# Vaka Takibi — Faz 1: Series + Manuel Devam — Tasarım Dokümanı

**Tarih:** 2026-05-12
**Durum:** Tasarım onaylandı, plan yazımı bekliyor
**Önceki dokümanlar:**
- Ana spec: `2026-05-09-ai-danisan-supervizyon-design.md`
- Serbest seans: `2026-05-11-serbest-seans-design.md`

## 1. Amaç

Kullanıcı aynı vakayla birden fazla seans yapabilsin. Seanslar bir **vaka serisi** (`case_series`) altında gruplanır, AI önceki seansların transcript'lerini hatırlayarak yanıt verir.

**Faz 1 çekirdeği:** mimari + manuel devam akışı. Önceki seansların **ham transcript'i** AI'a verilir (naive memory). Maliyet/ölçeklenebilirlik problemini Faz 2 çözecek.

## 2. Kapsam

### Dahil
- `case_series` tablosu + RLS
- `sessions.series_id` FK + mevcut seanslar için backfill (her biri kendi `closed` serisine girer)
- `startSession` her seans için açık seriyi bulur veya yeni seri açar (otomatik)
- Yeni sayfa `/seri/[id]`: seans listesi + "Yeni seans başlat" + "Vakayı kapat"
- Curated kart (anasayfa) ve `/vaka/[id]` briefing: açık seri varsa "Devam et" linki
- Free session rapor sayfası: "Bu danışanla devam et" butonu
- AI prompt'una **serideki tüm önceki seansların mesajları** kronolojik dahil edilir
- Çoklu seansta AI açılışı: system not olarak "Bu danışanla daha önce konuştun, geçmiş yukarıda; yeni seansa başla, açılışı sen yap"

### Dahil değil (Faz 2'ye)
- Seans-sonu özet üretimi (`session.summary`)
- Yaşayan formülasyon (faz 1'de mevcut per-session formülasyon davranışı sürer)
- `time_gap_label` seçici ve "1 hafta sonra" promptu

### Dahil değil (Faz 3'e)
- Kapanış sentez raporu — `Vakayı kapat` butonu sadece `status='closed'` yapar
- Geçmiş sayfasında "kapanmış vakalar" özel listesi

## 3. Veri Modeli

```sql
-- 0019_case_series.sql

create table public.case_series (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  case_id     uuid not null references public.cases(id),
  status      text not null default 'open' check (status in ('open','closed')),
  created_at  timestamptz not null default now(),
  closed_at   timestamptz
);

-- (user, case) için en fazla bir açık seri
create unique index case_series_open_uniq
  on public.case_series(user_id, case_id)
  where status = 'open';

create index case_series_user_idx on public.case_series(user_id);

alter table public.case_series enable row level security;

create policy "users manage own series"
  on public.case_series for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- sessions.series_id
alter table public.sessions
  add column series_id uuid references public.case_series(id);

create index sessions_series_idx on public.sessions(series_id);

-- backfill: mevcut her seans kendi closed serisine girer
do $$
declare
  s record;
  new_series_id uuid;
begin
  for s in
    select id, user_id, case_id from public.sessions where series_id is null
  loop
    insert into public.case_series(user_id, case_id, status, closed_at)
    values (s.user_id, s.case_id, 'closed', now())
    returning id into new_series_id;
    update public.sessions set series_id = new_series_id where id = s.id;
  end loop;
end $$;

alter table public.sessions alter column series_id set not null;
```

**Notlar:**
- Curated için `(user_id, case_id)` unique partial index → aynı kullanıcı aynı curated vakaya birden fazla açık seri başlatamaz.
- ai_generated case'ler her serbest seansta yeni `case_id` ürettiği için bu kısıt etkisiz; her serbest seans kendi serisini açar.

## 4. Sunucu Akışı

### 4.1. `startSession` genişletmesi

```ts
export async function startSession(userId: string, input: StartSessionInput) {
  // limit check (mevcut)
  // ...

  let caseId: string;
  let seriesId: string;

  if (input.mode === 'free') {
    // mevcut: generateCase + cases insert
    // ...
    caseId = caseRow.id;

    // her serbest seans yeni seri açar
    const { data: series } = await sb.from('case_series')
      .insert({ user_id: userId, case_id: caseId, status: 'open' })
      .select('id').single();
    seriesId = series.id;
  } else {
    // curated
    caseId = input.caseId;
    // açık seri var mı?
    const { data: existing } = await sb.from('case_series')
      .select('id').eq('user_id', userId).eq('case_id', caseId)
      .eq('status', 'open').maybeSingle();
    if (existing) {
      seriesId = existing.id;
    } else {
      const { data: created } = await sb.from('case_series')
        .insert({ user_id: userId, case_id: caseId, status: 'open' })
        .select('id').single();
      seriesId = created.id;
    }
  }

  // sessions insert with series_id
  const { data: session } = await sb.from('sessions')
    .insert({ user_id: userId, case_id: caseId, series_id: seriesId, status: 'in_progress' })
    .select('id').single();

  // usage upsert (mevcut)
  return { session_id: session.id };
}
```

### 4.2. Mesaj endpoint'i — `series-wide history`

`src/app/api/seans/message/route.ts`: mevcut `prevMsgs` sorgusu **bu seansın** mesajlarını çeker. Faz 1'de **serideki tüm tamamlanmış seansların mesajları** + bu seansın canlı mesajları AI'a iletilir.

```ts
// önce: tek seansın mesajları
const { data: prevMsgs } = await sb
  .from('messages')
  .select('role, content')
  .eq('session_id', sessionId)
  .order('created_at', { ascending: true });

// sonra: serideki tüm completed seansların mesajları + bu seansın mesajları
const { data: series } = await sb
  .from('sessions').select('id, status, started_at')
  .eq('series_id', session.series_id)
  .order('started_at', { ascending: true });

const olderSessionIds = series
  .filter(s => s.id !== sessionId && s.status === 'completed')
  .map(s => s.id);

let history: Array<{ role: string; content: string; session_index?: number }> = [];

if (olderSessionIds.length > 0) {
  const { data: olderMsgs } = await sb.from('messages')
    .select('session_id, role, content, created_at')
    .in('session_id', olderSessionIds)
    .order('created_at', { ascending: true });
  // her eski seans için ayraç ekle
  // ...
}

// + current session mesajları
```

**AI mesaj sırası (tek system prompt):**
```
system:
  base case prompt
  + (seri > 1 seans ise) "Bu danışanla daha önce konuştun. Aşağıdaki user/assistant mesajları geçmiş seanslardan; en son blok bugünkü seans. Sen rol olarak danışansın, kişiliği koru."
user/assistant: [seans 1 tüm mesajlar] [seans 2 tüm mesajlar] ... [current session mesajları]
```

Seans ayraçları için ham mesaj sırası yeterli — araya ekstra system mesajı yerleştirilmez. AI'ın seans sınırlarını ayırt etmesi gerekirse Faz 2'deki özet bloklarıyla bu netleşir.

### 4.3. "Vakayı kapat" — `POST /api/seri/[id]/kapat`

Yeni route. Body yok. İşlem:
- Kullanıcının kendi serisi olduğunu doğrula (RLS yeterli).
- Eğer aktif `in_progress` seans varsa hata (`active_session_exists`).
- `status = 'closed'`, `closed_at = now()`.

## 5. UI Değişiklikleri

### 5.1. Anasayfa (`src/app/page.tsx`)
- Cases sorgusuna kullanıcının açık serileri de fetch edilir (ayrı query: `case_series` where `user_id` and `status='open'`)
- `CaseCard` (curated) komponenti `openSeries?: boolean` propu alır; varsa küçük rozet "Devam ediyor".
- Curated card tıklama: `openSeries` varsa `/seri/[id]`'ye, yoksa mevcut `/vaka/[id]`'ye.

### 5.2. `/vaka/[id]` briefing sayfası
- Kullanıcının bu vaka için açık serisi varsa: "Hazırım, seansa başla" CTA'sı yerine **"Vakayla devam et → Seri sayfası"** linki.
- Açık seri yoksa: aynen mevcut akış (seans başlat → series otomatik oluşur → seans ekranı).

### 5.3. Yeni sayfa `/seri/[id]`
**Konum:** `src/app/seri/[id]/page.tsx` (server component).

**İçerik:**
- Header: `case.title`, durum rozet (`Açık · 3 seans` veya `Kapalı · 5 seans`)
- Vaka tipi: curated için "Vaka dosyası" linki (briefing'e gider); ai_generated için "Bu serbest bir vaka" notu (dosya gizli)
- Seans listesi (kronolojik): her satırda tarih + mesaj sayısı + durum + (rapor varsa) "Raporu gör" linki
- Aksiyon butonları (status='open' ise):
  - **Yeni seans başlat** — POST `/api/seans/start` `{ case_id: series.case_id }` → redirect `/seans/[new_id]`
  - **Vakayı kapat** — POST `/api/seri/[id]/kapat` → confirm modal → sayfa yenilenir

### 5.4. Free session rapor sayfası (`/rapor/[sessionId]`)
- Rapor view'ında en alta yeni section: **"Bu danışanla devam et"** butonu.
- Sadece şu koşullarda görünür:
  - `case.source === 'ai_generated'`
  - `series.status === 'open'` (kapatılmamış)
- Tıklayınca `/seri/[id]`'ye yönlendirir.

### 5.5. Rapor sayfası top breadcrumb
- Eğer seans bir seriye aitse (her zaman, faz 1'den itibaren): "← Seri sayfası" linki.

## 6. RLS ve Güvenlik

- `case_series` RLS: `users manage own series` (yukarıda) → user_id eşleşmesi.
- `sessions.series_id` mevcut sessions RLS politikalarını etkilemez (user_id check sürer).
- `cases` için: zaten geçen faz'da yazıldığı gibi, "own ai_generated cases" policy serideki kullanıcının erişimini garanti ediyor (`EXISTS sessions WHERE case_id = cases.id AND user_id`).

## 7. Maliyet ve Limit

- Günlük 5 seans / 100k token limiti aynen geçerli. Bir seri içindeki her seans tek başına sayılır.
- **Faz 1 bilinen yan etki:** N. seans = N-1 öncesi seansın transcript'lerini system prompt'a koyar. ~5-6 seansa kadar tolere edilebilir; sonrası pahalı ve "samanlıkta iğne" riski yaratır. Faz 2 (özetler) bunu çözecek.

## 8. Test Stratejisi

### Birim (Vitest)
- `startSession` curated mode: açık seri varsa yeniden kullanılır.
- `startSession` curated mode: açık seri yoksa yeni seri oluşturulur.
- `startSession` free mode: her çağrı yeni seri açar (yeni case_id ile).
- Message route mock: önceki seansların mesajları AI'ye iletilen `messages` array'ine girer (separator system mesajı dahil).
- `POST /api/seri/[id]/kapat`: aktif seans varsa 409 döner.

### E2E (Playwright)
- Curated vakayla seans yap → bitir → anasayfaya dön → vaka kartında "Devam ediyor" rozeti → kart tıkla → `/seri/[id]` → "Yeni seans başlat" → ikinci seans açılır.

## 9. Migrasyon Sırası

1. `0019_case_series.sql` migration.
2. `startSession` series-aware refactor + testler.
3. Message route series-wide history.
4. `/seri/[id]` sayfası.
5. `/api/seri/[id]/kapat` endpoint.
6. Anasayfa + briefing + rapor UI değişiklikleri.
7. E2E testler.

## 10. Geriye Uyumluluk

- Backfill her mevcut seansa kendi `closed` serisine yerleştirir. Geçmiş sayfası ve raporlar etkilenmez.
- `sessions.series_id` NOT NULL — backfill sonrası enforce edilir.
- `/api/seans/start` body sözleşmesi değişmez (curated `{ case_id }` veya free `{ mode:'free', ... }`).

## 11. Açık Olmayan Konular (Faz 2/3'e)

- Memory ölçeklendirme: seans-sonu özet üretimi + son 2 seans full + öncekiler özet.
- Yaşayan formülasyon: per-series formülasyon, her seansta güncellenir, süpervizör karşılaştırması bunun üstünde.
- `time_gap_label`: "1 hafta sonra" gibi seans-arası zaman ipucu.
- Kapanış sentez raporu: tüm seri özetleri + final formülasyon → kapsamlı bütünleştirici rapor.
