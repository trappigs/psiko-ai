type CaseSheet = {
  id: string;
  title: string;
  presenting: string;
  diagnosis_hint: string | null;
  background: string;
  personality: string;
  speech_style: string;
  difficulty: 'easy' | 'medium' | 'hard';
  insight_level: string | null;
  defense_style: string | null;
  register: string | null;
};

const DIFFICULTY_LABEL: Record<string, string> = {
  easy: 'Kolay',
  medium: 'Orta',
  hard: 'Zor',
};

const INSIGHT_LABEL: Record<string, string> = {
  low: 'Düşük',
  moderate: 'Orta',
  high: 'Yüksek',
};

/**
 * Vaka dosyası — briefing sayfasında ve seans-içi drawer'da kullanılır.
 * `goals_hidden` *kasıtlı olarak* dahil edilmez; öğrencinin keşfetmesi gereken kısım.
 */
export function CaseBriefing({ c, index }: { c: CaseSheet; index?: number }) {
  return (
    <div className="space-y-10">
      <header>
        {index != null && (
          <p className="font-mono text-xs text-muted">
            VAKA · {String(index).padStart(2, '0')}
          </p>
        )}
        <h1 className="font-display text-4xl md:text-5xl leading-[1.02] mt-3">
          <em className="font-display-italic">{c.title}</em>
        </h1>
        <div className="flex items-center gap-3 mt-4 flex-wrap">
          <span className="index-meta" data-difficulty={c.difficulty}>
            {DIFFICULTY_LABEL[c.difficulty]}
          </span>
          {c.insight_level && (
            <>
              <span className="text-rule">·</span>
              <span className="text-xs text-muted tracking-wide">
                İçgörü: <span className="text-ink">{INSIGHT_LABEL[c.insight_level] ?? c.insight_level}</span>
              </span>
            </>
          )}
          <span className="text-rule">·</span>
          <span className="text-xs text-muted tracking-wide">~45 dk</span>
        </div>
      </header>

      <hr className="rule-soft" />

      <Block label="Sunulan sorun">{c.presenting}</Block>

      {c.diagnosis_hint && (
        <Block label="Klinik çağrışım" muted>
          {c.diagnosis_hint}
        </Block>
      )}

      <Block label="Geçmiş / aile">{c.background}</Block>

      <Block label="Kişilik">{c.personality}</Block>

      <Block label="Konuşma stili">{c.speech_style}</Block>

      {(c.defense_style || c.register) && (
        <div className="grid sm:grid-cols-2 gap-x-8 gap-y-6">
          {c.defense_style && <Block label="Baskın savunma" small>{c.defense_style}</Block>}
          {c.register && <Block label="Söylem kaydı" small>{c.register}</Block>}
        </div>
      )}
    </div>
  );
}

function Block({
  label,
  children,
  muted,
  small,
}: {
  label: string;
  children: React.ReactNode;
  muted?: boolean;
  small?: boolean;
}) {
  return (
    <section>
      <p className="label-caps mb-2">{label}</p>
      <p
        className={
          small
            ? 'text-sm leading-relaxed'
            : muted
              ? 'text-base leading-relaxed text-ink-soft italic'
              : 'text-base leading-relaxed'
        }
      >
        {children}
      </p>
    </section>
  );
}

export type { CaseSheet };
