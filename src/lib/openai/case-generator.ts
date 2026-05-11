import { getOpenAI, MODEL, isMockMode } from './client';
import { mockGeneratedCase } from './mock';

export type Difficulty = 'easy' | 'medium' | 'hard';

export type GenerateCaseInput = {
  difficulty: Difficulty;
  themeHint?: string;
};

export type GeneratedCase = {
  title: string;
  presenting: string;
  background: string;
  personality: string;
  speech_style: string;
  goals_hidden: string;
  insight_level: string;
  defense_style: string;
  register: string;
  diagnosis_hint: string | null;
  difficulty: Difficulty;
};

export type GenerateCaseResult = {
  case: GeneratedCase;
  token_count: number;
};

const REQUIRED_STR = [
  'title','presenting','background','personality','speech_style',
  'goals_hidden','insight_level','defense_style','register',
] as const;

export function validateGeneratedCase(raw: unknown): GeneratedCase {
  if (!raw || typeof raw !== 'object') throw new Error('not_object');
  const r = raw as Record<string, unknown>;
  for (const k of REQUIRED_STR) {
    if (typeof r[k] !== 'string' || (r[k] as string).trim().length === 0) {
      throw new Error(`invalid_field:${k}`);
    }
  }
  const diff = r.difficulty;
  if (diff !== 'easy' && diff !== 'medium' && diff !== 'hard') {
    throw new Error('invalid_difficulty');
  }
  const dx = r.diagnosis_hint;
  const diagnosis_hint = typeof dx === 'string' && dx.trim().length > 0 ? dx : null;
  return {
    title: (r.title as string).trim().slice(0, 120),
    presenting: (r.presenting as string).trim().slice(0, 600),
    background: (r.background as string).trim().slice(0, 1200),
    personality: (r.personality as string).trim().slice(0, 400),
    speech_style: (r.speech_style as string).trim().slice(0, 300),
    goals_hidden: (r.goals_hidden as string).trim().slice(0, 600),
    insight_level: (r.insight_level as string).trim().slice(0, 60),
    defense_style: (r.defense_style as string).trim().slice(0, 120),
    register: (r.register as string).trim().slice(0, 60),
    diagnosis_hint,
    difficulty: diff,
  };
}

function buildPrompt(input: GenerateCaseInput): string {
  const hint = input.themeHint?.trim();
  return [
    `Psikoterapi eğitim aracı için kurmaca bir Türk danışan profili üret.`,
    `Zorluk: ${input.difficulty} (easy=daha açık ve işbirlikçi, hard=daha kapalı/savunmacı).`,
    hint ? `İpucu/tema (zayıf yönlendirme, taklit etme): "${hint}"` : `Tema serbest — kaygı klişesine takılma, çeşitlilik göster (kayıp, ilişki, kimlik, iş, aile, beden, yas, göç, vb. uzaydan seç).`,
    `Türkçe yaygın ama özgün bir ad/lakap kullan; gerçek bir kamuya mâl olmuş kişi olmasın.`,
    `goals_hidden alanında aktif intihar planı YAZMA; üzgünlük/işlevsizlik düzeyinde kal.`,
    `Sadece şu schema'ya birebir uyan tek bir JSON nesnesi döndür, başka hiçbir metin yazma:`,
    `{`,
    `  "title": string,                  // 4-10 kelime, danışanı tanımlayan bir başlık`,
    `  "presenting": string,             // 1-3 cümle, "neden geldim" duyumu`,
    `  "background": string,             // 2-4 cümle, geçmiş + aile + bağlam`,
    `  "personality": string,            // 1-2 cümle, mizaç`,
    `  "speech_style": string,           // 1 cümle, nasıl konuşur`,
    `  "goals_hidden": string,           // 1-2 cümle, terapistin keşfetmesi gereken esas mesele`,
    `  "insight_level": "low"|"moderate"|"high",`,
    `  "defense_style": string,          // 1-3 kelime (kaçınma, rasyonalizasyon, vb.)`,
    `  "register": "gündelik"|"resmi"|"sokak"|"argo-az",`,
    `  "diagnosis_hint": string | null,  // klinik çağrışım (opsiyonel)`,
    `  "difficulty": "${input.difficulty}"`,
    `}`,
  ].join('\n');
}

async function callOnce(input: GenerateCaseInput): Promise<{ raw: unknown; tokens: number }> {
  const openai = getOpenAI();
  const resp = await openai.chat.completions.create({
    model: MODEL,
    temperature: 0.9,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: 'Sen psikoterapi eğitim aracı için gerçekçi, klinik açıdan tutarlı kurmaca danışan personaları üretirsin. Çıktın yalnız geçerli JSON olur.' },
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
  return { raw, tokens };
}

export async function generateCase(input: GenerateCaseInput): Promise<GenerateCaseResult> {
  if (isMockMode()) {
    return mockGeneratedCase(input);
  }
  let lastErr: unknown;
  let totalTokens = 0;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const { raw, tokens } = await callOnce(input);
      totalTokens += tokens;
      const validated = validateGeneratedCase(raw);
      return { case: validated, token_count: totalTokens };
    } catch (e) {
      lastErr = e;
    }
  }
  throw new Error(`generation_failed:${(lastErr as Error)?.message ?? 'unknown'}`);
}
