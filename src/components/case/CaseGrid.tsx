import { CaseCard } from './CaseCard';

type Case = {
  id: string;
  title: string;
  presenting: string;
  difficulty: 'easy' | 'medium' | 'hard';
};

export function CaseGrid({ cases }: { cases: Case[] }) {
  if (cases.length === 0) {
    return <p className="text-center text-gray-500 mt-12">Henüz vaka yok.</p>;
  }
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {cases.map((c) => (
        <CaseCard key={c.id} {...c} />
      ))}
    </div>
  );
}
