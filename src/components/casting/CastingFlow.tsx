'use client';
import { useState } from 'react';
import { CastingForm } from './CastingForm';
import { CandidateCard } from './CandidateCard';
import { CandidateDetailModal } from './CandidateDetailModal';
import type { CastingParams } from '@/lib/openai/casting-types';

type CandidatePublic = {
  case_id: string;
  title: string;
  presenting: string;
  background: string;
  personality: string;
  speech_style: string;
  insight_level: string;
  defense_style: string;
  register: string;
  diagnosis_hint: string | null;
  difficulty: 'easy' | 'medium' | 'hard';
  variant_label: string;
};

export function CastingFlow() {
  const [candidates, setCandidates] = useState<CandidatePublic[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<CandidatePublic | null>(null);

  async function generate(params: CastingParams) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/danisan-aday/uret', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ params }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        const code = String(body.error ?? 'internal');
        if (code.startsWith('limit:')) setError('Günlük limit doldu.');
        else if (code === 'generation_failed')
          setError('Üretemedik, tekrar dene.');
        else setError('Bir şey ters gitti, tekrar dene.');
        setLoading(false);
        return;
      }
      const { candidates } = await res.json();
      setCandidates(candidates);
      setLoading(false);
    } catch {
      setError('Bağlantı hatası.');
      setLoading(false);
    }
  }

  function reset() {
    setCandidates(null);
    setSelected(null);
    setError(null);
  }

  if (candidates) {
    return (
      <div className="space-y-8">
        <div className="flex items-baseline justify-between">
          <p className="label-caps">3 aday hazır</p>
          <button onClick={reset} className="btn-quiet text-xs">
            Parametreleri değiştir
          </button>
        </div>
        <div className="grid md:grid-cols-3 gap-4">
          {candidates.map((c) => (
            <CandidateCard
              key={c.case_id}
              caseId={c.case_id}
              title={c.title}
              presenting={c.presenting}
              variantLabel={c.variant_label}
              difficulty={c.difficulty}
              onClick={() => setSelected(c)}
            />
          ))}
        </div>
        <CandidateDetailModal
          open={selected !== null}
          onClose={() => setSelected(null)}
          candidate={selected}
        />
      </div>
    );
  }

  return (
    <div>
      {error && (
        <p className="text-sm text-danger mb-4" role="alert">
          {error}
        </p>
      )}
      <CastingForm onSubmit={generate} loading={loading} />
    </div>
  );
}
