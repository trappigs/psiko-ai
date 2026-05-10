export type CaseSummary = {
  title: string;
  presenting: string;
  diagnosis_hint?: string | null;
};

export type TranscriptEntry = { role: 'student' | 'client'; content: string };

export type MicroskillEntry = {
  count: number;
  examples: string[];
};

export type Microskills = {
  open_question: MicroskillEntry;
  closed_question: MicroskillEntry;
  reflection: MicroskillEntry;
  empathy: MicroskillEntry;
  summary: MicroskillEntry;
  advice_or_interpretation: MicroskillEntry;
};

export type FormulationComparison = {
  aligned: string[];
  student_caught: string[];
  supervisor_added: string[];
  verdict: string;
};

export type ParsedReport = {
  summary: string;
  strengths: string[];
  improvements: string[];
  missed_signals: string[];
  next_steps: string;
  microskills: Microskills;
  formulation_comparison: FormulationComparison | null;
};

export const MICROSKILL_LABELS: Record<keyof Microskills, string> = {
  open_question: 'Açık-uçlu soru',
  closed_question: 'Kapalı-uçlu soru',
  reflection: 'Yansıtma',
  empathy: 'Empati ifadesi',
  summary: 'Özetleme',
  advice_or_interpretation: 'Tavsiye / yorum',
};

export const MICROSKILL_DESC: Record<keyof Microskills, string> = {
  open_question:
    'Yanıtlayanı açıklamaya davet eden, "evet/hayır" ile kapatılamayan soru. ("Bunu nasıl yaşıyorsun?", "Anlat biraz daha…")',
  closed_question:
    '"Evet/hayır", "şu mu bu mu" gibi sınırlı bir cevaba kapatılan soru. ("Şu an üzgün müsün?", "İlaç kullanıyor musun?")',
  reflection:
    'Danışanın söylediğinin duygusal/anlamsal özünü kendi cümlene dönüştürerek geri verme. ("Yani şu an çaresiz hissediyorsun.")',
  empathy:
    'Danışanın deneyimine dair anlayış/yakınlık ifadesi. ("Bunu paylaşman kolay olmadı." / "Anlıyorum, çok zor bir dönem.")',
  summary:
    'Bir bölümün ya da seansın gidişatını özetleme. ("Bugüne kadar şunları konuştuk: ...")',
  advice_or_interpretation:
    'Doğrudan tavsiye, yönlendirme, yorum ya da tanı vurgusu. (Erken seansta sıkça olması zayıflık sayılır.)',
};

export type StudentFormulation = {
  presenting?: string;
  hypothesis?: string;
  patterns?: string;
  next_session?: string;
};

export function buildSupervisorPrompt(
  caseSummary: CaseSummary,
  transcript: TranscriptEntry[],
  studentFormulation?: StudentFormulation | null
): string {
  const lines = transcript
    .map((t) => `${t.role === 'student' ? 'S' : 'D'}: ${t.content}`)
    .join('\n');

  const hasFormulation =
    studentFormulation &&
    (studentFormulation.presenting ||
      studentFormulation.hypothesis ||
      studentFormulation.patterns ||
      studentFormulation.next_session);

  const formulationBlock = hasFormulation
    ? `

ÖĞRENCİNİN KENDİ FORMÜLASYONU (seansın hemen ardından, raporu görmeden yazdığı):
${studentFormulation?.presenting ? `· Sunulan sorun: ${studentFormulation.presenting}` : ''}
${studentFormulation?.hypothesis ? `· Hipotez: ${studentFormulation.hypothesis}` : ''}
${studentFormulation?.patterns ? `· Örüntüler: ${studentFormulation.patterns}` : ''}
${studentFormulation?.next_session ? `· Sonraki seans: ${studentFormulation.next_session}` : ''}
`
    : '';

  const comparisonSchema = hasFormulation
    ? `,
  "formulation_comparison": {
    "aligned": ["öğrencinin formülasyonunda kendi gözleminle örtüşen 1-3 nokta — kısa, somut"],
    "student_caught": ["öğrencinin yakaladığı, senin de katıldığın özellikle güçlü gözlem(ler) — kısa"],
    "supervisor_added": ["öğrencinin formülasyonunda eksik kalan, senin görüp eklediğin gözlem(ler) — kısa"],
    "verdict": "1-2 cümlelik özet hüküm: formülasyonu ne kadar isabetli, sonraki seansta neye dikkat etsin"
  }`
    : '';

  return `Sen psikoterapi süpervizörüsün. Aşağıdaki vaka için bir öğrencinin yaptığı seansı değerlendireceksin. Hem cesaretlendirici hem dürüst ol.

VAKA: ${caseSummary.title}
SUNULAN SORUN: ${caseSummary.presenting}
${caseSummary.diagnosis_hint ? `DEĞERLENDİRME NOTU: ${caseSummary.diagnosis_hint}` : ''}

TRANSKRİPT (S = öğrenci, D = danışan):
${lines}
${formulationBlock}
GÖREV: Sadece aşağıdaki JSON formatında yanıt ver, başka hiçbir metin yazma:
{
  "summary": "2-3 cümle özet",
  "strengths": ["...", "..."],
  "improvements": ["...", "..."],
  "missed_signals": ["..."],
  "next_steps": "...",
  "microskills": {
    "open_question": { "count": <int>, "examples": ["öğrencinin transkriptteki açık-uçlu sorularının kısa alıntıları"] },
    "closed_question": { "count": <int>, "examples": [...] },
    "reflection": { "count": <int>, "examples": [...] },
    "empathy": { "count": <int>, "examples": [...] },
    "summary": { "count": <int>, "examples": [...] },
    "advice_or_interpretation": { "count": <int>, "examples": [...] }
  }${comparisonSchema}
}

MİKROBECERİ TANIMLARI (sayım için bunlara dikkat et):
- Açık-uçlu soru: yanıtlayanı açıklamaya davet eden, "evet/hayır"la kapatılamayan soru. ("Bunu nasıl yaşıyorsun?")
- Kapalı-uçlu soru: sınırlı yanıta kapatılan soru. ("Şu an üzgün müsün?")
- Yansıtma: danışanın söylediğinin duygusal/anlamsal özünü öğrencinin kendi cümlesine dönüştürerek geri vermesi. ("Yani çaresiz hissediyorsun.")
- Empati ifadesi: anlayış/yakınlık beyanı. ("Anlıyorum, çok zor.")
- Özetleme: bir bölümün/seansın özetlenmesi.
- Tavsiye/yorum: doğrudan tavsiye, yönlendirme, tanı/yorum verme.

Her örnek için transkriptten **gerçek alıntı** kullan, kelime kelime aynı olsun (12 kelimeden uzunsa kısaltabilirsin "…" ile). Tek bir öğrenci cümlesi birden fazla kategoriye girebilir; uygun olduğu yere koy.

KILAVUZ:
- Spesifik ol, transkriptten örnek ver.
- Türk Psikolojik Danışma Derneği etik ilkelerine uyumlu kal.
- Patolojize etme, yapıcı eleştir.`;
}

function emptySkill(): MicroskillEntry {
  return { count: 0, examples: [] };
}

function emptyMicroskills(): Microskills {
  return {
    open_question: emptySkill(),
    closed_question: emptySkill(),
    reflection: emptySkill(),
    empathy: emptySkill(),
    summary: emptySkill(),
    advice_or_interpretation: emptySkill(),
  };
}

function parseSkillEntry(raw: unknown): MicroskillEntry {
  if (!raw || typeof raw !== 'object') return emptySkill();
  const r = raw as Record<string, unknown>;
  const count = typeof r.count === 'number' ? Math.max(0, Math.floor(r.count)) : 0;
  const examples = Array.isArray(r.examples) ? r.examples.map(String).slice(0, 6) : [];
  return { count, examples };
}

export function parseSupervisorReply(raw: string): ParsedReport | null {
  let text = raw.trim();
  text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return null;
  }
  const p = parsed as Record<string, unknown> | null;
  if (
    !p ||
    typeof p.summary !== 'string' ||
    !Array.isArray(p.strengths) ||
    !Array.isArray(p.improvements) ||
    !Array.isArray(p.missed_signals) ||
    typeof p.next_steps !== 'string'
  ) {
    return null;
  }

  const ms = p.microskills as Record<string, unknown> | undefined;
  const microskills: Microskills = ms
    ? {
        open_question: parseSkillEntry(ms.open_question),
        closed_question: parseSkillEntry(ms.closed_question),
        reflection: parseSkillEntry(ms.reflection),
        empathy: parseSkillEntry(ms.empathy),
        summary: parseSkillEntry(ms.summary),
        advice_or_interpretation: parseSkillEntry(ms.advice_or_interpretation),
      }
    : emptyMicroskills();

  const fc = p.formulation_comparison as Record<string, unknown> | undefined;
  const formulation_comparison: FormulationComparison | null =
    fc &&
    (Array.isArray(fc.aligned) ||
      Array.isArray(fc.student_caught) ||
      Array.isArray(fc.supervisor_added) ||
      typeof fc.verdict === 'string')
      ? {
          aligned: Array.isArray(fc.aligned) ? (fc.aligned as unknown[]).map(String) : [],
          student_caught: Array.isArray(fc.student_caught)
            ? (fc.student_caught as unknown[]).map(String)
            : [],
          supervisor_added: Array.isArray(fc.supervisor_added)
            ? (fc.supervisor_added as unknown[]).map(String)
            : [],
          verdict: typeof fc.verdict === 'string' ? fc.verdict : '',
        }
      : null;

  return {
    summary: p.summary,
    strengths: (p.strengths as unknown[]).map(String),
    improvements: (p.improvements as unknown[]).map(String),
    missed_signals: (p.missed_signals as unknown[]).map(String),
    next_steps: p.next_steps,
    microskills,
    formulation_comparison,
  };
}

export function totalQuestions(m: Microskills): number {
  return m.open_question.count + m.closed_question.count;
}

export function openQuestionRatio(m: Microskills): number {
  const total = totalQuestions(m);
  return total === 0 ? 0 : m.open_question.count / total;
}
