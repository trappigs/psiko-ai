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
    <main className="min-h-[calc(100vh-2rem)] grid md:grid-cols-2">
      {/* Left atmospheric panel */}
      <aside className="hidden md:flex bg-ink text-paper relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.06]" aria-hidden style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")",
        }}></div>
        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          <p className="label-caps text-paper" style={{ color: 'var(--color-paper)', opacity: 0.75 }}>
            Bereketli Topraklar
          </p>
          <div>
            <p className="font-display-italic text-5xl leading-[1.05]">
              “Terapinin
              <br />
              en zor yanı,
              <br />
              <span className="text-accent-soft">danışanı</span> görmektir.”
            </p>
            <p className="label-caps mt-8" style={{ color: 'var(--color-paper)', opacity: 0.55 }}>
              — Pratik için bir oda
            </p>
          </div>
          <p className="font-mono text-xs" style={{ color: 'var(--color-paper)', opacity: 0.45 }}>
            01 / Pratik · 02 / Süpervizyon · 03 / Geri bildirim
          </p>
        </div>
      </aside>

      <div className="flex items-center justify-center px-6 py-16 md:py-12">
        <div className="w-full max-w-sm">
          <p className="label-caps mb-4">{mode === 'login' ? 'Giriş' : 'Kayıt'}</p>
          <h1 className="font-display text-5xl leading-[1.02] mb-3">
            {mode === 'login' ? (
              <>
                Tekrar
                <br />
                <em className="font-display-italic">hoş geldin</em>.
              </>
            ) : (
              <>
                <em className="font-display-italic">Pratiğe</em>
                <br />
                başla.
              </>
            )}
          </h1>
          <p className="text-sm text-muted mb-10">
            {mode === 'login'
              ? 'AI danışanla seansa devam et.'
              : 'AI danışanla terapi pratiği yap, süpervizör raporu al.'}
          </p>

          <form onSubmit={handleSubmit} className="space-y-7">
            <div>
              <label className="label-caps block mb-2">E-posta</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full"
                placeholder="ornek@kurum.edu.tr"
              />
            </div>

            <div>
              <label className="label-caps block mb-2">Şifre</label>
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
              <p className="text-sm text-danger border-l-2 border-danger pl-3 py-1">{error}</p>
            )}
            {info && (
              <p className="text-sm text-success border-l-2 border-success pl-3 py-1">{info}</p>
            )}
          </form>

          <p className="mt-10 text-sm text-muted">
            {mode === 'login' ? (
              <>
                Hesabın yok mu?{' '}
                <a href="/signup" className="btn-quiet" style={{ color: 'var(--color-ink)' }}>
                  Kayıt ol →
                </a>
              </>
            ) : (
              <>
                Zaten hesabın var mı?{' '}
                <a href="/login" className="btn-quiet" style={{ color: 'var(--color-ink)' }}>
                  Giriş yap →
                </a>
              </>
            )}
          </p>
        </div>
      </div>
    </main>
  );
}
