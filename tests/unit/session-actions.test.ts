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
    const supabaseService = await import('@/lib/supabase/service');
    // @ts-expect-error __mocks is a test-only export
    const { casesInsert, sessionsInsert, usageDailyUpsert } = supabaseService.__mocks;
    expect(casesInsert).toHaveBeenCalledTimes(0);
    expect(sessionsInsert).toHaveBeenCalledWith(expect.objectContaining({ case_id: 'case-X', user_id: 'user-1' }));
    expect(usageDailyUpsert.mock.calls[0][0]).toMatchObject({ token_count: 0 });
  });

  it('free mode generates a case, inserts it, then opens session', async () => {
    const r = await startSession('user-1', { mode: 'free', difficulty: 'easy' });
    expect(r.session_id).toBe('session-id');
    const { generateCase } = await import('@/lib/openai/case-generator');
    expect(generateCase).toHaveBeenCalledWith({ difficulty: 'easy', themeHint: undefined });
    const supabaseService = await import('@/lib/supabase/service');
    // @ts-expect-error __mocks is a test-only export
    const { casesInsert, sessionsInsert, usageDailyUpsert } = supabaseService.__mocks;
    expect(casesInsert).toHaveBeenCalledTimes(1);
    expect(casesInsert).toHaveBeenCalledWith(expect.objectContaining({ source: 'ai_generated', is_active: false, difficulty: 'easy' }));
    expect(sessionsInsert).toHaveBeenCalledWith(expect.objectContaining({ case_id: 'generated-case-id', user_id: 'user-1' }));
    expect(usageDailyUpsert.mock.calls[0][0]).toMatchObject({ token_count: 800 });
  });

  it('free mode throws if generation fails (no session created)', async () => {
    const { generateCase } = await import('@/lib/openai/case-generator');
    (generateCase as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('generation_failed:x'));
    await expect(startSession('user-1', { mode: 'free', difficulty: 'medium' })).rejects.toThrow(/generation_failed/);
    const supabaseService = await import('@/lib/supabase/service');
    // @ts-expect-error __mocks is a test-only export
    const { casesInsert, sessionsInsert } = supabaseService.__mocks;
    expect(casesInsert).toHaveBeenCalledTimes(0);
    expect(sessionsInsert).toHaveBeenCalledTimes(0);
  });
});
