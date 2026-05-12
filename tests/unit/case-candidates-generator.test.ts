import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  validateCandidatesPayload,
  generateCaseCandidates,
} from '@/lib/openai/case-candidates-generator';

describe('validateCandidatesPayload', () => {
  const validCandidate = {
    title: 't',
    presenting: 'p',
    background: 'b',
    personality: 'x',
    speech_style: 's',
    goals_hidden: 'g',
    insight_level: 'moderate',
    defense_style: 'kaçınma',
    register: 'gündelik',
    diagnosis_hint: null,
    difficulty: 'medium',
    variant_label: 'Dengeli',
  };

  it('accepts payload with exactly 3 valid candidates', () => {
    const r = validateCandidatesPayload({
      candidates: [
        { ...validCandidate, variant_label: 'Daha açık' },
        { ...validCandidate, variant_label: 'Dengeli' },
        { ...validCandidate, variant_label: 'Direngen' },
      ],
    });
    expect(r).toHaveLength(3);
  });

  it('rejects payload with !=3 candidates', () => {
    expect(() =>
      validateCandidatesPayload({ candidates: [validCandidate] })
    ).toThrow();
    expect(() =>
      validateCandidatesPayload({
        candidates: [validCandidate, validCandidate, validCandidate, validCandidate],
      })
    ).toThrow();
  });

  it('rejects candidate with invalid variant_label', () => {
    expect(() =>
      validateCandidatesPayload({
        candidates: [
          { ...validCandidate, variant_label: 'X' },
          { ...validCandidate, variant_label: 'Dengeli' },
          { ...validCandidate, variant_label: 'Direngen' },
        ],
      })
    ).toThrow();
  });
});

describe('generateCaseCandidates (mock mode)', () => {
  beforeEach(() => {
    vi.stubEnv('MOCK_OPENAI', 'true');
  });
  it('returns 3 candidates + token_count when MOCK_OPENAI=true', async () => {
    const r = await generateCaseCandidates({ difficulty: 'easy' });
    expect(r.candidates).toHaveLength(3);
    expect(r.token_count).toBeGreaterThan(0);
  });
});
