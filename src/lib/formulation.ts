/**
 * Öğrencinin seans sonu formülasyonu — refleksif egzersiz.
 * Tüm alanlar opsiyonel; öğrenci atlayabilir veya kısmen doldurabilir.
 */
export type Formulation = {
  presenting?: string;
  hypothesis?: string;
  patterns?: string;
  next_session?: string;
  written_at?: string;
};

export function isEmptyFormulation(f: Formulation | null | undefined): boolean {
  if (!f) return true;
  return !(f.presenting || f.hypothesis || f.patterns || f.next_session)?.trim();
}

export function parseFormulation(j: unknown): Formulation | null {
  if (!j || typeof j !== 'object' || Array.isArray(j)) return null;
  const r = j as Record<string, unknown>;
  const out: Formulation = {};
  if (typeof r.presenting === 'string') out.presenting = r.presenting;
  if (typeof r.hypothesis === 'string') out.hypothesis = r.hypothesis;
  if (typeof r.patterns === 'string') out.patterns = r.patterns;
  if (typeof r.next_session === 'string') out.next_session = r.next_session;
  if (typeof r.written_at === 'string') out.written_at = r.written_at;
  return out;
}
