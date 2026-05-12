import { getOpenAIDirect, OPENAI_DIRECT_MODEL, isMockMode } from './client';
import { mockCandidatesResponse } from './mock';
import { validateGeneratedCase } from './case-generator';
import type {
  CastingParams,
  CandidateCase,
  GenerateCandidatesResult,
  VariantLabel,
} from './casting-types';

export type {
  CastingParams,
  CandidateCase,
  GenerateCandidatesResult,
} from './casting-types';

const VARIANT_LABELS: VariantLabel[] = ['Daha açık', 'Dengeli', 'Direngen'];

export function validateCandidatesPayload(raw: unknown): CandidateCase[] {
  if (!raw || typeof raw !== 'object') throw new Error('not_object');
  const r = raw as Record<string, unknown>;
  const list = r.candidates;
  if (!Array.isArray(list) || list.length !== 3) {
    throw new Error('invalid_count');
  }
  const out: CandidateCase[] = [];
  for (const item of list) {
    const base = validateGeneratedCase(item);
    const variant = (item as Record<string, unknown>).variant_label;
    if (
      typeof variant !== 'string' ||
      !VARIANT_LABELS.includes(variant as VariantLabel)
    ) {
      throw new Error('invalid_variant_label');
    }
    out.push({ ...base, variant_label: variant as VariantLabel });
  }
  return out;
}

function describeParams(p: CastingParams): string {
  const lines: string[] = [];
  if (p.age_range) lines.push(`- Yaş aralığı: ${p.age_range}`);
  if (p.gender) lines.push(`- Cinsiyet: ${p.gender}`);
  if (p.culture_segment) {
    lines.push(`- Kültür: ${p.culture_segment}`);
    if (p.culture_freetext) lines.push(`  Ek bağlam: ${p.culture_freetext}`);
  } else if (p.culture_freetext) {
    lines.push(`- Kültür bağlamı: ${p.culture_freetext}`);
  }
  if (p.occupation) lines.push(`- Meslek/SE durumu: ${p.occupation}`);
  if (p.relationship_status) lines.push(`- İlişki durumu: ${p.relationship_status}`);
  if (p.family_structure) lines.push(`- Aile yapısı: ${p.family_structure}`);
  if (p.referral_source) lines.push(`- Geliş sebebi: ${p.referral_source}`);
  if (p.difficulty) lines.push(`- Zorluk: ${p.difficulty}`);
  if (p.resistance_level) lines.push(`- Direnç düzeyi: ${p.resistance_level}`);
  if (p.school_fit)
    lines.push(
      `- Ekol uyumu (vaka bu ekolde işlenmeye uygun olsun): ${p.school_fit}`
    );
  if (p.prior_therapy) lines.push(`- Önceki terapi deneyimi: ${p.prior_therapy}`);
  if (p.theme_hint) lines.push(`- Tema ipucu: ${p.theme_hint}`);
  return lines.length > 0
    ? lines.join('\n')
    : '(parametre verilmedi — sen serbestçe çeşitlilik kur)';
}

function buildPrompt(params: CastingParams): string {
  return [
    'Aşağıdaki parametrelere uygun 3 farklı kurmaca danışan adayı üret. Üçü de aynı parametre setine uyar ama varyasyon ekseninde birbirinden ayrılır:',
    '- Aday 1: variant_label "Daha açık" — sıcak, kolay açılan, terapiste hızlı güvenen',
    '- Aday 2: variant_label "Dengeli" — tedirgin ama denemeye açık, ölçülü',
    '- Aday 3: variant_label "Direngen" — mesafeli, kapalı, savunmacı',
    '',
    'Parametreler:',
    describeParams(params),
    '',
    'Türkçe yaygın ama özgün adlar kullan; gerçek kamuya mâl olmuş kişi olmasın.',
    'goals_hidden akut kriz değil; sürekli ama yönetilebilir düzeyde işlevsizlik/üzgünlük teması olsun.',
    'school_fit verildiyse vaka o ekolde çalışmaya uygun şekilde tasarla (ör. cbt → bilişsel çarpıtmalar belirgin; psikodinamik → ilişki örüntüleri zengin; humanistik → içsel çelişki ön planda; sistemik → ailesel/ilişkisel bağlam dokulu).',
    '',
    'ÖNEMLİ: candidates dizisi tam olarak 3 nesne içermeli. Her bir nesne aşağıdaki tam şemayı doldurmalı; placeholder veya kısaltma kullanma. Üç ada da farklı isim, geçmiş, kişilik ver — sadece variant_label değişmesin, üç aday gerçekten farklı kişiler olsun.',
    '',
    'Her aday için zorunlu alanlar:',
    '- title: string (4-10 kelime, danışanı tanımlayan başlık)',
    '- presenting: string (1-3 cümle, neden geldim)',
    '- background: string (2-4 cümle, geçmiş + aile + bağlam)',
    '- personality: string (1-2 cümle, mizaç)',
    '- speech_style: string (1 cümle)',
    '- goals_hidden: string (1-2 cümle, terapistin keşfetmesi gereken esas mesele)',
    '- insight_level: "low" veya "moderate" veya "high"',
    '- defense_style: string (1-3 kelime, örn. "kaçınma", "rasyonalizasyon", "inkâr")',
    '- register: "gündelik" veya "resmi" veya "sokak" veya "argo-az"',
    '- diagnosis_hint: string veya null (klinik çağrışım, opsiyonel)',
    '- difficulty: "easy" veya "medium" veya "hard"',
    '- variant_label: birinci adayda "Daha açık", ikincide "Dengeli", üçüncüde "Direngen"',
    '',
    'Çıktı şekli (sadece tek JSON nesnesi, başka metin yok):',
    '{ "candidates": [<3 tam aday nesnesi>] }',
  ].join('\n');
}

async function callOnce(
  params: CastingParams
): Promise<{ raw: unknown; tokens: number }> {
  const openai = getOpenAIDirect();
  const resp = await openai.chat.completions.create({
    model: OPENAI_DIRECT_MODEL,
    temperature: 0.7,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content:
          'Sen psikoterapi eğitim aracı için 3 farklı kurmaca danışan adayı üretirsin. Aynı temel parametreler için 3 farklı yorum verirsin; varyasyon ekseni açıklık-kapalılık. Çıktın yalnız geçerli JSON olur.',
      },
      { role: 'user', content: buildPrompt(params) },
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

export async function generateCaseCandidates(
  params: CastingParams
): Promise<GenerateCandidatesResult> {
  if (isMockMode()) {
    return mockCandidatesResponse(params);
  }
  let lastErr: unknown;
  let totalTokens = 0;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const { raw, tokens } = await callOnce(params);
      totalTokens += tokens;
      const candidates = validateCandidatesPayload(raw);
      return { candidates, token_count: totalTokens };
    } catch (e) {
      lastErr = e;
      console.error('[case-candidates-generator] attempt', attempt + 1, 'failed:', e);
    }
  }
  throw new Error(`generation_failed:${(lastErr as Error)?.message ?? 'unknown'}`);
}
