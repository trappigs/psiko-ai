'use client';

type Props = {
  caseId: string;
  title: string;
  presenting: string;
  variantLabel: string;
  difficulty: 'easy' | 'medium' | 'hard';
  onClick: () => void;
};

const DIFFICULTY_LABEL: Record<string, string> = {
  easy: 'Kolay',
  medium: 'Orta',
  hard: 'Zor',
};

export function CandidateCard(props: Props) {
  return (
    <button
      onClick={props.onClick}
      className="surface w-full text-left p-5 flex flex-col gap-3 transition hover:shadow-lg"
    >
      <div className="flex items-baseline justify-between gap-3">
        <span className="label-caps text-accent">{props.variantLabel}</span>
        <span className="text-xs text-muted">
          {DIFFICULTY_LABEL[props.difficulty]}
        </span>
      </div>
      <p className="font-display text-lg leading-tight">
        <em className="font-display-italic">{props.title}</em>
      </p>
      <p className="text-sm text-ink-soft leading-relaxed line-clamp-3">
        {props.presenting}
      </p>
      <span className="text-xs text-muted mt-auto pt-2 border-t border-rule">
        Detayı gör →
      </span>
    </button>
  );
}
