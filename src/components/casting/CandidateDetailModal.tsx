'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type CandidateDetail = {
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

export function CandidateDetailModal({
  open,
  onClose,
  candidate,
}: {
  open: boolean;
  onClose: () => void;
  candidate: CandidateDetail | null;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || loading) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, loading, onClose]);

  async function start() {
    if (!candidate) return;
    setLoading(true);
    setError(null);
    const res = await fetch('/api/seans/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ case_id: candidate.case_id }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      const code = String(body.error ?? 'internal');
      if (code.startsWith('limit:')) setError('Günlük limit doldu.');
      else setError('Seans başlatılamadı, tekrar dene.');
      setLoading(false);
      return;
    }
    const { session_id } = await res.json();
    router.push(`/seans/${session_id}`);
  }

  if (!open || !candidate) return null;

  return (
    <>
      <div
        onClick={loading ? undefined : onClose}
        aria-hidden
        className="fixed inset-0 bg-ink/40 backdrop-blur-sm z-40"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Danışan detayı"
        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl max-h-[85vh] overflow-y-auto bg-paper border border-rule shadow-2xl rounded-md z-50 p-6 md:p-8"
      >
        <div className="flex items-baseline justify-between mb-2">
          <span className="label-caps text-accent">{candidate.variant_label}</span>
          <button
            onClick={onClose}
            className="btn-quiet text-xs"
            aria-label="Kapat"
          >
            Kapat ✕
          </button>
        </div>
        <h2 className="font-display text-3xl mb-6">
          <em className="font-display-italic">{candidate.title}</em>
        </h2>

        <div className="space-y-5">
          <Section label="Sunulan sorun">{candidate.presenting}</Section>
          <Section label="Geçmiş / aile">{candidate.background}</Section>
          <Section label="Kişilik">{candidate.personality}</Section>
          <Section label="Konuşma stili">{candidate.speech_style}</Section>
          <div className="grid sm:grid-cols-3 gap-4">
            <Section label="İçgörü">{candidate.insight_level}</Section>
            <Section label="Baskın savunma">{candidate.defense_style}</Section>
            <Section label="Söylem kaydı">{candidate.register}</Section>
          </div>
          {candidate.diagnosis_hint && (
            <Section label="Klinik çağrışım" muted>
              {candidate.diagnosis_hint}
            </Section>
          )}
        </div>

        {error && (
          <p className="text-sm text-danger mt-6" role="alert">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2 mt-8 pt-6 border-t border-rule">
          <button onClick={onClose} disabled={loading} className="btn-quiet">
            Geri dön
          </button>
          <button onClick={start} disabled={loading} className="btn-primary">
            {loading ? 'Seansa başlatılıyor…' : 'Bu danışanla seansa başla →'}
          </button>
        </div>
      </div>
    </>
  );
}

function Section({
  label,
  children,
  muted,
}: {
  label: string;
  children: React.ReactNode;
  muted?: boolean;
}) {
  return (
    <div>
      <p className="label-caps mb-1.5">{label}</p>
      <p
        className={
          muted
            ? 'text-sm leading-relaxed text-ink-soft italic'
            : 'text-base leading-relaxed'
        }
      >
        {children}
      </p>
    </div>
  );
}
