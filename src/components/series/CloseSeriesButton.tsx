'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function CloseSeriesButton({ seriesId }: { seriesId: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function close() {
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/seri/${seriesId}/kapat`, { method: 'POST' });
    setLoading(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      if (body.error === 'active_session_exists') {
        setError('Açık bir seans var. Önce onu bitir.');
      } else {
        setError('Kapatılamadı, tekrar dene.');
      }
      return;
    }
    router.refresh();
  }

  if (!confirming) {
    return (
      <button onClick={() => setConfirming(true)} className="btn-quiet">
        Vakayı kapat
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted">Emin misin?</span>
      <button onClick={close} disabled={loading} className="btn-primary text-sm">
        {loading ? '...' : 'Kapat'}
      </button>
      <button onClick={() => setConfirming(false)} disabled={loading} className="btn-quiet text-sm">
        Vazgeç
      </button>
      {error && <span className="text-xs text-danger ml-2">{error}</span>}
    </div>
  );
}
