'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type Gap = '1 gün sonra' | '1 hafta sonra' | '1 ay sonra' | '';

const GAP_OPTIONS: Array<{ value: Gap; label: string }> = [
  { value: '1 gün sonra', label: '1 gün sonra' },
  { value: '1 hafta sonra', label: '1 hafta sonra' },
  { value: '1 ay sonra', label: '1 ay sonra' },
  { value: '', label: 'Belirsiz' },
];

export function TimeGapModal({
  open,
  onClose,
  caseId,
}: {
  open: boolean;
  onClose: () => void;
  caseId: string;
}) {
  const router = useRouter();
  const [gap, setGap] = useState<Gap>('1 hafta sonra');
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
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/seans/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          case_id: caseId,
          time_gap_label: gap || undefined,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        const code = String(body.error ?? 'internal');
        if (code.startsWith('limit:')) setError('Günlük seans/token limitin doldu.');
        else setError('Bir şey ters gitti, tekrar dene.');
        setLoading(false);
        return;
      }
      const { session_id } = await res.json();
      router.push(`/seans/${session_id}`);
    } catch {
      setError('Bağlantı hatası.');
      setLoading(false);
    }
  }

  if (!open) return null;

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
        aria-label="Zaman ipucu"
        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-paper border border-rule shadow-2xl rounded-md z-50 p-6"
      >
        <p className="label-caps mb-2">Yeni seans</p>
        <h2 className="font-display text-2xl mb-1">
          Son seansla bu seans arasında <em className="font-display-italic">ne kadar</em> zaman geçti?
        </h2>
        <p className="text-sm text-muted mb-6">
          Danışan bu süreçte ne yaşamış olabilirse onunla başlayalım.
        </p>

        <fieldset className="mb-6">
          <legend className="sr-only">Zaman ipucu</legend>
          <div className="grid grid-cols-2 gap-2">
            {GAP_OPTIONS.map((o) => (
              <button
                key={o.label}
                type="button"
                onClick={() => setGap(o.value)}
                aria-pressed={gap === o.value}
                className={`px-3 py-3 border rounded text-sm ${
                  gap === o.value ? 'border-accent bg-accent/10' : 'border-rule'
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
        </fieldset>

        {error && (
          <p className="text-sm text-danger mb-4" role="alert">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2">
          <button onClick={onClose} disabled={loading} className="btn-quiet">
            İptal
          </button>
          <button onClick={start} disabled={loading} className="btn-primary">
            {loading ? 'Hazırlanıyor…' : 'Başlat'}
          </button>
        </div>
      </div>
    </>
  );
}
