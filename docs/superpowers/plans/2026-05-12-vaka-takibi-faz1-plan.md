# Vaka Takibi Faz 1 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bir kullanıcının aynı vaka ile birden fazla seans yapabilmesi; her seans bir `case_series` altında gruplanır ve AI önceki seansların transcript'ini hatırlar (naive memory).

**Architecture:** Yeni `case_series` tablosu kullanıcı × vaka ikilisini gruplar. `sessions.series_id` ile bağ kurulur. `startSession` aynı vaka için açık seri varsa onu kullanır, yoksa yeni açar. Mesaj endpoint'i serideki tüm completed seansların mesajlarını AI'a sunar. Yeni `/seri/[id]` sayfası seans listesini ve "Yeni seans başlat / Vakayı kapat" aksiyonlarını yönetir.

**Tech Stack:** Next.js 16 (App Router), TypeScript, Supabase (Postgres + RLS), OpenAI SDK, Vitest, Playwright, Tailwind.

**Spec:** `docs/superpowers/specs/2026-05-12-vaka-takibi-faz1-design.md`

---

## File Structure

**Yeni:**
- `supabase/migrations/0019_case_series.sql` — table + sessions.series_id + backfill + RLS
- `src/app/seri/[id]/page.tsx` — seri sayfası (server component)
- `src/app/api/seri/[id]/kapat/route.ts` — vakayı kapat endpoint
- `src/components/series/CloseSeriesButton.tsx` — client confirm + POST
- `tests/unit/series-history.test.ts` — message route series-wide history birim testi (helper extraction üstünde)

**Değişen:**
- `src/lib/types.ts` — regenerate (series_id ve case_series tipleri)
- `src/lib/session-actions.ts` — series-aware insert (curated: find-or-create; free: always create)
- `src/lib/series.ts` (yeni) — `findOrCreateSeries`, `findOpenSeriesForCase` yardımcıları
- `src/app/api/seans/message/route.ts` — serideki tüm completed seans mesajlarını fetch et + AI prompt'a koy
- `src/app/page.tsx` — kullanıcının açık serilerini fetch et, `CaseIndex` ve `CaseCard` rotasyonuna geç
- `src/components/case/CaseIndex.tsx` — openSeriesByCaseId prop, link davranışı
- `src/components/case/CaseCard.tsx` — `openSeries?` badge ve link davranışı
- `src/app/vaka/[id]/page.tsx` — açık seri varsa "devam et" CTA
- `src/app/rapor/[sessionId]/page.tsx` — series_id fetch + ReportView'e geçir
- `src/components/report/ReportView.tsx` — breadcrumb "← Seri" + free için "Bu danışanla devam et"

**Test:**
- `tests/unit/session-actions.test.ts` — yeni testler: curated open-series reuse, free creates series, both → session.series_id set
- `tests/e2e/series.spec.ts` — yeni: curated 2-session series akışı (mock mode)

---

## Task 1: DB Migration — `case_series` + `sessions.series_id` + Backfill

**Files:**
- Create: `supabase/migrations/0019_case_series.sql`
- Modify: `src/lib/types.ts` (regenerate)

- [ ] **Step 1: Migration dosyasını yaz**

```sql
-- supabase/migrations/0019_case_series.sql
create table public.case_series (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  case_id     uuid not null references public.cases(id),
  status      text not null default 'open' check (status in ('open','closed')),
  created_at  timestamptz not null default now(),
  closed_at   timestamptz
);

create unique index case_series_open_uniq
  on public.case_series(user_id, case_id)
  where status = 'open';

create index case_series_user_idx on public.case_series(user_id);

alter table public.case_series enable row level security;

create policy "users manage own series"
  on public.case_series for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

alter table public.sessions
  add column series_id uuid references public.case_series(id);

create index sessions_series_idx on public.sessions(series_id);

-- backfill: her mevcut seans kendi closed serisine girer
do $$
declare
  s record;
  new_series_id uuid;
begin
  for s in
    select id, user_id, case_id from public.sessions where series_id is null
  loop
    insert into public.case_series(user_id, case_id, status, closed_at)
    values (s.user_id, s.case_id, 'closed', now())
    returning id into new_series_id;
    update public.sessions set series_id = new_series_id where id = s.id;
  end loop;
end $$;

alter table public.sessions alter column series_id set not null;
```

- [ ] **Step 2: Local Supabase'e uygula**

Run: `npx supabase migration up`
Expected: Migration başarıyla uygulanır; backfill tüm mevcut seanslara series_id atar.

- [ ] **Step 3: Tipleri yeniden üret**

Run: `npm run db:types`
Expected: `src/lib/types.ts` içinde:
- `case_series` Row/Insert/Update tipi var.
- `sessions.Row` içinde `series_id: string` (not null).

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/0019_case_series.sql src/lib/types.ts
git commit -m "feat(db): add case_series + sessions.series_id with backfill"
```

---

## Task 2: Series Helper Library

**Files:**
- Create: `src/lib/series.ts`

- [ ] **Step 1: Helper'ı yaz**

```ts
// src/lib/series.ts
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/types';

type Sb = SupabaseClient<Database>;

export async function findOpenSeriesForCase(
  sb: Sb,
  userId: string,
  caseId: string
): Promise<string | null> {
  const { data } = await sb
    .from('case_series')
    .select('id')
    .eq('user_id', userId)
    .eq('case_id', caseId)
    .eq('status', 'open')
    .maybeSingle();
  return data?.id ?? null;
}

export async function createSeries(
  sb: Sb,
  userId: string,
  caseId: string
): Promise<string> {
  const { data, error } = await sb
    .from('case_series')
    .insert({ user_id: userId, case_id: caseId, status: 'open' })
    .select('id')
    .single();
  if (error || !data) throw error ?? new Error('series_create_failed');
  return data.id;
}

export async function findOrCreateOpenSeries(
  sb: Sb,
  userId: string,
  caseId: string
): Promise<string> {
  const existing = await findOpenSeriesForCase(sb, userId, caseId);
  if (existing) return existing;
  return createSeries(sb, userId, caseId);
}

export async function findOpenSeriesIdsForUser(
  sb: Sb,
  userId: string
): Promise<Record<string, string>> {
  const { data } = await sb
    .from('case_series')
    .select('id, case_id')
    .eq('user_id', userId)
    .eq('status', 'open');
  const map: Record<string, string> = {};
  for (const row of data ?? []) map[row.case_id] = row.id;
  return map;
}
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/lib/series.ts
git commit -m "feat(series): add case_series helper queries"
```

---

## Task 3: `startSession` Series-Aware

**Files:**
- Modify: `src/lib/session-actions.ts`
- Modify: `tests/unit/session-actions.test.ts`

- [ ] **Step 1: Mevcut testleri series_id beklentisi ile güncelle ve yeni testler ekle**

`tests/unit/session-actions.test.ts` içinde mock setup'ı genişlet. Mock için ek table'lar lazım: `case_series` (`maybeSingle`, `insert`).

Mevcut `vi.mock('@/lib/supabase/service', ...)` factory'sini güncelle — `from()` switch'ine `case_series` branch'i ekle:

```ts
// mock factory'nin from() switch'ine ekle:
if (table === 'case_series') {
  return {
    select: () => ({
      eq: () => ({
        eq: () => ({
          eq: () => ({ maybeSingle: caseSeriesMaybeSingle }),
        }),
      }),
    }),
    insert: caseSeriesInsert,
  };
}
```

Üstte mock fn'leri tanımla:

```ts
const caseSeriesMaybeSingle = vi.fn(async () => ({ data: null, error: null })); // default: no open series
const caseSeriesInsert = vi.fn(() => ({
  select: () => ({ single: async () => ({ data: { id: 'series-id' }, error: null }) }),
}));
```

`__mocks` export'una ekle: `caseSeriesInsert, caseSeriesMaybeSingle`.

Mevcut testleri güncelle (assertions ekle):

```ts
it('curated mode reuses open series if exists', async () => {
  const { __mocks } = (await import('@/lib/supabase/service')) as any;
  __mocks.caseSeriesMaybeSingle.mockResolvedValueOnce({ data: { id: 'existing-series' }, error: null });

  await startSession('user-1', { mode: 'curated', caseId: 'case-X' });

  expect(__mocks.caseSeriesInsert).not.toHaveBeenCalled();
  expect(__mocks.sessionsInsert).toHaveBeenCalledWith(
    expect.objectContaining({ series_id: 'existing-series', case_id: 'case-X', user_id: 'user-1' })
  );
});

it('curated mode creates new series if none open', async () => {
  // default mock: caseSeriesMaybeSingle returns { data: null }
  const { __mocks } = (await import('@/lib/supabase/service')) as any;

  await startSession('user-1', { mode: 'curated', caseId: 'case-X' });

  expect(__mocks.caseSeriesInsert).toHaveBeenCalledWith(
    expect.objectContaining({ user_id: 'user-1', case_id: 'case-X', status: 'open' })
  );
  expect(__mocks.sessionsInsert).toHaveBeenCalledWith(
    expect.objectContaining({ series_id: 'series-id' })
  );
});

it('free mode always creates a new series for the generated case', async () => {
  const { __mocks } = (await import('@/lib/supabase/service')) as any;

  await startSession('user-1', { mode: 'free', difficulty: 'easy' });

  // free path: case insert THEN series insert
  expect(__mocks.casesInsert).toHaveBeenCalled();
  expect(__mocks.caseSeriesInsert).toHaveBeenCalledWith(
    expect.objectContaining({ user_id: 'user-1', case_id: 'generated-case-id', status: 'open' })
  );
});
```

Önceki testleri de `series_id` payload assertion'ı ile güncelle.

- [ ] **Step 2: Testi koştur, fail bekle**

Run: `npm test -- session-actions`
Expected: FAIL — kod yeni davranışı henüz uygulamıyor.

- [ ] **Step 3: `session-actions.ts`'i güncelle**

```ts
// src/lib/session-actions.ts
import { createServiceClient } from '@/lib/supabase/service';
import { defaultLimits, isOverDailyLimit } from '@/lib/usage';
import { generateCase, type Difficulty } from '@/lib/openai/case-generator';
import { findOrCreateOpenSeries, createSeries } from '@/lib/series';

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
  let seriesId: string;

  if (input.mode === 'free') {
    const result = await generateCase({ difficulty: input.difficulty, themeHint: input.themeHint });
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
    seriesId = await createSeries(sb, userId, caseId);
  } else {
    caseId = input.caseId;
    seriesId = await findOrCreateOpenSeries(sb, userId, caseId);
  }

  const { data: session, error } = await sb
    .from('sessions')
    .insert({ user_id: userId, case_id: caseId, series_id: seriesId, status: 'in_progress' })
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
Expected: PASS.

- [ ] **Step 5: Tüm testler yeşil**

Run: `npm test`
Expected: Tüm testler PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/session-actions.ts tests/unit/session-actions.test.ts
git commit -m "feat(session): startSession reuses or creates case_series"
```

---

## Task 4: Mesaj Route — Series-Wide History

**Files:**
- Modify: `src/app/api/seans/message/route.ts`

Mevcut endpoint sadece **bu seansın** mesajlarını fetch ediyor. Bu task seri içindeki tüm completed seansların mesajlarını da çekip AI prompt'a ekler.

- [ ] **Step 1: Route'u güncelle**

`src/app/api/seans/message/route.ts` — `prevMsgs` fetch bloğunu değiştir:

Eski (~satır 71-75):
```ts
const { data: prevMsgs } = await svc
  .from('messages')
  .select('role, content')
  .eq('session_id', sessionId)
  .order('created_at', { ascending: true });
```

Yeni:
```ts
// 1) bu seansın series_id'sini al (session zaten fetch'lendi; SessionRow'a series_id ekle)
const seriesId = session.series_id;

// 2) seride bu seans dahil tüm seansların id'lerini ve started_at'lerini al
const { data: seriesSessions } = await svc
  .from('sessions')
  .select('id, status, started_at')
  .eq('series_id', seriesId)
  .order('started_at', { ascending: true });

// 3) önceki COMPLETED seansların mesajları
const olderIds = (seriesSessions ?? [])
  .filter(s => s.id !== sessionId && s.status === 'completed')
  .map(s => s.id);

let olderHistory: Array<{ role: string; content: string }> = [];
if (olderIds.length > 0) {
  const { data: olderMsgs } = await svc
    .from('messages')
    .select('session_id, role, content, created_at')
    .in('session_id', olderIds)
    .order('created_at', { ascending: true });
  olderHistory = (olderMsgs ?? []).map(m => ({ role: m.role, content: m.content }));
}

// 4) bu seansın mesajları
const { data: currentMsgs } = await svc
  .from('messages')
  .select('role, content')
  .eq('session_id', sessionId)
  .order('created_at', { ascending: true });

const prevMsgs = [...olderHistory, ...(currentMsgs ?? [])];
```

`SessionRow` tipine `series_id: string` ekle ve session select sorgusuna `series_id` alanı dahil et (~satır 38-42):

```ts
type SessionRow = {
  id: string;
  user_id: string;
  status: 'in_progress' | 'completed' | 'abandoned';
  started_at: string;
  series_id: string;
  case: CaseProfile | null;
};

// select string'ine series_id ekle:
.select(
  'id, user_id, status, started_at, series_id, case:cases(presenting, background, personality, speech_style, goals_hidden, insight_level, defense_style, register)'
)
```

System prompt'a seri uyarısı ekle (mevcut `buildClientSystemPrompt` çağrısının sonucuna append):

```ts
let systemPrompt = buildClientSystemPrompt(session.case);
if (olderIds.length > 0) {
  systemPrompt += `\n\nBu danışanla daha önce ${olderIds.length} seans yaptın. Aşağıdaki user/assistant mesajları geçmiş seanslardandır; en son blok bugünkü seans. Karakterini ve geçmişteki söylediklerinin tutarlılığını koru.`;
}
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 3: Tüm birim testler yeşil**

Run: `npm test`
Expected: Tüm testler PASS (bu route için doğrudan birim test yok; mevcut testler bu değişiklikten etkilenmez).

- [ ] **Step 4: Commit**

```bash
git add src/app/api/seans/message/route.ts
git commit -m "feat(message): include series-wide history in AI prompt"
```

---

## Task 5: Vakayı Kapat Endpoint

**Files:**
- Create: `src/app/api/seri/[id]/kapat/route.ts`

- [ ] **Step 1: Endpoint'i yaz**

```ts
// src/app/api/seri/[id]/kapat/route.ts
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id: seriesId } = await context.params;
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  // seri var mı + kullanıcı sahibi mi (RLS zaten kısıtlar)
  const { data: series } = await sb
    .from('case_series')
    .select('id, status')
    .eq('id', seriesId)
    .maybeSingle();
  if (!series) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  if (series.status === 'closed') {
    return NextResponse.json({ error: 'already_closed' }, { status: 409 });
  }

  // aktif seans var mı?
  const { data: active } = await sb
    .from('sessions')
    .select('id')
    .eq('series_id', seriesId)
    .eq('status', 'in_progress')
    .maybeSingle();
  if (active) {
    return NextResponse.json({ error: 'active_session_exists' }, { status: 409 });
  }

  const { error } = await sb
    .from('case_series')
    .update({ status: 'closed', closed_at: new Date().toISOString() })
    .eq('id', seriesId);
  if (error) return NextResponse.json({ error: 'internal' }, { status: 500 });

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/seri/[id]/kapat/route.ts
git commit -m "feat(api): seri/kapat endpoint with active-session guard"
```

---

## Task 6: `/seri/[id]` Sayfası

**Files:**
- Create: `src/app/seri/[id]/page.tsx`
- Create: `src/components/series/CloseSeriesButton.tsx`

- [ ] **Step 1: `CloseSeriesButton` client bileşenini yaz**

```tsx
// src/components/series/CloseSeriesButton.tsx
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function CloseSeriesButton({ seriesId }: { seriesId: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function close() {
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/seri/${seriesId}/kapat`, { method: 'POST' });
    setLoading(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      if (body.error === 'active_session_exists') {
        setError('Açık bir seans var. Önce onu bitir.');
      } else {
        setError('Kapatılamadı, tekrar dene.');
      }
      return;
    }
    router.refresh();
  }

  if (!confirming) {
    return (
      <button onClick={() => setConfirming(true)} className="btn-quiet">
        Vakayı kapat
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted">Emin misin?</span>
      <button onClick={close} disabled={loading} className="btn-primary text-sm">
        {loading ? '...' : 'Kapat'}
      </button>
      <button onClick={() => setConfirming(false)} disabled={loading} className="btn-quiet text-sm">
        Vazgeç
      </button>
      {error && <span className="text-xs text-danger ml-2">{error}</span>}
    </div>
  );
}
```

- [ ] **Step 2: Seri sayfasını yaz**

```tsx
// src/app/seri/[id]/page.tsx
import { createClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import { AppShell } from '@/components/shell/AppShell';
import { CloseSeriesButton } from '@/components/series/CloseSeriesButton';

type SeriesRow = {
  id: string;
  user_id: string;
  status: 'open' | 'closed';
  created_at: string;
  closed_at: string | null;
  case: {
    id: string;
    title: string;
    source: 'curated' | 'ai_generated';
  } | null;
};

type SessionRow = {
  id: string;
  status: 'in_progress' | 'completed' | 'abandoned';
  started_at: string;
  ended_at: string | null;
  message_count: number;
};

const STATUS_LABEL: Record<SessionRow['status'], string> = {
  in_progress: 'Açık',
  completed: 'Tamam',
  abandoned: 'Yarım',
};

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect('/login');

  const { data: seriesData } = await sb
    .from('case_series')
    .select('id, user_id, status, created_at, closed_at, case:cases(id, title, source)')
    .eq('id', id)
    .single();
  const series = seriesData as unknown as SeriesRow | null;
  if (!series || series.user_id !== user.id || !series.case) notFound();

  const { data: sessionsData } = await sb
    .from('sessions')
    .select('id, status, started_at, ended_at, message_count')
    .eq('series_id', id)
    .order('started_at', { ascending: true });
  const sessions = (sessionsData ?? []) as SessionRow[];

  const isOpen = series.status === 'open';
  const activeSession = sessions.find((s) => s.status === 'in_progress');
  const isCurated = series.case.source === 'curated';

  return (
    <AppShell userEmail={user.email}>
      <div className="max-w-3xl mx-auto px-6 md:px-10 py-8 md:py-12">
        <nav className="mb-8">
          <a href="/" className="btn-quiet text-xs">← Anasayfa</a>
        </nav>

        <header className="mb-10">
          <p className="label-caps mb-3">Vaka takibi</p>
          <h1 className="font-display text-4xl md:text-5xl leading-[1.05] tracking-tight">
            <em className="font-display-italic">{series.case.title}</em>
          </h1>
          <div className="flex items-center gap-3 mt-4 flex-wrap">
            <span className={`label-caps ${isOpen ? 'text-accent' : 'text-muted'}`}>
              {isOpen ? 'Açık' : 'Kapalı'} · {sessions.length} seans
            </span>
            {isCurated && (
              <>
                <span className="text-rule">·</span>
                <a href={`/vaka/${series.case.id}`} className="text-xs text-muted underline">
                  Vaka dosyası
                </a>
              </>
            )}
            {!isCurated && (
              <>
                <span className="text-rule">·</span>
                <span className="text-xs text-muted italic">Serbest seans — dosya gizli</span>
              </>
            )}
          </div>
        </header>

        {sessions.length === 0 ? (
          <p className="surface p-10 text-center text-sm text-muted">Henüz seans yok.</p>
        ) : (
          <ol className="surface divide-y divide-rule overflow-hidden mb-10">
            {sessions.map((s, i) => {
              const num = String(i + 1).padStart(2, '0');
              const href =
                s.status === 'completed'
                  ? `/rapor/${s.id}`
                  : s.status === 'in_progress'
                    ? `/seans/${s.id}`
                    : null;
              const Body = (
                <>
                  <span className="index-num">№ {num}</span>
                  <span className="min-w-0">
                    <span className="block index-title">Seans {i + 1}</span>
                    <span className="block mt-1 text-xs text-muted font-mono">
                      {new Date(s.started_at).toLocaleString('tr-TR', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}{' '}
                      · {s.message_count} mesaj
                    </span>
                  </span>
                  <span className="index-meta">{STATUS_LABEL[s.status]}</span>
                  <span className="font-mono text-base text-muted">{href ? '→' : ''}</span>
                </>
              );
              return (
                <li key={s.id}>
                  {href ? (
                    <a href={href} className="index-row">{Body}</a>
                  ) : (
                    <div className="index-row" style={{ cursor: 'default' }}>{Body}</div>
                  )}
                </li>
              );
            })}
          </ol>
        )}

        {isOpen && (
          <div className="flex items-center justify-between gap-4 flex-wrap pt-6 border-t border-rule">
            {activeSession ? (
              <a href={`/seans/${activeSession.id}`} className="btn-primary">
                Açık seansa dön →
              </a>
            ) : (
              <a href={`/seans/start?case=${series.case.id}`} className="btn-primary">
                Yeni seans başlat →
              </a>
            )}
            <CloseSeriesButton seriesId={series.id} />
          </div>
        )}
      </div>
    </AppShell>
  );
}
```

**Not:** "Yeni seans başlat" hem curated hem ai_generated için aynı GET handler'a gider (`/seans/start?case=<case_id>`). Mevcut handler `startSession(user.id, { mode: 'curated', caseId })` çağırıyor — `case_id` ai_generated bile olsa RLS kullanıcının kendi vakasına izin veriyor, `findOrCreateOpenSeries` mevcut açık seriyi bulup yeni seansı oraya bağlıyor.

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/app/seri/[id]/page.tsx src/components/series/CloseSeriesButton.tsx
git commit -m "feat(series): /seri/[id] page with session list + close action"
```

---

## Task 7: Anasayfada Açık Seri Rozeti

**Files:**
- Modify: `src/app/page.tsx`
- Modify: `src/components/case/CaseIndex.tsx`

- [ ] **Step 1: Anasayfada açık serileri fetch et**

`src/app/page.tsx` içinde mevcut `cases` ve `doneRows` fetch'lerinin yanına ekle:

```ts
const { data: openSeriesRows } = await sb
  .from('case_series')
  .select('id, case_id')
  .eq('user_id', user.id)
  .eq('status', 'open');
const openSeriesByCaseId: Record<string, string> = {};
for (const r of openSeriesRows ?? []) openSeriesByCaseId[r.case_id] = r.id;
```

`<CaseIndex>` çağrısına prop olarak geçir:

```tsx
<CaseIndex cases={list} doneIds={doneIds} openSeriesByCaseId={openSeriesByCaseId} />
```

- [ ] **Step 2: `CaseIndex` propunu kabul et ve link davranışını değiştir**

`src/components/case/CaseIndex.tsx`:

Props tipini güncelle:

```ts
export function CaseIndex({
  cases, doneIds, openSeriesByCaseId,
}: {
  cases: CaseRow[];
  doneIds: string[];
  openSeriesByCaseId?: Record<string, string>;
}) {
```

`<a href={\`/vaka/${c.id}\`}` link bloğunu değiştir — eğer açık seri varsa direkt seri sayfasına gitsin:

```tsx
const openSeriesId = openSeriesByCaseId?.[c.id];
const href = openSeriesId ? `/seri/${openSeriesId}` : `/vaka/${c.id}`;

// ... mevcut <a href={href} ...>
```

Liste satırının title satırının yanına küçük rozet ekle (açık seri varsa):

```tsx
<span className="block index-title">
  <em className="font-display-italic">{c.title}</em>
  {openSeriesId && (
    <span className="ml-2 text-xs text-accent font-mono not-italic">· devam ediyor</span>
  )}
</span>
```

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/app/page.tsx src/components/case/CaseIndex.tsx
git commit -m "feat(home): badge open series on case index + link to series page"
```

---

## Task 8: `/vaka/[id]` Briefing — "Devam et" CTA

**Files:**
- Modify: `src/app/vaka/[id]/page.tsx`

- [ ] **Step 1: Briefing sayfasında açık seri kontrolü ekle**

`src/app/vaka/[id]/page.tsx` — user'ı fetch ettikten sonra (auth check'inden sonra), case fetch'inden önce/sonra ekle:

```ts
const { data: openSeries } = await sb
  .from('case_series')
  .select('id')
  .eq('user_id', user.id)
  .eq('case_id', id)
  .eq('status', 'open')
  .maybeSingle();
```

Sayfanın sonundaki "Hazırım, seansa başla" link bloğunu (satır 79-87 civarı) güncelle:

```tsx
<div className="mt-12 flex items-center justify-between gap-4 flex-wrap">
  <p className="text-xs text-muted max-w-sm leading-relaxed">
    Seansı başlattığında 45 dakikalık süre sayacı işlemeye başlar. Vaka dosyasına seans
    sırasında üst köşeden geri dönebilirsin.
  </p>
  {openSeries ? (
    <a href={`/seri/${openSeries.id}`} className="btn-primary">
      Takibe devam et →
    </a>
  ) : (
    <a href={`/seans/start?case=${c.id}`} className="btn-primary">
      Hazırım, seansa başla →
    </a>
  )}
</div>
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/app/vaka/[id]/page.tsx
git commit -m "feat(case): show 'continue series' CTA when an open series exists"
```

---

## Task 9: Rapor Sayfası — Breadcrumb + Free "Devam et"

**Files:**
- Modify: `src/app/rapor/[sessionId]/page.tsx`
- Modify: `src/components/report/ReportView.tsx`

- [ ] **Step 1: Rapor sayfasına series fetch ve prop'lar ekle**

`src/app/rapor/[sessionId]/page.tsx`:

`SessionWithCase` tipine `series_id` ekle:

```ts
type SessionWithCase = {
  id: string;
  status: 'in_progress' | 'completed' | 'abandoned';
  user_id: string;
  formulation: unknown;
  series_id: string;
  case: { /* mevcut alanlar + source */ } | null;
};
```

`.select` string'ine `series_id` ekle:

```ts
.select('id, status, user_id, formulation, series_id, case:cases(...)')
```

Series status fetch (session fetch'inden sonra):

```ts
const { data: seriesRow } = await sb
  .from('case_series')
  .select('id, status')
  .eq('id', session.series_id)
  .single();
const seriesOpen = seriesRow?.status === 'open';
```

`<ReportView>` props'una ekle:

```tsx
<ReportView
  /* mevcut props */
  seriesId={session.series_id}
  seriesOpen={seriesOpen}
  caseSource={session.case?.source ?? 'curated'}
/>
```

- [ ] **Step 2: `ReportView`'e breadcrumb + Devam et bölümü ekle**

`src/components/report/ReportView.tsx`:

Props tipine ekle:

```tsx
export function ReportView(props: {
  /* mevcut */
  seriesId: string;
  seriesOpen: boolean;
  caseSource: 'curated' | 'ai_generated';
}) {
```

Render'ın **en üstüne**, "← Vakalar" yerine series breadcrumb (mevcut `<a href="/" ...>← Vakalar</a>` satırını değiştir):

```tsx
<a href={`/seri/${props.seriesId}`} className="btn-quiet text-xs">← Seri sayfası</a>
```

Render'ın sonuna (mevcut `hiddenDossier` bölümünden sonra, footer'dan önce), free + open için yeni bölüm:

```tsx
{props.caseSource === 'ai_generated' && props.seriesOpen && (
  <section className="surface px-6 py-6 mb-16 text-center">
    <p className="font-display text-xl mb-2">Bu danışanla devam et</p>
    <p className="text-sm text-muted mb-5">
      Aynı kişiyle bir sonraki seansa geçebilirsin. AI önceki seansı hatırlar.
    </p>
    <a href={`/seri/${props.seriesId}`} className="btn-primary">
      Seri sayfasına git →
    </a>
  </section>
)}
```

- [ ] **Step 3: Typecheck + testler**

Run: `npm run typecheck && npm test`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/app/rapor/[sessionId]/page.tsx src/components/report/ReportView.tsx
git commit -m "feat(report): series breadcrumb + 'continue with this client' CTA"
```

---

## Task 10: E2E Smoke — Series 2-Session Flow

**Files:**
- Create: `tests/e2e/series.spec.ts`

- [ ] **Step 1: E2E testi yaz**

```ts
// tests/e2e/series.spec.ts
import { test, expect } from '@playwright/test';

test.skip(
  ({ }) => process.env.MOCK_OPENAI !== 'true',
  'requires MOCK_OPENAI=true in dev server env'
);

test('two-session series happy path', async ({ page }) => {
  // anonymous redirect
  await page.goto('/');
  await expect(page).toHaveURL(/\/login/);

  // login (test fixture user: test@psk.local seeded locally)
  await page.locator('input[type="email"]').fill('test@psk.local');
  await page.locator('input[type="password"]').fill('password123');
  await page.locator('button[type="submit"]').click();
  await page.waitForURL('/');

  // serbest seans başlat
  await page.getByRole('button', { name: /Başlat/i }).first().click();
  await page.getByRole('button', { name: 'Kolay' }).click();
  await page.getByRole('button', { name: 'Başlat' }).click();

  await page.waitForURL(/\/seans\//);
  const firstSessionUrl = page.url();
  const firstSessionId = firstSessionUrl.split('/').pop()!;

  // birkaç mesaj at + bitir (mevcut UI çağırma örüntüsünü kullan)
  await page.locator('textarea, input[type="text"]').first().fill('Merhaba, nasılsın?');
  await page.locator('button[aria-label*="Gönder"], button[type="submit"]').first().click();
  await page.waitForTimeout(2000); // mock stream

  await page.getByRole('button', { name: /Bitir/i }).first().click();
  await page.waitForURL(/\/rapor\//);

  // raporda "Bu danışanla devam et" görünür
  await expect(page.getByText(/Bu danışanla devam et/)).toBeVisible();

  // seri sayfasına git
  await page.getByRole('link', { name: /Seri sayfasına git/ }).click();
  await page.waitForURL(/\/seri\//);

  // 1 seans listeleniyor
  await expect(page.getByText('Seans 1')).toBeVisible();
  await expect(page.getByText(/Açık · 1 seans/)).toBeVisible();

  // yeni seans başlat
  await page.getByRole('link', { name: /Yeni seans başlat/ }).click();
  await page.waitForURL(/\/seans\//);
  const secondSessionUrl = page.url();
  expect(secondSessionUrl).not.toBe(firstSessionUrl);
});
```

(Test login kullanıcı/parola değerleri `tests/manual/real-session.mjs` ve mevcut e2e file'larıyla aynı pattern — gerekirse oradakine bak.)

- [ ] **Step 2: Testi koştur**

Run: `npm run test:e2e -- series`
Expected: PASS (mock mode), veya skip (mock mode off).

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/series.spec.ts
git commit -m "test(e2e): two-session series happy path"
```

---

## Task 11: Final Verification

- [ ] **Step 1: Typecheck + tüm testler**

Run: `npm run typecheck && npm test && npm run test:e2e`
Expected: Hepsi PASS.

- [ ] **Step 2: Manuel sanity (dev server)**

`MOCK_OPENAI=false` ile dev server'ı çalıştır, manuel kontrol:
- Curated bir vakayla seans yap, bitir → anasayfada o kart "devam ediyor" rozetli, tıklayınca `/seri/[id]`'ye gidiyor
- Seri sayfasından "Yeni seans başlat" → ikinci seans AI ilk mesajda önceki seansa referans veriyor (gerçek OpenAI ile)
- "Vakayı kapat" → seri kapanıyor, rozet kayboluyor, anasayfada normal vaka olarak görünüyor
- Serbest seans → rapor → "Bu danışanla devam et" çalışıyor

- [ ] **Step 3: Prod migration (kullanıcı onayıyla)**

Cloud Supabase'e migration push:
- MCP üzerinden veya `npx supabase db push` ile `0019_case_series.sql` uygula
- Backfill prod'daki mevcut seansları kendi closed serisine yerleştirir

- [ ] **Step 4: Commit (gerekirse final düzeltmeler)**

Manuel testte bulunan UI düzeltmeleri varsa commit et.

---

## Notlar

- **Geriye uyumluluk:** Mevcut tüm seanslar backfill ile kendi closed serilerine atanır. Geçmiş sayfası, raporlar, rapor breadcrumb'u zarar görmez (kapalı serilerin /seri/[id] sayfası açılır ama "Yeni seans başlat" düğmesi görünmez).
- **Token bütçesi:** Faz 1 bilinçli olarak naive. 5-6 seans sonrası prompt token'ı yükselir; Faz 2 (özetleme) bunu çözer.
- **Tek seri kısıtı:** Aynı user × curated case için tek açık seri (unique partial index). Eski kapanmış serilerin üstüne yeni açılabilir.
- **Free session:** Her serbest seans yeni `case_id` ürettiği için her birinin kendi serisi olur. Free serisi tek bir kullanıcıya bağlı; başkası göremez (cases RLS + case_series RLS birlikte).
- **AI prompt güvenliği:** Geçmiş mesajlar olduğu gibi prompt'a girer. `[ROLE_RESET]` ve diğer güvenlik kuralları (client-prompt.ts) sürer.
