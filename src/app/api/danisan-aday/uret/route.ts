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
    console.error('[danisan-aday] generation failed:', msg);
    if (msg.startsWith('generation_failed')) {
      return NextResponse.json({ error: 'generation_failed', detail: msg }, { status: 502 });
    }
    return NextResponse.json({ error: 'internal', detail: msg }, { status: 500 });
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
