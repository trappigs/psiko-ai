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
