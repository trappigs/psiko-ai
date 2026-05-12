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

  // Eager summary üretimi — başarısız olursa seans yine completed olur, sessizce yutulur
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
        .filter(
          (s): s is SessionSummary =>
            !!s && typeof s === 'object' && typeof s.headline === 'string'
        );

      const { data: seriesRow } = await svc
        .from('case_series')
        .select('formulation')
        .eq('id', session.series_id)
        .single();

      const result = await generateSessionSummary({
        case: session.case,
        transcript: ((msgs ?? []) as Array<{ role: string; content: string }>).map(
          (m) => ({
            role: m.role === 'student' ? 'student' : 'client',
            content: m.content,
          })
        ),
        priorSummaries,
        livingFormulation:
          (seriesRow?.formulation as {
            presenting?: string;
            hypothesis?: string;
            patterns?: string;
            next_session?: string;
          } | null) ?? null,
      });

      await svc
        .from('sessions')
        .update({ summary: result.summary })
        .eq('id', sessionId);

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
      // sessizce yutulur
    }
  }

  return NextResponse.json({ ok: true });
}
