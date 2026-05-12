# psk — AI Danışan Klinik Beceri Alıştırma Platformu

Psikoloji öğrencileri için klinik görüşme becerisi alıştırma aracı. Öğrenci görüşmeci rolünde, AI danışan rolünde; oturum sonu AI değerlendiricisi mikrobeceri sayımı + formülasyon karşılaştırması içeren bir rapor üretir. **Gerçek psikoterapi hizmeti değildir; profesyonel süpervizyonun yerini tutmaz.**

## Stack

- Next.js 16 App Router + TypeScript + Tailwind v4
- Supabase (Postgres + Auth + RLS)
- OpenAI-uyumlu LLM API (varsayılan: Gemini 3 Flash Preview)
- Vercel deployment + Supabase Cloud

## Yerel geliştirme

```bash
cp .env.local.example .env.local
# .env.local'i doldur (aşağıdaki env değişken listesine bak)
npm install
npm run dev
```

[http://localhost:3000](http://localhost:3000)

> Windows'ta Turbopack + Tailwind v4 dev sırasında patlıyor; `dev` script'i `next dev --webpack` ile çalışıyor. Production build (`next build`) standart Turbopack ile çalışır, sorun yok.

## Test

```bash
npm test            # birim + entegrasyon (Vitest)
npm run test:e2e    # Playwright (E2E golden path)
npm run typecheck   # TypeScript
npm run build       # üretim build doğrulama
```

`tests/manual/` altında manuel AI doğrulama scriptleri (jailbreak set, real-session, role-anchor, vb.) var.

## Vercel deployment

### 1. Repo'yu Vercel'e bağla

- vercel.com → New Project → GitHub'dan `trappigs/psiko-ai` repo'sunu seç
- Framework otomatik **Next.js** algılanır
- Root directory: `./` (varsayılan), Build command: `next build` (varsayılan)
- Region `vercel.json`'dan `fra1` (Frankfurt) — Supabase ile aynı bölge

### 2. Environment Variables (production)

Vercel proje ayarları → **Environment Variables**, aşağıdakileri **ekle**:

| Key | Değer (örnek) |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://upgrwmvulasxpqznlinb.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJ...` (Supabase → Settings → API → `anon public`) |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJ...` (`service_role` — **gizli**, sadece server için) |
| `LLM_BASE_URL` | `https://generativelanguage.googleapis.com/v1beta/openai/` (Gemini için) |
| `LLM_API_KEY` | Gemini API key |
| `OPENAI_MODEL` | `gemini-3-flash-preview` |
| `OPENAI_API_KEY` | (boş bırakılabilir; yalnız fallback) |
| `MOCK_OPENAI` | `false` |
| `DAILY_SESSION_LIMIT` | `5` |
| `DAILY_TOKEN_LIMIT` | `100000` |
| `SESSION_DURATION_MINUTES` | `45` |

> **Önemli:** `DAILY_SESSION_LIMIT` ve `DAILY_TOKEN_LIMIT` yerel geliştirmede daha yüksekti (50/1M). Production'da kötüye kullanımı engellemek için 5/100k. Gerekirse sonradan ayarlanır.

> `SUPABASE_SERVICE_ROLE_KEY` ve `LLM_API_KEY` — bu iki anahtar **server-only**. `NEXT_PUBLIC_*` olanlar tarayıcıya iner, OK.

### 3. Supabase Auth — production URL'i ekle

İlk deploy sonrası `https://xxxxx.vercel.app` URL'i belli olunca:

- Supabase dashboard → Authentication → URL Configuration
- **Site URL**: `https://xxxxx.vercel.app` (custom domain varsa onu)
- **Redirect URLs** listesine ekle: `https://xxxxx.vercel.app/auth/callback`

Aksi halde signup e-mail doğrulama linki çalışmaz.

### 4. İlk deploy

- Push → Vercel otomatik build
- Build başarılı olursa preview URL gelir
- Manuel test akışı:
  1. `/login` → kayıt ol → e-mail doğrula
  2. `/` → vaka seç → briefing oku → seans başlat
  3. 3-4 mesaj at, seansı bitir
  4. Formülasyonu yaz → rapor görünür
  5. `/ilerleme`'de mikrobeceri grafiği

### 5. Custom domain (opsiyonel)

- Vercel → Settings → Domains → custom domain ekle
- Supabase'deki Site URL ve Redirect URL'i de güncelle

### 6. Production sonrası izleme

- **Supabase logs**: Auth + Postgres + RLS ihlal denemeleri
- **Vercel logs**: API route hataları, build sorunları
- **Sentry** (henüz kurulu değil — opsiyonel): `npx @sentry/wizard@latest -i nextjs`

## Doküman

- Tasarım: `docs/superpowers/specs/2026-05-09-ai-danisan-supervizyon-design.md`
- Plan: `docs/superpowers/plans/2026-05-09-ai-danisan-mvp-plan.md`
- KVKK aydınlatma metni: `docs/KVKK.md` *(taslak — yayına almadan önce hukuki gözden geçirme önerilir)*

## Veritabanı şeması

`supabase/migrations/` altında 16 SQL dosyası:

| # | Açıklama |
|---|---|
| 0001 | profiles + auth trigger |
| 0002 | cases (vaka iskeleti) |
| 0003 | sessions |
| 0004 | messages + count trigger |
| 0005 | reports |
| 0006 | usage_daily (kota) |
| 0007 | 1 seed vaka |
| 0008 | 9 vaka (kolay/orta/zor karışım) |
| 0009 | message_feedback (yanıt başına 👍/👎 + etiket) |
| 0010 | 5 ek kolay vaka |
| 0011 | cases.insight_level / defense_style / register |
| 0012 | mevcut vakaları yeni alanlarla doldur |
| 0013 | 6 derinlik vakası (somatizer, fatalist, vb.) |
| 0014 | reports.microskills (mikrobeceri sayımı) |
| 0015 | sessions.formulation (öğrenci formülasyonu) |
| 0016 | reports.formulation_comparison (karşılaştırma haritası) |

Production migration uygula:

```bash
npx supabase link --project-ref upgrwmvulasxpqznlinb
npx supabase db push
```
