export type CaseSummary = {
  title: string;
  presenting: string;
  diagnosis_hint?: string | null;
};

export type TranscriptEntry = { role: 'student' | 'client'; content: string };

export type ParsedReport = {
  summary: string;
  strengths: string[];
  improvements: string[];
  missed_signals: string[];
  next_steps: string;
};

export function buildSupervisorPrompt(
  caseSummary: CaseSummary,
  transcript: TranscriptEntry[]
): string {
  const lines = transcript
    .map((t) => `${t.role === 'student' ? 'S' : 'D'}: ${t.content}`)
    .join('\n');
  return `Sen psikoterapi süpervizörüsün. Aşağıdaki vaka için bir öğrencinin yaptığı seansı değerlendireceksin. Hem cesaretlendirici hem dürüst ol.

VAKA: ${caseSummary.title}
SUNULAN SORUN: ${caseSummary.presenting}
${caseSummary.diagnosis_hint ? `DEĞERLENDİRME NOTU: ${caseSummary.diagnosis_hint}` : ''}

TRANSKRİPT (S = öğrenci, D = danışan):
${lines}

GÖREV: Sadece aşağıdaki JSON formatında yanıt ver, başka hiçbir metin yazma:
{
  "summary": "2-3 cümle özet",
  "strengths": ["...", "..."],
  "improvements": ["...", "..."],
  "missed_signals": ["..."],
  "next_steps": "..."
}

KILAVUZ:
- Spesifik ol, transkriptten örnek ver.
- Türk Psikolojik Danışma Derneği etik ilkelerine uyumlu kal.
- Patolojize etme, yapıcı eleştir.`;
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
  return {
    summary: p.summary,
    strengths: (p.strengths as unknown[]).map(String),
    improvements: (p.improvements as unknown[]).map(String),
    missed_signals: (p.missed_signals as unknown[]).map(String),
    next_steps: p.next_steps,
  };
}
