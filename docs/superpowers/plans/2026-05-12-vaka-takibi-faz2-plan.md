# Vaka Takibi Faz 2 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Faz 1'in naive hafızasını ölçeklenebilir hale getir: seans-sonu özet üret, yaşayan formülasyon kavramı kur, son 2 seans + öncekiler özet olarak prompt'a koy, zaman ipucu (1 gün/hafta/ay) ile seans aralarına bağlam ekle.

**Architecture:** Yeni `sessions.summary` + `sessions.time_gap_label` + `case_series.formulation` kolonları. Yeni `summary-generator` servisi `POST /api/seans/end` içinde eager çağrılır. Formülasyon endpoint'i hem snapshot hem canonical güncellemeye çift yazar. Mesaj route prompt'u hybrid: son 2 ham + eski özet.

**Tech Stack:** Next.js 16, TypeScript, Supabase, OpenAI SDK, Vitest, Tailwind.

**Spec:** `docs/superpowers/specs/2026-05-12-vaka-takibi-faz2-design.md`

---

## File Structure

**Yeni:**
- `supabase/migrations/0020_session_summary_and_living_formulation.sql`
- `src/lib/openai/summary-types.ts` — paylaşılan tipler
- `src/lib/openai/summary-generator.ts` — `generateSessionSummary` + validator + mock fallback
- `src/app/api/seri/[id]/formulasyon/route.ts` — series-level formülasyon yazma endpoint'i
- `src/app/seri/[id]/formulasyon/page.tsx` — series formülasyon editor sayfası
- `src/components/series/TimeGapModal.tsx` — yeni seans başlatırken zaman ipucu modal'ı
- `src/components/series/StartNextSessionButton.tsx` — modal'ı tetikleyen client wrapper
- `src/components/series/LivingFormulationCard.tsx` — `/seri/[id]` sayfası için canlı formülasyon kartı
- `tests/unit/summary-generator.test.ts`

**Değişen:**
- `src/lib/types.ts` — regenerate (yeni kolonlar)
- `src/lib/openai/mock.ts` — `mockSessionSummary` helper
- `src/app/api/seans/end/route.ts` — eager summary üretimi
- `src/app/api/seans/formulasyon/route.ts` — çift yazma (`sessions` + `case_series`)
- `src/app/seans/[id]/formulasyon/page.tsx` — canlı formülasyondan yükleme
- `src/lib/session-actions.ts` — `time_gap_label` payload kabulü
- `src/app/api/seans/start/route.ts` — body'de `time_gap_label` parse
- `src/app/seri/[id]/page.tsx` — formülasyon kartı + `StartNextSessionButton` mount
- `src/app/api/seans/message/route.ts` — hybrid memory + yaşayan formülasyon + zaman ipucu prompt'a koy
- `src/components/report/ReportView.tsx` — "AI'ın eklemek istediği" görsel iyileştirme

---

## Task 1: DB Migration (yeni kolonlar)

**Files:**
- Create: `supabase/migrations/0020_session_summary_and_living_formulation.sql`
- Modify: `src/lib/types.ts` (regenerate)

- [ ] **Step 1: Migration**

```sql
-- supabase/migrations/0020_session_summary_and_living_formulation.sql
alter table public.sessions
  add column summary jsonb,
  add column time_gap_label text;

alter table public.case_series
  add column formulation jsonb;

comment on column public.sessions.summary is
  'Seans-sonu AI özeti: {headline, key_events[], promises[], hypothesis_update}';
comment on column public.sessions.time_gap_label is
  'Bu seans ile önceki seans arasındaki zaman ipucu (örn "1 hafta sonra")';
comment on column public.case_series.formulation is
  'Seri-canonical yaşayan formülasyon (case-bazında evrilen)';
```

- [ ] **Step 2: Local uygula**

Run: `npx supabase migration up`
Expected: Migration uygulanır.

- [ ] **Step 3: Tipler**

Run: `npm run db:types`
Expected: `sessions.Row` içinde `summary: Json | null` ve `time_gap_label: string | null`; `case_series.Row` içinde `formulation: Json | null`.

- [ ] **Step 4: Typecheck temiz mi**

Run: `npm run typecheck`
Expected: PASS (yeni kolonlar opsiyonel, var olan kod kırılmaz).

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/0020_session_summary_and_living_formulation.sql src/lib/types.ts
git commit -m "feat(db): add sessions.summary, sessions.time_gap_label, case_series.formulation"
```

---

## Task 2: Summary Types

**Files:**
- Create: `src/lib/openai/summary-types.ts`

- [ ] **Step 1: Tipleri yaz**

```ts
// src/lib/openai/summary-types.ts
export type SessionSummary = {
  headline: string;
  key_events: string[];
  promises: string[];
  hypothesis_update: string;
};

export type TranscriptMessage = {
  role: 'student' | 'client';
  content: string;
};

export type GenerateSummaryInput = {
  case: {
    presenting: string;
    background: string;
    personality: string;
    speech_style: string;
    goals_hidden: string;
    insight_level?: string | null;
    defense_style?: string | null;
    register?: string | null;
  };
  transcript: TranscriptMessage[];
  priorSummaries?: SessionSummary[];
  livingFormulation?: {
    presenting?: string;
    hypothesis?: string;
    patterns?: string;
    next_session?: string;
  } | null;
};

export type GenerateSummaryResult = {
  summary: SessionSummary;
  token_count: number;
};
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/lib/openai/summary-types.ts
git commit -m "feat(openai): session summary shared types"
```

---

## Task 3: Mock Session Summary

**Files:**
- Modify: `src/lib/openai/mock.ts`
- Create: `tests/unit/summary-generator-mock.test.ts`

- [ ] **Step 1: Test**

```ts
// tests/unit/summary-generator-mock.test.ts
import { describe, it, expect } from 'vitest';
import { mockSessionSummary } from '@/lib/openai/mock';

describe('mockSessionSummary', () => {
  it('returns SessionSummary shape with non-empty fields', () => {
    const r = mockSessionSummary({
      transcript: [
        { role: 'student', content: 'Merhaba.' },
        { role: 'client', content: 'Bilmiyorum, kötüyüm.' },
      ],
    });
    expect(typeof r.summary.headline).toBe('string');
    expect(r.summary.headline.length).toBeGreaterThan(0);
    expect(Array.isArray(r.summary.key_events)).toBe(true);
    expect(Array.isArray(r.summary.promises)).toBe(true);
    expect(typeof r.summary.hypothesis_update).toBe('string');
    expect(typeof r.token_count).toBe('number');
    expect(r.token_count).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Fail bekle**

Run: `npm test -- summary-generator-mock`
Expected: FAIL (`mockSessionSummary` exported değil).

- [ ] **Step 3: `mock.ts` sonuna ekle**

```ts
import type { GenerateSummaryInput, GenerateSummaryResult } from './summary-types';

export function mockSessionSummary(
  input: Pick<GenerateSummaryInput, 'transcript'>
): GenerateSummaryResult {
  const msgCount = input.transcript.length;
  return {
    summary: {
      headline: `Mock seans özeti — ${msgCount} mesaj`,
      key_events: [
        'Danışan açılış sorularına kısa yanıt verdi',
        'Bir aile dinamiği gündeme geldi ama derinleşmedi',
      ],
      promises: [],
      hypothesis_update: 'İçedönüklük yüzeyde; kayıp temasının altta yatma ihtimali var.',
    },
    token_count: 500,
  };
}
```

- [ ] **Step 4: Test yeşil**

Run: `npm test -- summary-generator-mock`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/openai/mock.ts tests/unit/summary-generator-mock.test.ts
git commit -m "feat(openai): mockSessionSummary for dev/test"
```

---

## Task 4: Summary Generator Service

**Files:**
- Create: `src/lib/openai/summary-generator.ts`
- Create: `tests/unit/summary-generator.test.ts`

- [ ] **Step 1: Test**

```ts
// tests/unit/summary-generator.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { validateSessionSummary, generateSessionSummary } from '@/lib/openai/summary-generator';

describe('validateSessionSummary', () => {
  const valid = {
    headline: 'h',
    key_events: ['a', 'b'],
    promises: [],
    hypothesis_update: 'u',
  };
  it('accepts complete summary', () => {
    expect(validateSessionSummary(valid)).toEqual(valid);
  });
  it('rejects empty headline', () => {
    expect(() => validateSessionSummary({ ...valid, headline: '' })).toThrow();
  });
  it('rejects non-array key_events', () => {
    expect(() => validateSessionSummary({ ...valid, key_events: 'x' })).toThrow();
  });
  it('coerces missing promises to []', () => {
    const r = validateSessionSummary({ ...valid, promises: undefined });
    expect(r.promises).toEqual([]);
  });
});

describe('generateSessionSummary (mock mode)', () => {
  beforeEach(() => { vi.stubEnv('MOCK_OPENAI', 'true'); });
  it('returns summary + token_count via mock when MOCK_OPENAI=true', async () => {
    const r = await generateSessionSummary({
      case: {
        presenting: 'p', background: 'b', personality: 'x',
        speech_style: 's', goals_hidden: 'g',
      },
      transcript: [{ role: 'student', content: 'merhaba' }],
    });
    expect(r.summary.headline.length).toBeGreaterThan(0);
    expect(r.token_count).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Fail bekle**

Run: `npm test -- summary-generator.test`
Expected: FAIL.

- [ ] **Step 3: Servis**

```ts
// src/lib/openai/summary-generator.ts
import { getOpenAI, MODEL, isMockMode } from './client';
import { mockSessionSummary } from './mock';
import type {
  SessionSummary,
  GenerateSummaryInput,
  GenerateSummaryResult,
  TranscriptMessage,
} from './summary-types';

export type {
  SessionSummary,
  GenerateSummaryInput,
  GenerateSummaryResult,
} from './summary-types';

export function validateSessionSummary(raw: unknown): SessionSummary {
  if (!raw || typeof raw !== 'object') throw new Error('not_object');
  const r = raw as Record<string, unknown>;
  const headline = typeof r.headline === 'string' ? r.headline.trim() : '';
  if (!headline) throw new Error('invalid_headline');
  if (r.key_events !== undefined && !Array.isArray(r.key_events)) {
    throw new Error('invalid_key_events');
  }
  if (r.promises !== undefined && !Array.isArray(r.promises)) {
    throw new Error('invalid_promises');
  }
  const hypothesis_update =
    typeof r.hypothesis_update === 'string' ? r.hypothesis_update.trim() : '';
  return {
    headline: headline.slice(0, 200),
    key_events: ((r.key_events as unknown[]) ?? [])
      .filter((x): x is string => typeof x === 'string')
      .map((x) => x.slice(0, 240))
      .slice(0, 8),
    promises: ((r.promises as unknown[]) ?? [])
      .filter((x): x is string => typeof x === 'string')
      .map((x) => x.slice(0, 240))
      .slice(0, 8),
    hypothesis_update: hypothesis_update.slice(0, 500),
  };
}

function renderTranscript(t: TranscriptMessage[]): string {
  return t
    .map((m) => `${m.role === 'student' ? 'TERAPİST' : 'DANIŞAN'}: ${m.content}`)
    .join('\n');
}

function buildPrompt(input: GenerateSummaryInput): string {
  const lines: string[] = [];
  lines.push('Vakanın temel profili:');
  lines.push(`- Sunulan sorun: ${input.case.presenting}`);
  lines.push(`- Geçmiş: ${input.case.background}`);
  lines.push(`- Kişilik: ${input.case.personality}`);
  lines.push(`- Konuşma stili: ${input.case.speech_style}`);
  lines.push(`- Gizli mesele (kullanma — sadece tutarlılık için): ${input.case.goals_hidden}`);
  if (input.priorSummaries && input.priorSummaries.length > 0) {
    lines.push('\nÖnceki seansların özetleri:');
    input.priorSummaries.forEach((s, i) => {
      lines.push(
        `Seans ${i + 1}: ${s.headline} | olaylar: ${s.key_events.join('; ')} | sözler: ${s.promises.join('; ') || '—'} | hipotez: ${s.hypothesis_update}`
      );
    });
  }
  if (input.livingFormulation) {
    const f = input.livingFormulation;
    const parts = [
      f.presenting && `Sunulan: ${f.presenting}`,
      f.hypothesis && `Hipotez: ${f.hypothesis}`,
      f.patterns && `Örüntü: ${f.patterns}`,
      f.next_session && `Sonraki seans: ${f.next_session}`,
    ].filter(Boolean);
    if (parts.length > 0) {
      lines.push('\nÖğrencinin mevcut formülasyonu:');
      lines.push(parts.join(' | '));
    }
  }
  lines.push('\nBu seansın transcript\'i (en eski en üstte):');
  lines.push(renderTranscript(input.transcript));
  lines.push('');
  lines.push('Şu JSON schema\'ya birebir uy ve sadece tek bir JSON nesnesi döndür:');
  lines.push('{');
  lines.push('  "headline": string,            // 1 cümle, en güçlü çıkarımı yansıt');
  lines.push('  "key_events": string[],         // 3-5 kısa madde, "neler oldu"');
  lines.push('  "promises": string[],           // danışanın bu seansta verdiği konkret sözler; yoksa []');
  lines.push('  "hypothesis_update": string     // süpervizörce: hipotez nasıl evrilmeli, 1-2 cümle');
  lines.push('}');
  return lines.join('\n');
}

export async function generateSessionSummary(
  input: GenerateSummaryInput
): Promise<GenerateSummaryResult> {
  if (isMockMode()) {
    return mockSessionSummary(input);
  }
  const openai = getOpenAI();
  const resp = await openai.chat.completions.create({
    model: MODEL,
    temperature: 0.4,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content:
          'Sen psikoterapi süpervizör asistanısın. Bir seansı kısa ve eylem-odaklı şekilde özetlersin; çıktın yalnız geçerli JSON olur.',
      },
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
  const validated = validateSessionSummary(raw);
  return { summary: validated, token_count: tokens };
}
```

- [ ] **Step 4: Test yeşil**

Run: `npm test -- summary-generator.test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/openai/summary-generator.ts tests/unit/summary-generator.test.ts
git commit -m "feat(openai): generateSessionSummary service with validation"
```

---

## Task 5: `/api/seans/end` Eager Summary Üretimi

**Files:**
- Modify: `src/app/api/seans/end/route.ts`

- [ ] **Step 1: Route'u güncelle**

`src/app/api/seans/end/route.ts` — mevcut completion logic'inin sonuna summary üretimi ekle:

```ts
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { NextResponse } from 'next/server';
import { generateSessionSummary } from '@/lib/openai/summary-generator';
import type { SessionSummary } from '@/lib/openai/summary-types';

type SessionRow = {
  id: string;
  user_id: string;
  status: 'in_progress' | 'completed' | 'abandoned';
  series_id: string;
  case: {
    presenting: string;
    background: string;
    personality: string;
    speech_style: string;
    goals_hidden: string;
    insight_level: string | null;
    defense_style: string | null;
    register: string | null;
  } | null;
};

export async function POST(request: Request) {
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const sessionId = body.session_id;
  if (!sessionId) return NextResponse.json({ error: 'invalid_input' }, { status: 400 });

  const svc = createServiceClient();
  const { data: sessionData } = await svc
    .from('sessions')
    .select(
      'id, user_id, status, series_id, case:cases(presenting, background, personality, speech_style, goals_hidden, insight_level, defense_style, register)'
    )
    .eq('id', sessionId)
    .single();
  const session = sessionData as unknown as SessionRow | null;
  if (!session || session.user_id !== user.id) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  if (session.status !== 'in_progress') {
    return NextResponse.json({ ok: true, already: true });
  }

  await svc
    .from('sessions')
    .update({ status: 'completed', ended_at: new Date().toISOString() })
    .eq('id', sessionId);

  // Eager summary üretimi (best-effort, hata seansı kapatmayı engellemez)
  if (session.case) {
    try {
      const { data: msgs } = await svc
        .from('messages')
        .select('role, content')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });

      const { data: priorSummaryRows } = await svc
        .from('sessions')
        .select('summary, started_at')
        .eq('series_id', session.series_id)
        .eq('status', 'completed')
        .neq('id', sessionId)
        .order('started_at', { ascending: true });

      const priorSummaries: SessionSummary[] = (priorSummaryRows ?? [])
        .map((r) => r.summary as SessionSummary | null)
        .filter((s): s is SessionSummary => !!s && typeof s === 'object');

      const { data: seriesRow } = await svc
        .from('case_series')
        .select('formulation')
        .eq('id', session.series_id)
        .single();

      const result = await generateSessionSummary({
        case: session.case,
        transcript: ((msgs ?? []) as Array<{ role: string; content: string }>).map((m) => ({
          role: m.role === 'student' ? 'student' : 'client',
          content: m.content,
        })),
        priorSummaries,
        livingFormulation: (seriesRow?.formulation as Record<string, string> | null) ?? null,
      });

      await svc
        .from('sessions')
        .update({ summary: result.summary })
        .eq('id', sessionId);

      // usage token sayacına ekle
      const today = new Date().toISOString().split('T')[0];
      const { data: usage } = await svc
        .from('usage_daily')
        .select('session_count, token_count')
        .eq('user_id', user.id)
        .eq('day', today)
        .maybeSingle();
      await svc.from('usage_daily').upsert(
        {
          user_id: user.id,
          day: today,
          session_count: usage?.session_count ?? 1,
          token_count: (usage?.token_count ?? 0) + result.token_count,
        },
        { onConflict: 'user_id,day' }
      );
    } catch {
      // sessizce yutulur; seans yine completed
    }
  }

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 2: Typecheck + testler**

Run: `npm run typecheck && npm test`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/seans/end/route.ts
git commit -m "feat(end): generate eager session summary on completion"
```

---

## Task 6: Formülasyon Çift Yazma + Series Endpoint

**Files:**
- Modify: `src/app/api/seans/formulasyon/route.ts`
- Create: `src/app/api/seri/[id]/formulasyon/route.ts`

- [ ] **Step 1: `/api/seans/formulasyon` çift yazma**

`src/app/api/seans/formulasyon/route.ts` — mevcut son blok şu anda sadece sessions.formulation güncelliyor. Onu hem sessions hem case_series'e yazacak şekilde değiştir.

Mevcut session select satırını `series_id` de fetch edecek şekilde değiştir, sonra update'i iki tarafa yap:

```ts
// (önce) yalnız user_id ile fetch
// (sonra) series_id de fetch
const { data: session } = await svc
  .from('sessions')
  .select('id, user_id, series_id')
  .eq('id', sessionId)
  .single();
if (!session || session.user_id !== user.id) {
  return NextResponse.json({ error: 'not_found' }, { status: 404 });
}

const formulation = {
  presenting: presenting || undefined,
  hypothesis: hypothesis || undefined,
  patterns: patterns || undefined,
  next_session: next_session || undefined,
  written_at: new Date().toISOString(),
};

const { error: sessErr } = await svc
  .from('sessions')
  .update({ formulation })
  .eq('id', sessionId);
if (sessErr) return NextResponse.json({ error: 'save_failed' }, { status: 500 });

const { error: seriesErr } = await svc
  .from('case_series')
  .update({ formulation })
  .eq('id', session.series_id);
if (seriesErr) return NextResponse.json({ error: 'save_failed' }, { status: 500 });

return NextResponse.json({ ok: true });
```

- [ ] **Step 2: `/api/seri/[id]/formulasyon` yeni endpoint**

```ts
// src/app/api/seri/[id]/formulasyon/route.ts
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id: seriesId } = await context.params;
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const presenting = typeof body.presenting === 'string' ? body.presenting.trim() : '';
  const hypothesis = typeof body.hypothesis === 'string' ? body.hypothesis.trim() : '';
  const patterns = typeof body.patterns === 'string' ? body.patterns.trim() : '';
  const next_session = typeof body.next_session === 'string' ? body.next_session.trim() : '';

  if (!presenting && !hypothesis && !patterns && !next_session) {
    return NextResponse.json({ error: 'empty' }, { status: 400 });
  }

  const { data: series } = await sb
    .from('case_series')
    .select('id, user_id')
    .eq('id', seriesId)
    .maybeSingle();
  if (!series || series.user_id !== user.id) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  const formulation = {
    presenting: presenting || undefined,
    hypothesis: hypothesis || undefined,
    patterns: patterns || undefined,
    next_session: next_session || undefined,
    written_at: new Date().toISOString(),
  };

  const { error } = await sb
    .from('case_series')
    .update({ formulation })
    .eq('id', seriesId);
  if (error) return NextResponse.json({ error: 'save_failed' }, { status: 500 });

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/seans/formulasyon/route.ts src/app/api/seri/[id]/formulasyon/route.ts
git commit -m "feat(formulasyon): dual-write sessions+case_series; add series endpoint"
```

---

## Task 7: Seans-Sonu Formülasyon Sayfası — Living'den Yükle

**Files:**
- Modify: `src/app/seans/[id]/formulasyon/page.tsx`

Mevcut sayfa `parseFormulation(session.formulation)` ile sessions.formulation'dan yüklüyor. Yeni davranış: önce `case_series.formulation`'dan yükle (varsa), yoksa `sessions.formulation`'dan, yoksa null.

- [ ] **Step 1: Sayfayı güncelle**

`src/app/seans/[id]/formulasyon/page.tsx` içinde session fetch'inden sonra ekle:

```ts
// SessionRow tipine series_id ekle (henüz yoksa)
type SessionRow = {
  id: string;
  user_id: string;
  status: 'in_progress' | 'completed' | 'abandoned';
  formulation: unknown;
  series_id: string;
  case: { title: string } | null;
};

// select string güncelle:
.select('id, user_id, status, formulation, series_id, case:cases(title)')

// fetch sonrası:
const { data: seriesRow } = await sb
  .from('case_series')
  .select('formulation')
  .eq('id', session.series_id)
  .maybeSingle();

const existing =
  parseFormulation(seriesRow?.formulation) ?? parseFormulation(session.formulation);
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/app/seans/[id]/formulasyon/page.tsx
git commit -m "feat(formulasyon): preload from living case_series.formulation"
```

---

## Task 8: `/seri/[id]/formulasyon` Sayfası

**Files:**
- Create: `src/app/seri/[id]/formulasyon/page.tsx`

Mevcut `FormulationForm` client component'i yeniden kullanılır. Form submit endpoint'i farklı (`/api/seri/[id]/formulasyon`). `FormulationForm`'a opsiyonel `endpoint` prop ekle.

- [ ] **Step 1: `FormulationForm` endpoint prop'u**

`src/components/formulation/FormulationForm.tsx` — submit URL'ini parametreden alacak şekilde değiştir. Mevcut:

```ts
const res = await fetch('/api/seans/formulasyon', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ session_id: sessionId, ...values }),
});
```

Yeni:

```ts
// FormulationForm props:
export function FormulationForm({
  sessionId,
  initial,
  endpoint,
  redirectTo,
  bodyKey,
}: {
  sessionId: string;
  initial: Formulation | null;
  endpoint?: string;
  redirectTo?: string;
  bodyKey?: 'session_id' | 'series_id'; // payload key
}) {
  // ...
  const res = await fetch(endpoint ?? '/api/seans/formulasyon', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ [bodyKey ?? 'session_id']: sessionId, ...values }),
  });
  // ...
  router.push(redirectTo ?? `/rapor/${sessionId}`);
```

(Mevcut callsite `<FormulationForm sessionId={id} initial={existing ?? null} />` değişmez; opsiyonel prop'lar default'a düşer.)

- [ ] **Step 2: Yeni sayfa**

```tsx
// src/app/seri/[id]/formulasyon/page.tsx
import { createClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import { FormulationForm } from '@/components/formulation/FormulationForm';
import { AppShell } from '@/components/shell/AppShell';
import { parseFormulation } from '@/lib/formulation';

type SeriesRow = {
  id: string;
  user_id: string;
  formulation: unknown;
  case: { title: string } | null;
};

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) redirect('/login');

  const { data } = await sb
    .from('case_series')
    .select('id, user_id, formulation, case:cases(title)')
    .eq('id', id)
    .maybeSingle();
  const series = data as unknown as SeriesRow | null;
  if (!series || series.user_id !== user.id) notFound();

  const existing = parseFormulation(series.formulation);

  return (
    <AppShell userEmail={user.email}>
      <div className="max-w-2xl mx-auto px-6 md:px-10 py-8 md:py-12">
        <nav className="mb-8">
          <a href={`/seri/${id}`} className="btn-quiet text-xs">
            ← Seri sayfası
          </a>
        </nav>

        <header className="mb-10">
          <p className="label-caps mb-3">Yaşayan formülasyon</p>
          <h1 className="font-display text-4xl md:text-5xl leading-[1.05] tracking-tight">
            <em className="font-display-italic text-accent">{series.case?.title ?? '—'}</em>
          </h1>
          <p className="text-ink-soft mt-3 leading-relaxed text-sm md:text-base max-w-lg">
            Bu vakaya dair gelişen formülasyonun. Her seansta üstüne yazabilirsin.
          </p>
        </header>

        <FormulationForm
          sessionId={id}
          initial={existing ?? null}
          endpoint={`/api/seri/${id}/formulasyon`}
          bodyKey="series_id"
          redirectTo={`/seri/${id}`}
        />
      </div>
    </AppShell>
  );
}
```

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/app/seri/[id]/formulasyon/page.tsx src/components/formulation/FormulationForm.tsx
git commit -m "feat(series): /seri/[id]/formulasyon editor reusing FormulationForm"
```

---

## Task 9: `LivingFormulationCard` ve `/seri/[id]` Mount

**Files:**
- Create: `src/components/series/LivingFormulationCard.tsx`
- Modify: `src/app/seri/[id]/page.tsx`

- [ ] **Step 1: Kartı yaz**

```tsx
// src/components/series/LivingFormulationCard.tsx
import type { Formulation } from '@/lib/formulation';

export function LivingFormulationCard({
  seriesId,
  formulation,
}: {
  seriesId: string;
  formulation: Formulation | null;
}) {
  const hasContent = !!(
    formulation?.presenting ||
    formulation?.hypothesis ||
    formulation?.patterns ||
    formulation?.next_session
  );

  return (
    <section className="surface-deep px-6 py-6 mb-10">
      <div className="flex items-baseline justify-between mb-4">
        <p className="label-caps">Yaşayan formülasyon</p>
        <a href={`/seri/${seriesId}/formulasyon`} className="btn-quiet text-xs">
          Düzenle →
        </a>
      </div>
      {hasContent ? (
        <div className="space-y-4">
          {formulation?.presenting && <Row label="Sunulan sorun" text={formulation.presenting} />}
          {formulation?.hypothesis && <Row label="Hipotez" text={formulation.hypothesis} />}
          {formulation?.patterns && <Row label="Örüntüler" text={formulation.patterns} />}
          {formulation?.next_session && <Row label="Sonraki seans" text={formulation.next_session} />}
        </div>
      ) : (
        <p className="text-sm text-muted italic">
          Henüz formülasyon yazmadın. İlk seansını bitirdikten sonra yazabilirsin.
        </p>
      )}
    </section>
  );
}

function Row({ label, text }: { label: string; text: string }) {
  return (
    <div>
      <p className="label-caps mb-1 text-xs">{label}</p>
      <p className="text-base leading-relaxed font-display-italic">{text}</p>
    </div>
  );
}
```

- [ ] **Step 2: `/seri/[id]` sayfasında mount**

`src/app/seri/[id]/page.tsx` — `SeriesRow` tipine `formulation: unknown` ekle, select string'ine `formulation` ekle, `LivingFormulationCard`'ı header'dan sonra (seans listesinden önce) render et:

```ts
// SeriesRow tipi:
type SeriesRow = {
  // ...
  formulation: unknown;
};

// select:
.select('id, user_id, status, created_at, closed_at, formulation, case:cases(id, title, source)')

// import:
import { LivingFormulationCard } from '@/components/series/LivingFormulationCard';
import { parseFormulation } from '@/lib/formulation';

// render: header'dan sonra:
const formulation = parseFormulation(series.formulation);
// ...
<LivingFormulationCard seriesId={series.id} formulation={formulation} />
```

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/components/series/LivingFormulationCard.tsx src/app/seri/[id]/page.tsx
git commit -m "feat(series): living formulation card on /seri/[id]"
```

---

## Task 10: `TimeGapModal` + `StartNextSessionButton`

**Files:**
- Create: `src/components/series/TimeGapModal.tsx`
- Create: `src/components/series/StartNextSessionButton.tsx`
- Modify: `src/app/seri/[id]/page.tsx`

- [ ] **Step 1: Modal'ı yaz**

```tsx
// src/components/series/TimeGapModal.tsx
'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type Gap = '1 gün sonra' | '1 hafta sonra' | '1 ay sonra' | '';

const GAP_OPTIONS: Array<{ value: Gap; label: string }> = [
  { value: '1 gün sonra', label: '1 gün sonra' },
  { value: '1 hafta sonra', label: '1 hafta sonra' },
  { value: '1 ay sonra', label: '1 ay sonra' },
  { value: '', label: 'Belirsiz' },
];

export function TimeGapModal({
  open,
  onClose,
  caseId,
}: {
  open: boolean;
  onClose: () => void;
  caseId: string;
}) {
  const router = useRouter();
  const [gap, setGap] = useState<Gap>('1 hafta sonra');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || loading) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, loading, onClose]);

  async function start() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/seans/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          case_id: caseId,
          time_gap_label: gap || undefined,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        const code = String(body.error ?? 'internal');
        if (code.startsWith('limit:')) setError('Günlük seans/token limitin doldu.');
        else setError('Bir şey ters gitti, tekrar dene.');
        setLoading(false);
        return;
      }
      const { session_id } = await res.json();
      router.push(`/seans/${session_id}`);
    } catch {
      setError('Bağlantı hatası.');
      setLoading(false);
    }
  }

  if (!open) return null;

  return (
    <>
      <div onClick={loading ? undefined : onClose} aria-hidden className="fixed inset-0 bg-ink/40 backdrop-blur-sm z-40" />
      <div role="dialog" aria-modal="true" aria-label="Zaman ipucu" className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-paper border border-rule shadow-2xl rounded-md z-50 p-6">
        <p className="label-caps mb-2">Yeni seans</p>
        <h2 className="font-display text-2xl mb-1">Son seansla bu seans arasında <em className="font-display-italic">ne kadar</em> zaman geçti?</h2>
        <p className="text-sm text-muted mb-6">Danışan bu süreçte ne yaşamış olabilirse onunla başlayalım.</p>

        <fieldset className="mb-6">
          <legend className="sr-only">Zaman ipucu</legend>
          <div className="grid grid-cols-2 gap-2">
            {GAP_OPTIONS.map((o) => (
              <button
                key={o.label}
                type="button"
                onClick={() => setGap(o.value)}
                aria-pressed={gap === o.value}
                className={`px-3 py-3 border rounded text-sm ${
                  gap === o.value ? 'border-accent bg-accent/10' : 'border-rule'
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
        </fieldset>

        {error && <p className="text-sm text-danger mb-4" role="alert">{error}</p>}

        <div className="flex justify-end gap-2">
          <button onClick={onClose} disabled={loading} className="btn-quiet">İptal</button>
          <button onClick={start} disabled={loading} className="btn-primary">
            {loading ? 'Hazırlanıyor…' : 'Başlat'}
          </button>
        </div>
      </div>
    </>
  );
}
```

- [ ] **Step 2: Button wrapper**

```tsx
// src/components/series/StartNextSessionButton.tsx
'use client';
import { useState } from 'react';
import { TimeGapModal } from './TimeGapModal';

export function StartNextSessionButton({ caseId }: { caseId: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)} className="btn-primary">
        Yeni seans başlat →
      </button>
      <TimeGapModal open={open} onClose={() => setOpen(false)} caseId={caseId} />
    </>
  );
}
```

- [ ] **Step 3: `/seri/[id]` sayfası entegrasyonu**

`src/app/seri/[id]/page.tsx` — mevcut "Yeni seans başlat" `<a href={...}>` linkini değiştir:

```tsx
// önce:
<a href={`/seans/start?case=${series.case.id}`} className="btn-primary">
  Yeni seans başlat →
</a>

// sonra: ilk seans (boş seri) ise yine GET handler, değilse modal
const hasPriorSessions = sessions.some((s) => s.status === 'completed');

{hasPriorSessions ? (
  <StartNextSessionButton caseId={series.case.id} />
) : (
  <a href={`/seans/start?case=${series.case.id}`} className="btn-primary">
    Yeni seans başlat →
  </a>
)}
```

Import: `import { StartNextSessionButton } from '@/components/series/StartNextSessionButton';`

- [ ] **Step 4: Typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/series/TimeGapModal.tsx src/components/series/StartNextSessionButton.tsx src/app/seri/[id]/page.tsx
git commit -m "feat(series): TimeGapModal for follow-up sessions"
```

---

## Task 11: `startSession` ve `/api/seans/start` Time Gap Kabulü

**Files:**
- Modify: `src/lib/session-actions.ts`
- Modify: `src/app/api/seans/start/route.ts`

- [ ] **Step 1: `StartSessionInput` curated branch'ine `timeGapLabel?` ekle**

`src/lib/session-actions.ts`:

```ts
// Önce:
export type StartSessionInput =
  | { mode: 'curated'; caseId: string }
  | { mode: 'free'; difficulty: Difficulty; themeHint?: string };

// Sonra:
export type StartSessionInput =
  | { mode: 'curated'; caseId: string; timeGapLabel?: string }
  | { mode: 'free'; difficulty: Difficulty; themeHint?: string };
```

`startSession` içinde sessions insert payload'ına ekle:

```ts
// Önce:
.insert({ user_id: userId, case_id: caseId, series_id: seriesId, status: 'in_progress' })

// Sonra:
.insert({
  user_id: userId,
  case_id: caseId,
  series_id: seriesId,
  status: 'in_progress',
  time_gap_label: input.mode === 'curated' ? input.timeGapLabel ?? null : null,
})
```

- [ ] **Step 2: `/api/seans/start` parse**

`src/app/api/seans/start/route.ts` — `parseBody`'nin curated branch'ini güncelle:

```ts
// Önce:
if (typeof b.case_id === 'string' && b.case_id.length > 0) {
  return { mode: 'curated', caseId: b.case_id };
}

// Sonra:
if (typeof b.case_id === 'string' && b.case_id.length > 0) {
  const gap = typeof b.time_gap_label === 'string' ? b.time_gap_label.trim().slice(0, 60) : '';
  return {
    mode: 'curated',
    caseId: b.case_id,
    timeGapLabel: gap.length > 0 ? gap : undefined,
  };
}
```

- [ ] **Step 3: Mevcut testler regresyon kontrol**

Run: `npm run typecheck && npm test`
Expected: 33+/33+ PASS, mevcut session-actions testleri etkilenmez (varsayılan `timeGapLabel` undefined geçmiş davranışla aynı).

- [ ] **Step 4: Commit**

```bash
git add src/lib/session-actions.ts src/app/api/seans/start/route.ts
git commit -m "feat(session): startSession accepts time_gap_label for follow-up sessions"
```

---

## Task 12: Mesaj Route — Hybrid Memory + Yaşayan Formülasyon + Zaman İpucu

**Files:**
- Modify: `src/app/api/seans/message/route.ts`

- [ ] **Step 1: SessionRow ve fetch'i genişlet**

Mevcut SessionRow tipine `time_gap_label` ekle. Select string'ine `time_gap_label` ekle.

Ayrıca series fetch'i case_series.formulation'ı da çekecek şekilde genişlet:

```ts
type SessionRow = {
  id: string;
  user_id: string;
  status: 'in_progress' | 'completed' | 'abandoned';
  started_at: string;
  series_id: string;
  time_gap_label: string | null;
  case: CaseProfile | null;
};

// select:
.select(
  'id, user_id, status, started_at, series_id, time_gap_label, case:cases(presenting, background, personality, speech_style, goals_hidden, insight_level, defense_style, register)'
)
```

- [ ] **Step 2: Hybrid memory toplama**

Mevcut series-wide history bloğunu hybrid versiyonla değiştir:

```ts
// series'teki tüm seansları çek (mevcut)
const { data: seriesSessions } = await svc
  .from('sessions')
  .select('id, status, started_at, summary')
  .eq('series_id', session.series_id)
  .order('started_at', { ascending: true });

const completedOthers = (seriesSessions ?? []).filter(
  (s) => s.id !== sessionId && s.status === 'completed'
);

// Son 2 completed seans tam transcript için, geri kalanlar özet
const FULL_TRANSCRIPT_COUNT = 2;
const fullSessions = completedOthers.slice(-FULL_TRANSCRIPT_COUNT);
const olderSessions = completedOthers.slice(0, -FULL_TRANSCRIPT_COUNT);

const fullIds = fullSessions.map((s) => s.id);

let fullHistory: Array<{ role: string; content: string }> = [];
if (fullIds.length > 0) {
  const { data: rows } = await svc
    .from('messages')
    .select('role, content, created_at, session_id')
    .in('session_id', fullIds)
    .order('created_at', { ascending: true });
  fullHistory = (rows ?? []).map((m) => ({ role: m.role, content: m.content }));
}

// Özet bloğu (eski seanslardan summary'si olanlar)
type SummaryShape = {
  headline: string;
  key_events: string[];
  promises: string[];
  hypothesis_update: string;
};
const summaries: SummaryShape[] = olderSessions
  .map((s) => s.summary as SummaryShape | null)
  .filter((s): s is SummaryShape => !!s && typeof s === 'object' && typeof s.headline === 'string');

// Yaşayan formülasyon
const { data: seriesRow } = await svc
  .from('case_series')
  .select('formulation')
  .eq('id', session.series_id)
  .maybeSingle();
const livingFormulation = seriesRow?.formulation as
  | { presenting?: string; hypothesis?: string; patterns?: string; next_session?: string }
  | null
  | undefined;

// Bu seansın mesajları
const { data: currentMsgs } = await svc
  .from('messages')
  .select('role, content')
  .eq('session_id', sessionId)
  .order('created_at', { ascending: true });

const prevMsgs = [...fullHistory, ...(currentMsgs ?? [])];
```

- [ ] **Step 3: System prompt extension**

`buildClientSystemPrompt` çağrısının dönüşüne append:

```ts
let systemPrompt = buildClientSystemPrompt(session.case);

if (livingFormulation) {
  const parts = [
    livingFormulation.presenting && `Sunulan: ${livingFormulation.presenting}`,
    livingFormulation.hypothesis && `Hipotez: ${livingFormulation.hypothesis}`,
    livingFormulation.patterns && `Örüntü: ${livingFormulation.patterns}`,
    livingFormulation.next_session && `Sonraki seans hedefi: ${livingFormulation.next_session}`,
  ].filter(Boolean);
  if (parts.length > 0) {
    systemPrompt += `\n\nTerapistin bu vakaya dair mevcut formülasyonu (bağlam için, kendi rolünü bozma):\n${parts.join('\n')}`;
  }
}

if (summaries.length > 0) {
  const block = summaries
    .map(
      (s, i) =>
        `Seans ${i + 1}: ${s.headline}\n  Olaylar: ${s.key_events.join('; ')}\n  Sözler: ${s.promises.join('; ') || '—'}\n  Hipotez: ${s.hypothesis_update}`
    )
    .join('\n\n');
  systemPrompt += `\n\nGeçmiş seans özetleri (eskiden yeniye):\n${block}`;
}

if (fullSessions.length > 0) {
  systemPrompt += `\n\nSon ${fullSessions.length} seansın tam transcript'i aşağıdaki user/assistant mesajlarında; ardından bugünkü seans devam ediyor.`;
}

if (session.time_gap_label) {
  systemPrompt += `\n\nSon seansla bu seans arasında "${session.time_gap_label}" geçti. Açılışını ve referanslarını buna göre kur.`;
}
```

- [ ] **Step 4: Typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/seans/message/route.ts
git commit -m "feat(message): hybrid memory + living formulation + time gap in prompt"
```

---

## Task 13: Rapor — "AI'ın eklemek istediği" Görsel İyileştirme

**Files:**
- Modify: `src/components/report/ReportView.tsx`

Mevcut `formulation_comparison.supervisor_added` zaten görünüyor olabilir (`ReportView` içinde rendering bloğu varsa). Görsel ağırlığı artır: kendi kart bölümü, başlık net.

- [ ] **Step 1: ReportView'da arama**

Mevcut `formulation_comparison`'un render edildiği yeri bul (Grep). Eğer yoksa, formülasyon karşılaştırma bölümünde "supervisor_added" itemlarını ayrı kart olarak göster.

`src/components/report/ReportView.tsx` — `formulation_comparison` doluysa render edilen yerde, `supervisor_added` listesini ayrı bir bölüm haline getir:

```tsx
{report?.formulation_comparison && report.formulation_comparison.supervisor_added.length > 0 && (
  <section className="surface px-6 py-6 mb-12">
    <p className="label-caps mb-3 text-accent">AI'ın eklemek istediği</p>
    <p className="text-sm text-muted mb-5 italic">
      Süpervizörün senin formülasyonuna eklemeyi düşündüğü maddeler. İstersen{' '}
      <a href={`/seri/${props.seriesId}/formulasyon`} className="underline">
        yaşayan formülasyonu düzenle
      </a>{' '}
      üzerinden manuel kopyalayabilirsin.
    </p>
    <ul className="space-y-2">
      {report.formulation_comparison.supervisor_added.map((item, i) => (
        <li key={i} className="text-base leading-relaxed flex gap-3">
          <span className="font-mono text-muted shrink-0">+</span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  </section>
)}
```

Yerleştirme: mevcut formulation_comparison render bloğunun **ardından** veya yerine. Eğer mevcut render zaten varsa, sadece "supervisor_added" alt-bölümünü ayır.

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck && npm test`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/components/report/ReportView.tsx
git commit -m "feat(report): elevate 'AI'ın eklemek istediği' card in formulation comparison"
```

---

## Task 14: Final Verification

- [ ] **Step 1: Bütün testler**

Run: `npm run typecheck && npm test && npm run test:e2e`
Expected: Hepsi PASS (E2E mock olmadan skip olabilir).

- [ ] **Step 2: Manuel sanity (dev, MOCK_OPENAI=false)**
- Curated bir vakayla seri başlat → ilk seans bitir → formülasyon yaz → rapor görünür
- `/seri/[id]` sayfası: yaşayan formülasyon kartında yazdıkların görünür
- "Yeni seans başlat" → modal açılır → "1 hafta sonra" seç → seans açılır
- 2. seans AI'sı ilk mesajda "1 hafta sonra" referansı verir, önceki konuyu hatırlar
- 2. seansı bitir → 1. seansın `summary`'si artık prompt'a dahil olmuyor (son 2 kuralı), 1. seans tam transcript'i girer
- Rapor sayfasında supervisor_added kartı görünür

- [ ] **Step 3: Prod migration**

Cloud Supabase'e `0020` uygula (Supabase MCP veya `supabase db push` ile, kullanıcı onayı ile).

- [ ] **Step 4: Push**

Branch + main FF + push.

---

## Notlar

- **Geriye uyumluluk:** Faz 1 seanslarının `summary` null. Hybrid memory bunları "summary'si null → eski seans olarak özet bloğunda yer almaz" şeklinde atlatır. Son 2 tam transcript kuralı yine geçerli (faz 1 seansları olabildiğince ham olarak girer). Kabul edilebilir bozunum.
- **`sessions.formulation` deprecation:** Bu plan'da kaldırılmaz. Sadece okuma yapan tek yer `/seans/[id]/formulasyon` sayfası (fallback olarak), o da artık önce series.formulation'a bakar. Faz 3'te tamamen kaldırılabilir.
- **Token tasarrufu:** 10. seansta system context Faz 1'de ~30k, Faz 2'de ~6k. Tasarruf belirgin olduğunda Faz 2'nin değerini hissedersin.
- **Crisis safety:** Mevcut güvenlik kuralları (`[ROLE_RESET]`, intihar planı yazma yasağı) tüm seanslarda devam eder. Özet üretici aynı temel profilden besleniyor; ek güvenlik kısıtı gereksiz.
