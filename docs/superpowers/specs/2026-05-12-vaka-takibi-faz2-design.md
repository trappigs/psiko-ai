# Vaka Takibi — Faz 2: Hybrid Hafıza + Yaşayan Formülasyon + Zaman İpucu — Tasarım

**Tarih:** 2026-05-12
**Durum:** Tasarım onaylandı, plan yazımı bekliyor
**Önceki:** `2026-05-12-vaka-takibi-faz1-design.md`

## 1. Amaç

Faz 1'in naive hafızasını ölçeklenebilir hale getirir: AI artık serideki tüm transcript'leri ham olarak görmez; eski seanslar **özetlenmiş**, son 2 seans **tam transcript**, **yaşayan formülasyon** ve **zaman ipucu** AI'ın bağlamına eklenir. Süpervizör formülasyon karşılaştırması, yaşayan formülasyon üstünde işler.

## 2. Kapsam

### Dahil
- Seans-sonu özet üretimi (`sessions.summary`) — eager, `POST /api/seans/end` içinde
- Yaşayan formülasyon: `case_series.formulation`; kullanıcı yazdığında hem seans-snapshot hem seri-canonical güncellenir
- Zaman ipucu seçici: `/seri/[id]` "Yeni seans başlat" → küçük modal → `sessions.time_gap_label`
- Mesaj route hybrid prompt: yaşayan formülasyon + eski seans özetleri (system) + son 2 transcript + canlı mesajlar + zaman ipucu
- Süpervizör formülasyon karşılaştırması artık yaşayan formülasyonu okur (ek değişiklik yok; mevcut alan üzerinden)
- `/seri/[id]` sayfasına yaşayan formülasyon kartı + düzenle linki
- Rapor sayfasında "AI'ın eklemek istediği" bölümü (mevcut `supervisor_added` görünür hale getirilir; YAGNI: tek tık aksiyon yok)

### Dahil değil (Faz 3'e)
- Kapanış sentez raporu
- Kapanmış seriler için ayrı listeleme
- Formülasyon revision history

### Dahil değil (kalıcı YAGNI)
- Otomatik gerçek-zaman temelli `time_gap_label`
- Süpervizör eklemesini tek tıkla formülasyona yazma

## 3. Veri Modeli

```sql
-- 0020_session_summary_and_living_formulation.sql
alter table public.sessions
  add column summary jsonb,
  add column time_gap_label text;

alter table public.case_series
  add column formulation jsonb;

-- not: case_series.formulation rls'i mevcut "users manage own series" policy'siyle korunur
```

**Şekil sözleşmeleri:**

```ts
// sessions.summary jsonb
{
  headline: string;       // 1 cümle başlık
  key_events: string[];   // 3-5 madde
  promises: string[];     // danışanın söz verdiği şeyler; boş olabilir
  hypothesis_update: string; // 1-2 cümle: süpervizörün hipotez güncellemesi
}

// case_series.formulation jsonb
// Tip mevcut Formulation tipiyle aynı (src/lib/formulation.ts):
{ presenting?, hypothesis?, patterns?, next_session?, written_at? }
```

## 4. Seans-Sonu Özet Servisi

### 4.1. Konum
`src/lib/openai/summary-generator.ts` (yeni)

### 4.2. Sözleşme
```ts
export type SessionSummary = {
  headline: string;
  key_events: string[];
  promises: string[];
  hypothesis_update: string;
};

export type GenerateSummaryInput = {
  case: CaseProfile;
  transcript: Array<{ role: 'student' | 'client'; content: string }>;
  priorSummaries?: SessionSummary[]; // önceki seansların özetleri (tutarlılık için)
  livingFormulation?: Formulation | null;
};

export type GenerateSummaryResult = {
  summary: SessionSummary;
  token_count: number;
};

export async function generateSessionSummary(input: GenerateSummaryInput): Promise<GenerateSummaryResult>;
```

### 4.3. Prompt mantığı
- **System:** "Sen psikoterapi süpervizör asistanısın. Bir seansın özetini üreteceksin. Bu özet, gelecek seanslarda terapistin (öğrencinin) hatırlaması için bağlam sağlayacak. Klinik kayıt formatında, kısa ve eylem-odaklı yaz. Sadece JSON döndür."
- **User:** vaka temel profili (özet), önceki özetler (varsa), yaşayan formülasyon (varsa), bu seansın transcript'i, schema.
- **Model:** `gpt-4o`, `response_format: { type: 'json_object' }`, temperature `0.4` (özet için tutarlı).
- **Token bütçesi:** ~400-600 token / üretim. Günlük token sayacına eklenir.

### 4.4. Hata politikası
Üretim başarısız olursa: seans yine `completed` olur, `summary` null kalır. Bir sonraki seans hybrid-memory akışında null'u özet yokmuş gibi atlatır (eski seans hiç hatırlanmaz). Kullanıcıya görünmez, sadece log'da kaydedilir.

### 4.5. Mock
`MOCK_OPENAI=true` durumunda sabit/seans-uzunluğuna duyarlı bir mock döner (test ve dev kolaylığı için).

## 5. `POST /api/seans/end` Genişletmesi

Mevcut endpoint:
1. `status='completed'`, `ended_at=now()` set ediyor.

Yeni:
2. Sonra: transcript'i, vaka profili, önceki seans özetlerini, yaşayan formülasyonu fetch et
3. `generateSessionSummary` çağır
4. Başarılıysa `sessions.summary`'ye yaz, `usage_daily.token_count`'a ekle
5. Hata olursa session zaten completed; sessizce devam et (response başarılı döner)

Performans: response süresi 1-2 sn uzar. Kullanıcı "Bitir" sonrası nasılsa rapor bekleyecek; bu süre tahammül edilebilir.

## 6. Yaşayan Formülasyon Akışı

### 6.1. Yükleme
`/seans/[id]/formulasyon` sayfası — mevcut: `sessions.formulation`'dan yüklüyor.

Yeni: önce `case_series.formulation`'dan yükle (canlı hâl). Yoksa boş başla. `sessions.formulation` artık snapshot/audit; yükleme için kullanılmaz.

### 6.2. Kaydetme
`POST /api/seans/formulasyon`:
- Mevcut: payload → `sessions.formulation` set
- Yeni: aynı payload → **HEM** `sessions.formulation` (snapshot) **HEM** `case_series.formulation` (canonical) güncellenir
- `written_at` damgalanır

### 6.3. `/seri/[id]` sayfasında formülasyon kartı
Seans listesinin **üstünde** (veya altında) yeni section:
- Başlık: "Yaşayan formülasyon"
- Eğer doluysa: 4 alan görünür (presenting / hypothesis / patterns / next_session)
- "Düzenle" linki: `/seri/[id]/formulasyon` rotasına gider (yeni)
- Eğer boşsa: "Henüz formülasyon yazmadın. İlk seansını bitirip yazabilirsin." mesajı

### 6.4. `/seri/[id]/formulasyon` route'u
Yeni sayfa. Mevcut `FormulationForm` bileşeni yeniden kullanılır. Submit → `POST /api/seri/[id]/formulasyon` (yeni endpoint) → sadece `case_series.formulation`'ı update eder, `sessions.formulation`'ı dokunmaz. Sonra `/seri/[id]`'ye redirect.

## 7. Hybrid Hafıza (Mesaj Route)

### 7.1. Mevcut faz 1 davranışı
`src/app/api/seans/message/route.ts` — serideki TÜM completed seansların mesajları + bu seansın mesajları AI'a gidiyor.

### 7.2. Yeni davranış

```
system:
  base case prompt
  + (varsa) "Kullanıcının formülasyonu: <case_series.formulation kısa string>"
  + (varsa) "Geçmiş seans özetleri (eskiden yeniye):
      Seans 1: <headline> | olaylar: <…> | sözler: <…> | hipotez: <…>
      Seans 2: …
      Seans N: …"  (sadece N-2 eski seans için, son 2 hariç)
  + (varsa) "Son seans ile bu seans arasında ${time_gap_label} geçti."

messages:
  [son 2 completed seansın TÜM mesajları, kronolojik]
  [bu seansın mesajları]
```

### 7.3. Eski seans özet eşik
- Seri toplam seans sayısı N
- Tam transcript: en yeni 2 completed seans
- Özet: 3. en yeniden geriye, summary'si null olmayanlar
- Summary null seanslar atlatılır (faz 1'den kalan seanslar)

### 7.4. Token bütçe etkisi
- Naive (faz 1): 10 seans = ~30k token system context'i
- Hybrid (faz 2): 10 seans = ~6k token system context'i (2 transcript + 8 özet)
- Tasarruf çoğu seans için 60-80%

## 8. Zaman İpucu — TimeGapModal

### 8.1. UI
`src/components/series/TimeGapModal.tsx` (yeni client component)
- `/seri/[id]` sayfasında "Yeni seans başlat" tıklanınca açılır
- 4 seçenek (segment butonlar):
  - **1 gün sonra**
  - **1 hafta sonra**  *(default)*
  - **1 ay sonra**
  - **Belirsiz** (boş bırak)
- "Devam et" → POST `/api/seans/start` `{ case_id, time_gap_label }` → router push `/seans/[id]`

### 8.2. API
`startSession` (`src/lib/session-actions.ts`):
- `StartSessionInput` curated branch'ine `timeGapLabel?: string` eklenir
- Yeni seans insert'inde `time_gap_label` kolonuna yazılır

İlk seans için (seri henüz boşsa): time_gap_label `null` kalır. Modal yine açılır ama "İlk seans" alternatifi default seçilir veya modal hiç açılmaz (sürekli akış için). **Karar:** ilk seansta modal **gösterilmez**, doğrudan başlatılır; sonraki seanslarda modal açılır.

### 8.3. Prompt enjeksiyonu
Mesaj route'unda `time_gap_label` doluysa system prompt'a satır eklenir:
```
"Son seansla bu seans arasında ${time_gap_label} geçti. Açılışını buna göre yap."
```

## 9. Süpervizör Raporu — "AI'ın eklemek istediği"

Mevcut `formulation_comparison` JSON'ında zaten `supervisor_added: string[]` var. Faz 1'den itibaren rapor sayfasında bu görünüyor ama varsayılan görsel ağırlığı düşük.

**Yeni:** Görseli güçlendir — kart olarak görünsün, başlık: "AI'ın eklemek istediği"; her madde altı çizilmiş kısa metin. **Aksiyon yok.** Kullanıcı isterse manuel olarak formülasyona kopyalar (`/seri/[id]/formulasyon` aç → yaz → kaydet).

Bu küçük UI değişikliği `src/components/report/ReportView.tsx` içinde `formulation_comparison` bölümünde yapılır.

## 10. Geriye Uyumluluk

- Faz 1 öncesi seanslar `summary=null` ile gelir. Eski seans olarak prompt'a girerken atlanırlar — AI bilmezden gelir. Bu kabul edilebilir; eski seanslar yeniden yapılırsa zaten yeni seans olur.
- `sessions.formulation` korunur. Yeni formulasyon endpoint'i ikiye birden yazar. Eski raporların formulation_comparison'u sessions.formulation'dan üretilmiştir; o sabit kalır.
- Mevcut Faz 1 e2e testi (`tests/e2e/series.spec.ts`) bozulmamalı.

## 11. Test Stratejisi

### Birim (Vitest)
- `generateSessionSummary` mock validation (schema-lock testi)
- `POST /api/seans/end` summary üretimi: başarı → sessions.summary doldu; hata → completed yine başarılı
- `POST /api/seans/formulasyon`: her iki tabloya da yazıyor
- `POST /api/seri/[id]/formulasyon`: sadece case_series'e yazıyor
- `startSession` curated: time_gap_label payload'da → sessions.time_gap_label set

### Entegrasyon
- Mesaj route hybrid memory: 3 completed seansı olan bir seride → 1 ham transcript + 2 özet (son 2'den eski olan 1, summary'siz son 1) → system message içeriği kontrol

### E2E (Playwright)
- Mevcut series.spec.ts genişletilmez (zaman çıktı ekleme/test fixture yeniden ayarlamak zor). Yeni manuel test çek listesi sayfası docs/superpowers/specs/manual-test-faz2.md (opsiyonel, plan'a almayız).

## 12. Maliyet

- Her seans sonu +400-600 token (özet üretimi)
- Yaşayan formülasyon kayıt: API call yok, sadece DB yazma
- Net tasarruf: hybrid memory sayesinde N seans için **toplam token** Faz 1'e göre kayda değer şekilde azalır (10+ seansta belirgin)

## 13. Migrasyon Sırası

1. `0020_session_summary_and_living_formulation.sql`
2. `summary-generator.ts` + mock
3. `POST /api/seans/end` summary üretimi
4. `/api/seans/formulasyon` çift yazma + `/api/seri/[id]/formulasyon` (yeni)
5. `/seri/[id]/formulasyon` sayfası + `FormulationForm` reuse
6. `/seri/[id]` sayfasında formülasyon kartı
7. Mesaj route hybrid prompt
8. `TimeGapModal` + `/seri/[id]` integration + startSession `timeGapLabel`
9. Rapor sayfasında "AI'ın eklemek istediği" kartı
10. Birim testler
11. Prod migration (Supabase MCP üzerinden)
