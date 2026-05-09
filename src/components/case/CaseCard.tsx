const DIFFICULTY_LABEL: Record<string, string> = {
  easy: 'Kolay',
  medium: 'Orta',
  hard: 'Zor',
};

export function CaseCard(props: {
  id: string;
  title: string;
  presenting: string;
  difficulty: 'easy' | 'medium' | 'hard';
}) {
  return (
    <div className="border rounded-lg p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold">{props.title}</h3>
        <span className="text-xs px-2 py-1 bg-gray-100 rounded shrink-0">
          {DIFFICULTY_LABEL[props.difficulty]}
        </span>
      </div>
      <p className="text-sm text-gray-700 line-clamp-3">{props.presenting}</p>
      <a
        href={`/seans/start?case=${props.id}`}
        className="mt-auto bg-black text-white px-4 py-2 rounded text-center text-sm"
      >
        Seansa başla
      </a>
    </div>
  );
}
