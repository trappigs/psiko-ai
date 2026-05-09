import { describe, it, expect } from 'vitest';
import {
  buildSupervisorPrompt,
  parseSupervisorReply,
  type ParsedReport,
} from '@/lib/openai/supervisor-prompt';

describe('buildSupervisorPrompt', () => {
  it('embeds case summary and transcript', () => {
    const p = buildSupervisorPrompt(
      { title: 'Sınav kaygısı', presenting: 'uyku problemi', diagnosis_hint: 'YAB' },
      [
        { role: 'student', content: 'Nasılsın?' },
        { role: 'client', content: 'Şey, kötü.' },
      ]
    );
    expect(p).toContain('Sınav kaygısı');
    expect(p).toContain('S: Nasılsın?');
    expect(p).toContain('D: Şey, kötü.');
    expect(p).toMatch(/JSON/);
  });
});

describe('parseSupervisorReply', () => {
  it('parses a clean JSON', () => {
    const raw = JSON.stringify({
      summary: 'iyi seans',
      strengths: ['empati'],
      improvements: ['daha açık soru'],
      missed_signals: ['aile'],
      next_steps: 'aile dinamikleri',
    });
    const r = parseSupervisorReply(raw) as ParsedReport;
    expect(r.summary).toBe('iyi seans');
    expect(r.strengths).toEqual(['empati']);
  });

  it('strips markdown code fences', () => {
    const raw =
      '```json\n{"summary":"x","strengths":[],"improvements":[],"missed_signals":[],"next_steps":"y"}\n```';
    const r = parseSupervisorReply(raw) as ParsedReport;
    expect(r.summary).toBe('x');
  });

  it('returns null on invalid JSON', () => {
    expect(parseSupervisorReply('not json')).toBeNull();
  });

  it('returns null when shape is wrong', () => {
    const raw = JSON.stringify({ summary: 'x' });
    expect(parseSupervisorReply(raw)).toBeNull();
  });
});
