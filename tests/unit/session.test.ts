import { describe, it, expect } from 'vitest';
import { remainingSeconds, isExpired, sessionDurationMinutes } from '@/lib/session';

describe('session timing', () => {
  it('default duration is 45 minutes', () => {
    expect(sessionDurationMinutes()).toBe(45);
  });
  it('remainingSeconds returns full duration at start', () => {
    const now = new Date('2026-05-09T12:00:00Z');
    const started = new Date('2026-05-09T12:00:00Z');
    expect(remainingSeconds(started, now)).toBe(45 * 60);
  });
  it('remainingSeconds decreases as time passes', () => {
    const started = new Date('2026-05-09T12:00:00Z');
    const now = new Date('2026-05-09T12:30:00Z');
    expect(remainingSeconds(started, now)).toBe(15 * 60);
  });
  it('returns 0 when expired', () => {
    const started = new Date('2026-05-09T12:00:00Z');
    const now = new Date('2026-05-09T13:00:00Z');
    expect(remainingSeconds(started, now)).toBe(0);
  });
  it('isExpired true when remaining is 0', () => {
    const started = new Date('2026-05-09T12:00:00Z');
    expect(isExpired(started, new Date('2026-05-09T13:00:00Z'))).toBe(true);
    expect(isExpired(started, new Date('2026-05-09T12:30:00Z'))).toBe(false);
  });
});
