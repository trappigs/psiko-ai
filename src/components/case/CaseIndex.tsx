'use client';
import { useMemo, useState } from 'react';

type CaseRow = {
  id: string;
  title: string;
  presenting: string;
  difficulty: 'easy' | 'medium' | 'hard';
};

const DIFFICULTY_LABEL: Record<string, string> = {
  easy: 'Kolay',
  medium: 'Orta',
  hard: 'Zor',
};

type Filter = 'all' | 'easy' | 'medium' | 'hard' | 'todo';

export function CaseIndex({ cases, doneIds }: { cases: CaseRow[]; doneIds: string[] }) {
  const done = useMemo(() => new Set(doneIds), [doneIds]);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return cases.filter((c) => {
      if (filter === 'easy' || filter === 'medium' || filter === 'hard') {
        if (c.difficulty !== filter) return false;
      }
      if (filter === 'todo' && done.has(c.id)) return false;
      if (q && !`${c.title} ${c.presenting}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [cases, query, filter, done]);

  const counts = useMemo(() => {
    return {
      all: cases.length,
      easy: cases.filter((c) => c.difficulty === 'easy').length,
      medium: cases.filter((c) => c.difficulty === 'medium').length,
      hard: cases.filter((c) => c.difficulty === 'hard').length,
      todo: cases.filter((c) => !done.has(c.id)).length,
    };
  }, [cases, done]);

  return (
    <section>
      <header className="flex items-baseline justify-between gap-6 mb-6 flex-wrap">
        <p className="label-caps">
          İçindekiler ·{' '}
          <span className="text-ink">{filtered.length}</span>
          {filtered.length !== cases.length && <> / {cases.length}</>} vaka
        </p>
        <p className="label-caps">Süre · 45 dk</p>
      </header>

      <div className="flex items-center gap-3 mb-2 flex-wrap">
        <FilterChip active={filter === 'all'} onClick={() => setFilter('all')}>
          Tümü <span className="opacity-50">{counts.all}</span>
        </FilterChip>
        <FilterChip active={filter === 'todo'} onClick={() => setFilter('todo')}>
          Yapmadıklarım <span className="opacity-50">{counts.todo}</span>
        </FilterChip>
        <span className="text-rule">·</span>
        <FilterChip active={filter === 'easy'} onClick={() => setFilter('easy')}>
          Kolay <span className="opacity-50">{counts.easy}</span>
        </FilterChip>
        <FilterChip active={filter === 'medium'} onClick={() => setFilter('medium')}>
          Orta <span className="opacity-50">{counts.medium}</span>
        </FilterChip>
        <FilterChip active={filter === 'hard'} onClick={() => setFilter('hard')}>
          Zor <span className="opacity-50">{counts.hard}</span>
        </FilterChip>
      </div>

      <div className="mb-2 relative">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Ara — başlık veya sunulan sorun…"
          className="w-full"
          style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: '1.0625rem' }}
        />
      </div>

      {filtered.length === 0 ? (
        <p className="text-center py-16 font-display-italic text-2xl text-muted">
          Bu kriterle vaka yok.
        </p>
      ) : (
        <ol className="list-none">
          {filtered.map((c) => {
            const realIdx = cases.findIndex((x) => x.id === c.id) + 1;
            const isDone = done.has(c.id);
            return (
              <li key={c.id}>
                <a
                  href={`/vaka/${c.id}`}
                  className="index-row group"
                  aria-label={`${c.title} — vaka dosyasını aç`}
                >
                  <span className="index-num flex items-center gap-2">
                    {String(realIdx).padStart(2, '0')}
                    {isDone && (
                      <span className="text-success" title="Yapıldı">
                        ✓
                      </span>
                    )}
                  </span>
                  <span className="min-w-0">
                    <span className="block index-title">
                      <em className="font-display-italic">{c.title}</em>
                    </span>
                    <span className="block mt-2 text-sm text-ink-soft leading-relaxed line-clamp-2 max-w-2xl">
                      {c.presenting}
                    </span>
                  </span>
                  <span className="index-meta whitespace-nowrap" data-difficulty={c.difficulty}>
                    {DIFFICULTY_LABEL[c.difficulty]}
                  </span>
                  <span className="font-mono text-base text-muted group-hover:text-accent transition-colors">
                    →
                  </span>
                </a>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}

function FilterChip({
  children,
  active,
  onClick,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`text-xs tracking-wide uppercase px-3 py-1.5 rounded-full transition-colors ${
        active
          ? 'bg-ink text-paper'
          : 'border border-rule text-muted hover:border-ink hover:text-ink'
      }`}
    >
      {children}
    </button>
  );
}
