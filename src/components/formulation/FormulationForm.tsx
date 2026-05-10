'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Formulation } from '@/lib/formulation';

const FIELDS: Array<{
  key: keyof Pick<Formulation, 'presenting' | 'hypothesis' | 'patterns' | 'next_session'>;
  label: string;
  prompt: string;
  rows: number;
}> = [
  {
    key: 'presenting',
    label: 'Sunulan sorun',
    prompt:
      'Danışan kendi sözcükleriyle ne ile geldi? Ne hissediyor, ne arıyor? Klinik dile çevirme, onun ifadesinde kal.',
    rows: 3,
  },
  {
    key: 'hypothesis',
    label: 'Senin hipotezin',
    prompt:
      'Yüzeyselin altında ne olabilir? Şu an gördüğün haliyle danışanın asıl meselesi nedir sence? Kesin olma — bir hipotez.',
    rows: 4,
  },
  {
    key: 'patterns',
    label: 'Dikkat çeken örüntüler',
    prompt:
      'Konuşma stilinde, savunmasında, ne anlatıp ne anlatmadığında neler dikkatini çekti? Bedensel ifadeler, duraksamalar, kaçındığı konular?',
    rows: 4,
  },
  {
    key: 'next_session',
    label: 'Bir sonraki seansa nasıl hazırlanırsın?',
    prompt:
      'Hangi yöne gitmek istersin? Hangi soruyu sorabilirsin? Neyi ertelemek doğru olur?',
    rows: 3,
  },
];

export function FormulationForm({
  sessionId,
  initial,
}: {
  sessionId: string;
  initial: Formulation | null;
}) {
  const router = useRouter();
  const [values, setValues] = useState<Record<string, string>>({
    presenting: initial?.presenting ?? '',
    hypothesis: initial?.hypothesis ?? '',
    patterns: initial?.patterns ?? '',
    next_session: initial?.next_session ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalChars = Object.values(values).reduce((a, b) => a + b.length, 0);
  const hasContent = totalChars > 0;

  async function submit() {
    setSaving(true);
    setError(null);
    const res = await fetch('/api/seans/formulasyon', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ session_id: sessionId, ...values }),
    });
    setSaving(false);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      setError(err.error === 'empty' ? 'En az bir alan dolu olmalı.' : 'Kaydedilemedi.');
      return;
    }
    router.push(`/rapor/${sessionId}`);
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="space-y-10"
    >
      {FIELDS.map((f) => (
        <div key={f.key}>
          <label className="block">
            <p className="label-caps mb-2">{f.label}</p>
            <p className="text-xs text-muted leading-relaxed mb-3 italic">{f.prompt}</p>
            <textarea
              value={values[f.key]}
              onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
              rows={f.rows}
              className="w-full"
              placeholder="…"
              style={{
                fontFamily: 'var(--font-serif)',
                fontStyle: 'italic',
                fontSize: '1rem',
                lineHeight: '1.65',
                resize: 'vertical',
              }}
            />
          </label>
        </div>
      ))}

      {error && (
        <p className="text-sm text-danger border-l-2 border-danger pl-3 py-1">{error}</p>
      )}

      <div className="flex items-center justify-between gap-4 pt-6 border-t border-rule flex-wrap">
        <a href={`/rapor/${sessionId}`} className="btn-quiet">
          Atla & rapora git
        </a>
        <div className="flex items-center gap-4">
          <span className="text-xs text-muted font-mono">{totalChars} karakter</span>
          <button
            type="submit"
            disabled={saving || !hasContent}
            className="btn-primary"
          >
            {saving ? '...' : 'Kaydet & rapora git →'}
          </button>
        </div>
      </div>
    </form>
  );
}
