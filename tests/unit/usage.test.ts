import { describe, it, expect } from 'vitest';
import { isOverDailyLimit, defaultLimits } from '@/lib/usage';

describe('isOverDailyLimit', () => {
  const limits = defaultLimits();
  it('allows usage below limits', () => {
    expect(isOverDailyLimit({ session_count: 2, token_count: 5000 }, limits)).toBe(false);
  });
  it('blocks when sessions exceed limit', () => {
    const result = isOverDailyLimit({ session_count: 5, token_count: 0 }, limits);
    expect(result).not.toBe(false);
    expect(result && result.reason).toBe('sessions');
  });
  it('blocks when tokens exceed limit', () => {
    const result = isOverDailyLimit({ session_count: 1, token_count: 100_001 }, limits);
    expect(result).not.toBe(false);
    expect(result && result.reason).toBe('tokens');
  });
  it('returns false for null usage row (first action of the day)', () => {
    expect(isOverDailyLimit(null, limits)).toBe(false);
  });
});
