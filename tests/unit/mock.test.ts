import { describe, it, expect } from 'vitest';
import { mockClientStream, mockSupervisorReport } from '@/lib/openai/mock';

describe('mockClientStream', () => {
  it('yields deterministic chunks', async () => {
    const chunks: string[] = [];
    for await (const c of mockClientStream('Merhaba')) chunks.push(c);
    expect(chunks.length).toBeGreaterThan(0);
    expect(chunks.join('')).toMatch(/.+/);
  });
});

describe('mockSupervisorReport', () => {
  it('returns a valid report shape', () => {
    const r = mockSupervisorReport();
    expect(r.summary).toBeTypeOf('string');
    expect(Array.isArray(r.strengths)).toBe(true);
    expect(Array.isArray(r.improvements)).toBe(true);
    expect(Array.isArray(r.missed_signals)).toBe(true);
    expect(r.next_steps).toBeTypeOf('string');
  });
});
