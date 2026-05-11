import { describe, it, expect } from 'vitest';
import { mockGeneratedCase } from '@/lib/openai/mock';

describe('mockGeneratedCase', () => {
  it('returns all required fields for easy difficulty', () => {
    const r = mockGeneratedCase({ difficulty: 'easy' });
    expect(r.case.difficulty).toBe('easy');
    for (const f of [
      'title','presenting','background','personality','speech_style',
      'goals_hidden','insight_level','defense_style','register',
    ] as const) {
      expect(typeof r.case[f]).toBe('string');
      expect(r.case[f].length).toBeGreaterThan(0);
    }
    expect(typeof r.token_count).toBe('number');
  });
  it('threads themeHint into presenting or background', () => {
    const r = mockGeneratedCase({ difficulty: 'medium', themeHint: 'kayıp yası' });
    const blob = (r.case.presenting + ' ' + r.case.background).toLowerCase();
    expect(blob).toContain('kayıp');
  });
});
