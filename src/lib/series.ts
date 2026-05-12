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
