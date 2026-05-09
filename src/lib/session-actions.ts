import { createServiceClient } from '@/lib/supabase/service';
import { defaultLimits, isOverDailyLimit } from '@/lib/usage';

export async function startSession(userId: string, caseId: string) {
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
      token_count: usage?.token_count ?? 0,
    },
    { onConflict: 'user_id,day' }
  );

  return { session_id: session.id };
}
