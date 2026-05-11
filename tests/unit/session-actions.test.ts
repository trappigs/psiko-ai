import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/supabase/service', () => {
  const usage = { session_count: 0, token_count: 0 };
  const usageDailyMaybeSingle = vi.fn(async () => ({ data: usage, error: null }));
  const usageDailyUpsert = vi.fn(async () => ({ error: null }));
  const casesInsertReturn = { id: 'generated-case-id' };
  const casesInsert = vi.fn(() => ({ select: () => ({ single: async () => ({ data: casesInsertReturn, error: null }) }) }));
  const sessionsInsert = vi.fn(() => ({ select: () => ({ single: async () => ({ data: { id: 'session-id' }, error: null }) }) }));

  return {
    createServiceClient: () => ({
      from: (table: string) => {
        if (table === 'usage_daily') {
          return {
            select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: usageDailyMaybeSingle }) }) }),
            upsert: usageDailyUpsert,
          };
        }
        if (table === 'cases') return { insert: casesInsert };
        if (table === 'sessions') return { insert: sessionsInsert };
        throw new Error('unknown table: ' + table);
      },
    }),
    __mocks: { casesInsert, sessionsInsert, usageDailyUpsert },
  };
});

vi.mock('@/lib/openai/case-generator', () => ({
  generateCase: vi.fn(async () => ({
    case: {
      title: 'Mock', presenting: 'p', background: 'b', personality: 'x',
      speech_style: 's', goals_hidden: 'g', insight_level: 'moderate',
      defense_style: 'kaçınma', register: 'gündelik',
      diagnosis_hint: null, difficulty: 'easy',
    },
    token_count: 800,
  })),
}));

import { startSession } from '@/lib/session-actions';

describe('startSession', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('curated mode inserts session with given caseId', async () => {
    const r = await startSession('user-1', { mode: 'curated', caseId: 'case-X' });
    expect(r.session_id).toBe('session-id');
  });

  it('free mode generates a case, inserts it, then opens session', async () => {
    const r = await startSession('user-1', { mode: 'free', difficulty: 'easy' });
    expect(r.session_id).toBe('session-id');
    const { generateCase } = await import('@/lib/openai/case-generator');
    expect(generateCase).toHaveBeenCalledWith({ difficulty: 'easy', themeHint: undefined });
  });

  it('free mode throws if generation fails (no session created)', async () => {
    const { generateCase } = await import('@/lib/openai/case-generator');
    (generateCase as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('generation_failed:x'));
    await expect(startSession('user-1', { mode: 'free', difficulty: 'medium' })).rejects.toThrow(/generation_failed/);
  });
});
