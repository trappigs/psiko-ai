# Serbest Seans (AI-Üretilen Vaka) — Tasarım Dokümanı

**Tarih:** 2026-05-11
**Durum:** Tasarım onaylandı, plan yazımı bekliyor
**İlgili ana doküman:** `2026-05-09-ai-danisan-supervizyon-design.md`

## 1. Amaç

Kullanıcı önceden hazırlanmış vaka kütüphanesinden seçim yapmadan, **detaylarını bilmediği** bir danışanla seans başlatabilsin. Vaka iskeletini AI üretir, "danışan dosyası" seans bittikten sonra raporla birlikte açılır.

**Motivasyon:** Gerçek klinik akışta danışan hakkında çok az bilgiyle başlanır. Bu mod öğrenciyi "ipuçlarını konuşmadan yakalama" pratiğine zorlar; ayrıca aynı 5-10 vakanın tekrarına karşı sürekli yeni içerik sağlar.

## 2. Kapsam

### Dahil
- "Serbest seans başlat" girişi (anasayfada kütüphanenin yanında).
- Pre-flight modal: **zorluk seçimi** (easy/medium/hard) + **opsiyonel tek satır tema ipucu**.
- Sunucu tarafı vaka üretici: schema-kilitli JSON döndüren OpenAI çağrısı.
- Üretilen vakanın `cases` tablosuna `source='ai_generated'` ile yazılması.
- Seans ekranında briefing drawer'ının gizli/devre dışı olması, üstte "Serbest seans" rozeti.
- Rapor sayfasında **"Gizli dosya açıklandı"** bölümü (sadece `source='ai_generated'` için).

### Dahil değil (kapsam dışı)
- Üretilen vakayı favorilere/kütüphaneye alma.
- Üretim için ayrıntılı parametreler (yaş, cinsiyet, tanı kategorisi seçici vb.) — zorluk + tema ipucu yeterli.
- Aynı serbest vakayla "tekrar seans" akışı — v2.
- Üretilen vaka için ayrı günlük limit/tarife — mevcut 5 seans / 100k token / kullanıcı sayacına dahildir.

## 3. Kullanıcı Akışı

```
Anasayfa
  └─ "Serbest seans başlat" kartı
       └─ Modal: zorluk seç + (opsiyonel) tema ipucu yaz
            └─ [Başlat] → 2-4 sn "Danışan hazırlanıyor..."
                 ├─ Sunucu: limit kontrolü → AI üret → cases insert → sessions insert
                 └─ Redirect: /seans/[id]
                      └─ Chat ekranı (briefing kilitli, üstte rozet)
                           └─ Seans sonu → /rapor/[sessionId]
                                └─ Standart rapor + "Gizli dosya açıklandı" bölümü
```

## 4. Veri Modeli Değişikliği

Tek bir minimal migration:

```sql
-- 0017_case_source.sql
alter table public.cases
  add column source text not null default 'curated'
  check (source in ('curated', 'ai_generated'));

create index cases_source_active_idx on public.cases (source, is_active);
```

**Etkiler:**
- Kütüphane sorgusu (`src/app/page.tsx`): `where source = 'curated' and is_active = true`.
- Vaka detay sayfası `/vaka/[id]`: AI üretilenler gösterilmez (404 veya redirect).
- `sessions.case_id` FK aynı kalır; raporlama, formülasyon karşılaştırma, mesaj geçmişi vb. **hiçbir kod yolu değişmez**.
- RLS politikası `cases` tablosunda zaten "herkes okur" — değişiklik gerekmez.

## 5. Vaka Üretim Servisi

### 5.1. Konum
`src/lib/openai/case-generator.ts` (yeni dosya).

### 5.2. Sözleşme

```ts
type GenerateCaseInput = {
  difficulty: 'easy' | 'medium' | 'hard';
  themeHint?: string; // serbest metin, max 120 char; boş olabilir
};

type GeneratedCase = {
  title: string;
  presenting: string;
  background: string;
  personality: string;
  speech_style: string;
  goals_hidden: string;
  insight_level: string;
  defense_style: string;
  register: string;
  diagnosis_hint: string | null;
  difficulty: 'easy' | 'medium' | 'hard';
};

type GenerateCaseResult = {
  case: GeneratedCase;
  token_count: number; // toplam (prompt + completion); usage_daily'e eklenir
};

export async function generateCase(input: GenerateCaseInput): Promise<GenerateCaseResult>;
```

### 5.3. Üretim promptu (özet)

- **System:** "Sen psikoterapi eğitim aracı için gerçekçi, klinik açıdan tutarlı bir kurmaca danışan persona üreteceksin. Schema'ya birebir uyan tek bir JSON nesnesi döndür, başka hiçbir şey yazma."
- **User:** Difficulty + themeHint + çeşitlilik kuralları (klişeden kaçın, isim/yaş/aile yapısı çeşitlilendir, yalnız "kaygı" temasına saplanma vb.) + alan tanımları + örnek schema.
- **Güvenlik kuralı:** Kriz/intihar planı içermesin (mevcut sistem promptundaki kuralla uyumlu); `goals_hidden` aktif intihar planı yerine üzgünlük/işlevsizlik düzeyinde kalsın.
- **Model:** `gpt-4o`, `response_format: { type: 'json_object' }`, `temperature: 0.9` (çeşitlilik için).
- **Token bütçesi:** ~800 output token / üretim. Mevcut `usage_daily.token_count` sayacına eklenir.

### 5.4. Doğrulama

JSON parse + alan tipi/uzunluk kontrolü. Eksik/geçersiz alan varsa **bir kez** retry (aynı parametrelerle), o da başarısız olursa kullanıcıya `error: 'generation_failed'` döndürülür ve seans/limit sayacı **artırılmaz**.

### 5.5. Mock

`src/lib/openai/mock.ts` benzeri: `OPENAI_API_KEY` yoksa veya `NEXT_PUBLIC_USE_MOCK=1` ise sabit/seed-rotasyonlu örnek üretir (test ve dev kolaylığı).

## 6. Sunucu Akışı

### 6.1. `startSession` genişletmesi

`src/lib/session-actions.ts` — mevcut imza:

```ts
startSession(userId, caseId)
```

Yeni imza:

```ts
type StartSessionInput =
  | { mode: 'curated'; caseId: string }
  | { mode: 'free'; difficulty: 'easy'|'medium'|'hard'; themeHint?: string };

startSession(userId: string, input: StartSessionInput): Promise<{ session_id: string }>;
```

**Free mod adımları:**
1. Günlük limit kontrolü (mevcut mantık).
2. `generateCase(input)` çağrısı.
3. `cases` tablosuna insert (`source='ai_generated'`, `is_active=false`) → `caseId` al.
4. `sessions` insert (mevcut mantık).
5. `usage_daily` upsert: `session_count + 1`, `token_count` üretim maliyetini de ekleyecek şekilde (üretici tokeniadetini döndürür).

**Hata sırası:** limit → generation → DB insert. Generation hatasında ne `cases` ne `sessions` yazılır.

### 6.2. API route

`src/app/api/seans/start/route.ts` — body iki şekilden birini kabul eder:

```json
// curated (mevcut, geriye uyumlu)
{ "case_id": "uuid" }

// free (yeni)
{ "mode": "free", "difficulty": "medium", "themeHint": "kayıp yası" }
```

`case_id` varsa curated path, yoksa `mode === 'free'` validasyonu yapılır, ikisi de yoksa 400.

## 7. UI Değişiklikleri

### 7.1. Anasayfa (`src/app/page.tsx`)
- "Vaka kütüphanesi" başlığının altında ya da `CaseIndex` grid'inin **üstünde** yeni bir kart: **"Serbest seans — sürpriz danışan"**. Stil mevcut `surface` + `btn-outline` desenine sadık.
- Kart `<button>` veya küçük link; tıklayınca client-side modal açılır.

### 7.2. Yeni bileşen: `FreeSessionModal`
`src/components/case/FreeSessionModal.tsx`
- Form alanları:
  - Zorluk radio/segment (3 seçenek)
  - Tema ipucu input (opsiyonel, placeholder: "ör. iş yerinde tükenmişlik — boş bırakabilirsin")
- "Başlat" submit → `POST /api/seans/start` → loading state ("Danışan hazırlanıyor...") → success'te `router.push('/seans/'+id)`.
- Hata durumları: `limit:*` → mevcut limit mesajı; `generation_failed` → "Şu an üretemedik, tekrar dene"; diğer → genel hata.

### 7.3. Seans ekranı (`src/app/seans/[id]/page.tsx`)
- Session + case fetch ettikten sonra `case.source === 'ai_generated'` ise:
  - `CaseSheetDrawer` render edilmez (veya drawer içeriği "Bu serbest bir seans. Dosya seans sonunda açılır." mesajıyla kilitlenir).
  - Üst barda küçük rozet: **"Serbest seans"**.
- Diğer her şey (chat, formülasyon, timer) aynı.

### 7.4. Rapor (`src/components/report/ReportView.tsx` + sayfa)
- Sayfa server-side `case.source`'u fetch edip prop olarak geçirir.
- `source === 'ai_generated'` ise raporun sonunda yeni bir bölüm: **"Bu vakanın gizli dosyası"**.
- Bölüm içeriği: `title`, `presenting`, `background`, `personality`, `speech_style`, `defense_style`, `insight_level`, `register`, `goals_hidden`, `diagnosis_hint` — kart/satır olarak.
- "Bu rapor açıkladığı için artık vakanın gerçek profilini biliyorsun" şeklinde bir kısa açıklama.

### 7.5. Geçmiş ve diğer listeler
- `src/app/gecmis/page.tsx` ve `/vaka/[id]`: AI-üretilen vakaların başlığı görünür (geçmişte gizleme gereği yok — seans bittiği için reveal olmuş kabul edilir). Sadece kütüphane listesinden ve direkt `/vaka/[id]` görüntülemeden hariç tutulur. Eğer `vaka/[id]` doğrudan açılırsa: ilgili session varsa rapora yönlendir, yoksa 404.

## 8. Süpervizör Tarafı

Mevcut süpervizör rapor üretici (`src/lib/openai/supervisor-prompt.ts`) zaten `case` verisini kullanıyor. AI-üretilen vakalar standart `cases` satırlarıdır; **kod yolu değişmez**. Formülasyon karşılaştırma, microskills vb. aynı şekilde çalışır.

## 9. Limitler ve Maliyet

- Günlük 5 seans limiti: serbest seanslar da sayılır.
- Günlük 100k token limiti: serbest seans **üretim** maliyetini (~1k token) ve seans/rapor maliyetini içerir.
- Üretim limit aşımı yapacaksa: limit kontrolü üretimden **önce** yapılır; üretim sırasında token sayacı güncellenmeden döner.

## 10. Test Stratejisi

### Birim (Vitest)
- `generateCase` mock'la: zorluk + tema input → schema doğrulanmış output.
- `generateCase` invalid JSON döndürdüğünde retry → fallback hata.
- `startSession({ mode: 'free' })`: limit reddi, generation hatası, başarı senaryoları.

### Entegrasyon
- `POST /api/seans/start` her iki body şekli; 400/401/429/500 yolları.

### E2E (Playwright)
- "Serbest seans başlat" tıkla → modal aç → easy seç → başlat → seans ekranı görünür → rozet "Serbest seans" yazıyor → drawer kilitli → seansı bitir → rapor sayfasında "Gizli dosya açıklandı" bölümü görünür.

## 11. Açık Olmayan Konular / Kararlar

- **Çeşitlilik:** Aynı kullanıcının arka arkaya benzer profiller almasını engellemek için promptta "son 5 vakayla aynı tema/savunma stilini tekrarlama" enjeksiyonu **v2'ye**. MVP'de sadece yüksek temperature + random seed.
- **PII/isim:** Üretilen vakada Türkçe yaygın isim havuzu kullanılır; gerçek bir kişiye atıf yapmaması için promptta açıkça yasaklanır.
- **Crisis safety:** Üretim promptu, sistem prompt'taki kriz kuralına uyumlu olacak şekilde `goals_hidden` alanını "aktif intihar planı" içeren içerikten arındırır.

## 12. Geriye Uyumluluk

- Eski `POST /api/seans/start` body `{ case_id }` çalışmaya devam eder.
- `cases` tablosundaki tüm mevcut satırlar `source='curated'` default'unu alır; herhangi bir veri taşıması gerekmez.
- Mevcut kütüphane/rapor/seans akışları değişmez.

## 13. Migrasyon Sırası

1. `0017_case_source.sql` migration uygula.
2. Vaka üretici (`case-generator.ts`) + mock.
3. `startSession` genişletmesi + API route güncellemesi.
4. `FreeSessionModal` + anasayfa girişi.
5. Seans ekranında source kontrolü (drawer kilidi + rozet).
6. Rapor sayfasında "Gizli dosya" bölümü.
7. Testler.
