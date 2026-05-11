import { describe, it, expect, vi, beforeEach } from 'vitest';
import { validateGeneratedCase, generateCase } from '@/lib/openai/case-generator';

describe('validateGeneratedCase', () => {
  const valid = {
    title: 'T', presenting: 'P', background: 'B', personality: 'X',
    speech_style: 'S', goals_hidden: 'G', insight_level: 'moderate',
    defense_style: 'kaçınma', register: 'gündelik', diagnosis_hint: null,
    difficulty: 'medium',
  };
  it('accepts a complete object', () => {
    expect(validateGeneratedCase(valid)).toEqual(valid);
  });
  it('rejects missing required string', () => {
    const bad = { ...valid, title: '' };
    expect(() => validateGeneratedCase(bad)).toThrow();
  });
  it('rejects invalid difficulty', () => {
    const bad = { ...valid, difficulty: 'extreme' };
    expect(() => validateGeneratedCase(bad)).toThrow();
  });
  it('allows null diagnosis_hint', () => {
    expect(validateGeneratedCase({ ...valid, diagnosis_hint: null }).diagnosis_hint).toBeNull();
  });
});

describe('generateCase (mock mode)', () => {
  beforeEach(() => { vi.stubEnv('MOCK_OPENAI', 'true'); });
  it('returns a result with case + token_count when MOCK_OPENAI=true', async () => {
    const r = await generateCase({ difficulty: 'easy' });
    expect(r.case.difficulty).toBe('easy');
    expect(r.token_count).toBeGreaterThan(0);
  });
});
