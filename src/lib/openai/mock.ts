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
