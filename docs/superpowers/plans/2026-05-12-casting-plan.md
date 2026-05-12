# Casting (Parametreli 3-Aday Üretimi) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Yeni `/dosya-yarat` rotasında 12 parametre + tek API çağrısında 3 aday üretimi + kart grid + detay modal + seans başlatma akışı. Mevcut "blind" serbest seans akışı dokunulmaz.

**Architecture:** Yeni `case-candidates-generator.ts` servisi OpenAI'dan 3 varyasyonu tek schema-locked JSON ile alır. `/api/danisan-aday/uret` endpoint'i 3 aday'ı `cases` tablosuna `source='ai_generated'`, `is_active=false` insert eder ve detay verisini response'da döner (RLS sebebiyle DB'den re-fetch yok). Kullanıcı modal'da seçim yapınca mevcut `/api/seans/start` `{ case_id }` ile seans başlatılır.

**Tech Stack:** Next.js 16, TypeScript, OpenAI SDK, Supabase, Vitest, Tailwind.

**Spec:** `docs/superpowers/specs/2026-05-12-casting-design.md`

---

## File Structure

**Yeni:**
- `src/lib/openai/casting-types.ts` — `CastingParams`, `CandidateCase`, response tipleri
- `src/lib/openai/case-candidates-generator.ts` — `generateCaseCandidates` + validation + mock
- `src/app/api/danisan-aday/uret/route.ts` — POST endpoint
- `src/app/dosya-yarat/page.tsx` — server component (auth + render)
- `src/components/casting/CastingFlow.tsx` — client state machine (form → loading → candidates → detail → starting)
- `src/components/casting/CastingForm.tsx` — 12 parametre formu (client)
- `src/components/casting/CandidateCard.tsx` — kart bileşeni
- `src/components/casting/CandidateDetailModal.tsx` — detay modal + başlat butonu
- `src/components/case/CastingTrigger.tsx` — anasayfa kart linki
- `tests/unit/case-candidates-generator.test.ts`

**Değişen:**
- `src/lib/openai/mock.ts` — `mockCandidatesResponse` helper
- `src/app/page.tsx` — `CastingTrigger` mount (`FreeSessionTrigger` yanına)

**DB migration yok** — mevcut `cases` schema yeterli; `variant_label` sadece response'da var (kalıcı saklanmaz).

---

## Task 1: Casting Types

**Files:**
- Create: `src/lib/openai/casting-types.ts`

- [ ] **Step 1: Yaz**

```ts
// src/lib/openai/casting-types.ts
import type { GeneratedCase, Difficulty } from './case-types';

export type AgeRange = 'ergen' | 'genc_yetiskin' | 'orta_yas' | 'ileri_yas';
export type Gender = 'kadin' | 'erkek' | 'non_binary' | 'belirtmek_istemiyor';
export type CultureSegment = 'tr_koylu' | 'tr_sehirli' | 'tr_diaspora' | 'serbest';
export type Occupation =
  | 'ogrenci' | 'beyaz_yaka' | 'mavi_yaka' | 'esnaf' | 'issiz' | 'emekli';
export type RelationshipStatus = 'bekar' | 'iliskide' | 'evli' | 'ayrilmis' | 'dul';
export type FamilyStructure = 'tek_cocuk' | 'kalabalik' | 'ayri_ebeveyn' | 'vefat_ebeveyn';
export type ReferralSource = 'kendi' | 'aile' | 'sevgili' | 'mahkeme' | 'okul_is';
export type ResistanceLevel = 'direngen' | 'dengeli' | 'isbirlikci';
export type SchoolFit = 'cbt' | 'psikodinamik' | 'humanistik' | 'sistemik';
export type PriorTherapy = 'ilk_kez' | 'kisa_sure' | 'uzun_gecmis';
export type VariantLabel = 'Daha açık' | 'Dengeli' | 'Direngen';

export type CastingParams = {
  age_range?: AgeRange;
  gender?: Gender;
  culture_segment?: CultureSegment;
  culture_freetext?: string;
  occupation?: Occupation;
  relationship_status?: RelationshipStatus;
  family_structure?: FamilyStructure;
  referral_source?: ReferralSource;
  difficulty?: Difficulty;
  resistance_level?: ResistanceLevel;
  school_fit?: SchoolFit;
  prior_therapy?: PriorTherapy;
  theme_hint?: string;
};

export type CandidateCase = GeneratedCase & {
  variant_label: VariantLabel;
};

export type GenerateCandidatesResult = {
  candidates: CandidateCase[]; // length 3
  token_count: number;
};
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/lib/openai/casting-types.ts
git commit -m "feat(openai): casting params and candidate types"
```

---

## Task 2: Mock Candidates Helper

**Files:**
- Modify: `src/lib/openai/mock.ts`
- Create: `tests/unit/casting-mock.test.ts`

- [ ] **Step 1: Test**

```ts
// tests/unit/casting-mock.test.ts
import { describe, it, expect } from 'vitest';
import { mockCandidatesResponse } from '@/lib/openai/mock';

describe('mockCandidatesResponse', () => {
  it('returns exactly 3 candidates with variant labels', () => {
    const r = mockCandidatesResponse({});
    expect(r.candidates).toHaveLength(3);
    const labels = r.candidates.map((c) => c.variant_label);
    expect(labels).toContain('Daha açık');
    expect(labels).toContain('Dengeli');
    expect(labels).toContain('Direngen');
  });

  it('returns token_count > 0', () => {
    const r = mockCandidatesResponse({});
    expect(r.token_count).toBeGreaterThan(0);
  });

  it('each candidate has full GeneratedCase shape', () => {
    const r = mockCandidatesResponse({ difficulty: 'medium' });
    for (const c of r.candidates) {
      expect(typeof c.title).toBe('string');
      expect(typeof c.presenting).toBe('string');
      expect(typeof c.background).toBe('string');
      expect(typeof c.goals_hidden).toBe('string');
      expect(c.difficulty).toBe('medium');
    }
  });
});
```

- [ ] **Step 2: Fail bekle**

Run: `npm test -- casting-mock`
Expected: FAIL — `mockCandidatesResponse` exported değil.

- [ ] **Step 3: `mock.ts` sonuna ekle**

```ts
// src/lib/openai/mock.ts en üstündeki import bloğuna ekle:
import type {
  CastingParams,
  GenerateCandidatesResult,
  VariantLabel,
} from './casting-types';

// Dosyanın sonuna ekle:
export function mockCandidatesResponse(
  params: CastingParams
): GenerateCandidatesResult {
  const difficulty = params.difficulty ?? 'medium';
  const variants: Array<{
    label: VariantLabel;
    personality: string;
    speech_style: string;
    defense_style: string;
    insight_level: string;
  }> = [
    {
      label: 'Daha açık',
      personality: 'Sıcak, kolay açılan, terapiste hızlı güvenen.',
      speech_style: 'Uzun, akıcı cümleler; duyguları kelimeleştirir.',
      defense_style: 'rasyonalizasyon',
      insight_level: 'high',
    },
    {
      label: 'Dengeli',
      personality: 'Tedirgin ama denemeye açık; ölçülü.',
      speech_style: 'Orta uzunlukta cümleler, zaman zaman duraksar.',
      defense_style: 'kaçınma',
      insight_level: 'moderate',
    },
    {
      label: 'Direngen',
      personality: 'Mesafeli, gözlerini kaçıran, soruları kapatmaya çalışan.',
      speech_style: 'Kısa cümleler, sessizlikler, "bilmiyorum" sık.',
      defense_style: 'inkâr',
      insight_level: 'low',
    },
  ];

  return {
    candidates: variants.map((v) => ({
      title: `Mock ${v.label.toLowerCase()} aday`,
      presenting:
        params.theme_hint
          ? `${params.theme_hint} etrafında bir şikayet ile geldi.`
          : 'Açıklamakta zorlandığı bir yorgunluk hâli ile geldi.',
      background:
        'Sosyal bağlamı parametrelere uygun şekilde mock olarak üretildi.',
      personality: v.personality,
      speech_style: v.speech_style,
      goals_hidden: 'Mock: keşfedilmesi gereken bir mesele var (yüzeyde değil).',
      insight_level: v.insight_level,
      defense_style: v.defense_style,
      register: 'gündelik',
      diagnosis_hint: null,
      difficulty,
      variant_label: v.label,
    })),
    token_count: 2500,
  };
}
```

- [ ] **Step 4: Test yeşil**

Run: `npm test -- casting-mock`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/openai/mock.ts tests/unit/casting-mock.test.ts
git commit -m "feat(openai): mockCandidatesResponse for casting dev/test"
```

---

## Task 3: Candidates Generator Service

**Files:**
- Create: `src/lib/openai/case-candidates-generator.ts`
- Create: `tests/unit/case-candidates-generator.test.ts`

- [ ] **Step 1: Test**

```ts
// tests/unit/case-candidates-generator.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  validateCandidatesPayload,
  generateCaseCandidates,
} from '@/lib/openai/case-candidates-generator';

describe('validateCandidatesPayload', () => {
  const validCandidate = {
    title: 't',
    presenting: 'p',
    background: 'b',
    personality: 'x',
    speech_style: 's',
    goals_hidden: 'g',
    insight_level: 'moderate',
    defense_style: 'kaçınma',
    register: 'gündelik',
    diagnosis_hint: null,
    difficulty: 'medium',
    variant_label: 'Dengeli',
  };

  it('accepts payload with exactly 3 valid candidates', () => {
    const r = validateCandidatesPayload({
      candidates: [
        { ...validCandidate, variant_label: 'Daha açık' },
        { ...validCandidate, variant_label: 'Dengeli' },
        { ...validCandidate, variant_label: 'Direngen' },
      ],
    });
    expect(r).toHaveLength(3);
  });

  it('rejects payload with !=3 candidates', () => {
    expect(() =>
      validateCandidatesPayload({ candidates: [validCandidate] })
    ).toThrow();
    expect(() =>
      validateCandidatesPayload({
        candidates: [validCandidate, validCandidate, validCandidate, validCandidate],
      })
    ).toThrow();
  });

  it('rejects candidate with invalid variant_label', () => {
    expect(() =>
      validateCandidatesPayload({
        candidates: [
          { ...validCandidate, variant_label: 'X' },
          { ...validCandidate, variant_label: 'Dengeli' },
          { ...validCandidate, variant_label: 'Direngen' },
        ],
      })
    ).toThrow();
  });
});

describe('generateCaseCandidates (mock mode)', () => {
  beforeEach(() => {
    vi.stubEnv('MOCK_OPENAI', 'true');
  });
  it('returns 3 candidates + token_count when MOCK_OPENAI=true', async () => {
    const r = await generateCaseCandidates({ difficulty: 'easy' });
    expect(r.candidates).toHaveLength(3);
    expect(r.token_count).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Fail bekle**

Run: `npm test -- case-candidates-generator.test`
Expected: FAIL.

- [ ] **Step 3: Servis**

```ts
// src/lib/openai/case-candidates-generator.ts
import { getOpenAI, MODEL, isMockMode } from './client';
import { mockCandidatesResponse } from './mock';
import { validateGeneratedCase } from './case-generator';
import type {
  CastingParams,
  CandidateCase,
  GenerateCandidatesResult,
  VariantLabel,
} from './casting-types';

export type { CastingParams, CandidateCase, GenerateCandidatesResult } from './casting-types';

const VARIANT_LABELS: VariantLabel[] = ['Daha açık', 'Dengeli', 'Direngen'];

export function validateCandidatesPayload(raw: unknown): CandidateCase[] {
  if (!raw || typeof raw !== 'object') throw new Error('not_object');
  const r = raw as Record<string, unknown>;
  const list = r.candidates;
  if (!Array.isArray(list) || list.length !== 3) {
    throw new Error('invalid_count');
  }
  const out: CandidateCase[] = [];
  for (const item of list) {
    const base = validateGeneratedCase(item);
    const variant = (item as Record<string, unknown>).variant_label;
    if (
      typeof variant !== 'string' ||
      !VARIANT_LABELS.includes(variant as VariantLabel)
    ) {
      throw new Error('invalid_variant_label');
    }
    out.push({ ...base, variant_label: variant as VariantLabel });
  }
  return out;
}

function describeParams(p: CastingParams): string {
  const lines: string[] = [];
  if (p.age_range) lines.push(`- Yaş aralığı: ${p.age_range}`);
  if (p.gender) lines.push(`- Cinsiyet: ${p.gender}`);
  if (p.culture_segment) {
    lines.push(`- Kültür: ${p.culture_segment}`);
    if (p.culture_freetext) lines.push(`  Ek bağlam: ${p.culture_freetext}`);
  } else if (p.culture_freetext) {
    lines.push(`- Kültür bağlamı: ${p.culture_freetext}`);
  }
  if (p.occupation) lines.push(`- Meslek/SE durumu: ${p.occupation}`);
  if (p.relationship_status) lines.push(`- İlişki durumu: ${p.relationship_status}`);
  if (p.family_structure) lines.push(`- Aile yapısı: ${p.family_structure}`);
  if (p.referral_source) lines.push(`- Geliş sebebi: ${p.referral_source}`);
  if (p.difficulty) lines.push(`- Zorluk: ${p.difficulty}`);
  if (p.resistance_level) lines.push(`- Direnç düzeyi: ${p.resistance_level}`);
  if (p.school_fit) lines.push(`- Ekol uyumu (vaka bu ekolde işlenmeye uygun olsun): ${p.school_fit}`);
  if (p.prior_therapy) lines.push(`- Önceki terapi deneyimi: ${p.prior_therapy}`);
  if (p.theme_hint) lines.push(`- Tema ipucu: ${p.theme_hint}`);
  return lines.length > 0 ? lines.join('\n') : '(parametre verilmedi — sen serbestçe çeşitlilik kur)';
}

function buildPrompt(params: CastingParams): string {
  return [
    'Aşağıdaki parametrelere uygun 3 farklı kurmaca danışan adayı üret. Üçü de aynı parametre setine uyar ama varyasyon ekseninde birbirinden ayrılır:',
    '- Aday 1: variant_label "Daha açık" — sıcak, kolay açılan, terapiste hızlı güvenen',
    '- Aday 2: variant_label "Dengeli" — tedirgin ama denemeye açık, ölçülü',
    '- Aday 3: variant_label "Direngen" — mesafeli, kapalı, savunmacı',
    '',
    'Parametreler:',
    describeParams(params),
    '',
    'Türkçe yaygın ama özgün adlar kullan; gerçek kamuya mâl olmuş kişi olmasın.',
    'goals_hidden alanında aktif intihar planı YAZMA; üzgünlük/işlevsizlik düzeyinde kal.',
    'Schools_fit verildiyse vaka o ekolde çalışmaya uygun şekilde tasarla (ör. cbt → bilişsel çarpıtmalar belirgin; psikodinamik → ilişki örüntüleri zengin; humanistik → içsel çelişki ön planda; sistemik → ailesel/ilişkisel bağlam dokulu).',
    '',
    'Sadece şu JSON nesnesini döndür, başka hiçbir metin yazma:',
    '{',
    '  "candidates": [',
    '    {',
    '      "title": string,                  // 4-10 kelime',
    '      "presenting": string,             // 1-3 cümle',
    '      "background": string,             // 2-4 cümle',
    '      "personality": string,            // 1-2 cümle',
    '      "speech_style": string,           // 1 cümle',
    '      "goals_hidden": string,           // 1-2 cümle, esas mesele',
    '      "insight_level": "low"|"moderate"|"high",',
    '      "defense_style": string,          // 1-3 kelime',
    '      "register": "gündelik"|"resmi"|"sokak"|"argo-az",',
    '      "diagnosis_hint": string | null,',
    '      "difficulty": "easy"|"medium"|"hard",',
    '      "variant_label": "Daha açık"|"Dengeli"|"Direngen"',
    '    },',
    '    { ... ikinci aday ... },',
    '    { ... üçüncü aday ... }',
    '  ]',
    '}',
  ].join('\n');
}

async function callOnce(params: CastingParams): Promise<{ raw: unknown; tokens: number }> {
  const openai = getOpenAI();
  const resp = await openai.chat.completions.create({
    model: MODEL,
    temperature: 0.85,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content:
          'Sen psikoterapi eğitim aracı için 3 farklı kurmaca danışan adayı üretirsin. Aynı temel parametreler için 3 farklı yorum verirsin; varyasyon ekseni açıklık-kapalılık. Çıktın yalnız geçerli JSON olur.',
      },
      { role: 'user', content: buildPrompt(params) },
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

export async function generateCaseCandidates(
  params: CastingParams
): Promise<GenerateCandidatesResult> {
  if (isMockMode()) {
    return mockCandidatesResponse(params);
  }
  let lastErr: unknown;
  let totalTokens = 0;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const { raw, tokens } = await callOnce(params);
      totalTokens += tokens;
      const candidates = validateCandidatesPayload(raw);
      return { candidates, token_count: totalTokens };
    } catch (e) {
      lastErr = e;
    }
  }
  throw new Error(`generation_failed:${(lastErr as Error)?.message ?? 'unknown'}`);
}
```

- [ ] **Step 4: Test yeşil**

Run: `npm test -- case-candidates-generator.test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/openai/case-candidates-generator.ts tests/unit/case-candidates-generator.test.ts
git commit -m "feat(openai): generateCaseCandidates with 3-variant validation + retry"
```

---

## Task 4: `/api/danisan-aday/uret` Endpoint

**Files:**
- Create: `src/app/api/danisan-aday/uret/route.ts`

- [ ] **Step 1: Endpoint**

```ts
// src/app/api/danisan-aday/uret/route.ts
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { NextResponse } from 'next/server';
import { defaultLimits, isOverDailyLimit } from '@/lib/usage';
import { generateCaseCandidates } from '@/lib/openai/case-candidates-generator';
import type { CastingParams, CandidateCase } from '@/lib/openai/casting-types';

type CandidatePublic = Omit<CandidateCase, 'goals_hidden'> & { case_id: string };

export async function POST(request: Request) {
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const params: CastingParams = (body?.params ?? {}) as CastingParams;

  const svc = createServiceClient();
  const today = new Date().toISOString().split('T')[0];
  const { data: usage } = await svc
    .from('usage_daily')
    .select('session_count, token_count')
    .eq('user_id', user.id)
    .eq('day', today)
    .maybeSingle();
  const limit = isOverDailyLimit(usage, defaultLimits());
  if (limit) {
    return NextResponse.json({ error: `limit:${limit.reason}` }, { status: 429 });
  }

  let result;
  try {
    result = await generateCaseCandidates(params);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'unknown';
    if (msg.startsWith('generation_failed')) {
      return NextResponse.json({ error: 'generation_failed' }, { status: 502 });
    }
    return NextResponse.json({ error: 'internal' }, { status: 500 });
  }

  const publics: CandidatePublic[] = [];
  for (const c of result.candidates) {
    const { data: row, error } = await svc
      .from('cases')
      .insert({
        title: c.title,
        presenting: c.presenting,
        background: c.background,
        personality: c.personality,
        speech_style: c.speech_style,
        goals_hidden: c.goals_hidden,
        insight_level: c.insight_level,
        defense_style: c.defense_style,
        register: c.register,
        diagnosis_hint: c.diagnosis_hint,
        difficulty: c.difficulty,
        source: 'ai_generated',
        is_active: false,
      })
      .select('id')
      .single();
    if (error || !row) {
      return NextResponse.json({ error: 'case_insert_failed' }, { status: 500 });
    }
    publics.push({
      case_id: row.id,
      title: c.title,
      presenting: c.presenting,
      background: c.background,
      personality: c.personality,
      speech_style: c.speech_style,
      insight_level: c.insight_level,
      defense_style: c.defense_style,
      register: c.register,
      diagnosis_hint: c.diagnosis_hint,
      difficulty: c.difficulty,
      variant_label: c.variant_label,
    });
  }

  await svc.from('usage_daily').upsert(
    {
      user_id: user.id,
      day: today,
      session_count: usage?.session_count ?? 0,
      token_count: (usage?.token_count ?? 0) + result.token_count,
    },
    { onConflict: 'user_id,day' }
  );

  return NextResponse.json({ candidates: publics });
}
```

- [ ] **Step 2: Typecheck + testler**

Run: `npm run typecheck && npm test`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add "src/app/api/danisan-aday/uret/route.ts"
git commit -m "feat(api): /danisan-aday/uret generates 3 candidates with goals_hidden stripped"
```

---

## Task 5: `CastingForm` Bileşeni

**Files:**
- Create: `src/components/casting/CastingForm.tsx`

Form çok parametre içerir ama tekrarlı segment butonu pattern'i temiz tutar. Tüm alanlar opsiyonel.

- [ ] **Step 1: Yaz**

```tsx
// src/components/casting/CastingForm.tsx
'use client';
import { useState } from 'react';
import type {
  CastingParams,
  AgeRange,
  Gender,
  CultureSegment,
  Occupation,
  RelationshipStatus,
  FamilyStructure,
  ReferralSource,
  ResistanceLevel,
  SchoolFit,
  PriorTherapy,
} from '@/lib/openai/casting-types';
import type { Difficulty } from '@/lib/openai/case-types';

type Option<T extends string> = { value: T; label: string };

const AGE: Option<AgeRange>[] = [
  { value: 'ergen', label: 'Ergen' },
  { value: 'genc_yetiskin', label: 'Genç yetişkin' },
  { value: 'orta_yas', label: 'Orta yaş' },
  { value: 'ileri_yas', label: 'İleri yaş' },
];
const GENDER: Option<Gender>[] = [
  { value: 'kadin', label: 'Kadın' },
  { value: 'erkek', label: 'Erkek' },
  { value: 'non_binary', label: 'Non-binary' },
  { value: 'belirtmek_istemiyor', label: 'Belirtmiyor' },
];
const CULTURE: Option<CultureSegment>[] = [
  { value: 'tr_koylu', label: 'TR köylü/taşra' },
  { value: 'tr_sehirli', label: 'TR şehirli' },
  { value: 'tr_diaspora', label: 'TR diaspora' },
  { value: 'serbest', label: 'Serbest yaz' },
];
const OCCUPATION: Option<Occupation>[] = [
  { value: 'ogrenci', label: 'Öğrenci' },
  { value: 'beyaz_yaka', label: 'Beyaz yaka' },
  { value: 'mavi_yaka', label: 'Mavi yaka' },
  { value: 'esnaf', label: 'Esnaf' },
  { value: 'issiz', label: 'İşsiz' },
  { value: 'emekli', label: 'Emekli' },
];
const RELATIONSHIP: Option<RelationshipStatus>[] = [
  { value: 'bekar', label: 'Bekar' },
  { value: 'iliskide', label: 'İlişkide' },
  { value: 'evli', label: 'Evli' },
  { value: 'ayrilmis', label: 'Ayrılmış' },
  { value: 'dul', label: 'Dul' },
];
const FAMILY: Option<FamilyStructure>[] = [
  { value: 'tek_cocuk', label: 'Tek çocuk' },
  { value: 'kalabalik', label: 'Kalabalık' },
  { value: 'ayri_ebeveyn', label: 'Ayrı ebeveyn' },
  { value: 'vefat_ebeveyn', label: 'Vefat etmiş ebeveyn' },
];
const REFERRAL: Option<ReferralSource>[] = [
  { value: 'kendi', label: 'Kendi kararı' },
  { value: 'aile', label: 'Aile' },
  { value: 'sevgili', label: 'Sevgili' },
  { value: 'mahkeme', label: 'Mahkeme' },
  { value: 'okul_is', label: 'Okul / iş' },
];
const DIFFICULTY: Option<Difficulty>[] = [
  { value: 'easy', label: 'Kolay' },
  { value: 'medium', label: 'Orta' },
  { value: 'hard', label: 'Zor' },
];
const RESISTANCE: Option<ResistanceLevel>[] = [
  { value: 'isbirlikci', label: 'İşbirlikçi' },
  { value: 'dengeli', label: 'Dengeli' },
  { value: 'direngen', label: 'Direngen' },
];
const SCHOOL: Option<SchoolFit>[] = [
  { value: 'cbt', label: 'CBT' },
  { value: 'psikodinamik', label: 'Psikodinamik' },
  { value: 'humanistik', label: 'Hümanistik' },
  { value: 'sistemik', label: 'Sistemik' },
];
const PRIOR: Option<PriorTherapy>[] = [
  { value: 'ilk_kez', label: 'İlk kez' },
  { value: 'kisa_sure', label: 'Kısa süre denedi' },
  { value: 'uzun_gecmis', label: 'Uzun geçmişi var' },
];

export function CastingForm({
  onSubmit,
  loading,
}: {
  onSubmit: (params: CastingParams) => void;
  loading: boolean;
}) {
  const [p, setP] = useState<CastingParams>({});

  function update<K extends keyof CastingParams>(key: K, value: CastingParams[K]) {
    setP((prev) => ({ ...prev, [key]: prev[key] === value ? undefined : value }));
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(p);
      }}
      className="space-y-8"
    >
      <div className="grid md:grid-cols-2 gap-x-8 gap-y-6">
        <FieldSet label="Yaş aralığı">
          <Segment
            value={p.age_range}
            options={AGE}
            onChange={(v) => update('age_range', v)}
          />
        </FieldSet>

        <FieldSet label="Cinsiyet">
          <Segment
            value={p.gender}
            options={GENDER}
            onChange={(v) => update('gender', v)}
          />
        </FieldSet>

        <FieldSet label="Kültür / bağlam">
          <Segment
            value={p.culture_segment}
            options={CULTURE}
            onChange={(v) => update('culture_segment', v)}
          />
          {(p.culture_segment === 'serbest' || p.culture_freetext) && (
            <input
              type="text"
              maxLength={120}
              value={p.culture_freetext ?? ''}
              onChange={(e) => setP((prev) => ({ ...prev, culture_freetext: e.target.value }))}
              placeholder={
                p.culture_segment === 'serbest'
                  ? 'kültürel bağlamı yaz…'
                  : 'opsiyonel ek bağlam'
              }
              className="w-full mt-2 px-3 py-2 border border-rule rounded text-sm bg-paper"
            />
          )}
        </FieldSet>

        <FieldSet label="Meslek / sosyo-ekonomik">
          <Segment
            value={p.occupation}
            options={OCCUPATION}
            onChange={(v) => update('occupation', v)}
          />
        </FieldSet>

        <FieldSet label="İlişki durumu">
          <Segment
            value={p.relationship_status}
            options={RELATIONSHIP}
            onChange={(v) => update('relationship_status', v)}
          />
        </FieldSet>

        <FieldSet label="Aile yapısı">
          <Segment
            value={p.family_structure}
            options={FAMILY}
            onChange={(v) => update('family_structure', v)}
          />
        </FieldSet>

        <FieldSet label="Geliş sebebi">
          <Segment
            value={p.referral_source}
            options={REFERRAL}
            onChange={(v) => update('referral_source', v)}
          />
        </FieldSet>

        <FieldSet label="Zorluk">
          <Segment
            value={p.difficulty}
            options={DIFFICULTY}
            onChange={(v) => update('difficulty', v)}
          />
        </FieldSet>

        <FieldSet label="Direnç düzeyi">
          <Segment
            value={p.resistance_level}
            options={RESISTANCE}
            onChange={(v) => update('resistance_level', v)}
          />
        </FieldSet>

        <FieldSet label="Ekol uyumu">
          <Segment
            value={p.school_fit}
            options={SCHOOL}
            onChange={(v) => update('school_fit', v)}
          />
        </FieldSet>

        <FieldSet label="Önceki terapi">
          <Segment
            value={p.prior_therapy}
            options={PRIOR}
            onChange={(v) => update('prior_therapy', v)}
          />
        </FieldSet>

        <FieldSet label="Tema ipucu (opsiyonel)">
          <input
            type="text"
            maxLength={120}
            value={p.theme_hint ?? ''}
            onChange={(e) => setP((prev) => ({ ...prev, theme_hint: e.target.value }))}
            placeholder="ör. iş yerinde tükenmişlik"
            className="w-full px-3 py-2 border border-rule rounded text-sm bg-paper"
          />
        </FieldSet>
      </div>

      <div className="pt-6 border-t border-rule flex justify-end">
        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? '3 aday üretiliyor…' : 'Danışan üret →'}
        </button>
      </div>
    </form>
  );
}

function FieldSet({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset>
      <legend className="label-caps mb-2">{label}</legend>
      {children}
    </fieldset>
  );
}

function Segment<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T | undefined;
  options: Option<T>[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          aria-pressed={value === o.value}
          className={`px-3 py-1.5 border rounded-full text-xs transition-colors ${
            value === o.value
              ? 'border-accent bg-accent/10 text-ink'
              : 'border-rule text-muted hover:border-ink hover:text-ink'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/components/casting/CastingForm.tsx
git commit -m "feat(casting): 12-parameter CastingForm with toggle segments"
```

---

## Task 6: `CandidateCard` ve `CandidateDetailModal`

**Files:**
- Create: `src/components/casting/CandidateCard.tsx`
- Create: `src/components/casting/CandidateDetailModal.tsx`

- [ ] **Step 1: `CandidateCard`**

```tsx
// src/components/casting/CandidateCard.tsx
'use client';

type Props = {
  caseId: string;
  title: string;
  presenting: string;
  variantLabel: string;
  difficulty: 'easy' | 'medium' | 'hard';
  onClick: () => void;
};

const DIFFICULTY_LABEL: Record<string, string> = {
  easy: 'Kolay',
  medium: 'Orta',
  hard: 'Zor',
};

export function CandidateCard(props: Props) {
  return (
    <button
      onClick={props.onClick}
      className="surface w-full text-left p-5 flex flex-col gap-3 transition hover:shadow-lg"
    >
      <div className="flex items-baseline justify-between gap-3">
        <span className="label-caps text-accent">{props.variantLabel}</span>
        <span className="text-xs text-muted">{DIFFICULTY_LABEL[props.difficulty]}</span>
      </div>
      <p className="font-display text-lg leading-tight">
        <em className="font-display-italic">{props.title}</em>
      </p>
      <p className="text-sm text-ink-soft leading-relaxed line-clamp-3">
        {props.presenting}
      </p>
      <span className="text-xs text-muted mt-auto pt-2 border-t border-rule">
        Detayı gör →
      </span>
    </button>
  );
}
```

- [ ] **Step 2: `CandidateDetailModal`**

```tsx
// src/components/casting/CandidateDetailModal.tsx
'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type CandidateDetail = {
  case_id: string;
  title: string;
  presenting: string;
  background: string;
  personality: string;
  speech_style: string;
  insight_level: string;
  defense_style: string;
  register: string;
  diagnosis_hint: string | null;
  difficulty: 'easy' | 'medium' | 'hard';
  variant_label: string;
};

export function CandidateDetailModal({
  open,
  onClose,
  candidate,
}: {
  open: boolean;
  onClose: () => void;
  candidate: CandidateDetail | null;
}) {
  const router = useRouter();
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
    if (!candidate) return;
    setLoading(true);
    setError(null);
    const res = await fetch('/api/seans/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ case_id: candidate.case_id }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      const code = String(body.error ?? 'internal');
      if (code.startsWith('limit:')) setError('Günlük limit doldu.');
      else setError('Seans başlatılamadı, tekrar dene.');
      setLoading(false);
      return;
    }
    const { session_id } = await res.json();
    router.push(`/seans/${session_id}`);
  }

  if (!open || !candidate) return null;

  return (
    <>
      <div
        onClick={loading ? undefined : onClose}
        aria-hidden
        className="fixed inset-0 bg-ink/40 backdrop-blur-sm z-40"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Danışan detayı"
        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl max-h-[85vh] overflow-y-auto bg-paper border border-rule shadow-2xl rounded-md z-50 p-6 md:p-8"
      >
        <div className="flex items-baseline justify-between mb-2">
          <span className="label-caps text-accent">{candidate.variant_label}</span>
          <button onClick={onClose} className="btn-quiet text-xs" aria-label="Kapat">
            Kapat ✕
          </button>
        </div>
        <h2 className="font-display text-3xl mb-6">
          <em className="font-display-italic">{candidate.title}</em>
        </h2>

        <div className="space-y-5">
          <Section label="Sunulan sorun">{candidate.presenting}</Section>
          <Section label="Geçmiş / aile">{candidate.background}</Section>
          <Section label="Kişilik">{candidate.personality}</Section>
          <Section label="Konuşma stili">{candidate.speech_style}</Section>
          <div className="grid sm:grid-cols-3 gap-4">
            <Section label="İçgörü">{candidate.insight_level}</Section>
            <Section label="Baskın savunma">{candidate.defense_style}</Section>
            <Section label="Söylem kaydı">{candidate.register}</Section>
          </div>
          {candidate.diagnosis_hint && (
            <Section label="Klinik çağrışım" muted>
              {candidate.diagnosis_hint}
            </Section>
          )}
        </div>

        {error && (
          <p className="text-sm text-danger mt-6" role="alert">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2 mt-8 pt-6 border-t border-rule">
          <button onClick={onClose} disabled={loading} className="btn-quiet">
            Geri dön
          </button>
          <button onClick={start} disabled={loading} className="btn-primary">
            {loading ? 'Seansa başlatılıyor…' : 'Bu danışanla seansa başla →'}
          </button>
        </div>
      </div>
    </>
  );
}

function Section({
  label,
  children,
  muted,
}: {
  label: string;
  children: React.ReactNode;
  muted?: boolean;
}) {
  return (
    <div>
      <p className="label-caps mb-1.5">{label}</p>
      <p
        className={
          muted
            ? 'text-sm leading-relaxed text-ink-soft italic'
            : 'text-base leading-relaxed'
        }
      >
        {children}
      </p>
    </div>
  );
}
```

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/components/casting/CandidateCard.tsx src/components/casting/CandidateDetailModal.tsx
git commit -m "feat(casting): candidate card + detail modal with session-start"
```

---

## Task 7: `CastingFlow` State Machine

**Files:**
- Create: `src/components/casting/CastingFlow.tsx`

- [ ] **Step 1: Yaz**

```tsx
// src/components/casting/CastingFlow.tsx
'use client';
import { useState } from 'react';
import { CastingForm } from './CastingForm';
import { CandidateCard } from './CandidateCard';
import { CandidateDetailModal } from './CandidateDetailModal';
import type { CastingParams } from '@/lib/openai/casting-types';

type CandidatePublic = {
  case_id: string;
  title: string;
  presenting: string;
  background: string;
  personality: string;
  speech_style: string;
  insight_level: string;
  defense_style: string;
  register: string;
  diagnosis_hint: string | null;
  difficulty: 'easy' | 'medium' | 'hard';
  variant_label: string;
};

export function CastingFlow() {
  const [candidates, setCandidates] = useState<CandidatePublic[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<CandidatePublic | null>(null);

  async function generate(params: CastingParams) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/danisan-aday/uret', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ params }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        const code = String(body.error ?? 'internal');
        if (code.startsWith('limit:')) setError('Günlük limit doldu.');
        else if (code === 'generation_failed') setError('Üretemedik, tekrar dene.');
        else setError('Bir şey ters gitti, tekrar dene.');
        setLoading(false);
        return;
      }
      const { candidates } = await res.json();
      setCandidates(candidates);
      setLoading(false);
    } catch {
      setError('Bağlantı hatası.');
      setLoading(false);
    }
  }

  function reset() {
    setCandidates(null);
    setSelected(null);
    setError(null);
  }

  if (candidates) {
    return (
      <div className="space-y-8">
        <div className="flex items-baseline justify-between">
          <p className="label-caps">3 aday hazır</p>
          <button onClick={reset} className="btn-quiet text-xs">
            Parametreleri değiştir
          </button>
        </div>
        <div className="grid md:grid-cols-3 gap-4">
          {candidates.map((c) => (
            <CandidateCard
              key={c.case_id}
              caseId={c.case_id}
              title={c.title}
              presenting={c.presenting}
              variantLabel={c.variant_label}
              difficulty={c.difficulty}
              onClick={() => setSelected(c)}
            />
          ))}
        </div>
        <CandidateDetailModal
          open={selected !== null}
          onClose={() => setSelected(null)}
          candidate={selected}
        />
      </div>
    );
  }

  return (
    <div>
      {error && (
        <p className="text-sm text-danger mb-4" role="alert">
          {error}
        </p>
      )}
      <CastingForm onSubmit={generate} loading={loading} />
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/components/casting/CastingFlow.tsx
git commit -m "feat(casting): CastingFlow state machine (form → candidates → detail)"
```

---

## Task 8: `/dosya-yarat` Sayfası

**Files:**
- Create: `src/app/dosya-yarat/page.tsx`

- [ ] **Step 1: Sayfa**

```tsx
// src/app/dosya-yarat/page.tsx
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { AppShell } from '@/components/shell/AppShell';
import { CastingFlow } from '@/components/casting/CastingFlow';

export default async function Page() {
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) redirect('/login');

  return (
    <AppShell userEmail={user.email}>
      <div className="max-w-3xl mx-auto px-6 md:px-10 py-8 md:py-12">
        <nav className="mb-8">
          <a href="/" className="btn-quiet text-xs">
            ← Anasayfa
          </a>
        </nav>

        <header className="mb-10">
          <p className="label-caps mb-3">Casting</p>
          <h1 className="font-display text-4xl md:text-5xl leading-[1.05] tracking-tight">
            İstediğin <em className="font-display-italic text-accent">danışanı</em> yarat
          </h1>
          <p className="text-ink-soft mt-3 text-sm md:text-base max-w-lg leading-relaxed">
            Parametreleri seç (hepsi opsiyonel). AI 3 farklı yorum üretir — incele, birini seç,
            seansa başla.
          </p>
        </header>

        <CastingFlow />
      </div>
    </AppShell>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/app/dosya-yarat/page.tsx
git commit -m "feat(casting): /dosya-yarat page hosting CastingFlow"
```

---

## Task 9: Anasayfa Casting Kartı

**Files:**
- Create: `src/components/case/CastingTrigger.tsx`
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Kart bileşeni**

```tsx
// src/components/case/CastingTrigger.tsx
export function CastingTrigger() {
  return (
    <a
      href="/dosya-yarat"
      className="surface w-full text-left px-5 py-5 mb-8 flex items-center justify-between gap-4 hover:bg-paper-soft transition"
    >
      <div>
        <p className="label-caps mb-1">Casting</p>
        <p className="font-display text-xl">
          İstediğim <em className="font-display-italic">danışanı</em> yarat
        </p>
        <p className="text-sm text-muted mt-1">
          Detaylı parametre + 3 aday + seçim.
        </p>
      </div>
      <span className="btn-outline shrink-0">Yarat</span>
    </a>
  );
}
```

- [ ] **Step 2: Anasayfada mount et**

`src/app/page.tsx` — `<FreeSessionTrigger />` satırının hemen altına ekle:

```tsx
import { CastingTrigger } from '@/components/case/CastingTrigger';

// ...mevcut markup...
<FreeSessionTrigger />
<CastingTrigger />
{starter && <StarterHint starter={starter} />}
```

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/components/case/CastingTrigger.tsx src/app/page.tsx
git commit -m "feat(home): CastingTrigger card alongside FreeSessionTrigger"
```

---

## Task 10: Final Verification + Push

- [ ] **Step 1: Tüm testler**

Run: `npm run typecheck && npm test`
Expected: PASS.

- [ ] **Step 2: Manuel sanity (dev)**
- Anasayfada "Casting" kartı görünür
- /dosya-yarat → parametre formu görünür (boş bırakılabilir)
- "Danışan üret" → 3 kart gelir (mock'ta 3 sabit varyasyon)
- Karta tıkla → modal açılır, tam profil görünür
- "Bu danışanla seansa başla" → /seans/[id] açılır

- [ ] **Step 3: Push**

```bash
git push origin feat/mvp-scaffold
git checkout main && git merge --ff-only feat/mvp-scaffold && git push origin main
git checkout feat/mvp-scaffold
```

**DB migration prod için GEREKMİYOR** — schema değişikliği yok.

---

## Notlar

- **goals_hidden response'da yok:** Adayların `goals_hidden` alanı DB'ye yazılır ama API response'unda `Omit<...>` ile çıkarılır. Frontend hiçbir zaman görmez — modal'da gösterilmez. Mevcut "gizli mesele" semantiği korunur.
- **Orphan adaylar:** Seçilmeyen 2 aday `cases` tablosunda `is_active=false, source='ai_generated'` olarak kalır. RLS politikası "kendi session'ı olan kullanıcı görebilir" der; bu adaylar hiçbir session'a bağlanmadığı için kimseye görünmez. Cleanup yok (Faz X'e bırakıldı).
- **Mevcut blind serbest seans:** `FreeSessionTrigger` + `FreeSessionModal` + `/api/seans/start { mode: 'free', difficulty, themeHint }` akışı dokunulmaz, yan yana yaşar.
- **Casting seansının raporu:** Faz 1 reveal section ai_generated case için zaten çalışıyor. Casting'le başlatılan seansta da çalışır (kullanıcı modal'da detayı görmüştü ama 45 dk seans sonunda unutmuş olabilir; reveal yine değerlidir).
- **Token bütçe:** 3-aday üretimi ~2500 token. Günlük 100k limitinde ortalama 40 casting üretimi yapılabilir.
