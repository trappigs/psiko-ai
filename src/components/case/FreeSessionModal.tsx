'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Difficulty = 'easy' | 'medium' | 'hard';

const DIFF_OPTIONS: Array<{ value: Difficulty; label: string; hint: string }> = [
  { value: 'easy', label: 'Kolay', hint: 'işbirlikçi, daha açık' },
  { value: 'medium', label: 'Orta', hint: 'dengeli zorluk' },
  { value: 'hard', label: 'Zor', hint: 'kapalı, savunmacı' },
];

export function FreeSessionModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [themeHint, setThemeHint] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/seans/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'free',
          difficulty,
          themeHint: themeHint.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        const code = String(body.error ?? 'internal');
        if (code.startsWith('limit:')) setError('Günlük seans/token limitin doldu.');
        else if (code === 'generation_failed') setError('Şu an üretemedik, tekrar dene.');
        else setError('Bir şey ters gitti, tekrar dene.');
        setLoading(false);
        return;
      }
      const { session_id } = await res.json();
      router.push(`/seans/${session_id}`);
    } catch {
      setError('Bağlantı hatası, tekrar dene.');
      setLoading(false);
    }
  }

  if (!open) return null;

  return (
    <>
      <div onClick={loading ? undefined : onClose} aria-hidden className="fixed inset-0 bg-ink/40 backdrop-blur-sm z-40" />
      <div role="dialog" aria-label="Serbest seans" className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-paper border border-rule shadow-2xl rounded-md z-50 p-6">
        <p className="label-caps mb-2">Serbest seans</p>
        <h2 className="font-display text-2xl mb-1">Sürpriz <em className="font-display-italic">danışan</em></h2>
        <p className="text-sm text-muted mb-6">Vakanın dosyası seans sonunda açılır.</p>

        <fieldset className="mb-5">
          <legend className="label-caps mb-2">Zorluk</legend>
          <div className="grid grid-cols-3 gap-2">
            {DIFF_OPTIONS.map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() => setDifficulty(o.value)}
                aria-pressed={difficulty === o.value}
                className={`px-3 py-2 border rounded text-sm ${
                  difficulty === o.value ? 'border-accent bg-accent/10' : 'border-rule'
                }`}
              >
                <div className="font-medium">{o.label}</div>
                <div className="text-xs text-muted">{o.hint}</div>
              </button>
            ))}
          </div>
        </fieldset>

        <label className="block mb-6">
          <span className="label-caps mb-2 block">Tema ipucu (opsiyonel)</span>
          <input
            type="text"
            maxLength={120}
            value={themeHint}
            onChange={(e) => setThemeHint(e.target.value)}
            placeholder="ör. iş yerinde tükenmişlik — boş bırakabilirsin"
            className="w-full px-3 py-2 border border-rule rounded text-sm bg-paper"
          />
        </label>

        {error && <p className="text-sm text-danger mb-4" role="alert">{error}</p>}

        <div className="flex justify-end gap-2">
          <button onClick={onClose} disabled={loading} className="btn-quiet">İptal</button>
          <button onClick={start} disabled={loading} className="btn-primary">
            {loading ? 'Danışan hazırlanıyor…' : 'Başlat'}
          </button>
        </div>
      </div>
    </>
  );
}
