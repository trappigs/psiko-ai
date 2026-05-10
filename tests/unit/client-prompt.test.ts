import { describe, it, expect } from 'vitest';
import { buildClientSystemPrompt } from '@/lib/openai/client-prompt';

describe('buildClientSystemPrompt', () => {
  const sampleCase = {
    presenting: 'Sınav kaygısı',
    background: 'Üniversite 3. sınıf',
    personality: 'İçedönük',
    speech_style: 'Kısa cümleler',
    goals_hidden: 'Babasıyla mesafe',
  };

  it('embeds case fields in the prompt', () => {
    const p = buildClientSystemPrompt(sampleCase);
    expect(p).toContain('Sınav kaygısı');
    expect(p).toContain('Üniversite 3. sınıf');
    expect(p).toContain('İçedönük');
    expect(p).toContain('Kısa cümleler');
    expect(p).toContain('Babasıyla mesafe');
  });

  it('includes safety rules and role-keep instructions', () => {
    const p = buildClientSystemPrompt(sampleCase);
    expect(p).toMatch(/danışan/i);
    expect(p).toMatch(/terapist/i);
    expect(p).toMatch(/intihar.*canlandırma/i);
    expect(p).toContain('[ROLE_RESET]');
  });
});
