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
    <main className="max-w-2xl mx-auto px-6 md:px-10 py-10 md:py-14">
      <nav className="flex items-center justify-between mb-16">
        <a href="/" className="btn-quiet">← Vakalar</a>
        <p className="label-caps">Hesap</p>
      </nav>

      <header className="mb-16">
        <p className="label-caps mb-3">Ayarlar</p>
        <h1 className="font-display text-5xl md:text-6xl leading-[0.98]">
          <em className="font-display-italic">Hesabını</em>
          <br />
          yönet.
        </h1>
      </header>

      <section className="py-8 border-t border-rule">
        <div className="flex items-baseline justify-between gap-6">
          <div>
            <p className="font-display text-2xl leading-tight">Oturum</p>
            <p className="text-sm text-muted mt-2">Bu cihazdaki oturumunu kapat.</p>
          </div>
          <button onClick={handleSignOut} className="btn-outline shrink-0">
            Çıkış yap
          </button>
        </div>
      </section>

      <section className="py-8 border-t border-rule">
        <div className="flex items-baseline justify-between gap-6 mb-4">
          <div>
            <p className="font-display text-2xl leading-tight text-danger">
              <em className="font-display-italic">Hesabı sil</em>
            </p>
            <p className="text-sm text-muted mt-2 max-w-md">
              Tüm seansların, raporların ve verilerin kalıcı olarak silinecek. Geri alınamaz.
            </p>
          </div>
          {!confirming && (
            <button onClick={() => setConfirming(true)} className="btn-quiet text-danger shrink-0">
              Hesabımı sil
            </button>
          )}
        </div>
        {confirming && (
          <div className="surface-deep p-4 flex items-center justify-between gap-3 mt-2">
            <p className="text-sm font-display-italic">Geri alınamaz. Emin misin?</p>
            <div className="flex gap-2 shrink-0">
              <button onClick={() => setConfirming(false)} className="btn-quiet">
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
          </div>
        )}
        {error && <p className="text-sm text-danger mt-2">{error}</p>}
      </section>

      <section className="py-8 border-t border-rule">
        <a href="/kvkk" className="btn-quiet">KVKK Aydınlatma Metni →</a>
      </section>
    </main>
  );
}
