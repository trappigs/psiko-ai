'use client';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { AppShell } from '@/components/shell/AppShell';

export default function Page() {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setError(null);
    const res = await fetch('/api/hesap/delete', { method: 'POST' });
    if (!res.ok) {
      setError('Hesap silinemedi.');
      return;
    }
    await createClient().auth.signOut();
    window.location.href = '/login';
  }

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto px-6 md:px-10 py-8 md:py-12">
        <header className="mb-10 md:mb-14">
          <p className="label-caps mb-3">Hesap</p>
          <h1 className="font-display text-4xl md:text-5xl leading-[1.05] tracking-tight">
            Ayarlar
          </h1>
        </header>

        <section className="surface p-6 mb-6 border-l-4" style={{ borderLeftColor: 'var(--color-danger)' }}>
          <p className="font-display text-xl mb-1 text-danger">Hesabı sil</p>
          <p className="text-sm text-muted mb-5">
            Tüm seansların, raporların ve verilerin kalıcı olarak silinecek. Geri alınamaz.
          </p>
          {!confirming ? (
            <button onClick={() => setConfirming(true)} className="btn-outline">
              Hesabımı sil
            </button>
          ) : (
            <div className="flex items-center gap-3">
              <button onClick={() => setConfirming(false)} className="btn-outline">
                Vazgeç
              </button>
              <button
                onClick={handleDelete}
                className="btn-primary"
                style={{ background: 'var(--color-danger)' }}
              >
                Evet, kalıcı sil
              </button>
            </div>
          )}
          {error && <p className="text-sm text-danger mt-3">{error}</p>}
        </section>

        <section className="surface p-6">
          <p className="font-display text-xl mb-1">Yasal</p>
          <p className="text-sm text-muted mb-5">Verilerinin nasıl işlendiği.</p>
          <a href="/kvkk" className="btn-quiet">
            KVKK Aydınlatma Metni →
          </a>
        </section>
      </div>
    </AppShell>
  );
}
