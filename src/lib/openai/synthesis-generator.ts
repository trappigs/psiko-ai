import { getOpenAI, MODEL, isMockMode } from './client';
import { mockSeriesSynthesis } from './mock';
import type {
  SeriesSynthesis,
  GenerateSynthesisInput,
  GenerateSynthesisResult,
} from './synthesis-types';

export type {
  SeriesSynthesis,
  GenerateSynthesisInput,
  GenerateSynthesisResult,
} from './synthesis-types';

export function validateSeriesSynthesis(raw: unknown): SeriesSynthesis {
  if (!raw || typeof raw !== 'object') throw new Error('not_object');
  const r = raw as Record<string, unknown>;
  const summary = typeof r.summary === 'string' ? r.summary.trim() : '';
  if (!summary) throw new Error('invalid_summary');
  const arc = typeof r.arc === 'string' ? r.arc.trim() : '';
  if (!arc) throw new Error('invalid_arc');
  const next_steps = typeof r.next_steps === 'string' ? r.next_steps.trim() : '';
  if (!next_steps) throw new Error('invalid_next_steps');

  const coerceArr = (v: unknown): string[] =>
    Array.isArray(v)
      ? (v as unknown[])
          .filter((x): x is string => typeof x === 'string')
          .map((x) => x.slice(0, 240))
          .slice(0, 8)
      : [];

  return {
    summary: summary.slice(0, 1500),
    arc: arc.slice(0, 1500),
    themes: coerceArr(r.themes),
    growth: coerceArr(r.growth),
    missed_opportunities: coerceArr(r.missed_opportunities),
    next_steps: next_steps.slice(0, 1000),
  };
}

function buildPrompt(input: GenerateSynthesisInput): string {
  const lines: string[] = [];
  lines.push(`Vakanın temel profili:`);
  lines.push(`- Sunulan sorun: ${input.case.presenting}`);
  lines.push(`- Geçmiş: ${input.case.background}`);
  lines.push(`- Kişilik: ${input.case.personality}`);
  lines.push(`- Konuşma stili: ${input.case.speech_style}`);
  lines.push(`- Gizli mesele: ${input.case.goals_hidden}`);
  lines.push(`\nSeri toplam ${input.sessionCount} seanstan oluştu.\n`);

  if (input.sessionSummaries.length > 0) {
    lines.push('Tüm seans özetleri (kronolojik):');
    input.sessionSummaries.forEach((s, i) => {
      lines.push(
        `Seans ${i + 1}: ${s.headline} | olaylar: ${s.key_events.join('; ')} | sözler: ${s.promises.join('; ') || '—'} | hipotez: ${s.hypothesis_update}`
      );
    });
  }

  if (input.livingFormulation) {
    const f = input.livingFormulation;
    const parts = [
      f.presenting && `Sunulan: ${f.presenting}`,
      f.hypothesis && `Hipotez: ${f.hypothesis}`,
      f.patterns && `Örüntü: ${f.patterns}`,
      f.next_session && `Sonraki seans: ${f.next_session}`,
    ].filter(Boolean);
    if (parts.length > 0) {
      lines.push('\nÖğrencinin final formülasyonu:');
      lines.push(parts.join('\n'));
    }
  }

  if (input.closingReflection) {
    lines.push(`\nÖğrencinin kapanış notu: ${input.closingReflection}`);
  }

  lines.push("\nŞu JSON schema'ya birebir uy, sadece tek bir JSON nesnesi döndür:");
  lines.push('{');
  lines.push('  "summary": string,              // 1 paragraf, vakanın bütününü yansıtan açılış');
  lines.push('  "arc": string,                  // 1 paragraf, seri boyunca gözlenen gelişim yayı');
  lines.push('  "themes": string[],             // 3-5 madde, klinik temalar (her madde 1 cümle)');
  lines.push('  "growth": string[],             // 3-5 madde, öğrencinin görünür gelişimi');
  lines.push('  "missed_opportunities": string[], // 2-4 madde, yakalanmamış fırsatlar');
  lines.push('  "next_steps": string             // 1-2 cümle, öğrenci için sonraki vakaya pratik tavsiye');
  lines.push('}');
  return lines.join('\n');
}

export async function generateSeriesSynthesis(
  input: GenerateSynthesisInput
): Promise<GenerateSynthesisResult> {
  if (isMockMode()) {
    return mockSeriesSynthesis(input);
  }
  const openai = getOpenAI();
  const resp = await openai.chat.completions.create({
    model: MODEL,
    temperature: 0.5,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content:
          'Sen psikoterapi süpervizör asistanısın. Bir vaka serisinin tamamını okuyup öğrenciye kapsamlı, eylem-odaklı kapanış raporu üretiyorsun. Çıktın yalnız geçerli JSON olur.',
      },
      { role: 'user', content: buildPrompt(input) },
    ],
  });
  const content = resp.choices[0]?.message?.content ?? '{}';
  const tokens = resp.usage?.total_tokens ?? 0;
  let raw: unknown;
  try {
    raw = JSON.parse(content);
  } catch {
    throw new Error('invalid_json');
  }
  const validated = validateSeriesSynthesis(raw);
  return { synthesis: validated, token_count: tokens };
}
