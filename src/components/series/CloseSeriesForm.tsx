'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function CloseSeriesForm({ seriesId }: { seriesId: string }) {
  const router = useRouter();
  const [reflection, setReflection] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/seri/${seriesId}/kapat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        closing_reflection: reflection.trim() || undefined,
      }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      const code = String(body.error ?? 'internal');
      if (code === 'active_session_exists')
        setError('Açık bir seans var. Önce onu bitir.');
      else if (code === 'already_closed') setError('Bu vaka zaten kapanmış.');
      else if (code === 'synthesis_failed') setError('Rapor üretilemedi, tekrar dene.');
      else setError('Bir şey ters gitti, tekrar dene.');
      setLoading(false);
      return;
    }
    const { report_url } = await res.json();
    router.push(report_url ?? `/seri/${seriesId}/kapanis`);
  }

  return (
    <div className="space-y-6">
      <label className="block">
        <span className="label-caps mb-2 block">
          Bu vakadan ne öğrendin?{' '}
          <span className="text-muted">(opsiyonel)</span>
        </span>
        <p className="text-xs text-muted italic mb-3">
          Klinik veya kişisel bir not — değerlendirme raporu yazılırken hesaba katılır.
        </p>
        <textarea
          value={reflection}
          onChange={(e) => setReflection(e.target.value)}
          rows={6}
          maxLength={2000}
          placeholder="…"
          className="w-full"
          style={{
            fontFamily: 'var(--font-serif)',
            fontStyle: 'italic',
            fontSize: '1rem',
            lineHeight: '1.65',
            resize: 'vertical',
          }}
        />
      </label>

      {error && (
        <p
          className="text-sm text-danger border-l-2 border-danger pl-3 py-1"
          role="alert"
        >
          {error}
        </p>
      )}

      <div className="flex items-center justify-between gap-4 pt-6 border-t border-rule flex-wrap">
        <a href={`/seri/${seriesId}`} className="btn-quiet">
          Vazgeç
        </a>
        <button onClick={submit} disabled={loading} className="btn-primary">
          {loading ? 'Değerlendirici seriyi okuyor…' : 'Vakayı kapat ve raporu üret →'}
        </button>
      </div>
    </div>
  );
}
