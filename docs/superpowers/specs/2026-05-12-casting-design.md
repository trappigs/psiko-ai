# Casting (Parametreli 3-Aday Üretimi) — Tasarım Dokümanı

**Tarih:** 2026-05-12
**Durum:** Tasarım onaylandı, plan yazımı bekliyor
**İlgili:**
- Mevcut serbest seans: `2026-05-11-serbest-seans-design.md` (dokunulmaz)
- Vaka takibi: `2026-05-12-vaka-takibi-faz3-design.md` (dokunulmaz)

## 1. Amaç

Kullanıcı yarattığı danışanın özelliklerini detaylı belirleyebilsin (yaş, cinsiyet, kültür, meslek, ekol uyumu vb.), AI bu parametrelere göre **3 farklı aday** üretsin, kullanıcı kartlardan birini seçip o danışanla seans başlatsın. Mevcut "blind serbest seans" akışı dokunulmaz; yeni mod onun yanında durur.

## 2. Kapsam

### Dahil
- Yeni rota `/dosya-yarat` — full page parametre formu
- Anasayfada yeni kart "İstediğim danışanı yarat" (Serbest seans kartının yanında)
- 12 parametre (demografik + klinik), tümü opsiyonel
- Tek API çağrısında 3 aday üretici servisi (`generateCaseCandidates`)
- 3 aday `cases` tablosuna `source='ai_generated'` + `is_active=false` insert
- 3 kartlık grid, her kart: title + age/gender/culture chips + presenting özet + varyasyon etiketi
- Kart tıkla → modal: tam profil + "Bu danışanla seansa başla"
- Seans başlatma akışı mevcut `/api/seans/start` `{ case_id }` üzerinden

### Dahil değil (YAGNI)
- Aday cleanup (seçilmeyen 2 aday orphan kalır)
- Aday saklama / favorilere ekleme
- Re-generate butonu (kullanıcı formu güncelleyip baştan üretir)
- Casting flow için ayrı rapor reveal davranışı — aynı mevcut Faz 1 reveal section sürer

## 3. Parametre Seti

### Demografik (8)
| Alan | Tip | Değerler |
|---|---|---|
| `age_range` | enum | ergen / genç_yetiskin / orta_yas / ileri_yas |
| `gender` | enum | kadin / erkek / non_binary / belirtmek_istemiyor |
| `culture_segment` | enum | tr_koylu / tr_sehirli / tr_diaspora / serbest |
| `culture_freetext` | text (≤120) | culture_segment=serbest ise zorunlu, diğer hâllerde ek bağlam (opsiyonel) |
| `occupation` | enum | ogrenci / beyaz_yaka / mavi_yaka / esnaf / issiz / emekli |
| `relationship_status` | enum | bekar / iliskide / evli / ayrilmis / dul |
| `family_structure` | enum | tek_cocuk / kalabalik / ayri_ebeveyn / vefat_ebeveyn |
| `referral_source` | enum | kendi / aile / sevgili / mahkeme / okul_is |

### Klinik (4)
| Alan | Tip | Değerler |
|---|---|---|
| `difficulty` | enum | easy / medium / hard |
| `resistance_level` | enum | direngen / dengeli / isbirlikci |
| `school_fit` | enum | cbt / psikodinamik / humanistik / sistemik |
| `prior_therapy` | enum | ilk_kez / kisa_sure / uzun_gecmis |

### Serbest metin
| Alan | Tip |
|---|---|
| `theme_hint` | text (≤120, opsiyonel) |

**Tüm alanlar opsiyonel** (`theme_hint` zaten öyle); kullanıcı boş bırakırsa AI çeşitlilik için serbestçe doldurur. Sadece `culture_segment === 'serbest'` ise `culture_freetext` zorunlu.

## 4. Aday Üretim Servisi

### 4.1. Konum
`src/lib/openai/case-candidates-generator.ts` (yeni)

### 4.2. Sözleşme

```ts
export type CastingParams = {
  age_range?: 'ergen' | 'genc_yetiskin' | 'orta_yas' | 'ileri_yas';
  gender?: 'kadin' | 'erkek' | 'non_binary' | 'belirtmek_istemiyor';
  culture_segment?: 'tr_koylu' | 'tr_sehirli' | 'tr_diaspora' | 'serbest';
  culture_freetext?: string;
  occupation?: 'ogrenci' | 'beyaz_yaka' | 'mavi_yaka' | 'esnaf' | 'issiz' | 'emekli';
  relationship_status?: 'bekar' | 'iliskide' | 'evli' | 'ayrilmis' | 'dul';
  family_structure?: 'tek_cocuk' | 'kalabalik' | 'ayri_ebeveyn' | 'vefat_ebeveyn';
  referral_source?: 'kendi' | 'aile' | 'sevgili' | 'mahkeme' | 'okul_is';
  difficulty?: 'easy' | 'medium' | 'hard';
  resistance_level?: 'direngen' | 'dengeli' | 'isbirlikci';
  school_fit?: 'cbt' | 'psikodinamik' | 'humanistik' | 'sistemik';
  prior_therapy?: 'ilk_kez' | 'kisa_sure' | 'uzun_gecmis';
  theme_hint?: string;
};

export type CandidateCase = GeneratedCase & {
  variant_label: 'Daha açık' | 'Dengeli' | 'Direngen';
};

export type GenerateCandidatesResult = {
  candidates: CandidateCase[]; // exactly 3
  token_count: number;
};

export async function generateCaseCandidates(
  params: CastingParams
): Promise<GenerateCandidatesResult>;
```

### 4.3. Prompt
- **System:** "Sen psikoterapi eğitim aracı için 3 farklı kurmaca danışan adayı üreteceksin. Aynı temel parametreler için 3 farklı yorum, varyasyon eksenleri: kapalılık seviyesi (daha açık / dengeli / direngen). Çıktın yalnız geçerli JSON olur."
- **User:** verilen parametreler + JSON schema + "exactly 3 candidates" şartı + ekol uyumu nasıl yorumlanır kısa not (örn. "school_fit=cbt → bilişsel çarpıtmalar belirgin, sonra eylem teşviki için uygun bir vaka tasarla")
- Model: gpt-4o, response_format json_object, temperature 0.85 (çeşitlilik)
- Token bütçesi: ~2500 token / üretim

### 4.4. Validation
- `candidates` array length === 3 değilse retry (en fazla 1 kere)
- Her candidate `validateGeneratedCase` ile geçer; ek olarak `variant_label` zorunlu
- Hata → `generation_failed` propagate

### 4.5. Mock
`MOCK_OPENAI=true` → 3 sabit aday döner (her birinde farklı variant_label).

## 5. Endpoint

### 5.1. `POST /api/danisan-aday/uret`

**Auth:** zorunlu (401 yoksa)

**Body:**
```json
{ "params": { /* CastingParams */ } }
```

**Akış:**
1. Auth check
2. Günlük limit kontrol (`isOverDailyLimit`) — aday üretimi token harcar
3. `generateCaseCandidates(params)` çağır
4. Hata → `generation_failed` 502
5. 3 case'i `cases` tablosuna sırayla insert (her biri `source='ai_generated'`, `is_active=false`)
6. `usage_daily.token_count` += `token_count`
7. Response:

```json
{
  "candidates": [
    {
      "case_id": "uuid",
      "title": "...",
      "presenting": "...",
      "background": "...",
      "personality": "...",
      "speech_style": "...",
      "insight_level": "...",
      "defense_style": "...",
      "register": "...",
      "diagnosis_hint": null,
      "difficulty": "medium",
      "variant_label": "Dengeli",
      "age_range": "genc_yetiskin",
      "gender": "kadin"
      // goals_hidden DAHIL DEĞIL response'da — DB'de var ama UI'a sızmaz
    },
    ...
  ]
}
```

**Not:** `goals_hidden` AI tarafında üretilir, DB'ye yazılır, mesaj route prompt'undan kullanılır. Casting kartında veya modal'da görünmez (mevcut "gizli mesele" semantiği korunur).

### 5.2. Mevcut endpoint'lere etki yok
`/api/seans/start` `{ case_id }` ile aday case_id'leri kabul eder (mevcut RLS sayesinde kullanıcı kendi ai_generated case'ini kullanabilir).

## 6. UI

### 6.1. Anasayfa
Mevcut `FreeSessionTrigger` kartı `/dosya-yarat` linki olan ikinci bir kart ile yan yana durur.

`src/components/case/CastingTrigger.tsx` (yeni, basit link wrapper):

```tsx
<a href="/dosya-yarat" className="surface w-full ...">
  <div>
    <p className="label-caps">Casting</p>
    <p className="font-display text-xl">İstediğim <em>danışanı</em> yarat</p>
    <p className="text-sm text-muted mt-1">Detaylı parametre + 3 aday + seçim.</p>
  </div>
  <span className="btn-outline">Yarat</span>
</a>
```

### 6.2. `/dosya-yarat` sayfası
Server component (auth check + render).

`src/app/dosya-yarat/page.tsx`:
- Auth check
- Render `<CastingFlow />` (client component)

### 6.3. `CastingFlow` (client)
`src/components/casting/CastingFlow.tsx`:

State machine:
- `'form'` (default) → parametre formu, "Danışan üret" butonu
- `'loading'` → "3 aday üretiliyor..." spinner
- `'candidates'` → 3 kartlık grid + "Yeniden üret" linki (form'a döner)
- `'detail'` → modal açık, seçili aday tam profil
- `'starting'` → "Seansa başlanıyor..." (start çağrısı sırasında)

### 6.4. Parametre formu
12 parametre, 2 sütun grid'le. Her enum field segment butonlu (mevcut FreeSessionModal pattern'i). Culture'da `serbest` seçilirse altında textarea açılır. Hiç parametre zorunlu değil.

"Danışan üret" → POST `/api/danisan-aday/uret` → state='candidates'

### 6.5. Aday kartları
`src/components/casting/CandidateCard.tsx`:
- 3 kart yan yana (responsive: mobile stack)
- Her kart: title (italic), variant_label rozet, age/gender/culture chips, 1-cümle presenting özet
- Tıkla → onClick state='detail' + selectedCandidate

### 6.6. Detay modal
`src/components/casting/CandidateDetailModal.tsx`:
- role="dialog" aria-modal
- Tam profil: title, presenting, background, personality, speech_style, defense_style, insight_level, register, diagnosis_hint, difficulty, variant_label
- "Bu danışanla seansa başla" primary button → POST `/api/seans/start` `{ case_id }` → router.push `/seans/${id}`
- "Geri dön" butonu → modal kapat
- Escape kapat

### 6.7. Hata durumları (modal/form)
- `limit:sessions` veya `limit:tokens` → "Günlük limit doldu"
- `generation_failed` → "Üretemedik, tekrar dene"
- `internal` → genel hata

## 7. Geriye Uyumluluk

- Mevcut serbest seans flow (FreeSessionModal + tek aday auto-start) tamamen korunur
- Mevcut rapor reveal section ai_generated seanslar için çalışır — casting seansları için de çalışır (kullanıcı parametreleri girdi ama detay kompozisyonunu unutmuş olabilir; reveal yararlı)
- `/seans/start?case=...` GET handler aday case_id'leri için de çalışır (curated mode olarak başlatır)

## 8. RLS / Güvenlik

- `cases` tablosu mevcut RLS politikası ai_generated cases'i kullanıcı sahipliği ile zaten kısıtlıyor (Faz 1 Serbest Seans 0018 migration: "read curated active cases or own ai_generated cases")
- Casting'de üretilen 3 aday `is_active=false` `ai_generated`, sadece kendi sessions'a bağlı kullanıcıya görünür → ama BU NOKTADA henüz session yok!
- **Problem:** RLS policy `EXISTS sessions WHERE case_id AND user_id` koşulunu kontrol eder. Aday daha session açılmadan oluşturulduğu için kullanıcı kendi adayını DB'den okuyamaz!
- **Çözüm:** Casting endpoint'i `createServiceClient` ile insert eder ve **response'da** aday verisini döner (kullanıcı doğrudan DB'den okumaz). Kullanıcı bir adayı seçip `/api/seans/start` ile session açtığında RLS koşulu sağlanır. Sonraki sayfa fetch'lerinde (seans, rapor) sorun olmaz.
- Detay modal'da gösterilen veri **response'dan gelir, DB'den re-fetch edilmez**. Bu önemli.

## 9. Test Stratejisi

### Birim (Vitest)
- `validateCandidatesResponse`: 3 candidate length check; her birinin GeneratedCase + variant_label
- `generateCaseCandidates` mock mode: returns 3 candidates + token_count
- `POST /api/danisan-aday/uret`: auth/limit/success/generation_failed paths

### E2E
Mevcut tests/e2e/free-session.spec.ts dokunulmaz. Casting için yeni spec opsiyonel (test fixture maliyeti).

## 10. Maliyet

- Aday üretimi: ~2500 token / 3-aday batch
- Tek aday seçildiği için seçilmeyen 2'sinin maliyeti boşa gider (kaçınılmaz)
- Günlük token limitine dahil

## 11. Migrasyon Sırası

1. Parametre tip dosyası (`casting-types.ts`)
2. `case-candidates-generator.ts` + mock + testler
3. `/api/danisan-aday/uret` endpoint
4. `/dosya-yarat` sayfa + `CastingFlow` + `CastingForm`
5. `CandidateCard` + `CandidateDetailModal`
6. Anasayfada `CastingTrigger` kartı
7. Final verification

**DB migration GEREKMİYOR** — mevcut `cases` tablosu schema'sı yeterli, `variant_label` DB'de saklanmaz (sadece response'da var; case'i bağımsız olarak tekrar açtığımızda variant_label kaybolur — sorun değil, sadece casting flow seçim anında kullanılır).
