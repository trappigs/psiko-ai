const DIFFICULTY_LABEL: Record<string, string> = {
  easy: 'Kolay',
  medium: 'Orta',
  hard: 'Zor',
};

export function CaseCard(props: {
  id: string;
  index: number;
  title: string;
  presenting: string;
  difficulty: 'easy' | 'medium' | 'hard';
}) {
  const num = String(props.index).padStart(2, '0');
  return (
    <article className="surface p-6 flex flex-col gap-4 group transition-shadow hover:shadow-[0_2px_4px_rgba(27,35,48,0.06),0_24px_40px_-24px_rgba(27,35,48,0.22)]">
      <div className="flex items-baseline justify-between">
        <span className="font-mono text-xs text-muted">VAKA · {num}</span>
        <span className="pill" data-difficulty={props.difficulty}>
          {DIFFICULTY_LABEL[props.difficulty]}
        </span>
      </div>
      <h3 className="font-display text-2xl leading-tight">{props.title}</h3>
      <p className="text-sm text-ink-soft leading-relaxed line-clamp-3">{props.presenting}</p>
      <div className="mt-auto pt-2 border-t border-rule flex items-center justify-between">
        <span className="text-xs text-muted">~45 dk</span>
        <a
          href={`/seans/start?case=${props.id}`}
          className="text-sm text-ink font-medium underline underline-offset-4 decoration-rule hover:decoration-accent group-hover:decoration-accent transition-colors"
        >
          Seansa başla →
        </a>
      </div>
    </article>
  );
}
