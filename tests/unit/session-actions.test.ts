import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/supabase/service', () => {
  const usage = { session_count: 0, token_count: 0 };
  const usageDailyMaybeSingle = vi.fn(async () => ({ data: usage, error: null }));
  const usageDailyUpsert = vi.fn(async () => ({ error: null }));
  const casesInsertReturn = { id: 'generated-case-id' };
  const casesInsert = vi.fn(() => ({ select: () => ({ single: async () => ({ data: casesInsertReturn, error: null }) }) }));
  const sessionsInsert = vi.fn(() => ({ select: () => ({ single: async () => ({ data: { id: 'session-id' }, error: null }) }) }));
  const caseSeriesMaybeSingle = vi.fn(async () => ({ data: null as { id: string } | null, error: null }));
  const caseSeriesInsert = vi.fn(() => ({ select: () => ({ single: async () => ({ data: { id: 'series-id' }, error: null }) }) }));

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
        if (table === 'case_series') {
          return {
            select: () => ({
              eq: () => ({ eq: () => ({ eq: () => ({ maybeSingle: caseSeriesMaybeSingle }) }) }),
            }),
            insert: caseSeriesInsert,
          };
        }
        throw new Error('unknown table: ' + table);
      },
    }),
    __mocks: { casesInsert, sessionsInsert, usageDailyUpsert, caseSeriesMaybeSingle, caseSeriesInsert },
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

  it('curated mode reuses open series if exists', async () => {
    const supabaseService = await import('@/lib/supabase/service');
    // @ts-expect-error __mocks is a test-only export
    const { caseSeriesMaybeSingle, caseSeriesInsert, sessionsInsert, casesInsert } = supabaseService.__mocks;
    caseSeriesMaybeSingle.mockResolvedValueOnce({ data: { id: 'existing-series' }, error: null });

    const r = await startSession('user-1', { mode: 'curated', caseId: 'case-X' });

    expect(r.session_id).toBe('session-id');
    expect(casesInsert).toHaveBeenCalledTimes(0);
    expect(caseSeriesInsert).not.toHaveBeenCalled();
    expect(sessionsInsert).toHaveBeenCalledWith(
      expect.objectContaining({ series_id: 'existing-series', case_id: 'case-X', user_id: 'user-1' })
    );
  });

  it('curated mode creates new series if none open', async () => {
    const supabaseService = await import('@/lib/supabase/service');
    // @ts-expect-error __mocks is a test-only export
    const { caseSeriesInsert, sessionsInsert, casesInsert, usageDailyUpsert } = supabaseService.__mocks;

    const r = await startSession('user-1', { mode: 'curated', caseId: 'case-X' });

    expect(r.session_id).toBe('session-id');
    expect(casesInsert).toHaveBeenCalledTimes(0);
    expect(caseSeriesInsert).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: 'user-1', case_id: 'case-X', status: 'open' })
    );
    expect(sessionsInsert).toHaveBeenCalledWith(
      expect.objectContaining({ series_id: 'series-id', case_id: 'case-X', user_id: 'user-1' })
    );
    expect(usageDailyUpsert.mock.calls[0][0]).toMatchObject({ token_count: 0 });
  });

  it('free mode generates a case, creates new series, then opens session', async () => {
    const supabaseService = await import('@/lib/supabase/service');
    // @ts-expect-error __mocks is a test-only export
    const { casesInsert, caseSeriesInsert, sessionsInsert, usageDailyUpsert } = supabaseService.__mocks;

    const r = await startSession('user-1', { mode: 'free', difficulty: 'easy' });

    expect(r.session_id).toBe('session-id');
    const { generateCase } = await import('@/lib/openai/case-generator');
    expect(generateCase).toHaveBeenCalledWith({ difficulty: 'easy', themeHint: undefined });
    expect(casesInsert).toHaveBeenCalledTimes(1);
    expect(casesInsert).toHaveBeenCalledWith(
      expect.objectContaining({ source: 'ai_generated', is_active: false, difficulty: 'easy' })
    );
    expect(caseSeriesInsert).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: 'user-1', case_id: 'generated-case-id', status: 'open' })
    );
    expect(sessionsInsert).toHaveBeenCalledWith(
      expect.objectContaining({ series_id: 'series-id', case_id: 'generated-case-id', user_id: 'user-1' })
    );
    expect(usageDailyUpsert.mock.calls[0][0]).toMatchObject({ token_count: 800 });
  });

  it('free mode throws if generation fails (no series or session created)', async () => {
    const { generateCase } = await import('@/lib/openai/case-generator');
    (generateCase as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('generation_failed:x'));
    await expect(startSession('user-1', { mode: 'free', difficulty: 'medium' })).rejects.toThrow(/generation_failed/);
    const supabaseService = await import('@/lib/supabase/service');
    // @ts-expect-error __mocks is a test-only export
    const { casesInsert, caseSeriesInsert, sessionsInsert } = supabaseService.__mocks;
    expect(casesInsert).toHaveBeenCalledTimes(0);
    expect(caseSeriesInsert).toHaveBeenCalledTimes(0);
    expect(sessionsInsert).toHaveBeenCalledTimes(0);
  });
});
