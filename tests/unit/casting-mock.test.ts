import { describe, it, expect } from 'vitest';
import { mockCandidatesResponse } from '@/lib/openai/mock';

describe('mockCandidatesResponse', () => {
  it('returns exactly 3 candidates with variant labels', () => {
    const r = mockCandidatesResponse({});
    expect(r.candidates).toHaveLength(3);
    const labels = r.candidates.map((c) => c.variant_label);
    expect(labels).toContain('Daha açık');
    expect(labels).toContain('Dengeli');
    expect(labels).toContain('Direngen');
  });

  it('returns token_count > 0', () => {
    const r = mockCandidatesResponse({});
    expect(r.token_count).toBeGreaterThan(0);
  });

  it('each candidate has full GeneratedCase shape', () => {
    const r = mockCandidatesResponse({ difficulty: 'medium' });
    for (const c of r.candidates) {
      expect(typeof c.title).toBe('string');
      expect(typeof c.presenting).toBe('string');
      expect(typeof c.background).toBe('string');
      expect(typeof c.goals_hidden).toBe('string');
      expect(c.difficulty).toBe('medium');
    }
  });
});
