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
    <main className="max-w-2xl mx-auto p-6 space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Ayarlar</h1>
        <a href="/" className="underline text-sm">
          ← Geri
        </a>
      </header>

      <section className="space-y-2">
        <button onClick={handleSignOut} className="border px-4 py-2 rounded">
          Çıkış yap
        </button>
      </section>

      <section className="space-y-2 border-t pt-6">
        <h2 className="font-semibold">Hesabı sil</h2>
        <p className="text-sm text-gray-700">
          Tüm seansların, raporların ve verilerin kalıcı olarak silinecek.
        </p>
        {!confirming ? (
          <button onClick={() => setConfirming(true)} className="text-red-700 underline">
            Hesabımı sil
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={() => setConfirming(false)}
              className="border px-4 py-2 rounded"
            >
              Vazgeç
            </button>
            <button
              onClick={handleDelete}
              className="bg-red-700 text-white px-4 py-2 rounded"
            >
              Evet, sil
            </button>
          </div>
        )}
        {error && <p className="text-sm text-red-700">{error}</p>}
      </section>

      <section className="border-t pt-6 text-sm">
        <a href="/kvkk" className="underline">
          KVKK Aydınlatma Metni
        </a>
      </section>
    </main>
  );
}
