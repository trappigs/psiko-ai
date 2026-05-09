# psk — AI Danışan Süpervizyon Platformu

Psikoloji öğrencileri için AI danışanla terapi pratiği uygulaması. Öğrenci danışman rolünde, AI danışan rolünde; oturum sonu AI süpervizör raporu üretilir.

## Geliştirme

```bash
cp .env.local.example .env.local
# .env.local'i doldur (Supabase, OpenAI anahtarları)
npm install
npm run dev
```

[http://localhost:3000](http://localhost:3000) adresinden erişilir.

## Test

```bash
npm test            # birim + entegrasyon (Vitest)
npm run test:e2e    # Playwright (E2E golden path)
npm run typecheck   # TypeScript type check
```

## Stack

- Next.js (App Router) + TypeScript + Tailwind
- Supabase (Postgres + Auth + RLS)
- OpenAI Chat API
- Vercel + Supabase Cloud (deployment)

## Doküman

- Tasarım: `docs/superpowers/specs/2026-05-09-ai-danisan-supervizyon-design.md`
- Plan: `docs/superpowers/plans/2026-05-09-ai-danisan-mvp-plan.md`
- KVKK aydınlatma metni: `docs/KVKK.md`
