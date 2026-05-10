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
    <main className="min-h-[calc(100vh-2rem)] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <header className="mb-10 text-center">
          <p className="label-caps mb-3">Bereketli Topraklar — Psikoloji</p>
          <h1 className="text-4xl font-display-italic mb-2">
            {mode === 'login' ? 'Tekrar hoş geldin.' : 'Pratiğe başla.'}
          </h1>
          <p className="text-sm text-muted">
            {mode === 'login'
              ? 'AI danışanla seansa devam et.'
              : 'AI danışanla terapi pratiği yap, süpervizör raporu al.'}
          </p>
        </header>

        <form onSubmit={handleSubmit} className="surface p-7 space-y-5">
          <div className="space-y-1.5">
            <label className="label-caps block">E-posta</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full"
              placeholder="ornek@kurum.edu.tr"
            />
          </div>

          <div className="space-y-1.5">
            <label className="label-caps block">Şifre</label>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full"
              placeholder="en az 8 karakter"
            />
          </div>

          {mode === 'signup' && (
            <label className="flex items-start gap-2.5 text-xs text-ink-soft leading-relaxed">
              <input
                type="checkbox"
                checked={kvkkAccepted}
                onChange={(e) => setKvkkAccepted(e.target.checked)}
                className="mt-0.5 accent-ink"
              />
              <span>
                <a href="/kvkk" target="_blank" className="underline underline-offset-2 hover:text-ink">
                  KVKK Aydınlatma Metni
                </a>
                &apos;ni okudum; verilerimin OpenAI altyapısında işlenmesine onay veriyorum.
              </span>
            </label>
          )}

          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? '...' : mode === 'login' ? 'Giriş yap' : 'Hesap aç'}
          </button>

          {error && (
            <p className="text-sm text-danger border-l-2 border-danger pl-3 py-1 bg-accent-soft/40 rounded-r">
              {error}
            </p>
          )}
          {info && (
            <p className="text-sm text-success border-l-2 border-success pl-3 py-1 bg-paper-deep rounded-r">
              {info}
            </p>
          )}
        </form>

        <p className="mt-6 text-sm text-center text-muted">
          {mode === 'login' ? (
            <>
              Hesabın yok mu?{' '}
              <a href="/signup" className="text-ink underline underline-offset-2 hover:text-accent">
                Kayıt ol
              </a>
            </>
          ) : (
            <>
              Zaten hesabın var mı?{' '}
              <a href="/login" className="text-ink underline underline-offset-2 hover:text-accent">
                Giriş yap
              </a>
            </>
          )}
        </p>
      </div>
    </main>
  );
}
