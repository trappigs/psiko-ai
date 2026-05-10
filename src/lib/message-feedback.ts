import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/types';
import type { FeedbackState } from '@/components/chat/MessageFeedback';

export async function loadFeedbackByMessageId(
  sb: SupabaseClient<Database>,
  messageIds: string[]
): Promise<Record<string, FeedbackState>> {
  if (messageIds.length === 0) return {};
  const { data } = await sb
    .from('message_feedback')
    .select('message_id, rating, tags, comment')
    .in('message_id', messageIds);
  const map: Record<string, FeedbackState> = {};
  for (const row of data ?? []) {
    map[row.message_id] = {
      rating: row.rating as 'good' | 'bad',
      tags: row.tags ?? [],
      comment: row.comment ?? null,
    };
  }
  return map;
}
