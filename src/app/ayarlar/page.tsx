'use client';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

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

  async function handleSignOut() {
    await createClient().auth.signOut();
    window.location.href = '/login';
  }

  return (
    <main className="max-w-2xl mx-auto px-4 py-10 md:py-14 space-y-10">
      <header className="flex items-end justify-between gap-4">
        <div>
          <p className="label-caps mb-2">Hesap</p>
          <h1 className="font-display text-4xl md:text-5xl">Ayarlar</h1>
        </div>
        <a href="/" className="btn-quiet text-xs">← Geri</a>
      </header>

      <section className="surface p-6 flex items-center justify-between gap-4">
        <div>
          <p className="font-display text-lg">Oturum</p>
          <p className="text-sm text-muted mt-1">Bu cihazdaki oturumunu kapat.</p>
        </div>
        <button onClick={handleSignOut} className="btn-outline">
          Çıkış yap
        </button>
      </section>

      <section className="surface p-6 space-y-4 border-l-4 border-l-danger">
        <div>
          <p className="font-display text-lg">Hesabı sil</p>
          <p className="text-sm text-muted mt-1">
            Tüm seansların, raporların ve verilerin kalıcı olarak silinecek. Geri alınamaz.
          </p>
        </div>
        {!confirming ? (
          <button onClick={() => setConfirming(true)} className="btn-quiet text-danger">
            Hesabımı sil
          </button>
        ) : (
          <div className="flex gap-2">
            <button onClick={() => setConfirming(false)} className="btn-outline">
              Vazgeç
            </button>
            <button
              onClick={handleDelete}
              className="btn-primary"
              style={{ background: 'var(--color-danger)' }}
            >
              Evet, kalıcı olarak sil
            </button>
          </div>
        )}
        {error && <p className="text-sm text-danger">{error}</p>}
      </section>

      <section className="text-sm text-center">
        <a href="/kvkk" className="btn-quiet">KVKK Aydınlatma Metni</a>
      </section>
    </main>
  );
}
