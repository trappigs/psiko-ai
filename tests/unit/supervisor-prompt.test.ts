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
    expect(p).toContain('[1] S: Nasılsın?');
    expect(p).toContain('[2] D: Şey, kötü.');
    expect(p).toMatch(/JSON/);
  });
});

describe('parseSupervisorReply', () => {
  it('parses a clean JSON with microskills', () => {
    const raw = JSON.stringify({
      summary: 'iyi seans',
      strengths: ['empati'],
      improvements: ['daha açık soru'],
      missed_signals: ['aile'],
      next_steps: 'aile dinamikleri',
      microskills: {
        open_question: { count: 5, examples: ['Nasıl hissediyorsun?'] },
        closed_question: { count: 2, examples: ['Üzgün müsün?'] },
        reflection: { count: 1, examples: ['Yani çaresizsin.'] },
        empathy: { count: 0, examples: [] },
        summary: { count: 0, examples: [] },
        advice_or_interpretation: { count: 0, examples: [] },
      },
    });
    const r = parseSupervisorReply(raw) as ParsedReport;
    expect(r.summary).toBe('iyi seans');
    expect(r.microskills.open_question.count).toBe(5);
    expect(r.microskills.open_question.examples).toEqual(['Nasıl hissediyorsun?']);
  });

  it('falls back to empty microskills when missing', () => {
    const raw = JSON.stringify({
      summary: 'x',
      strengths: [],
      improvements: [],
      missed_signals: [],
      next_steps: 'y',
    });
    const r = parseSupervisorReply(raw) as ParsedReport;
    expect(r.microskills.open_question.count).toBe(0);
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
