import { describe, it, expect } from 'vitest';
import { mockSessionSummary } from '@/lib/openai/mock';

describe('mockSessionSummary', () => {
  it('returns SessionSummary shape with non-empty fields', () => {
    const r = mockSessionSummary({
      transcript: [
        { role: 'student', content: 'Merhaba.' },
        { role: 'client', content: 'Bilmiyorum, kötüyüm.' },
      ],
    });
    expect(typeof r.summary.headline).toBe('string');
    expect(r.summary.headline.length).toBeGreaterThan(0);
    expect(Array.isArray(r.summary.key_events)).toBe(true);
    expect(Array.isArray(r.summary.promises)).toBe(true);
    expect(typeof r.summary.hypothesis_update).toBe('string');
    expect(typeof r.token_count).toBe('number');
    expect(r.token_count).toBeGreaterThan(0);
  });
});
