# Serbest Seans (AI-Üretilen Vaka) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Kullanıcının önceden hazırlanmış vaka kütüphanesinden seçim yapmadan, AI'ın anlık ürettiği gizli bir danışanla seans başlatabilmesi; vaka dosyasının seans bittikten sonra raporla birlikte açıklanması.

**Architecture:** `cases` tablosuna `source` kolonu eklenir. Yeni `case-generator` servisi OpenAI'dan schema-locked JSON ile vaka üretir ve `cases`'e `source='ai_generated'` yazar; sonrasında mevcut `sessions`/`messages`/`reports` akışı değişmeden çalışır. Anasayfa kartı + modal + rapor reveal bölümü UI tarafını tamamlar.

**Tech Stack:** Next.js 16 (App Router), TypeScript, Supabase (Postgres), OpenAI SDK (`openai@6`), Vitest, Playwright, Tailwind.

**Spec:** `docs/superpowers/specs/2026-05-11-serbest-seans-design.md`

---

## File Structure

**Yeni:**
- `supabase/migrations/0017_case_source.sql` — `cases.source` kolonu + index
- `src/lib/openai/case-generator.ts` — `generateCase()` servisi + validator
- `src/components/case/FreeSessionModal.tsx` — pre-flight modal
- `tests/unit/case-generator.test.ts`
- `tests/unit/session-actions.test.ts` (yoksa) — `startSession` free mod testleri

**Değişen:**
- `src/lib/types.ts` — `cases.source` alanı (üretilen tip)
- `src/lib/openai/mock.ts` — `mockGeneratedCase()` ekle
- `src/lib/session-actions.ts` — `startSession` iki modlu imza
- `src/app/api/seans/start/route.ts` — yeni body şekli kabulü
- `src/app/page.tsx` — kütüphane filtresi + serbest seans kartı mount
- `src/app/seans/[id]/page.tsx` — `case.source` fetch + `ChatWindow`'a `freeMode` prop
- `src/components/chat/ChatWindow.tsx` — `freeMode` ile drawer gizleme + rozet
- `src/app/rapor/[sessionId]/page.tsx` — AI-üretilen vakanın tüm alanlarını fetch et + `ReportView`'e geçir
- `src/components/report/ReportView.tsx` — `hiddenDossier` propu + reveal bölümü
- `src/app/vaka/[id]/page.tsx` — `source='ai_generated'` ise 404

---

## Task 1: DB Migration — `cases.source`

**Files:**
- Create: `supabase/migrations/0017_case_source.sql`

- [ ] **Step 1: Migration dosyasını yaz**

```sql
-- supabase/migrations/0017_case_source.sql
-- 'curated': elden yazılmış vakalar (kütüphanede görünür)
-- 'ai_generated': serbest seans için AI tarafından anlık üretilen, kütüphanede gizli
ALTER TABLE public.cases
  ADD COLUMN source text NOT NULL DEFAULT 'curated'
  CHECK (source IN ('curated', 'ai_generated'));

CREATE INDEX cases_source_active_idx
  ON public.cases (source, is_active);

COMMENT ON COLUMN public.cases.source IS
  'curated = elden yazılmış kütüphane vakası; ai_generated = serbest seans için anlık üretilen, listede görünmez';
```

- [ ] **Step 2: Local Supabase'e uygula**

Run: `npx supabase db reset` (veya tek migrasyon uygulayacaksan: `npx supabase db push`)
Expected: Migration başarıyla uygulanır, hata yok.

- [ ] **Step 3: Tipleri yeniden üret**

Run: `npm run db:types`
Expected: `src/lib/types.ts` içinde `cases.Row` ve `cases.Insert` tipine `source: string` (veya `string | null`, default'lı için optional) eklenir.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/0017_case_source.sql src/lib/types.ts
git commit -m "feat(db): add cases.source column (curated|ai_generated)"
```

---

## Task 2: Mock Generator (test/dev için)

**Files:**
- Modify: `src/lib/openai/mock.ts`

- [ ] **Step 1: Test yaz**

Create `tests/unit/case-generator-mock.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { mockGeneratedCase } from '@/lib/openai/mock';

describe('mockGeneratedCase', () => {
  it('returns all required fields for easy difficulty', () => {
    const r = mockGeneratedCase({ difficulty: 'easy' });
    expect(r.case.difficulty).toBe('easy');
    for (const f of [
      'title','presenting','background','personality','speech_style',
      'goals_hidden','insight_level','defense_style','register',
    ] as const) {
      expect(typeof r.case[f]).toBe('string');
      expect(r.case[f].length).toBeGreaterThan(0);
    }
    expect(typeof r.token_count).toBe('number');
  });
  it('threads themeHint into presenting or background', () => {
    const r = mockGeneratedCase({ difficulty: 'medium', themeHint: 'kayıp yası' });
    const blob = (r.case.presenting + ' ' + r.case.background).toLowerCase();
    expect(blob).toContain('kayıp');
  });
});
```

- [ ] **Step 2: Testi koştur, fail bekle**

Run: `npm test -- case-generator-mock`
Expected: FAIL — `mockGeneratedCase` exported değil.

- [ ] **Step 3: `mock.ts`'e implementasyon ekle**

`src/lib/openai/mock.ts` dosyasının sonuna ekle:

```ts
export type MockGenInput = {
  difficulty: 'easy' | 'medium' | 'hard';
  themeHint?: string;
};

export function mockGeneratedCase(input: MockGenInput) {
  const theme = (input.themeHint ?? '').trim();
  const presenting = theme
    ? `Son zamanlarda ${theme} ile ilgili kendini kötü hissediyor, ne yapacağını bilmiyor.`
    : 'Açıklamakta zorlandığı, sürekli yorgunluk ve içine kapanma hâli var.';
  const background = theme
    ? `Yaklaşık altı aydır ${theme} etrafında dönen olaylar yaşadı; aile ve arkadaş çevresinden uzaklaştı.`
    : '24 yaşında, üniversite son sınıf. Anne baba ayrı yaşıyor; tek başına bir öğrenci evinde kalıyor.';
  return {
    case: {
      title: theme ? `${theme[0].toUpperCase() + theme.slice(1)} ile bir seans` : 'Adsız bir öğrenci',
      presenting,
      background,
      personality: 'Düşünmeden konuşmaz; gözlerini kaçırarak yanıt verir.',
      speech_style: 'Kısa cümleler, yer yer sessizlik.',
      goals_hidden: 'Aslında kendisiyle değil, en yakın arkadaşıyla olan kopukluğu yüzünden burada.',
      insight_level: input.difficulty === 'hard' ? 'low' : 'moderate',
      defense_style: input.difficulty === 'hard' ? 'rasyonalizasyon' : 'kaçınma',
      register: 'gündelik',
      diagnosis_hint: null,
      difficulty: input.difficulty,
    },
    token_count: 750,
  };
}
```

- [ ] **Step 4: Test yeşil**

Run: `npm test -- case-generator-mock`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/openai/mock.ts tests/unit/case-generator-mock.test.ts
git commit -m "feat(openai): add mockGeneratedCase for free-session dev/test"
```

---

## Task 3: Case Generator (gerçek OpenAI çağrısı + validator)

**Files:**
- Create: `src/lib/openai/case-generator.ts`
- Create: `tests/unit/case-generator.test.ts`

- [ ] **Step 1: Sözleşme + validator testlerini yaz**

```ts
// tests/unit/case-generator.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { validateGeneratedCase, generateCase } from '@/lib/openai/case-generator';

describe('validateGeneratedCase', () => {
  const valid = {
    title: 'T', presenting: 'P', background: 'B', personality: 'X',
    speech_style: 'S', goals_hidden: 'G', insight_level: 'moderate',
    defense_style: 'kaçınma', register: 'gündelik', diagnosis_hint: null,
    difficulty: 'medium',
  };
  it('accepts a complete object', () => {
    expect(validateGeneratedCase(valid)).toEqual(valid);
  });
  it('rejects missing required string', () => {
    const bad = { ...valid, title: '' };
    expect(() => validateGeneratedCase(bad)).toThrow();
  });
  it('rejects invalid difficulty', () => {
    const bad = { ...valid, difficulty: 'extreme' };
    expect(() => validateGeneratedCase(bad)).toThrow();
  });
  it('allows null diagnosis_hint', () => {
    expect(validateGeneratedCase({ ...valid, diagnosis_hint: null }).diagnosis_hint).toBeNull();
  });
});

describe('generateCase (mock mode)', () => {
  beforeEach(() => { vi.stubEnv('MOCK_OPENAI', 'true'); });
  it('returns a result with case + token_count when MOCK_OPENAI=true', async () => {
    const r = await generateCase({ difficulty: 'easy' });
    expect(r.case.difficulty).toBe('easy');
    expect(r.token_count).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Testi koştur, fail bekle**

Run: `npm test -- case-generator.test`
Expected: FAIL — modül yok.

- [ ] **Step 3: Generator'ı yaz**

```ts
// src/lib/openai/case-generator.ts
import { getOpenAI, MODEL, isMockMode } from './client';
import { mockGeneratedCase } from './mock';

export type Difficulty = 'easy' | 'medium' | 'hard';

export type GenerateCaseInput = {
  difficulty: Difficulty;
  themeHint?: string;
};

export type GeneratedCase = {
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
  difficulty: Difficulty;
};

export type GenerateCaseResult = {
  case: GeneratedCase;
  token_count: number;
};

const REQUIRED_STR = [
  'title','presenting','background','personality','speech_style',
  'goals_hidden','insight_level','defense_style','register',
] as const;

export function validateGeneratedCase(raw: unknown): GeneratedCase {
  if (!raw || typeof raw !== 'object') throw new Error('not_object');
  const r = raw as Record<string, unknown>;
  for (const k of REQUIRED_STR) {
    if (typeof r[k] !== 'string' || (r[k] as string).trim().length === 0) {
      throw new Error(`invalid_field:${k}`);
    }
  }
  const diff = r.difficulty;
  if (diff !== 'easy' && diff !== 'medium' && diff !== 'hard') {
    throw new Error('invalid_difficulty');
  }
  const dx = r.diagnosis_hint;
  const diagnosis_hint = typeof dx === 'string' && dx.trim().length > 0 ? dx : null;
  return {
    title: (r.title as string).trim().slice(0, 120),
    presenting: (r.presenting as string).trim().slice(0, 600),
    background: (r.background as string).trim().slice(0, 1200),
    personality: (r.personality as string).trim().slice(0, 400),
    speech_style: (r.speech_style as string).trim().slice(0, 300),
    goals_hidden: (r.goals_hidden as string).trim().slice(0, 600),
    insight_level: (r.insight_level as string).trim().slice(0, 60),
    defense_style: (r.defense_style as string).trim().slice(0, 120),
    register: (r.register as string).trim().slice(0, 60),
    diagnosis_hint,
    difficulty: diff,
  };
}

function buildPrompt(input: GenerateCaseInput): string {
  const hint = input.themeHint?.trim();
  return [
    `Psikoterapi eğitim aracı için kurmaca bir Türk danışan profili üret.`,
    `Zorluk: ${input.difficulty} (easy=daha açık ve işbirlikçi, hard=daha kapalı/savunmacı).`,
    hint ? `İpucu/tema (zayıf yönlendirme, taklit etme): "${hint}"` : `Tema serbest — kaygı klişesine takılma, çeşitlilik göster (kayıp, ilişki, kimlik, iş, aile, beden, yas, göç, vb. uzaydan seç).`,
    `Türkçe yaygın ama özgün bir ad/lakap kullan; gerçek bir kamuya mâl olmuş kişi olmasın.`,
    `goals_hidden alanında aktif intihar planı YAZMA; üzgünlük/işlevsizlik düzeyinde kal.`,
    `Sadece şu schema'ya birebir uyan tek bir JSON nesnesi döndür, başka hiçbir metin yazma:`,
    `{`,
    `  "title": string,                  // 4-10 kelime, danışanı tanımlayan bir başlık`,
    `  "presenting": string,             // 1-3 cümle, "neden geldim" duyumu`,
    `  "background": string,             // 2-4 cümle, geçmiş + aile + bağlam`,
    `  "personality": string,            // 1-2 cümle, mizaç`,
    `  "speech_style": string,           // 1 cümle, nasıl konuşur`,
    `  "goals_hidden": string,           // 1-2 cümle, terapistin keşfetmesi gereken esas mesele`,
    `  "insight_level": "low"|"moderate"|"high",`,
    `  "defense_style": string,          // 1-3 kelime (kaçınma, rasyonalizasyon, vb.)`,
    `  "register": "gündelik"|"resmi"|"sokak"|"argo-az",`,
    `  "diagnosis_hint": string | null,  // klinik çağrışım (opsiyonel)`,
    `  "difficulty": "${input.difficulty}"`,
    `}`,
  ].join('\n');
}

async function callOnce(input: GenerateCaseInput): Promise<{ raw: unknown; tokens: number }> {
  const openai = getOpenAI();
  const resp = await openai.chat.completions.create({
    model: MODEL,
    temperature: 0.9,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: 'Sen psikoterapi eğitim aracı için gerçekçi, klinik açıdan tutarlı kurmaca danışan personaları üretirsin. Çıktın yalnız geçerli JSON olur.' },
      { role: 'user', content: buildPrompt(input) },
    ],
  });
  const content = resp.choices[0]?.message?.content ?? '{}';
  const tokens = resp.usage?.total_tokens ?? 0;
  let raw: unknown;
  try {
    raw = JSON.parse(content);
  } catch {
    throw new Error('invalid_json');
  }
  return { raw, tokens };
}

export async function generateCase(input: GenerateCaseInput): Promise<GenerateCaseResult> {
  if (isMockMode()) {
    return mockGeneratedCase(input);
  }
  let lastErr: unknown;
  let totalTokens = 0;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const { raw, tokens } = await callOnce(input);
      totalTokens += tokens;
      const validated = validateGeneratedCase(raw);
      return { case: validated, token_count: totalTokens };
    } catch (e) {
      lastErr = e;
    }
  }
  throw new Error(`generation_failed:${(lastErr as Error)?.message ?? 'unknown'}`);
}
```

- [ ] **Step 4: Test yeşil**

Run: `npm test -- case-generator.test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/openai/case-generator.ts tests/unit/case-generator.test.ts
git commit -m "feat(openai): add generateCase service with schema validation + retry"
```

---

## Task 4: `startSession` İki-Modlu Yap

**Files:**
- Modify: `src/lib/session-actions.ts`
- Create: `tests/unit/session-actions.test.ts`

- [ ] **Step 1: Yeni imza için testleri yaz**

```ts
// tests/unit/session-actions.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/supabase/service', () => {
  const usage = { session_count: 0, token_count: 0 };
  const usageDailyMaybeSingle = vi.fn(async () => ({ data: usage, error: null }));
  const usageDailyUpsert = vi.fn(async () => ({ error: null }));
  const casesInsertReturn = { id: 'generated-case-id' };
  const casesInsert = vi.fn(() => ({ select: () => ({ single: async () => ({ data: casesInsertReturn, error: null }) }) }));
  const sessionsInsert = vi.fn(() => ({ select: () => ({ single: async () => ({ data: { id: 'session-id' }, error: null }) }) }));

  return {
    createServiceClient: () => ({
      from: (table: string) => {
        if (table === 'usage_daily') {
          return {
            select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: usageDailyMaybeSingle }) }) }),
            upsert: usageDailyUpsert,
          };
        }
        if (table === 'cases') return { insert: casesInsert };
        if (table === 'sessions') return { insert: sessionsInsert };
        throw new Error('unknown table: ' + table);
      },
    }),
    __mocks: { casesInsert, sessionsInsert, usageDailyUpsert },
  };
});

vi.mock('@/lib/openai/case-generator', () => ({
  generateCase: vi.fn(async () => ({
    case: {
      title: 'Mock', presenting: 'p', background: 'b', personality: 'x',
      speech_style: 's', goals_hidden: 'g', insight_level: 'moderate',
      defense_style: 'kaçınma', register: 'gündelik',
      diagnosis_hint: null, difficulty: 'easy',
    },
    token_count: 800,
  })),
}));

import { startSession } from '@/lib/session-actions';

describe('startSession', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('curated mode inserts session with given caseId', async () => {
    const r = await startSession('user-1', { mode: 'curated', caseId: 'case-X' });
    expect(r.session_id).toBe('session-id');
  });

  it('free mode generates a case, inserts it, then opens session', async () => {
    const r = await startSession('user-1', { mode: 'free', difficulty: 'easy' });
    expect(r.session_id).toBe('session-id');
    const { generateCase } = await import('@/lib/openai/case-generator');
    expect(generateCase).toHaveBeenCalledWith({ difficulty: 'easy', themeHint: undefined });
  });

  it('free mode throws if generation fails (no session created)', async () => {
    const { generateCase } = await import('@/lib/openai/case-generator');
    (generateCase as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('generation_failed:x'));
    await expect(startSession('user-1', { mode: 'free', difficulty: 'medium' })).rejects.toThrow(/generation_failed/);
  });
});
```

- [ ] **Step 2: Testi koştur, fail bekle**

Run: `npm test -- session-actions`
Expected: FAIL — yeni imza yok.

- [ ] **Step 3: `session-actions.ts`'i güncelle**

```ts
// src/lib/session-actions.ts
import { createServiceClient } from '@/lib/supabase/service';
import { defaultLimits, isOverDailyLimit } from '@/lib/usage';
import { generateCase, type Difficulty } from '@/lib/openai/case-generator';

export type StartSessionInput =
  | { mode: 'curated'; caseId: string }
  | { mode: 'free'; difficulty: Difficulty; themeHint?: string };

export async function startSession(userId: string, input: StartSessionInput) {
  const sb = createServiceClient();
  const today = new Date().toISOString().split('T')[0];

  const { data: usage } = await sb
    .from('usage_daily')
    .select('session_count, token_count')
    .eq('user_id', userId)
    .eq('day', today)
    .maybeSingle();

  const limit = isOverDailyLimit(usage, defaultLimits());
  if (limit) throw new Error(`limit:${limit.reason}`);

  let caseId: string;
  let generationTokens = 0;

  if (input.mode === 'free') {
    const result = await generateCase({
      difficulty: input.difficulty,
      themeHint: input.themeHint,
    });
    generationTokens = result.token_count;
    const { data: caseRow, error: caseErr } = await sb
      .from('cases')
      .insert({
        title: result.case.title,
        presenting: result.case.presenting,
        background: result.case.background,
        personality: result.case.personality,
        speech_style: result.case.speech_style,
        goals_hidden: result.case.goals_hidden,
        insight_level: result.case.insight_level,
        defense_style: result.case.defense_style,
        register: result.case.register,
        diagnosis_hint: result.case.diagnosis_hint,
        difficulty: result.case.difficulty,
        source: 'ai_generated',
        is_active: false,
      })
      .select('id')
      .single();
    if (caseErr || !caseRow) throw caseErr ?? new Error('case_insert_failed');
    caseId = caseRow.id;
  } else {
    caseId = input.caseId;
  }

  const { data: session, error } = await sb
    .from('sessions')
    .insert({ user_id: userId, case_id: caseId, status: 'in_progress' })
    .select('id')
    .single();
  if (error) throw error;

  await sb.from('usage_daily').upsert(
    {
      user_id: userId,
      day: today,
      session_count: (usage?.session_count ?? 0) + 1,
      token_count: (usage?.token_count ?? 0) + generationTokens,
    },
    { onConflict: 'user_id,day' }
  );

  return { session_id: session.id };
}
```

- [ ] **Step 4: Test yeşil**

Run: `npm test -- session-actions`
Expected: PASS (3 testin tümü).

- [ ] **Step 5: Mevcut session.test/lib regresyonunu doğrula**

Run: `npm test`
Expected: Tüm testler PASS (geçmişteki çağıranlar Task 5'te güncellenecek; bu adımda type-error olabilir — `startSession(user.id, caseId)` çağrısı route.ts içinde). Bu noktada type hatası beklenir; bir sonraki task'ta çözülür.

- [ ] **Step 6: Commit**

```bash
git add src/lib/session-actions.ts tests/unit/session-actions.test.ts
git commit -m "feat(session): startSession accepts curated or free mode"
```

---

## Task 5: API Route — Yeni Body Şeklini Kabul Et

**Files:**
- Modify: `src/app/api/seans/start/route.ts`

- [ ] **Step 1: Route'u güncelle**

```ts
// src/app/api/seans/start/route.ts
import { createClient } from '@/lib/supabase/server';
import { startSession, type StartSessionInput } from '@/lib/session-actions';
import { NextResponse } from 'next/server';

function parseBody(body: unknown): StartSessionInput | { error: string } {
  if (!body || typeof body !== 'object') return { error: 'bad_body' };
  const b = body as Record<string, unknown>;

  if (typeof b.case_id === 'string' && b.case_id.length > 0) {
    return { mode: 'curated', caseId: b.case_id };
  }

  if (b.mode === 'free') {
    const d = b.difficulty;
    if (d !== 'easy' && d !== 'medium' && d !== 'hard') return { error: 'bad_difficulty' };
    const hint = typeof b.themeHint === 'string' ? b.themeHint.trim().slice(0, 120) : undefined;
    return { mode: 'free', difficulty: d, themeHint: hint && hint.length > 0 ? hint : undefined };
  }

  return { error: 'bad_body' };
}

export async function POST(request: Request) {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const parsed = parseBody(body);
  if ('error' in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });

  try {
    const r = await startSession(user.id, parsed);
    return NextResponse.json(r);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'internal';
    if (msg.startsWith('limit:')) return NextResponse.json({ error: msg }, { status: 429 });
    if (msg.startsWith('generation_failed')) {
      return NextResponse.json({ error: 'generation_failed' }, { status: 502 });
    }
    return NextResponse.json({ error: 'internal' }, { status: 500 });
  }
}
```

- [ ] **Step 2: Tip kontrolü**

Run: `npm run typecheck`
Expected: PASS — eski `startSession(user.id, caseId)` çağrısı kalmamalı.

- [ ] **Step 3: Mevcut testler yeşil**

Run: `npm test`
Expected: Tüm testler PASS.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/seans/start/route.ts
git commit -m "feat(api): seans/start accepts free-mode body shape"
```

---

## Task 6: Kütüphane Sorgusunu `source='curated'` Olarak Daralt

**Files:**
- Modify: `src/app/page.tsx`
- Modify: `src/app/vaka/[id]/page.tsx`

- [ ] **Step 1: Anasayfa sorgusunu daralt**

`src/app/page.tsx` içinde mevcut cases sorgusunu güncelle:

```ts
// önce (yaklaşık satır 15-19):
const { data: cases } = await sb
  .from('cases')
  .select('id, title, presenting, difficulty')
  .eq('is_active', true)
  .order('created_at', { ascending: true });

// sonra:
const { data: cases } = await sb
  .from('cases')
  .select('id, title, presenting, difficulty')
  .eq('is_active', true)
  .eq('source', 'curated')
  .order('created_at', { ascending: true });
```

- [ ] **Step 2: `/vaka/[id]` sayfası AI-üretilen vakaları reddetsin**

`src/app/vaka/[id]/page.tsx` — satır 14-21 arası select sorgusuna `source` alanını ekle ve `if (!c) notFound();` satırının (satır 22) hemen ardına source kontrolü koy:

```ts
// satır 16-17: select string'ine 'source' ekle (sondan eklenir)
.select(
  'id, title, presenting, diagnosis_hint, background, personality, speech_style, difficulty, insight_level, defense_style, register, created_at, source'
)

// satır 22 sonrası:
if (!c) notFound();
if (c.source === 'ai_generated') notFound();
```

- [ ] **Step 3: Typecheck + mevcut testler**

Run: `npm run typecheck && npm test`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/app/page.tsx src/app/vaka/[id]/page.tsx
git commit -m "feat(library): filter cases by source=curated; 404 ai_generated case page"
```

---

## Task 7: `FreeSessionModal` Bileşeni

**Files:**
- Create: `src/components/case/FreeSessionModal.tsx`

- [ ] **Step 1: Bileşeni yaz**

```tsx
// src/components/case/FreeSessionModal.tsx
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Difficulty = 'easy' | 'medium' | 'hard';

const DIFF_OPTIONS: Array<{ value: Difficulty; label: string; hint: string }> = [
  { value: 'easy', label: 'Kolay', hint: 'işbirlikçi, daha açık' },
  { value: 'medium', label: 'Orta', hint: 'dengeli zorluk' },
  { value: 'hard', label: 'Zor', hint: 'kapalı, savunmacı' },
];

export function FreeSessionModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [themeHint, setThemeHint] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/seans/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'free',
          difficulty,
          themeHint: themeHint.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        const code = String(body.error ?? 'internal');
        if (code.startsWith('limit:')) setError('Günlük seans/token limitin doldu.');
        else if (code === 'generation_failed') setError('Şu an üretemedik, tekrar dene.');
        else setError('Bir şey ters gitti, tekrar dene.');
        setLoading(false);
        return;
      }
      const { session_id } = await res.json();
      router.push(`/seans/${session_id}`);
    } catch {
      setError('Bağlantı hatası, tekrar dene.');
      setLoading(false);
    }
  }

  if (!open) return null;

  return (
    <>
      <div onClick={loading ? undefined : onClose} aria-hidden className="fixed inset-0 bg-ink/40 backdrop-blur-sm z-40" />
      <div role="dialog" aria-label="Serbest seans" className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-paper border border-rule shadow-2xl rounded-md z-50 p-6">
        <p className="label-caps mb-2">Serbest seans</p>
        <h2 className="font-display text-2xl mb-1">Sürpriz <em className="font-display-italic">danışan</em></h2>
        <p className="text-sm text-muted mb-6">Vakanın dosyası seans sonunda açılır.</p>

        <fieldset className="mb-5">
          <legend className="label-caps mb-2">Zorluk</legend>
          <div className="grid grid-cols-3 gap-2">
            {DIFF_OPTIONS.map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() => setDifficulty(o.value)}
                aria-pressed={difficulty === o.value}
                className={`px-3 py-2 border rounded text-sm ${
                  difficulty === o.value ? 'border-accent bg-accent/10' : 'border-rule'
                }`}
              >
                <div className="font-medium">{o.label}</div>
                <div className="text-xs text-muted">{o.hint}</div>
              </button>
            ))}
          </div>
        </fieldset>

        <label className="block mb-6">
          <span className="label-caps mb-2 block">Tema ipucu (opsiyonel)</span>
          <input
            type="text"
            maxLength={120}
            value={themeHint}
            onChange={(e) => setThemeHint(e.target.value)}
            placeholder="ör. iş yerinde tükenmişlik — boş bırakabilirsin"
            className="w-full px-3 py-2 border border-rule rounded text-sm bg-paper"
          />
        </label>

        {error && <p className="text-sm text-danger mb-4" role="alert">{error}</p>}

        <div className="flex justify-end gap-2">
          <button onClick={onClose} disabled={loading} className="btn-quiet">İptal</button>
          <button onClick={start} disabled={loading} className="btn-primary">
            {loading ? 'Danışan hazırlanıyor…' : 'Başlat'}
          </button>
        </div>
      </div>
    </>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/components/case/FreeSessionModal.tsx
git commit -m "feat(ui): FreeSessionModal for free-session pre-flight"
```

---

## Task 8: Anasayfaya "Serbest Seans" Girişi

**Files:**
- Modify: `src/app/page.tsx`
- Create: `src/components/case/FreeSessionTrigger.tsx`

`page.tsx` server component; modal client component. Açılış durumunu yönetecek küçük bir client wrapper'a ihtiyaç var.

- [ ] **Step 1: Trigger wrapper'ı yaz**

```tsx
// src/components/case/FreeSessionTrigger.tsx
'use client';
import { useState } from 'react';
import { FreeSessionModal } from './FreeSessionModal';

export function FreeSessionTrigger() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="surface w-full text-left px-5 py-5 mb-8 flex items-center justify-between gap-4 hover:bg-paper-soft transition"
      >
        <div>
          <p className="label-caps mb-1">Serbest seans</p>
          <p className="font-display text-xl">Sürpriz bir <em className="font-display-italic">danışan</em></p>
          <p className="text-sm text-muted mt-1">Dosya yok — seans sonunda açılır.</p>
        </div>
        <span className="btn-outline shrink-0">Başlat</span>
      </button>
      <FreeSessionModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
```

- [ ] **Step 2: Anasayfaya mount et**

`src/app/page.tsx` içinde import et ve `{starter && <StarterHint .../>}` satırından **hemen önce** veya `CaseIndex`'ten önce yerleştir:

```tsx
// import: import { FreeSessionTrigger } from '@/components/case/FreeSessionTrigger';

// ... existing markup
{openSession && (/* mevcut blok */)}

<FreeSessionTrigger />

{starter && <StarterHint starter={starter} />}
<CaseIndex cases={list} doneIds={doneIds} />
```

- [ ] **Step 3: Dev server'da görsel doğrulama**

Run: `npm run dev` (background olmadan, manuel kontrol)
Expected: Anasayfada "Serbest seans — Sürpriz bir danışan" kartı görünür, tıklayınca modal açılır.

- [ ] **Step 4: Typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/case/FreeSessionTrigger.tsx src/app/page.tsx
git commit -m "feat(ui): home page entry card for free session"
```

---

## Task 9: Seans Ekranı — Drawer Kilidi + "Serbest Seans" Rozeti

**Files:**
- Modify: `src/app/seans/[id]/page.tsx`
- Modify: `src/components/chat/ChatWindow.tsx`
- Modify: `src/components/case/CaseSheetDrawer.tsx`

- [ ] **Step 1: Sayfa fetch'ine `source` ekle ve `ChatWindow`'a geçir**

`src/app/seans/[id]/page.tsx`:

```ts
// SessionRow.case tipine source ekle:
case: {
  // ... mevcut alanlar
  source: 'curated' | 'ai_generated';
} | null;

// select sorgusuna source ekle:
.select(
  'id, status, started_at, case:cases(id, title, presenting, diagnosis_hint, background, personality, speech_style, difficulty, insight_level, defense_style, register, source)'
)

// ChatWindow render'ına yeni prop:
return (
  <ChatWindow
    sessionId={id}
    caseSheet={caseSheet}
    startedAt={session.started_at}
    initialMessages={initialMessages}
    freeMode={session.case.source === 'ai_generated'}
  />
);
```

- [ ] **Step 2: `ChatWindow`'a `freeMode` propunu ekle, "Dosya" butonunu freeMode'da gizle, rozet göster**

`src/components/chat/ChatWindow.tsx`:

(a) Props tipini güncelle (satır 22-27):

```ts
export function ChatWindow(props: {
  sessionId: string;
  caseSheet: CaseSheet;
  startedAt: string;
  initialMessages: Msg[];
  freeMode?: boolean;
}) {
```

(b) Header'ın sağ tarafındaki "Dosya" butonunu freeMode'da rozetle değiştir (satır 159-169 — mevcut `<div className="flex items-center gap-2 sm:gap-4 justify-end">` bloğunu değiştir):

```tsx
<div className="flex items-center gap-2 sm:gap-4 justify-end">
  {props.freeMode ? (
    <span className="label-caps text-accent whitespace-nowrap" aria-label="Serbest seans">
      <span className="hidden sm:inline">Serbest seans · </span>dosya seans sonu
    </span>
  ) : (
    <button
      onClick={() => setSheetOpen(true)}
      className="btn-quiet text-xs whitespace-nowrap"
      aria-label="Vaka dosyası"
      title="Vaka dosyasını aç (her an erişebilirsin)"
    >
      <span className="hidden sm:inline">Dosya </span>☰
    </button>
  )}
  <SessionTimer startedAt={props.startedAt} onExpire={() => setExpired(true)} />
</div>
```

(c) `CaseSheetDrawer` render'ını freeMode'da hiç mount etme (satır 173-177'yi sar):

```tsx
{!props.freeMode && (
  <CaseSheetDrawer
    open={sheetOpen}
    onClose={() => setSheetOpen(false)}
    caseData={props.caseSheet}
  />
)}
```

- [ ] **Step 3: Typecheck + manual sanity**

Run: `npm run typecheck`
Expected: PASS.

Run: `npm run dev` (manuel) — serbest seans başlat, "Dosya ☰" butonu görünmemeli, yerinde "Serbest seans · dosya seans sonu" rozeti olmalı.

- [ ] **Step 4: Commit**

```bash
git add src/app/seans/[id]/page.tsx src/components/chat/ChatWindow.tsx
git commit -m "feat(session): hide briefing drawer + show 'Serbest seans' badge in free mode"
```

---

## Task 10: Rapor — "Gizli Dosya Açıklandı" Bölümü

**Files:**
- Modify: `src/app/rapor/[sessionId]/page.tsx`
- Modify: `src/components/report/ReportView.tsx`

- [ ] **Step 1: Sayfada AI-üretilen vakanın tüm alanlarını fetch et**

`src/app/rapor/[sessionId]/page.tsx` — `SessionWithCase` tipini ve select'i genişlet:

```ts
type SessionWithCase = {
  id: string;
  status: 'in_progress' | 'completed' | 'abandoned';
  user_id: string;
  formulation: unknown;
  case: {
    id: string;
    title: string;
    source: 'curated' | 'ai_generated';
    presenting: string;
    background: string;
    personality: string;
    speech_style: string;
    goals_hidden: string;
    insight_level: string | null;
    defense_style: string | null;
    register: string | null;
    diagnosis_hint: string | null;
  } | null;
};

// select:
.select('id, status, user_id, formulation, case:cases(id, title, source, presenting, background, personality, speech_style, goals_hidden, insight_level, defense_style, register, diagnosis_hint)')
```

`ReportView` çağrısına yeni prop:

```tsx
<ReportView
  // ... mevcut proplar
  hiddenDossier={
    session.case && session.case.source === 'ai_generated'
      ? {
          presenting: session.case.presenting,
          background: session.case.background,
          personality: session.case.personality,
          speech_style: session.case.speech_style,
          goals_hidden: session.case.goals_hidden,
          insight_level: session.case.insight_level,
          defense_style: session.case.defense_style,
          register: session.case.register,
          diagnosis_hint: session.case.diagnosis_hint,
        }
      : null
  }
/>
```

- [ ] **Step 2: `ReportView`'e propu ve bölümü ekle**

`src/components/report/ReportView.tsx`:

```tsx
// Props tipine ekle:
export type HiddenDossier = {
  presenting: string;
  background: string;
  personality: string;
  speech_style: string;
  goals_hidden: string;
  insight_level: string | null;
  defense_style: string | null;
  register: string | null;
  diagnosis_hint: string | null;
};

export function ReportView(props: {
  sessionId: string;
  caseId: string;
  caseTitle: string;
  formulation: Formulation | null;
  report: Report;
  messages: Msg[];
  hiddenDossier?: HiddenDossier | null;
}) {
```

Raporun render'ının sonuna (mevcut `<main>` içinde, footer/disclaimer'dan önce uygun yere) yeni bölüm ekle:

```tsx
{props.hiddenDossier && (
  <section className="surface-deep px-6 py-6 mb-16">
    <p className="label-caps mb-2 text-accent">Gizli dosya açıklandı</p>
    <p className="text-sm text-muted mb-6">
      Bu seansı dosyasını görmeden yürüttün. Aşağıda danışanın gerçek profili:
    </p>
    <div className="space-y-5">
      <DossierRow label="Sunulan sorun" text={props.hiddenDossier.presenting} />
      <DossierRow label="Geçmiş / aile" text={props.hiddenDossier.background} />
      <DossierRow label="Kişilik" text={props.hiddenDossier.personality} />
      <DossierRow label="Konuşma stili" text={props.hiddenDossier.speech_style} />
      <DossierRow label="Gizli mesele" text={props.hiddenDossier.goals_hidden} />
      {props.hiddenDossier.defense_style && (
        <DossierRow label="Baskın savunma" text={props.hiddenDossier.defense_style} />
      )}
      {props.hiddenDossier.insight_level && (
        <DossierRow label="İçgörü" text={props.hiddenDossier.insight_level} />
      )}
      {props.hiddenDossier.register && (
        <DossierRow label="Söylem kaydı" text={props.hiddenDossier.register} />
      )}
      {props.hiddenDossier.diagnosis_hint && (
        <DossierRow label="Klinik çağrışım" text={props.hiddenDossier.diagnosis_hint} />
      )}
    </div>
  </section>
)}
```

Ve yardımcı bileşeni dosyanın sonuna ekle:

```tsx
function DossierRow({ label, text }: { label: string; text: string }) {
  return (
    <div>
      <p className="label-caps mb-1">{label}</p>
      <p className="text-base leading-relaxed">{text}</p>
    </div>
  );
}
```

- [ ] **Step 3: Typecheck + testler**

Run: `npm run typecheck && npm test`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/app/rapor/[sessionId]/page.tsx src/components/report/ReportView.tsx
git commit -m "feat(report): reveal hidden dossier for ai_generated case reports"
```

---

## Task 11: Geçmiş Sayfası Sanity Check

**Files:**
- Read: `src/app/gecmis/page.tsx`

- [ ] **Step 1: Geçmiş sayfasını oku ve doğrula**

Geçmiş sayfası seans bazlı listeleme yapıyor, vaka filtresi `source` ile değil. AI-üretilen vakaların geçmişte görünmesi spec gereği (Task tamamlandığı için reveal olmuş kabul edilir). Eğer geçmişte "Vakalar"a link veriyorsa ve link `/vaka/[id]` ise, Task 6'daki 404 davranışı zaten ilgilenir.

**Eğer dosyada bir değişiklik gerekirse:** AI-üretilen vakaların başlığına `(Serbest)` veya rozet eklemek istersen, küçük conditional render ekle. Aksi halde no-op.

- [ ] **Step 2: Manuel görsel kontrol**

Run: `npm run dev` — Geçmiş sayfasını aç, daha önce yaptığın serbest seans listede görünmeli, tıklayınca rapora gitmeli.

- [ ] **Step 3: Commit (değişiklik varsa)**

Eğer değişiklik gerekmediyse bu task'ı atla.

---

## Task 12: Playwright E2E — Serbest Seans Tam Akışı

**Files:**
- Create: `tests/e2e/free-session.spec.ts`

- [ ] **Step 1: E2E testi yaz**

```ts
// tests/e2e/free-session.spec.ts
import { test, expect } from '@playwright/test';

// Bu test MOCK_OPENAI=true ile çalışmalı; playwright.config'te env ayarlı.
// Auth: storageState veya test öncesi login fixture mevcut projede nasıl
// kullanılıyorsa onu kullan (mevcut e2e dosyalarına bak).

test('serbest seans tam akışı', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('Serbest seans', { exact: false })).toBeVisible();

  await page.getByRole('button', { name: /Başlat/i }).first().click();

  // Modal açıldı
  await expect(page.getByRole('dialog', { name: 'Serbest seans' })).toBeVisible();
  await page.getByRole('button', { name: 'Kolay' }).click();
  await page.getByRole('button', { name: 'Başlat' }).click();

  // Seans sayfasına yönlendirildi, rozet görünür
  await page.waitForURL(/\/seans\//);
  await expect(page.getByText(/Serbest seans/)).toBeVisible();

  // En az bir mesaj at, seansı bitir (mevcut E2E pattern'lerine göre düzenle)
  // ...
  // Rapor sayfasına geç ve gizli dosya bölümünü doğrula
  // await page.waitForURL(/\/rapor\//);
  // await expect(page.getByText('Gizli dosya açıklandı')).toBeVisible();
});
```

(Eğer projede `tests/e2e/` dizini henüz yoksa, `playwright.config.ts` içindeki `testDir` yolunu kontrol et ve doğru dizinde oluştur.)

- [ ] **Step 2: Testi koştur**

Run: `npm run test:e2e -- free-session`
Expected: PASS (mock mod).

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/free-session.spec.ts
git commit -m "test(e2e): free-session end-to-end with mock generator"
```

---

## Task 13: Final Verification

- [ ] **Step 1: Tüm testler**

Run: `npm run typecheck && npm test && npm run test:e2e`
Expected: Hepsi PASS.

- [ ] **Step 2: Mock kapalıyken gerçek üretimi manuel doğrula**

`.env.local`'da `MOCK_OPENAI` kaldır (veya `false` yap), `OPENAI_API_KEY` ayarlı.
Run: `npm run dev`
Manuel test: Anasayfa → "Başlat" → Modal → Orta + boş ipucu → Başlat → 2-4 sn loading → seans ekranı açılır, rozet "Serbest seans · dosya seans sonunda" görünür → birkaç mesaj at → seansı bitir → rapor sayfasında en altta "Gizli dosya açıklandı" bölümü dolu.

- [ ] **Step 3: Final commit (gerekirse)**

Manuel test sırasında bulduğun küçük UI düzeltmeleri varsa commit et.

---

## Notlar

- **Geriye uyumluluk:** Mevcut `POST /api/seans/start` body `{ case_id }` desteklenmeye devam eder.
- **RLS:** `cases` tablosu zaten herkese okuma izni veriyor; `ai_generated` satırlar da öyle. Filtre yalnız UI tarafında.
- **Limit muhasebesi:** Üretim token'ı `usage_daily.token_count`'a eklenir; günlük 100k limiti seans + üretimi birlikte sayar.
- **Crisis safety:** Üretim prompt'unda aktif intihar planı yazımı yasaklı; mevcut `client-prompt.ts` güvenlik kuralları (`[ROLE_RESET]` vb.) zaten her seansta uygulanır.
