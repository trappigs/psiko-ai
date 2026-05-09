# AI Danışan & Süpervizyon Platformu — Tasarım Dokümanı

**Tarih:** 2026-05-09
**Durum:** MVP tasarımı (onaylandı)

## 1. Amaç ve Kapsam

Psikoloji öğrencileri için bir terapi pratiği platformu. Öğrenci **danışman** rolünde, AI **danışan** rolünde olur. Oturum bittiğinde AI **süpervizör** raporu üretir.

### MVP Kapsamı (bu doküman)

- Sadece **bireysel öğrenci** modu (kurumsal/eğitmen modu v2'ye)
- Sadece **tek-seanslık** pratik (sürekli vaka takibi v2'ye)
- Sadece **text chat** (sesli/video v2+)
- Oturum sonu **AI süpervizör raporu** (anlık ipucu modu yok)
- 5-10 elden yazılmış vaka iskeleti
- Web (responsive)
- Açık kayıt + e-mail doğrulama

### Faz sonrası (v1.1+) için park edilenler

- Anlık süpervizör ipucu modu (toggle)
- Kurumsal/eğitmen modu (sınıf, atama, izleme)
- Sürekli vaka takibi (8-12 haftalık kalıcı bellek)
- Rubrik skorlama / ilerleme grafiği
- Sesli mod
- AI tabanlı vaka önerisi

## 2. Teknoloji Yığını

| Katman | Seçim | Neden |
|---|---|---|
| Frontend | Next.js (App Router) + TypeScript | Tek kod tabanı, server actions ile API yönetimi |
| Veritabanı + Auth | Supabase (Postgres + Auth + RLS) | Auth + DB + politika tek pakette |
| LLM | OpenAI GPT (gpt-4o veya gpt-5) | Türkçe yetkin, prompt caching, role-play uyumlu |
| Hosting | Vercel + Supabase Cloud | Free tier başlangıç, otomatik preview deploy |
| Test | Vitest + Playwright | Birim + entegrasyon + az sayıda E2E |
| İzleme | Sentry (free tier) + Supabase logs | Server hataları + RLS ihlal denemeleri |

## 3. Mimari

### 3.1. Katmanlar

```
┌─────────────────────────────────────────────────────────────┐
│                      Tarayıcı (Next.js)                      │
│   • Kayıt/Giriş   • Vaka seçimi   • Seans chat    • Rapor   │
└────────────────┬────────────────────────────────┬───────────┘
                 │                                │
        Supabase Auth/JS                Server Actions / API Routes
                 │                                │
┌────────────────▼─────────────┐  ┌───────────────▼───────────────┐
│     Supabase Postgres        │  │      Next.js Server Layer      │
│   • profiles                  │  │   • Vaka prompt builder        │
│   • cases                     │  │   • OpenAI istemcisi           │
│   • sessions                  │  │   • Süpervizör rapor servisi   │
│   • messages                  │  │   • Rate limiting              │
│   • reports                   │  └────────────────┬───────────────┘
│   • usage_daily               │                   │
│   + RLS politikaları          │                   │
└──────────────────────────────┘                    │
                                       ┌────────────▼──────────┐
                                       │   OpenAI Chat API     │
                                       └───────────────────────┘
```

### 3.2. Sorumluluklar

- **Frontend (Next.js App Router):** Sayfa render, server action çağrıları. Supabase JS client ile doğrudan auth + okuma. Yazma işlemleri (özellikle LLM içerikleri) yalnız server üzerinden.
- **Server (Next.js Server Actions / Route Handlers):** OpenAI çağrılarının yapıldığı tek nokta. API anahtarı asla tarayıcıya inmez. Prompt inşa, mesaj sıralama, rate limit, rapor üretimi burada.
- **Veri (Supabase):** Postgres + Auth + Row Level Security. Öğrenci sadece kendi seans/raporlarını görür; vakalar herkese okunur; mesajlar yalnız sahibine.

## 4. Veri Modeli

```sql
-- Profil (auth.users'ı genişletir)
profiles (
  id              uuid PK REFERENCES auth.users(id),
  display_name    text,
  created_at      timestamptz DEFAULT now()
)

-- Vaka iskeleti (admin migration ile yüklenir)
cases (
  id              uuid PK,
  title           text,           -- "Sınav kaygısı, üniversite 3. sınıf"
  presenting      text,           -- sunulan sorun
  diagnosis_hint  text,           -- "YAB çağrışımı"
  background      text,           -- aile, geçmiş
  personality     text,           -- "İçedönük, savunmacı"
  speech_style    text,           -- "Kısa cümleler, 'şey' diye duraksar"
  goals_hidden    text,           -- öğrencinin keşfetmesi gereken
  difficulty      text CHECK (difficulty IN ('easy','medium','hard')),
  is_active       boolean DEFAULT true,
  created_at      timestamptz DEFAULT now()
)

-- Bir öğrenci-vaka oturumu
sessions (
  id              uuid PK,
  user_id         uuid FK REFERENCES profiles(id),
  case_id         uuid FK REFERENCES cases(id),
  status          text CHECK (status IN ('in_progress','completed','abandoned')),
  started_at      timestamptz DEFAULT now(),
  ended_at        timestamptz,
  message_count   int DEFAULT 0
)

-- Tek tek mesajlar (transcript)
messages (
  id              uuid PK,
  session_id      uuid FK REFERENCES sessions(id) ON DELETE CASCADE,
  role            text CHECK (role IN ('student','client')),
  content         text,
  created_at      timestamptz DEFAULT now(),
  token_count     int
)

-- Süpervizör raporu (oturum başına bir kez)
reports (
  id              uuid PK,
  session_id      uuid FK REFERENCES sessions(id) ON DELETE CASCADE UNIQUE,
  summary         text,
  strengths       jsonb,          -- ["...", "..."]
  improvements    jsonb,
  missed_signals  jsonb,
  next_steps      text,
  generated_at    timestamptz DEFAULT now(),
  model_version   text
)

-- Kullanım/limit takibi
usage_daily (
  user_id         uuid FK REFERENCES profiles(id),
  day             date,
  session_count   int DEFAULT 0,
  token_count     int DEFAULT 0,
  PRIMARY KEY (user_id, day)
)
```

### 4.1. RLS Politikaları (özet)

- `profiles`, `sessions`, `messages` (üzerinden join), `reports` (session üzerinden), `usage_daily` → sadece `auth.uid() = user_id`
- `cases` → kimliği doğrulanmış herkes SELECT, kimse INSERT/UPDATE/DELETE edemez (admin migration ile yüklenir)

## 5. AI Prompt Mimarisi

### 5.1. Danışan rolü (her öğrenci mesajında çağrılır)

**System prompt iskeleti:**

```
Sen bir psikoterapi seansında "danışan" rolünü oynuyorsun. Bir psikoloji öğrencisi
seni terapist olarak görüyor. Aşağıdaki KARAKTER PROFİLİNE sadık kal.

═══════════ KARAKTER PROFİLİ ═══════════
Sunulan sorun: {case.presenting}
Geçmiş/aile: {case.background}
Kişilik: {case.personality}
Konuşma stili: {case.speech_style}
Gizli hedefler (sen biliyorsun, terapist keşfetmeli): {case.goals_hidden}
══════════════════════════════════════

DAVRANIŞ KURALLARI:
1. ASLA terapist gibi davranma. Sen DANIŞANSIN.
2. Konuşma stiline sadık kal: {case.speech_style}
3. Direnç göster, hemen açılma.
4. "Gizli hedefler"i kendi başına ifşa etme — terapist iyi soru sorarsa bahset.
5. Yanıtların 1-4 cümle. Bazen tek kelime. Asla terapötik dil kullanma.
6. Kriz/intihar belirtileri rolü canlandırma; sadece üzgünlük/kaygı/sıkıntı seviyesinde kal.

GÜVENLİK ANAHTARLARI:
- "[ROLE_RESET]" görürsen rolü bırak.
- Yapay zeka olduğun sorulursa: rolü inkar etmeden dolaylı yanıt ver
  ("Buraya seninle konuşmaya geldim, bu beni rahatsız etti, devam edebilir miyiz?").
```

**Mesaj dizilimi:** `[system] [user] [assistant] [user] ...` — student mesajları `user` rolünde, client yanıtları `assistant` rolünde.

**Stream:** OpenAI streaming kullanılır; UI'da harf harf yazılır.

**Prompt caching:** Sistem promptu sabit ve uzun; OpenAI cache'i ile her turda yeniden ücretlendirilmez.

### 5.2. Süpervizör rolü (oturum sonu, bir kez)

**System prompt:**

```
Sen psikoterapi süpervizörüsün. Aşağıdaki vaka için bir öğrencinin yaptığı seansı
değerlendireceksin. Hem cesaretlendirici hem dürüst ol.

VAKA ÖZETİ: {case özet}
TRANSKRİPT: aşağıdaki diyalog (S = öğrenci, D = danışan)

GÖREV: Aşağıdaki JSON formatında yanıt ver:
{
  "summary": "...2-3 cümle...",
  "strengths": ["...", "..."],
  "improvements": ["...", "..."],
  "missed_signals": ["..."],
  "next_steps": "..."
}

KILAVUZ:
- Spesifik ol. "Daha iyi dinle" yerine "8. mesajda danışan annesinden bahsederken
  konuyu hızla değiştirdin."
- Türk Psikolojik Danışma Derneği etik ilkelerine uyumlu kal.
- Patolojize etme, öğrenciyi yargılamadan yapıcı eleştir.
```

**Çıktı doğrulama:** JSON schema ile parse. Başarısız olursa 1 retry, sonra `pending` olarak işaretlenir, kullanıcıya "Tekrar üret" butonu gösterilir.

### 5.3. Maliyet & Limit

- Tipik seans: ~30 mesaj × ~150 token + sistem prompt ≈ **15-25k token / seans**
- Rapor: ~5-10k token tek seferlik
- **Kullanıcı başına günlük 5 seans / 100k token** sınırı (`usage_daily` ile server tarafında)

## 6. Oturum Yaşam Döngüsü

### 6.1. Süre sınırı

- **Varsayılan 45 dk** seans süresi
- Server `started_at`'tan hesaplar
- 45 dk dolduğunda yeni mesaj 4xx döner; UI input'u disable eder, "Seansı bitir ve rapor al" zorunlu olur
- Süre dolmadan da öğrenci her an seansı bitirebilir

### 6.2. Durum geçişleri

```
in_progress ──[öğrenci bitirir / süre dolar]──> completed ──> rapor üretilir
in_progress ──[24 saat aktivite yok]──────────> abandoned (cron yok, lazy işaretleme)
```

`abandoned` MVP'de aktif olarak işaretlenmez; sonraki sürümde scheduled job ile.

## 7. Kullanıcı Akışları & UX

### Ekran 1 — Kayıt / Giriş
- Supabase Auth: e-mail + şifre, e-mail doğrulama, "şifremi unuttum"
- İlk girişte profil tamamlama: `display_name`

### Ekran 2 — Vaka kütüphanesi (ana sayfa)
- Vakalar kart ızgarası: başlık, kısa özet, zorluk etiketi
- Yarım kalmış seans varsa üstte "Devam et / Vazgeç" uyarısı

### Ekran 3 — Seans (chat)
```
┌────────────────────────────────────────────────────────────┐
│  ← Vakalara dön    [Vaka başlığı]      ⏱ 38:14 kaldı     │
├────────────────────────────────────────────────────────────┤
│   D: Merhaba… (yorgun ses)                                  │
│                          S: Hoşgeldin, oturalım. Nasılsın? │
│   D: Şey, bilmiyorum. Sanırım kötü.                        │
├────────────────────────────────────────────────────────────┤
│  [        mesajını yaz...                ]    [ Gönder ]   │
│             [ Seansı bitir ve rapor al ]                    │
└────────────────────────────────────────────────────────────┘
```

- D = sol (danışan), S = sağ (öğrenci)
- Üstte kalan süre, biter input disable + flash uyarı
- Streaming yanıt + typing indicator
- Bağlantı koparsa son mesaj `localStorage`'da, yeniden bağlanınca senkron

### Ekran 4 — Rapor üretimi (loading)
- "Süpervizör seansını inceliyor…" 5-10 sn animasyon
- Hata: "Tekrar dene" butonu (idempotent — her zaman aynı session_id için tek rapor)

### Ekran 5 — Rapor görüntüleme
- Özet, güçlü yanlar (✅), geliştirilebilir alanlar (⚠️), kaçırılan işaretler (🔍), sonraki adımlar (📋)
- Transkript akordeon olarak en altta
- "Yeni seans başlat" CTA

### Ekran 6 — Geçmiş seanslar
- Tablo: Tarih, Vaka, Süre, "Raporu gör"
- Vakaya göre filtre

### UX detayları
- Türkçe varsayılan; string'ler `messages.tr.json` benzeri tek dosyada (i18n hazır)
- Erişilebilirlik: klavye gezinme, semantic HTML, WCAG AA kontrast
- Mobil: chat ekranı tek elle kullanılabilir, vaka kartları tek sütun

## 8. Hata Yönetimi & Güvenlik

### 8.1. LLM çağrı hataları

| Senaryo | Davranış |
|---|---|
| OpenAI 5xx / timeout | 1 retry (üstel geri çekilme), sonra UI: "Yanıt alınamadı, tekrar dene". Mesaj `messages` tablosuna yazılmaz |
| Rate limit | "Şu an yoğunluk var" mesajı; sıraya alma yok |
| Content filter | "Bu mesaj sistem kurallarına uymadı, yeniden ifade et" |
| Rapor JSON parse hatası | 1 retry; hâlâ başarısızsa `pending`, "Tekrar üret" butonu |

### 8.2. Kötüye kullanım koruması

- Server tarafında her OpenAI çağrısından önce `usage_daily` kontrolü
- 5 seans/gün ve 100k token/gün sınırları
- Limit aşımında: "Bugün için kotanı doldurdun, yarın tekrar dene"

### 8.3. AI rol güvenliği

- Sistem promptu içinde rol kuralları + güvenlik anahtarları
- **Kriz içerikleri:** AI danışan profilinde intihar/kendine zarar canlandırılmaz; öğrenci o yöne giderse savunma içine çekilir
- **Tehlikeli yönlendirme:** Gerçek tıbbi tavsiye/ilaç istemine "Bu seansta ben danışanım" şeklinde rol hatırlatma
- **Jailbreak:** Sistem prompt sızdırma istekleri reddedilir, danışan modunda kalınır

### 8.4. Etik & yasal sınır mesajları

İlk girişte ve seans başlangıcında dismissible olmayan banner:

> ⚠️ Bu uygulama yalnızca **eğitim ve pratik** amaçlıdır. AI danışan gerçek bir kişi değildir. Burada üretilenler **gerçek terapi pratiği yerine geçmez**, etik denetimden geçmez. Profesyonel süpervizyonun yerini tutmaz.

Her rapor altında küçük disclaimer.

### 8.5. KVKK / Veri Gizliliği

- Supabase at-rest encryption yeterli kabul edilir; alan-bazlı şifreleme MVP'de yok
- **Hesap silme** opsiyonu zorunlu: server action ilgili tüm satırları + `auth.user`'ı siler
- Aydınlatma metni / KVKK politika sayfası ilk sürüme dahil
- Kayıt sırasında "verilerin OpenAI altyapısında işlenir" onayı (checkbox)

### 8.6. Loglama

- Sentry — server hataları
- Supabase logs — RLS ihlal denemeleri
- **Mesaj içeriği asla log'a yazılmaz**; sadece session_id, user_id, hata kodu

## 9. Test Stratejisi

### 9.1. Deterministik (CI'da koşar)

- **Birim (Vitest):** Vaka prompt builder, JSON parser, rate-limit hesabı, RLS yardımcıları
- **Entegrasyon (Vitest + Supabase test instance):** Server action'lar, RLS politikaları, usage sayacı
- **E2E (Playwright, az sayıda):** Kayıt → vaka seç → kısa seans → rapor al
- LLM çağrıları için `MOCK_OPENAI=true` modu — sabit yanıt, deterministik CI

### 9.2. AI davranış değerlendirme (CI dışı)

- **Karakterde-kalma test seti:** 10-15 jailbreak denemesi, her release öncesi manuel
- **Vaka kalitesi:** Her yeni vaka için 3-5 örnek seans manuel oynanır
- **Rapor kalitesi:** "İdeal seans" ve "kötü seans" örneklerine raporun tonu manuel değerlendirilir
- `tests/ai-eval/` altında transkript dosyaları + beklenen davranış notları

### 9.3. Kapsam dışı

- OpenAI'nin gerçek davranışı CI'da test edilmez
- Tarayıcı çapraz uyumluluğu MVP'de minimum (modern Chrome/Safari/Firefox yeter)

## 10. Deployment

- **Vercel** — Next.js production + her PR için preview URL
- **Supabase Cloud** — free tier başlar, gerekirse Pro plan
- Env değişkenleri:
  - Server-only: `OPENAI_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
  - Client'a inen: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Migration'lar: `supabase/migrations/` SQL dosyaları, manuel `supabase db push` ile prod'a uygulanır
- `main` → otomatik production deploy

## 11. Yol Haritası — Faz Faz MVP

| Faz | Kapsam | Süre |
|---|---|---|
| 1. İskelet | Next.js + Supabase bağlama, auth, DB şeması, vaka listesi okuma | 3-4 gün |
| 2. Çekirdek seans | Mesaj gönderme, OpenAI streaming, transkript kaydı, süre sayacı, rate limit | 4-5 gün |
| 3. Süpervizör raporu | Oturum sonu rapor üretimi, JSON parse, görüntüleme ekranı | 2-3 gün |
| 4. Cila | Geçmiş seanslar, hata durumları, KVKK metni, hesap silme, mobil ince ayar, 5-10 vaka yükleme, AI manuel testleri | 3-4 gün |

**Toplam tahmin: 12-16 iş günü (~2.5-3 hafta)**

## 12. Açık Sorular

- KVKK/Aydınlatma metninin son hâli proje sahibi (kullanıcı) tarafından gözden geçirilecek
- 5-10 başlangıç vakasının içeriği proje sahibi tarafından yazılacak — vaka şablonu (alanlar) bu spec'te tanımlı
- Domain/marka adı henüz belirlenmedi (deploy öncesi karar)
