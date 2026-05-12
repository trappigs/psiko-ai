import { describe, it, expect } from 'vitest';
import { mockSeriesSynthesis } from '@/lib/openai/mock';

describe('mockSeriesSynthesis', () => {
  it('returns SeriesSynthesis shape with non-empty fields', () => {
    const r = mockSeriesSynthesis({ sessionCount: 3 });
    expect(typeof r.synthesis.summary).toBe('string');
    expect(r.synthesis.summary.length).toBeGreaterThan(0);
    expect(typeof r.synthesis.arc).toBe('string');
    expect(Array.isArray(r.synthesis.themes)).toBe(true);
    expect(Array.isArray(r.synthesis.growth)).toBe(true);
    expect(Array.isArray(r.synthesis.missed_opportunities)).toBe(true);
    expect(typeof r.synthesis.next_steps).toBe('string');
    expect(typeof r.token_count).toBe('number');
    expect(r.token_count).toBeGreaterThan(0);
  });
});
