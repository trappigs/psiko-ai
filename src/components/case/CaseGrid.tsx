import { CaseCard } from './CaseCard';

type Case = {
  id: string;
  title: string;
  presenting: string;
  difficulty: 'easy' | 'medium' | 'hard';
};

export function CaseGrid({ cases }: { cases: Case[] }) {
  if (cases.length === 0) {
    return (
      <div className="surface-deep p-10 text-center">
        <p className="font-display-italic text-2xl text-muted">Henüz vaka yok.</p>
      </div>
    );
  }
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
      {cases.map((c, i) => (
        <CaseCard key={c.id} index={i + 1} {...c} />
      ))}
    </div>
  );
}
