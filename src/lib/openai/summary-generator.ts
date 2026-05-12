import { getOpenAI, MODEL, isMockMode } from './client';
import { mockSessionSummary } from './mock';
import type {
  SessionSummary,
  GenerateSummaryInput,
  GenerateSummaryResult,
  TranscriptMessage,
} from './summary-types';

export type {
  SessionSummary,
  GenerateSummaryInput,
  GenerateSummaryResult,
} from './summary-types';

export function validateSessionSummary(raw: unknown): SessionSummary {
  if (!raw || typeof raw !== 'object') throw new Error('not_object');
  const r = raw as Record<string, unknown>;
  const headline = typeof r.headline === 'string' ? r.headline.trim() : '';
  if (!headline) throw new Error('invalid_headline');
  if (r.key_events !== undefined && !Array.isArray(r.key_events)) {
    throw new Error('invalid_key_events');
  }
  if (r.promises !== undefined && !Array.isArray(r.promises)) {
    throw new Error('invalid_promises');
  }
  const hypothesis_update =
    typeof r.hypothesis_update === 'string' ? r.hypothesis_update.trim() : '';
  return {
    headline: headline.slice(0, 200),
    key_events: ((r.key_events as unknown[]) ?? [])
      .filter((x): x is string => typeof x === 'string')
      .map((x) => x.slice(0, 240))
      .slice(0, 8),
    promises: ((r.promises as unknown[]) ?? [])
      .filter((x): x is string => typeof x === 'string')
      .map((x) => x.slice(0, 240))
      .slice(0, 8),
    hypothesis_update: hypothesis_update.slice(0, 500),
  };
}

function renderTranscript(t: TranscriptMessage[]): string {
  return t
    .map((m) => `${m.role === 'student' ? 'TERAPİST' : 'DANIŞAN'}: ${m.content}`)
    .join('\n');
}

function buildPrompt(input: GenerateSummaryInput): string {
  const lines: string[] = [];
  lines.push('Vakanın temel profili:');
  lines.push(`- Sunulan sorun: ${input.case.presenting}`);
  lines.push(`- Geçmiş: ${input.case.background}`);
  lines.push(`- Kişilik: ${input.case.personality}`);
  lines.push(`- Konuşma stili: ${input.case.speech_style}`);
  lines.push(
    `- Gizli mesele (kullanma — sadece tutarlılık için): ${input.case.goals_hidden}`
  );
  if (input.priorSummaries && input.priorSummaries.length > 0) {
    lines.push('\nÖnceki seansların özetleri:');
    input.priorSummaries.forEach((s, i) => {
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
      lines.push('\nÖğrencinin mevcut formülasyonu:');
      lines.push(parts.join(' | '));
    }
  }
  lines.push("\nBu seansın transcript'i (en eski en üstte):");
  lines.push(renderTranscript(input.transcript));
  lines.push('');
  lines.push(
    "Şu JSON schema'ya birebir uy ve sadece tek bir JSON nesnesi döndür:"
  );
  lines.push('{');
  lines.push('  "headline": string,            // 1 cümle, en güçlü çıkarımı yansıt');
  lines.push('  "key_events": string[],         // 3-5 kısa madde, "neler oldu"');
  lines.push(
    '  "promises": string[],           // danışanın bu seansta verdiği konkret sözler; yoksa []'
  );
  lines.push(
    '  "hypothesis_update": string     // süpervizörce: hipotez nasıl evrilmeli, 1-2 cümle'
  );
  lines.push('}');
  return lines.join('\n');
}

export async function generateSessionSummary(
  input: GenerateSummaryInput
): Promise<GenerateSummaryResult> {
  if (isMockMode()) {
    return mockSessionSummary(input);
  }
  const openai = getOpenAI();
  const resp = await openai.chat.completions.create({
    model: MODEL,
    temperature: 0.4,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content:
          'Sen psikoterapi süpervizör asistanısın. Bir seansı kısa ve eylem-odaklı şekilde özetlersin; çıktın yalnız geçerli JSON olur.',
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
  const validated = validateSessionSummary(raw);
  return { summary: validated, token_count: tokens };
}
