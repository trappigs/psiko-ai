import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  validateSessionSummary,
  generateSessionSummary,
} from '@/lib/openai/summary-generator';

describe('validateSessionSummary', () => {
  const valid = {
    headline: 'h',
    key_events: ['a', 'b'],
    promises: [],
    hypothesis_update: 'u',
  };
  it('accepts complete summary', () => {
    expect(validateSessionSummary(valid)).toEqual(valid);
  });
  it('rejects empty headline', () => {
    expect(() => validateSessionSummary({ ...valid, headline: '' })).toThrow();
  });
  it('rejects non-array key_events', () => {
    expect(() => validateSessionSummary({ ...valid, key_events: 'x' })).toThrow();
  });
  it('coerces missing promises to []', () => {
    const r = validateSessionSummary({ ...valid, promises: undefined });
    expect(r.promises).toEqual([]);
  });
});

describe('generateSessionSummary (mock mode)', () => {
  beforeEach(() => {
    vi.stubEnv('MOCK_OPENAI', 'true');
  });
  it('returns summary + token_count via mock when MOCK_OPENAI=true', async () => {
    const r = await generateSessionSummary({
      case: {
        presenting: 'p',
        background: 'b',
        personality: 'x',
        speech_style: 's',
        goals_hidden: 'g',
      },
      transcript: [{ role: 'student', content: 'merhaba' }],
    });
    expect(r.summary.headline.length).toBeGreaterThan(0);
    expect(r.token_count).toBeGreaterThan(0);
  });
});
