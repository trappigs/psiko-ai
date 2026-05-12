import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  validateSeriesSynthesis,
  generateSeriesSynthesis,
} from '@/lib/openai/synthesis-generator';

describe('validateSeriesSynthesis', () => {
  const valid = {
    summary: 's',
    arc: 'a',
    themes: ['t1'],
    growth: ['g1'],
    missed_opportunities: [],
    next_steps: 'n',
  };
  it('accepts complete synthesis', () => {
    expect(validateSeriesSynthesis(valid)).toEqual(valid);
  });
  it('rejects empty summary', () => {
    expect(() => validateSeriesSynthesis({ ...valid, summary: '' })).toThrow();
  });
  it('rejects empty arc', () => {
    expect(() => validateSeriesSynthesis({ ...valid, arc: '' })).toThrow();
  });
  it('rejects empty next_steps', () => {
    expect(() => validateSeriesSynthesis({ ...valid, next_steps: '' })).toThrow();
  });
  it('coerces non-array arrays to []', () => {
    const r = validateSeriesSynthesis({ ...valid, themes: undefined });
    expect(r.themes).toEqual([]);
  });
});

describe('generateSeriesSynthesis (mock mode)', () => {
  beforeEach(() => {
    vi.stubEnv('MOCK_OPENAI', 'true');
  });
  it('returns synthesis + token_count via mock when MOCK_OPENAI=true', async () => {
    const r = await generateSeriesSynthesis({
      case: {
        presenting: 'p',
        background: 'b',
        personality: 'x',
        speech_style: 's',
        goals_hidden: 'g',
      },
      sessionCount: 3,
      sessionSummaries: [
        {
          headline: 'h',
          key_events: ['e'],
          promises: [],
          hypothesis_update: 'u',
        },
      ],
    });
    expect(r.synthesis.summary.length).toBeGreaterThan(0);
    expect(r.token_count).toBeGreaterThan(0);
  });
});
