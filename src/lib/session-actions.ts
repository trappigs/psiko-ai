import { createServiceClient } from '@/lib/supabase/service';
import { defaultLimits, isOverDailyLimit } from '@/lib/usage';
import { generateCase, type Difficulty } from '@/lib/openai/case-generator';
import { findOrCreateOpenSeries, createSeries } from '@/lib/series';

export type StartSessionInput =
  | { mode: 'curated'; caseId: string; timeGapLabel?: string }
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
    seriesId = await createSeries(sb, userId, caseId);
  } else {
    caseId = input.caseId;
    seriesId = await findOrCreateOpenSeries(sb, userId, caseId);
  }

  const { data: session, error } = await sb
    .from('sessions')
    .insert({
      user_id: userId,
      case_id: caseId,
      series_id: seriesId,
      status: 'in_progress',
      time_gap_label: input.mode === 'curated' ? input.timeGapLabel ?? null : null,
    })
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
