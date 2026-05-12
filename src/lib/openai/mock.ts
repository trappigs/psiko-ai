export async function* mockClientStream(_studentMessage: string) {
  const reply = 'Şey, bilmiyorum. Sanırım kötü hissediyorum.';
  for (const ch of reply) {
    yield ch;
    await new Promise((r) => setTimeout(r, 5));
  }
}

export function mockSupervisorReport() {
  return {
    summary: 'Mock seans raporu. Empatik açılış var, daha derin sorular sorulabilirdi.',
    strengths: ['Empatik açılış', 'Açık-uçlu soru kullanımı'],
    improvements: ['Sessizliği erken bozdu', 'Konuyu hızlı değiştirdi'],
    missed_signals: ['Danışanın ailesinden bahsetmesi takip edilmedi'],
    next_steps: 'Bir sonraki seansta aile dinamiklerine odaklanılabilir.',
    microskills: {
      open_question: { count: 4, examples: ['Bunu nasıl hissediyorsun?'] },
      closed_question: { count: 2, examples: ['Bu sıklıkla mı oluyor?'] },
      reflection: { count: 1, examples: ['Yani şu an çaresiz hissediyorsun.'] },
      empathy: { count: 1, examples: ['Anlıyorum, çok zor olmalı.'] },
      summary: { count: 0, examples: [] },
      advice_or_interpretation: { count: 0, examples: [] },
    },
    formulation_comparison: null,
  };
}

import type { GenerateCaseInput, GenerateCaseResult } from './case-types';
import type { GenerateSummaryInput, GenerateSummaryResult } from './summary-types';
import type {
  GenerateSynthesisInput,
  GenerateSynthesisResult,
} from './synthesis-types';
import type {
  CastingParams,
  GenerateCandidatesResult,
  VariantLabel,
} from './casting-types';

export function mockGeneratedCase(input: GenerateCaseInput): GenerateCaseResult {
  const theme = (input.themeHint ?? '').trim();
  const presenting = theme
    ? `Son zamanlarda ${theme} ile ilgili kendini kötü hissediyor, ne yapacağını bilmiyor.`
    : 'Açıklamakta zorlandığı, sürekli yorgunluk ve içine kapanma hâli var.';
  const background = theme
    ? `Yaklaşık altı aydır ${theme} etrafında dönen olaylar yaşadı; aile ve arkadaş çevresinden uzaklaştı.`
    : '24 yaşında, üniversite son sınıf. Anne baba ayrı yaşıyor; tek başına bir öğrenci evinde kalıyor.';
  return {
    case: {
      title: theme ? `${theme[0].toUpperCase() + theme.slice(1)} ile bir seans` : 'Adsız bir öğrenci',
      presenting,
      background,
      personality: 'Düşünmeden konuşmaz; gözlerini kaçırarak yanıt verir.',
      speech_style: 'Kısa cümleler, yer yer sessizlik.',
      goals_hidden: 'Aslında kendisiyle değil, en yakın arkadaşıyla olan kopukluğu yüzünden burada.',
      insight_level: input.difficulty === 'hard' ? 'low' : 'moderate',
      defense_style: input.difficulty === 'hard' ? 'rasyonalizasyon' : 'kaçınma',
      register: 'gündelik',
      diagnosis_hint: null,
      difficulty: input.difficulty,
    },
    token_count: 750,
  };
}

export function mockSessionSummary(
  input: Pick<GenerateSummaryInput, 'transcript'>
): GenerateSummaryResult {
  const msgCount = input.transcript.length;
  return {
    summary: {
      headline: `Mock seans özeti — ${msgCount} mesaj`,
      key_events: [
        'Danışan açılış sorularına kısa yanıt verdi',
        'Bir aile dinamiği gündeme geldi ama derinleşmedi',
      ],
      promises: [],
      hypothesis_update:
        'İçedönüklük yüzeyde; kayıp temasının altta yatma ihtimali var.',
    },
    token_count: 500,
  };
}

export function mockSeriesSynthesis(
  input: Pick<GenerateSynthesisInput, 'sessionCount'>
): GenerateSynthesisResult {
  return {
    synthesis: {
      summary: `Mock kapanış sentezi — ${input.sessionCount} seans boyunca süren bir vaka takibi.`,
      arc: 'Erken seanslarda yüzeyde kalan iletişim zamanla derinleşti; orta dönemde direnç belirgindi, son seanslarda iç gözlem arttı.',
      themes: [
        'Aileyle kopukluk yinelendi',
        'Bedensel ifade artarak gelişti',
        'Mizah savunma olarak kullanıldı',
      ],
      growth: [
        'Açık-uçlu soru kullanımı pekişti',
        'Sessizliği tolere etmeye başladın',
        'Yansıtmaya geçişte daha doğal oldun',
      ],
      missed_opportunities: [
        'Erken seansta bahsedilen kayıp tema yeterince takip edilmedi',
        'Bedensel sinyalleri kelimeleştirme bazen erkenden bırakıldı',
      ],
      next_steps:
        'Bir sonraki kısa süreli vakada erken sinyalleri etiketleyip seans planına bağlamak iyi bir gelişim hedefi olabilir.',
    },
    token_count: 1500,
  };
}

export function mockCandidatesResponse(
  params: CastingParams
): GenerateCandidatesResult {
  const difficulty = params.difficulty ?? 'medium';
  const variants: Array<{
    label: VariantLabel;
    personality: string;
    speech_style: string;
    defense_style: string;
    insight_level: string;
  }> = [
    {
      label: 'Daha açık',
      personality: 'Sıcak, kolay açılan, terapiste hızlı güvenen.',
      speech_style: 'Uzun, akıcı cümleler; duyguları kelimeleştirir.',
      defense_style: 'rasyonalizasyon',
      insight_level: 'high',
    },
    {
      label: 'Dengeli',
      personality: 'Tedirgin ama denemeye açık; ölçülü.',
      speech_style: 'Orta uzunlukta cümleler, zaman zaman duraksar.',
      defense_style: 'kaçınma',
      insight_level: 'moderate',
    },
    {
      label: 'Direngen',
      personality: 'Mesafeli, gözlerini kaçıran, soruları kapatmaya çalışan.',
      speech_style: 'Kısa cümleler, sessizlikler, "bilmiyorum" sık.',
      defense_style: 'inkâr',
      insight_level: 'low',
    },
  ];

  return {
    candidates: variants.map((v) => ({
      title: `Mock ${v.label.toLowerCase()} aday`,
      presenting: params.theme_hint
        ? `${params.theme_hint} etrafında bir şikayet ile geldi.`
        : 'Açıklamakta zorlandığı bir yorgunluk hâli ile geldi.',
      background:
        'Sosyal bağlamı parametrelere uygun şekilde mock olarak üretildi.',
      personality: v.personality,
      speech_style: v.speech_style,
      goals_hidden:
        'Mock: keşfedilmesi gereken bir mesele var (yüzeyde değil).',
      insight_level: v.insight_level,
      defense_style: v.defense_style,
      register: 'gündelik',
      diagnosis_hint: null,
      difficulty,
      variant_label: v.label,
    })),
    token_count: 2500,
  };
}
