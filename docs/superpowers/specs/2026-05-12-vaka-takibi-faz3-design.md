# Vaka Takibi — Faz 3: Kapanış Sentez Raporu — Tasarım

**Tarih:** 2026-05-12
**Durum:** Tasarım onaylandı, plan yazımı bekliyor
**Önceki:** `2026-05-12-vaka-takibi-faz2-design.md`

## 1. Amaç

Bir vaka serisi kapandığında AI'ın seri bütünü için **kapanış sentez raporu** üretmesi: temalar, öğrenci gelişim yayı, yakalanmamış fırsatlar, final formülasyon snapshot'ı. Kullanıcı kapatma öncesi kısa bir "ne öğrendim" notu (opsiyonel) bırakabilir; sentez bunu da hesaba katar.

## 2. Kapsam

### Dahil
- Yeni `case_series_reports` tablosu + RLS
- Yeni `synthesis-generator.ts` servisi (OpenAI çağrısı, schema-locked JSON)
- "Vakayı kapat" akışı değişir: tek tık confirm yerine **`/seri/[id]/kapat-onay`** hazırlık sayfası
- `POST /api/seri/[id]/kapat` body genişler: `{ closing_reflection?: string }`; aktif seans kontrolü sürer
- Yeni sayfa `/seri/[id]/kapanis` — sentez raporu görünümü
- Kapalı serilerde `/seri/[id]` üstünde "Kapanış raporunu gör →" linki
- Geçmiş sayfası üstüne yeni bölüm: **"Tamamlanmış vakalar"** (kapanmış seri kartları)

### Dahil değil (kalıcı YAGNI)
- Kapanış raporu regenerate / edit / delete
- Kapalı seriyi yeniden açma (kullanıcı yeni seri açar)
- Per-seans rapor değişmesi (kapanış sentezi onları replace etmez)

## 3. Veri Modeli

```sql
-- 0021_case_series_reports.sql
create table public.case_series_reports (
  id                    uuid primary key default gen_random_uuid(),
  series_id             uuid not null references public.case_series(id) on delete cascade,
  closing_reflection    text,
  summary               text not null,
  arc                   text not null,
  themes                jsonb not null default '[]',
  growth                jsonb not null default '[]',
  missed_opportunities  jsonb not null default '[]',
  final_formulation     jsonb,
  next_steps            text not null,
  generated_at          timestamptz not null default now()
);

create unique index case_series_reports_series_uniq
  on public.case_series_reports(series_id);

alter table public.case_series_reports enable row level security;

create policy "users access own series reports"
  on public.case_series_reports for all to authenticated
  using (
    exists (
      select 1 from public.case_series cs
      where cs.id = case_series_reports.series_id and cs.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.case_series cs
      where cs.id = case_series_reports.series_id and cs.user_id = auth.uid()
    )
  );
```

**Şekil sözleşmeleri:**

```ts
// JSON alanları
themes:               string[];                  // 3-5 gözlem (klinik temalar)
growth:               string[];                  // 3-5 öğrenci gelişim gözlemi
missed_opportunities: string[];                  // 2-4 yakalanmamış fırsat
final_formulation: {                              // case_series.formulation snapshot
  presenting?: string;
  hypothesis?: string;
  patterns?: string;
  next_session?: string;
} | null;
```

## 4. Sentez Servisi

### 4.1. Konum
`src/lib/openai/synthesis-generator.ts` (yeni). Mock fallback: `MOCK_OPENAI=true` ise sabit örnek döner.

### 4.2. Sözleşme

```ts
export type SeriesSynthesis = {
  summary: string;
  arc: string;
  themes: string[];
  growth: string[];
  missed_opportunities: string[];
  next_steps: string;
};

export type GenerateSynthesisInput = {
  case: { presenting; background; personality; speech_style; goals_hidden };
  sessionCount: number;
  sessionSummaries: SessionSummary[]; // kronolojik
  livingFormulation?: { presenting?; hypothesis?; patterns?; next_session? } | null;
  closingReflection?: string;
};

export type GenerateSynthesisResult = {
  synthesis: SeriesSynthesis;
  token_count: number;
};

export async function generateSeriesSynthesis(input): Promise<GenerateSynthesisResult>;
```

### 4.3. Prompt
- **System:** "Sen psikoterapi süpervizör asistanısın. Bir vaka serisinin tamamını okuyup öğrenciye kapsamlı, eylem-odaklı kapanış raporu üreteceksin. Çıktın yalnız JSON olur."
- **User:** vaka temel profili + seans sayısı + tüm seans özetleri + yaşayan formülasyon + closing_reflection + JSON schema
- Model: gpt-4o, temperature 0.5, response_format json_object
- ~1500-2000 token / üretim

### 4.4. Validation
String alanlar boş olamaz; array alanlar `[]`'a coerce edilir; uzunluk capleri uygulanır (summary 1500 char, arc 1500, themes/growth items 240 each).

### 4.5. Hata politikası
Üretim başarısızsa: status='closed' set edilmez, response 502 `synthesis_failed`. Kullanıcı tekrar deneyebilir. Aktif seans yoksa kapatma her zaman başarılı tarafa düşürülebilir mi? Hayır — sentez tek-shot zorunluluk (kapanmış ama raporsuz seri olmasın).

## 5. Akış Değişikliği — Kapatma

### 5.1. Mevcut `CloseSeriesButton` davranışı kaldırılır
`src/components/series/CloseSeriesButton.tsx` artık küçük client component değil — basit bir **link** olarak değişir: `/seri/[id]/kapat-onay`. (Component dosyası kaldırılabilir; `<a href="...">` inline yeterli. Plan'da rename veya removal kararı verilir.)

### 5.2. Yeni `/seri/[id]/kapat-onay` sayfası

Server component:
- Read-only kartlar:
  - Yaşayan formülasyon (var ise) — `LivingFormulationCard` benzeri
  - Seans listesi minimum bilgi: N seans, en son hangi tarihte
- Form (client component child):
  - Textarea: "Bu vakadan ne öğrendin? (opsiyonel) — klinik veya kişisel bir not"
  - "Vakayı kapat ve raporu üret →" butonu
  - Submit → POST `/api/seri/[id]/kapat` body: `{ closing_reflection?: string }`
  - Loading state: "Süpervizör seri bütününü okuyor..." (~3-5 sn)
  - Başarılı → router.push `/seri/[id]/kapanis`
  - Hata: `active_session_exists` / `already_closed` / `synthesis_failed` / generic

### 5.3. `POST /api/seri/[id]/kapat` genişlemesi

Mevcut: status='open' kontrolü + active session kontrolü + status='closed' update.

Yeni:
1. Aynı kontroller (mevcut).
2. Seri için case profile + tüm seans özetleri + yaşayan formülasyon fetch et.
3. `generateSeriesSynthesis` çağır (closing_reflection ile birlikte).
4. Başarılı: `case_series_reports`'a insert, `case_series.status='closed'`, `closed_at=now()` update. Response `{ ok: true, report_url: '/seri/[id]/kapanis' }`.
5. Hata (sentez): status değiştirilmez. 502 `synthesis_failed`.

### 5.4. Token muhasebesi
Sentez üretim token'ları `usage_daily.token_count`'a eklenir.

## 6. `/seri/[id]/kapanis` Sayfası

Server component. Rapor yoksa 404 (kapanmamış seri için bu rota erişilemez).

**Bölümler (üstten alta):**
- Breadcrumb: "← Seri sayfası"
- Header: vaka başlığı (italic), "Kapanış raporu", kapanış tarihi
- **Özet** (`summary`) — bir paragraf
- **Vakanın yayı** (`arc`) — bir paragraf, italic vurgu
- **Temalar** (`themes[]`) — kart, madde liste
- **Senin gelişimin** (`growth[]`) — kart, madde liste (accent renk)
- **Yakalanmamış fırsatlar** (`missed_opportunities[]`) — kart, madde liste (gilt renk)
- **Final formülasyon** (`final_formulation`) — read-only kart
- **Kapanış notun** (`closing_reflection`, varsa) — italic
- **Sonraki adımlar** (`next_steps`) — paragraf

## 7. `/seri/[id]` Sayfası — Kapalı Durum

Mevcut: open ise iki buton (Yeni seans + Vakayı kapat). Closed ise her ikisi gizli.

Yeni: closed ise header'ın altına primary buton: **"Kapanış raporunu gör →"** → `/seri/[id]/kapanis`.

## 8. Geçmiş Sayfası — Yeniden Yapı

`/gecmis` sayfası mevcut: sessions listesi.

Yeni: üstte **"Tamamlanmış vakalar"** bölümü.
- Kullanıcının `status='closed'` serilerini fetch et (with case title)
- Her seri için kart: vaka başlığı, kaç seans, kapanış tarihi, "Kapanış raporu →" linki → `/seri/[id]/kapanis`
- 0 kapanmış seri varsa bölüm hiç render edilmez

Mevcut "Geçmiş seanslar" listesi değişmez (altta kalır).

## 9. Test Stratejisi

### Birim (Vitest)
- `validateSeriesSynthesis`: missing required → throw; arrays coerce; length cap
- `generateSeriesSynthesis` mock mode: returns synthesis + token_count
- `POST /api/seri/[id]/kapat`:
  - active session → 409 (mevcut, regresyon)
  - synthesis success → status closed + report inserted + response includes report_url
  - synthesis failure → status remains open, 502

### E2E (Playwright) — opsiyonel, mevcut series.spec.ts genişlemez

Manuel test:
- /seri/[id] kapat-onay → form → kapanış raporu üret → /kapanis görünür
- /gecmis: tamamlanmış vakalar bölümü görünür, link çalışır

## 10. Maliyet

Kapanış raporu = bir kerelik üretim, ~1500-2000 token. Günlük token limitine sayılır.

## 11. Geriye Uyumluluk

- Faz 1/2 kapanmış serileri (Faz 1 backfill ile closed olanlar veya Faz 2 closed) `case_series_reports`'a sahip değil. `/seri/[id]/kapanis` rotası bunlar için 404 verir.
- Geçmiş sayfasında bu serilerin kartı görünür (status=closed) ama "Kapanış raporu" link'i tıklanırsa 404. **Karar:** Yeniden üretme yok. Bu seriler raporsuz kalır.
- Alternatif (opsiyonel, scope dışı): "Sentez raporu üret" butonu eski kapanmış seriler için manuel tetikleyici olarak eklenebilir. Bu spec'te yok.

## 12. Migrasyon Sırası

1. `0021_case_series_reports.sql` migration
2. `synthesis-generator.ts` + mock
3. `POST /api/seri/[id]/kapat` extension (closing_reflection + synthesis)
4. `/seri/[id]/kapat-onay` sayfası + client form
5. `/seri/[id]/kapanis` sayfası
6. `/seri/[id]` sayfası closed branch + "Kapanış raporunu gör" linki
7. `CloseSeriesButton` link refactor (button → anchor to /kapat-onay)
8. `/gecmis` sayfası "Tamamlanmış vakalar" bölümü
9. Birim testler
10. Prod migration
