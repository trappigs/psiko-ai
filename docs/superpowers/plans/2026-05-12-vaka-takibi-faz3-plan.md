# Vaka Takibi Faz 3 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bir vaka serisi kapandığında AI kapanış sentez raporu (özet, gelişim yayı, temalar, gelişim, yakalanmamış fırsatlar, sonraki adımlar) üretir; kullanıcı kapatma öncesi opsiyonel bir refleksiyon notu bırakır. Kapanmış vakalar geçmiş sayfasında ayrı bölümde listelenir.

**Architecture:** Yeni `case_series_reports` tablosu kapanış raporlarını tutar. Yeni `synthesis-generator` servisi tüm seans özetleri + yaşayan formülasyonu okuyup sentez üretir. "Vakayı kapat" akışı tek tıklamadan **ön-onay sayfası** + refleksiyon textarea'sına dönüşür. Yeni `/seri/[id]/kapanis` sayfası raporu gösterir.

**Tech Stack:** Next.js 16, TypeScript, Supabase, OpenAI SDK, Vitest, Tailwind.

**Spec:** `docs/superpowers/specs/2026-05-12-vaka-takibi-faz3-design.md`

---

## File Structure

**Yeni:**
- `supabase/migrations/0021_case_series_reports.sql`
- `src/lib/openai/synthesis-types.ts` — paylaşılan tipler
- `src/lib/openai/synthesis-generator.ts` — generateSeriesSynthesis + validation + mock
- `src/app/seri/[id]/kapat-onay/page.tsx` — kapatma hazırlık sayfası (server)
- `src/components/series/CloseSeriesForm.tsx` — closing_reflection + submit (client)
- `src/app/seri/[id]/kapanis/page.tsx` — sentez raporu görünüm sayfası (server)
- `tests/unit/synthesis-generator.test.ts`

**Değişen:**
- `src/lib/types.ts` — regenerate (case_series_reports tipi)
- `src/lib/openai/mock.ts` — `mockSeriesSynthesis` helper
- `src/app/api/seri/[id]/kapat/route.ts` — closing_reflection alır + sentez üretir + report insert + status update
- `src/app/seri/[id]/page.tsx` — closed dalında "Kapanış raporunu gör →" linki; "Vakayı kapat" linki `/kapat-onay`'a yönlendirir
- `src/components/series/CloseSeriesButton.tsx` — confirm/POST davranışı çıkarılır; sadece bir link wrapper'a dönüşür (veya silinip seri sayfasında `<a>` ile değiştirilir)
- `src/app/gecmis/page.tsx` — üstte "Tamamlanmış vakalar" bölümü

---

## Task 1: DB Migration — `case_series_reports`

**Files:**
- Create: `supabase/migrations/0021_case_series_reports.sql`
- Modify: `src/lib/types.ts` (regenerate)

- [ ] **Step 1: Migration**

```sql
-- supabase/migrations/0021_case_series_reports.sql
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

- [ ] **Step 2: Local uygula**

Run: `npx supabase migration up`
Expected: Migration uygulanır.

- [ ] **Step 3: Tipler**

Run: `npm run db:types`
Expected: `case_series_reports` Row/Insert/Update tipi mevcut.

- [ ] **Step 4: Typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/0021_case_series_reports.sql src/lib/types.ts
git commit -m "feat(db): add case_series_reports table for closing synthesis"
```

---

## Task 2: Synthesis Types

**Files:**
- Create: `src/lib/openai/synthesis-types.ts`

- [ ] **Step 1: Yaz**

```ts
// src/lib/openai/synthesis-types.ts
import type { SessionSummary } from './summary-types';

export type SeriesSynthesis = {
  summary: string;
  arc: string;
  themes: string[];
  growth: string[];
  missed_opportunities: string[];
  next_steps: string;
};

export type CaseProfileLite = {
  presenting: string;
  background: string;
  personality: string;
  speech_style: string;
  goals_hidden: string;
};

export type FormulationLite = {
  presenting?: string;
  hypothesis?: string;
  patterns?: string;
  next_session?: string;
};

export type GenerateSynthesisInput = {
  case: CaseProfileLite;
  sessionCount: number;
  sessionSummaries: SessionSummary[];
  livingFormulation?: FormulationLite | null;
  closingReflection?: string;
};

export type GenerateSynthesisResult = {
  synthesis: SeriesSynthesis;
  token_count: number;
};
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/lib/openai/synthesis-types.ts
git commit -m "feat(openai): series synthesis shared types"
```

---

## Task 3: Mock Series Synthesis

**Files:**
- Modify: `src/lib/openai/mock.ts`
- Create: `tests/unit/synthesis-mock.test.ts`

- [ ] **Step 1: Test**

```ts
// tests/unit/synthesis-mock.test.ts
import { describe, it, expect } from 'vitest';
import { mockSeriesSynthesis } from '@/lib/openai/mock';

describe('mockSeriesSynthesis', () => {
  it('returns SeriesSynthesis shape with non-empty fields', () => {
    const r = mockSeriesSynthesis({ sessionCount: 3 });
    expect(typeof r.synthesis.summary).toBe('string');
    expect(r.synthesis.summary.length).toBeGreaterThan(0);
    expect(typeof r.synthesis.arc).toBe('string');
    expect(Array.isArray(r.synthesis.themes)).toBe(true);
    expect(Array.isArray(r.synthesis.growth)).toBe(true);
    expect(Array.isArray(r.synthesis.missed_opportunities)).toBe(true);
    expect(typeof r.synthesis.next_steps).toBe('string');
    expect(typeof r.token_count).toBe('number');
    expect(r.token_count).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Fail bekle**

Run: `npm test -- synthesis-mock`
Expected: FAIL — `mockSeriesSynthesis` exported değil.

- [ ] **Step 3: `mock.ts` sonuna ekle**

```ts
// src/lib/openai/mock.ts'in en altına:
import type {
  GenerateSynthesisInput,
  GenerateSynthesisResult,
} from './synthesis-types';

export function mockSeriesSynthesis(
  input: Pick<GenerateSynthesisInput, 'sessionCount'>
): GenerateSynthesisResult {
  return {
    synthesis: {
      summary: `Mock kapanış sentezi — ${input.sessionCount} seans boyunca süren bir vaka takibi.`,
      arc: 'Erken seanslarda yüzeyde kalan iletişim zamanla derinleşti; orta dönemde direnç belirgindi, son seanslarda iç gözlem arttı.',
      themes: [
        'Aileyle kopukluk yinelendi',
        'Bedensel ifade artarak gelişti',
        'Mizah savunma olarak kullanıldı',
      ],
      growth: [
        'Açık-uçlu soru kullanımı pekişti',
        'Sessizliği tolere etmeye başladın',
        'Yansıtmaya geçişte daha doğal oldun',
      ],
      missed_opportunities: [
        'Erken seansta bahsedilen kayıp tema yeterince takip edilmedi',
        'Bedensel sinyalleri kelimeleştirme bazen erkenden bırakıldı',
      ],
      next_steps:
        'Bir sonraki kısa süreli vakada erken sinyalleri etiketleyip seans planına bağlamak iyi bir gelişim hedefi olabilir.',
    },
    token_count: 1500,
  };
}
```

(Note: import statement zaten mevcut import bloğuna eklenir; dosyanın en altına eklemek yerine import en üste taşıyabilir.)

- [ ] **Step 4: Test yeşil**

Run: `npm test -- synthesis-mock`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/openai/mock.ts tests/unit/synthesis-mock.test.ts
git commit -m "feat(openai): mockSeriesSynthesis for dev/test"
```

---

## Task 4: Synthesis Generator Service

**Files:**
- Create: `src/lib/openai/synthesis-generator.ts`
- Create: `tests/unit/synthesis-generator.test.ts`

- [ ] **Step 1: Test**

```ts
// tests/unit/synthesis-generator.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  validateSeriesSynthesis,
  generateSeriesSynthesis,
} from '@/lib/openai/synthesis-generator';

describe('validateSeriesSynthesis', () => {
  const valid = {
    summary: 's',
    arc: 'a',
    themes: ['t1'],
    growth: ['g1'],
    missed_opportunities: [],
    next_steps: 'n',
  };
  it('accepts complete synthesis', () => {
    expect(validateSeriesSynthesis(valid)).toEqual(valid);
  });
  it('rejects empty summary', () => {
    expect(() => validateSeriesSynthesis({ ...valid, summary: '' })).toThrow();
  });
  it('rejects empty arc', () => {
    expect(() => validateSeriesSynthesis({ ...valid, arc: '' })).toThrow();
  });
  it('rejects empty next_steps', () => {
    expect(() => validateSeriesSynthesis({ ...valid, next_steps: '' })).toThrow();
  });
  it('coerces non-array arrays to []', () => {
    const r = validateSeriesSynthesis({ ...valid, themes: undefined });
    expect(r.themes).toEqual([]);
  });
});

describe('generateSeriesSynthesis (mock mode)', () => {
  beforeEach(() => {
    vi.stubEnv('MOCK_OPENAI', 'true');
  });
  it('returns synthesis + token_count via mock when MOCK_OPENAI=true', async () => {
    const r = await generateSeriesSynthesis({
      case: {
        presenting: 'p',
        background: 'b',
        personality: 'x',
        speech_style: 's',
        goals_hidden: 'g',
      },
      sessionCount: 3,
      sessionSummaries: [
        {
          headline: 'h',
          key_events: ['e'],
          promises: [],
          hypothesis_update: 'u',
        },
      ],
    });
    expect(r.synthesis.summary.length).toBeGreaterThan(0);
    expect(r.token_count).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Fail bekle**

Run: `npm test -- synthesis-generator.test`
Expected: FAIL.

- [ ] **Step 3: Servis**

```ts
// src/lib/openai/synthesis-generator.ts
import { getOpenAI, MODEL, isMockMode } from './client';
import { mockSeriesSynthesis } from './mock';
import type {
  SeriesSynthesis,
  GenerateSynthesisInput,
  GenerateSynthesisResult,
} from './synthesis-types';

export type {
  SeriesSynthesis,
  GenerateSynthesisInput,
  GenerateSynthesisResult,
} from './synthesis-types';

export function validateSeriesSynthesis(raw: unknown): SeriesSynthesis {
  if (!raw || typeof raw !== 'object') throw new Error('not_object');
  const r = raw as Record<string, unknown>;
  const summary = typeof r.summary === 'string' ? r.summary.trim() : '';
  if (!summary) throw new Error('invalid_summary');
  const arc = typeof r.arc === 'string' ? r.arc.trim() : '';
  if (!arc) throw new Error('invalid_arc');
  const next_steps = typeof r.next_steps === 'string' ? r.next_steps.trim() : '';
  if (!next_steps) throw new Error('invalid_next_steps');

  const coerceArr = (v: unknown): string[] =>
    Array.isArray(v)
      ? (v as unknown[])
          .filter((x): x is string => typeof x === 'string')
          .map((x) => x.slice(0, 240))
          .slice(0, 8)
      : [];

  return {
    summary: summary.slice(0, 1500),
    arc: arc.slice(0, 1500),
    themes: coerceArr(r.themes),
    growth: coerceArr(r.growth),
    missed_opportunities: coerceArr(r.missed_opportunities),
    next_steps: next_steps.slice(0, 1000),
  };
}

function buildPrompt(input: GenerateSynthesisInput): string {
  const lines: string[] = [];
  lines.push(`Vakanın temel profili (öğrenci bunu hiç dosya olarak okumadıysa AI üretti):`);
  lines.push(`- Sunulan sorun: ${input.case.presenting}`);
  lines.push(`- Geçmiş: ${input.case.background}`);
  lines.push(`- Kişilik: ${input.case.personality}`);
  lines.push(`- Konuşma stili: ${input.case.speech_style}`);
  lines.push(`- Gizli mesele: ${input.case.goals_hidden}`);
  lines.push(`\nSeri toplam ${input.sessionCount} seanstan oluştu.\n`);

  if (input.sessionSummaries.length > 0) {
    lines.push('Tüm seans özetleri (kronolojik):');
    input.sessionSummaries.forEach((s, i) => {
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
      lines.push('\nÖğrencinin final formülasyonu:');
      lines.push(parts.join('\n'));
    }
  }

  if (input.closingReflection) {
    lines.push(`\nÖğrencinin kapanış notu: ${input.closingReflection}`);
  }

  lines.push('\nŞu JSON schema\'ya birebir uy, sadece tek bir JSON nesnesi döndür:');
  lines.push('{');
  lines.push('  "summary": string,              // 1 paragraf, vakanın bütününü yansıtan açılış');
  lines.push('  "arc": string,                  // 1 paragraf, seri boyunca gözlenen gelişim yayı');
  lines.push('  "themes": string[],             // 3-5 madde, klinik temalar (her madde 1 cümle)');
  lines.push('  "growth": string[],             // 3-5 madde, öğrencinin görünür gelişimi');
  lines.push('  "missed_opportunities": string[], // 2-4 madde, yakalanmamış fırsatlar');
  lines.push('  "next_steps": string             // 1-2 cümle, öğrenci için sonraki vakaya pratik tavsiye');
  lines.push('}');
  return lines.join('\n');
}

export async function generateSeriesSynthesis(
  input: GenerateSynthesisInput
): Promise<GenerateSynthesisResult> {
  if (isMockMode()) {
    return mockSeriesSynthesis(input);
  }
  const openai = getOpenAI();
  const resp = await openai.chat.completions.create({
    model: MODEL,
    temperature: 0.5,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content:
          'Sen psikoterapi süpervizör asistanısın. Bir vaka serisinin tamamını okuyup öğrenciye kapsamlı, eylem-odaklı kapanış raporu üretiyorsun. Çıktın yalnız geçerli JSON olur.',
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
  const validated = validateSeriesSynthesis(raw);
  return { synthesis: validated, token_count: tokens };
}
```

- [ ] **Step 4: Test yeşil**

Run: `npm test -- synthesis-generator.test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/openai/synthesis-generator.ts tests/unit/synthesis-generator.test.ts
git commit -m "feat(openai): generateSeriesSynthesis service with validation"
```

---

## Task 5: `/api/seri/[id]/kapat` — Sentez Entegrasyonu

**Files:**
- Modify: `src/app/api/seri/[id]/kapat/route.ts`

Mevcut endpoint sadece status='closed' update yapıyor. Yeni: closing_reflection body alır, seans verilerini fetch eder, sentez üretir, raporu insert eder, status update eder. Üretim hatasında status değişmez.

- [ ] **Step 1: Endpoint'i yeniden yaz**

```ts
// src/app/api/seri/[id]/kapat/route.ts
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { NextResponse } from 'next/server';
import { generateSeriesSynthesis } from '@/lib/openai/synthesis-generator';
import type { SessionSummary } from '@/lib/openai/summary-types';

type SeriesData = {
  id: string;
  user_id: string;
  status: 'open' | 'closed';
  formulation: unknown;
  case: {
    presenting: string;
    background: string;
    personality: string;
    speech_style: string;
    goals_hidden: string;
  } | null;
};

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
  const closingReflection =
    typeof body.closing_reflection === 'string'
      ? body.closing_reflection.trim().slice(0, 2000)
      : '';

  const svc = createServiceClient();

  const { data: seriesRow } = await svc
    .from('case_series')
    .select(
      'id, user_id, status, formulation, case:cases(presenting, background, personality, speech_style, goals_hidden)'
    )
    .eq('id', seriesId)
    .maybeSingle();
  const series = seriesRow as unknown as SeriesData | null;
  if (!series || series.user_id !== user.id) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  if (series.status === 'closed') {
    return NextResponse.json({ error: 'already_closed' }, { status: 409 });
  }
  if (!series.case) {
    return NextResponse.json({ error: 'case_missing' }, { status: 500 });
  }

  const { data: active } = await svc
    .from('sessions')
    .select('id')
    .eq('series_id', seriesId)
    .eq('status', 'in_progress')
    .maybeSingle();
  if (active) {
    return NextResponse.json({ error: 'active_session_exists' }, { status: 409 });
  }

  const { data: sessionRows } = await svc
    .from('sessions')
    .select('id, summary, started_at')
    .eq('series_id', seriesId)
    .eq('status', 'completed')
    .order('started_at', { ascending: true });

  const sessionSummaries: SessionSummary[] = (sessionRows ?? [])
    .map((r) => r.summary as SessionSummary | null)
    .filter(
      (s): s is SessionSummary =>
        !!s && typeof s === 'object' && typeof s.headline === 'string'
    );

  const livingFormulation =
    (series.formulation as {
      presenting?: string;
      hypothesis?: string;
      patterns?: string;
      next_session?: string;
    } | null) ?? null;

  let result;
  try {
    result = await generateSeriesSynthesis({
      case: series.case,
      sessionCount: (sessionRows ?? []).length,
      sessionSummaries,
      livingFormulation,
      closingReflection: closingReflection || undefined,
    });
  } catch {
    return NextResponse.json({ error: 'synthesis_failed' }, { status: 502 });
  }

  const { error: insertErr } = await svc.from('case_series_reports').insert({
    series_id: seriesId,
    closing_reflection: closingReflection || null,
    summary: result.synthesis.summary,
    arc: result.synthesis.arc,
    themes: result.synthesis.themes,
    growth: result.synthesis.growth,
    missed_opportunities: result.synthesis.missed_opportunities,
    final_formulation: livingFormulation,
    next_steps: result.synthesis.next_steps,
  });
  if (insertErr) {
    return NextResponse.json({ error: 'report_insert_failed' }, { status: 500 });
  }

  const { error: closeErr } = await svc
    .from('case_series')
    .update({ status: 'closed', closed_at: new Date().toISOString() })
    .eq('id', seriesId);
  if (closeErr) {
    return NextResponse.json({ error: 'close_failed' }, { status: 500 });
  }

  // Token muhasebesi
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
      session_count: usage?.session_count ?? 0,
      token_count: (usage?.token_count ?? 0) + result.token_count,
    },
    { onConflict: 'user_id,day' }
  );

  return NextResponse.json({
    ok: true,
    report_url: `/seri/${seriesId}/kapanis`,
  });
}
```

- [ ] **Step 2: Typecheck + testler**

Run: `npm run typecheck && npm test`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add "src/app/api/seri/[id]/kapat/route.ts"
git commit -m "feat(close): synthesize closing report on series close"
```

---

## Task 6: `/seri/[id]/kapat-onay` Sayfası + Form

**Files:**
- Create: `src/components/series/CloseSeriesForm.tsx`
- Create: `src/app/seri/[id]/kapat-onay/page.tsx`

- [ ] **Step 1: Form bileşeni**

```tsx
// src/components/series/CloseSeriesForm.tsx
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function CloseSeriesForm({ seriesId }: { seriesId: string }) {
  const router = useRouter();
  const [reflection, setReflection] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/seri/${seriesId}/kapat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        closing_reflection: reflection.trim() || undefined,
      }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      const code = String(body.error ?? 'internal');
      if (code === 'active_session_exists') setError('Açık bir seans var. Önce onu bitir.');
      else if (code === 'already_closed') setError('Bu vaka zaten kapanmış.');
      else if (code === 'synthesis_failed') setError('Rapor üretilemedi, tekrar dene.');
      else setError('Bir şey ters gitti, tekrar dene.');
      setLoading(false);
      return;
    }
    const { report_url } = await res.json();
    router.push(report_url ?? `/seri/${seriesId}/kapanis`);
  }

  return (
    <div className="space-y-6">
      <label className="block">
        <span className="label-caps mb-2 block">
          Bu vakadan ne öğrendin? <span className="text-muted">(opsiyonel)</span>
        </span>
        <p className="text-xs text-muted italic mb-3">
          Klinik veya kişisel bir not — süpervizör raporu yazılırken hesaba katılır.
        </p>
        <textarea
          value={reflection}
          onChange={(e) => setReflection(e.target.value)}
          rows={6}
          maxLength={2000}
          placeholder="…"
          className="w-full"
          style={{
            fontFamily: 'var(--font-serif)',
            fontStyle: 'italic',
            fontSize: '1rem',
            lineHeight: '1.65',
            resize: 'vertical',
          }}
        />
      </label>

      {error && (
        <p className="text-sm text-danger border-l-2 border-danger pl-3 py-1" role="alert">
          {error}
        </p>
      )}

      <div className="flex items-center justify-between gap-4 pt-6 border-t border-rule flex-wrap">
        <a href={`/seri/${seriesId}`} className="btn-quiet">
          Vazgeç
        </a>
        <button onClick={submit} disabled={loading} className="btn-primary">
          {loading ? 'Süpervizör seriyi okuyor…' : 'Vakayı kapat ve raporu üret →'}
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Sayfa**

```tsx
// src/app/seri/[id]/kapat-onay/page.tsx
import { createClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import { AppShell } from '@/components/shell/AppShell';
import { LivingFormulationCard } from '@/components/series/LivingFormulationCard';
import { CloseSeriesForm } from '@/components/series/CloseSeriesForm';
import { parseFormulation } from '@/lib/formulation';

type SeriesRow = {
  id: string;
  user_id: string;
  status: 'open' | 'closed';
  formulation: unknown;
  case: { id: string; title: string } | null;
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
    .select('id, user_id, status, formulation, case:cases(id, title)')
    .eq('id', id)
    .maybeSingle();
  const series = data as unknown as SeriesRow | null;
  if (!series || series.user_id !== user.id || !series.case) notFound();
  if (series.status === 'closed') redirect(`/seri/${id}/kapanis`);

  const { count: sessionCount } = await sb
    .from('sessions')
    .select('id', { count: 'exact', head: true })
    .eq('series_id', id)
    .eq('status', 'completed');

  const livingFormulation = parseFormulation(series.formulation);

  return (
    <AppShell userEmail={user.email}>
      <div className="max-w-2xl mx-auto px-6 md:px-10 py-8 md:py-12">
        <nav className="mb-8">
          <a href={`/seri/${id}`} className="btn-quiet text-xs">
            ← Seri sayfası
          </a>
        </nav>

        <header className="mb-10">
          <p className="label-caps mb-3">Vaka kapanıyor</p>
          <h1 className="font-display text-4xl md:text-5xl leading-[1.05] tracking-tight">
            <em className="font-display-italic">{series.case.title}</em>
          </h1>
          <p className="text-ink-soft mt-3 text-sm md:text-base max-w-lg leading-relaxed">
            {sessionCount ?? 0} seans yaptın. Bir sonraki adımda süpervizör seri bütününü okuyup
            kapanış raporu üretecek.
          </p>
        </header>

        <LivingFormulationCard seriesId={series.id} formulation={livingFormulation} />

        <CloseSeriesForm seriesId={series.id} />
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
git add src/components/series/CloseSeriesForm.tsx "src/app/seri/[id]/kapat-onay/page.tsx"
git commit -m "feat(series): kapat-onay preparation page with closing reflection form"
```

---

## Task 7: `/seri/[id]/kapanis` Sayfası

**Files:**
- Create: `src/app/seri/[id]/kapanis/page.tsx`

- [ ] **Step 1: Sayfa**

```tsx
// src/app/seri/[id]/kapanis/page.tsx
import { createClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import { AppShell } from '@/components/shell/AppShell';

type SeriesRow = {
  id: string;
  user_id: string;
  status: 'open' | 'closed';
  closed_at: string | null;
  case: { id: string; title: string } | null;
};

type ReportRow = {
  closing_reflection: string | null;
  summary: string;
  arc: string;
  themes: string[];
  growth: string[];
  missed_opportunities: string[];
  final_formulation: {
    presenting?: string;
    hypothesis?: string;
    patterns?: string;
    next_session?: string;
  } | null;
  next_steps: string;
  generated_at: string;
};

function toStringList(v: unknown): string[] {
  return Array.isArray(v) ? v.map((x) => String(x)) : [];
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) redirect('/login');

  const { data: seriesData } = await sb
    .from('case_series')
    .select('id, user_id, status, closed_at, case:cases(id, title)')
    .eq('id', id)
    .maybeSingle();
  const series = seriesData as unknown as SeriesRow | null;
  if (!series || series.user_id !== user.id || !series.case) notFound();

  const { data: rawReport } = await sb
    .from('case_series_reports')
    .select(
      'closing_reflection, summary, arc, themes, growth, missed_opportunities, final_formulation, next_steps, generated_at'
    )
    .eq('series_id', id)
    .maybeSingle();
  if (!rawReport) notFound();

  const report: ReportRow = {
    closing_reflection: (rawReport.closing_reflection as string) ?? null,
    summary: rawReport.summary as string,
    arc: rawReport.arc as string,
    themes: toStringList(rawReport.themes),
    growth: toStringList(rawReport.growth),
    missed_opportunities: toStringList(rawReport.missed_opportunities),
    final_formulation: (rawReport.final_formulation as ReportRow['final_formulation']) ?? null,
    next_steps: rawReport.next_steps as string,
    generated_at: rawReport.generated_at as string,
  };

  return (
    <AppShell userEmail={user.email}>
      <main className="max-w-2xl mx-auto px-6 md:px-10 py-10 md:py-16">
        <a href={`/seri/${id}`} className="btn-quiet text-xs">
          ← Seri sayfası
        </a>

        <header className="mt-12 mb-16">
          <p className="label-caps mb-4">Kapanış raporu</p>
          <h1 className="font-display text-5xl md:text-6xl leading-[0.98]">
            <em className="font-display-italic">{series.case.title}</em>
          </h1>
          <p className="mt-6 text-sm text-muted font-mono">
            {new Date(report.generated_at).toLocaleDateString('tr-TR', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </p>
        </header>

        <hr className="rule mb-16" />

        <section className="mb-16">
          <p className="label-caps mb-3">Özet</p>
          <p className="text-base leading-relaxed">{report.summary}</p>
        </section>

        <section className="mb-16">
          <p className="label-caps mb-3">Vakanın yayı</p>
          <p className="font-display-italic text-xl leading-relaxed text-ink">{report.arc}</p>
        </section>

        <div className="grid md:grid-cols-2 gap-10 mb-16">
          {report.themes.length > 0 && (
            <section>
              <p className="label-caps mb-3">Temalar</p>
              <ul className="space-y-3">
                {report.themes.map((t, i) => (
                  <li key={i} className="text-sm leading-relaxed border-l-2 border-rule pl-3">
                    {t}
                  </li>
                ))}
              </ul>
            </section>
          )}
          {report.growth.length > 0 && (
            <section>
              <p className="label-caps mb-3 text-accent">Senin gelişimin</p>
              <ul className="space-y-3">
                {report.growth.map((g, i) => (
                  <li
                    key={i}
                    className="text-sm leading-relaxed border-l-2 border-accent pl-3"
                  >
                    {g}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        {report.missed_opportunities.length > 0 && (
          <section className="mb-16">
            <p
              className="label-caps mb-3"
              style={{ color: 'var(--color-gilt)' }}
            >
              Yakalanmamış fırsatlar
            </p>
            <ul className="space-y-3">
              {report.missed_opportunities.map((m, i) => (
                <li
                  key={i}
                  className="text-sm leading-relaxed border-l-2 pl-3"
                  style={{ borderColor: 'var(--color-gilt)' }}
                >
                  {m}
                </li>
              ))}
            </ul>
          </section>
        )}

        {report.final_formulation && (
          <section className="surface-deep px-6 py-6 mb-16">
            <p className="label-caps mb-4">Final formülasyon</p>
            <div className="space-y-4">
              {report.final_formulation.presenting && (
                <Row label="Sunulan sorun" text={report.final_formulation.presenting} />
              )}
              {report.final_formulation.hypothesis && (
                <Row label="Hipotez" text={report.final_formulation.hypothesis} />
              )}
              {report.final_formulation.patterns && (
                <Row label="Örüntüler" text={report.final_formulation.patterns} />
              )}
              {report.final_formulation.next_session && (
                <Row label="Sonraki seans (planlanan)" text={report.final_formulation.next_session} />
              )}
            </div>
          </section>
        )}

        {report.closing_reflection && (
          <section className="mb-16">
            <p className="label-caps mb-3">Kapanış notun</p>
            <p className="font-display-italic text-lg leading-relaxed text-ink-soft">
              {report.closing_reflection}
            </p>
          </section>
        )}

        <section className="mb-16">
          <p className="label-caps mb-3">Sonraki adımlar</p>
          <p className="text-base leading-relaxed">{report.next_steps}</p>
        </section>
      </main>
    </AppShell>
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

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add "src/app/seri/[id]/kapanis/page.tsx"
git commit -m "feat(series): /seri/[id]/kapanis closing synthesis report page"
```

---

## Task 8: `/seri/[id]` — Closed Branch ve "Vakayı kapat" Refactor

**Files:**
- Modify: `src/app/seri/[id]/page.tsx`
- Modify: `src/components/series/CloseSeriesButton.tsx` (basitleştir/anchor'a çevir)

`CloseSeriesButton` mevcut: confirm + POST davranışlı client component. Yeni kapatma akışında POST direkt API'ye gitmiyor; önce `/kapat-onay` sayfasına gidilmesi gerekiyor. Button'u sadece bir link wrapper haline getir (veya kaldır ve seri sayfasında inline `<a>` koy). En basit: component'i kaldırıp seri sayfasında doğrudan `<a>` kullan.

- [ ] **Step 1: `CloseSeriesButton` dosyasını sil**

```bash
git rm src/components/series/CloseSeriesButton.tsx
```

- [ ] **Step 2: `/seri/[id]/page.tsx`'i güncelle**

(a) `CloseSeriesButton` import'unu kaldır.
(b) Mevcut `<CloseSeriesButton seriesId={series.id} />` referansını `<a href={\`/seri/${series.id}/kapat-onay\`}>` ile değiştir.
(c) `status='closed'` ise üste "Kapanış raporunu gör →" linki ekle.

`src/app/seri/[id]/page.tsx` — alt aksiyon bloğunu güncelle:

Mevcut:
```tsx
{isOpen && (
  <div className="flex items-center justify-between gap-4 flex-wrap pt-6 border-t border-rule">
    {/* yeni seans + close */}
    <CloseSeriesButton seriesId={series.id} />
  </div>
)}
```

Yeni:
```tsx
{!isOpen && (
  <div className="mb-10">
    <a href={`/seri/${series.id}/kapanis`} className="btn-primary">
      Kapanış raporunu gör →
    </a>
  </div>
)}

{isOpen && (
  <div className="flex items-center justify-between gap-4 flex-wrap pt-6 border-t border-rule">
    {/* mevcut yeni seans buton bloğu */}
    <a href={`/seri/${series.id}/kapat-onay`} className="btn-quiet">
      Vakayı kapat
    </a>
  </div>
)}
```

(Closed branch'i isteğe göre header'ın hemen altında veya seans listesinin üstünde göster — okunabilirliğe göre karar ver.)

Import line'ını da temizle: `import { CloseSeriesButton } from '@/components/series/CloseSeriesButton';` satırını sil.

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add "src/app/seri/[id]/page.tsx" src/components/series/CloseSeriesButton.tsx
git commit -m "feat(series): close-series goes through kapat-onay; show report link when closed"
```

---

## Task 9: Geçmiş Sayfası — "Tamamlanmış Vakalar" Bölümü

**Files:**
- Modify: `src/app/gecmis/page.tsx`

- [ ] **Step 1: Sayfayı genişlet**

`src/app/gecmis/page.tsx` — kullanıcının kapanmış serilerini fetch et + üstte yeni section render et:

```ts
// Mevcut sessions fetch'inin yanına ekle:
type ClosedSeriesRow = {
  id: string;
  closed_at: string | null;
  case: { title: string } | null;
  session_count: number;
};

const { data: closedSeriesData } = await sb
  .from('case_series')
  .select('id, closed_at, case:cases(title)')
  .eq('user_id', user.id)
  .eq('status', 'closed')
  .order('closed_at', { ascending: false });

const closedSeriesList = (closedSeriesData ?? []) as Array<{
  id: string;
  closed_at: string | null;
  case: { title: string } | null;
}>;

// Her seri için seans sayısı (basit n+1 ama küçük list)
const seriesWithCounts: ClosedSeriesRow[] = await Promise.all(
  closedSeriesList.map(async (s) => {
    const { count } = await sb
      .from('sessions')
      .select('id', { count: 'exact', head: true })
      .eq('series_id', s.id);
    return { ...s, session_count: count ?? 0 };
  })
);
```

JSX'de mevcut header sonrasına ekle:

```tsx
{seriesWithCounts.length > 0 && (
  <section className="mb-12">
    <p className="label-caps mb-6">Tamamlanmış vakalar</p>
    <ol className="surface divide-y divide-rule overflow-hidden">
      {seriesWithCounts.map((s) => (
        <li key={s.id}>
          <a href={`/seri/${s.id}/kapanis`} className="index-row">
            <span className="min-w-0">
              <span className="block index-title">
                <em className="font-display-italic">{s.case?.title ?? '—'}</em>
              </span>
              <span className="block mt-1 text-xs text-muted font-mono">
                {s.session_count} seans
                {s.closed_at && (
                  <> · {new Date(s.closed_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' })}</>
                )}
              </span>
            </span>
            <span className="index-meta">Kapanış raporu</span>
            <span className="font-mono text-base text-muted">→</span>
          </a>
        </li>
      ))}
    </ol>
  </section>
)}
```

Mevcut "Geçmiş seanslar" listesinin üstüne yerleştirilir. 0 kapanmış seri varsa hiç render edilmez.

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/app/gecmis/page.tsx
git commit -m "feat(history): 'Tamamlanmış vakalar' section listing closed series"
```

---

## Task 10: Final Verification + Prod Migration + Push

- [ ] **Step 1: Tüm testler**

Run: `npm run typecheck && npm test`
Expected: PASS.

- [ ] **Step 2: Manuel sanity (dev, MOCK_OPENAI=true ile)**
- /seri/[id] aç → "Vakayı kapat" tıkla → /kapat-onay sayfasında refleksiyon yaz → "Kapanış raporu üret" → /kapanis sayfası açılır, tüm bölümler dolu
- /gecmis: "Tamamlanmış vakalar" bölümü görünür, link çalışır

- [ ] **Step 3: Prod migration**

`0021_case_series_reports.sql` Supabase MCP ile prod'a apply (kullanıcı onayıyla).

- [ ] **Step 4: Push branch + main**

```bash
git push origin feat/mvp-scaffold
git checkout main && git merge --ff-only feat/mvp-scaffold && git push origin main
git checkout feat/mvp-scaffold
```

---

## Notlar

- **Geriye uyumluluk:** Faz 1/2'den önce kapanmış seriler `case_series_reports`'a sahip değil. `/seri/[id]/kapanis` rotası bunlar için 404 verir. Geçmiş sayfasında bunlar gözükür ama link 404'e gider. Kalıcı YAGNI.
- **Sentez hatası:** OpenAI başarısız olursa seri kapanmaz. Kullanıcı `/kapat-onay`'a geri gönderilir ve "Rapor üretilemedi, tekrar dene" mesajı görür.
- **Aktif seans:** Mevcut Faz 1 davranışı kalır — açık seans varken kapatılamaz.
- **Token muhasebesi:** Sentez üretimi günlük token limit'ine dahildir.
- **Plan dosyaları:** Faz 1, 2, 3 spec ve plan dosyaları `docs/superpowers/{specs,plans}/` altında. Faz 3 son aşama; daha sonraki bir iyileştirme planı yok (Faz 1 spec'inde park edilen "v1.1+" özellikleri ayrı kapsam).
