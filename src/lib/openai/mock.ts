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
