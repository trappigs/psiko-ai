'use client';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

export function AuthForm({ mode }: { mode: 'login' | 'signup' }) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [kvkkAccepted, setKvkkAccepted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);
    const sb = createClient();
    if (mode === 'signup') {
      if (!kvkkAccepted) {
        setError('KVKK onayı gerekli.');
        setLoading(false);
        return;
      }
      const { error } = await sb.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${location.origin}/auth/callback` },
      });
      if (error) setError(error.message);
      else setInfo('Doğrulama linki e-postana gönderildi.');
    } else {
      const { error } = await sb.auth.signInWithPassword({ email, password });
      if (error) setError(error.message);
      else router.push('/');
    }
    setLoading(false);
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-sm mx-auto mt-16 space-y-4 p-6 border rounded">
      <h1 className="text-2xl font-bold">{mode === 'login' ? 'Giriş Yap' : 'Kayıt Ol'}</h1>
      <input
        type="email"
        required
        placeholder="E-posta"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="w-full border p-2 rounded"
      />
      <input
        type="password"
        required
        minLength={8}
        placeholder="Şifre (en az 8 karakter)"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="w-full border p-2 rounded"
      />
      {mode === 'signup' && (
        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            checked={kvkkAccepted}
            onChange={(e) => setKvkkAccepted(e.target.checked)}
          />
          <span>
            <a href="/kvkk" target="_blank" className="underline">
              KVKK Aydınlatma Metni
            </a>
            &apos;ni okudum ve verilerimin OpenAI altyapısında işlenmesine onay veriyorum.
          </span>
        </label>
      )}
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-black text-white py-2 rounded disabled:opacity-50"
      >
        {loading ? '...' : mode === 'login' ? 'Giriş' : 'Kayıt'}
      </button>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {info && <p className="text-sm text-green-700">{info}</p>}
      <p className="text-sm text-center">
        {mode === 'login' ? (
          <>
            Hesabın yok mu?{' '}
            <a href="/signup" className="underline">
              Kayıt ol
            </a>
          </>
        ) : (
          <>
            Zaten hesabın var mı?{' '}
            <a href="/login" className="underline">
              Giriş yap
            </a>
          </>
        )}
      </p>
    </form>
  );
}
