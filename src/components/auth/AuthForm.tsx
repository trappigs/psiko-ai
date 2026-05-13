'use client';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

const FEATURES: Array<{ num: string; title: string; body: string }> = [
  {
    num: '01',
    title: 'Hazır vaka kütüphanesi',
    body:
      '21 vaka — kaygı, depresyon, yas, OKB, travma, somatizasyon, dini-fatalist çerçeveleme, jargon kullanan danışan, suçlayıcı tutum… farklı zorluk ve psikolojik yapılarda.',
  },
  {
    num: '02',
    title: '45 dakikalık görüşme alıştırması',
    body:
      'Gerçek görüşme süresinde, AI danışan vakanın söylem kaydında konuşur — beden dilini, duraksamalarını, direncini de canlandırır.',
  },
  {
    num: '03',
    title: 'Değerlendirme raporu',
    body:
      'Mikrobeceri sayımı (açık-uçlu soru oranı, yansıtma, empati…), gerçek mesaj alıntılarına dayalı somut geri bildirim, kaçırılan işaretler.',
  },
  {
    num: '04',
    title: 'Refleksif formülasyon',
    body:
      'Önce kendi okumanı yaz, sonra değerlendiricinin yorumuyla yan yana oku — buluştuğunuz, senin yakaladığın, eksik kalan.',
  },
];

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
      {/* Left atmospheric panel — desktop intro */}
      <aside className="hidden md:flex bg-ink text-paper relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.06]"
          aria-hidden
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")",
          }}
        ></div>
        <div className="relative z-10 flex flex-col justify-between p-10 lg:p-12 w-full overflow-y-auto">
          <p
            className="label-caps"
            style={{ color: 'var(--color-paper)', opacity: 0.75 }}
          >
            Bereketli Topraklar — Psikoloji Pratiği
          </p>

          <div className="my-8 lg:my-10">
            <h2 className="font-display text-4xl lg:text-5xl leading-[1.05]">
              Psikoloji öğrencileri için
              <br />
              <em className="font-display-italic text-accent-soft">AI danışanla</em>
              <br />
              güvenli bir pratik odası.
            </h2>
            <p
              className="text-sm lg:text-base leading-relaxed mt-6 max-w-md"
              style={{ color: 'var(--color-paper)', opacity: 0.85 }}
            >
              Gerçek danışan bulmak zor; bulunan danışanla deneme yapmak hem etik
              hem pedagojik açıdan riskli. Burada hazırlanmış vakalarla
              risksiz pratik yap, AI eğitim değerlendiricisinden seans bazlı geri
              bildirim oku, becerilerini zaman içinde izle.
            </p>

            <ul className="mt-10 space-y-5">
              {FEATURES.map((f) => (
                <li key={f.num} className="grid grid-cols-[2.25rem_1fr] gap-4">
                  <span
                    className="font-mono text-xs pt-0.5"
                    style={{ color: 'var(--color-paper)', opacity: 0.55 }}
                  >
                    {f.num}
                  </span>
                  <div>
                    <p
                      className="font-display-italic text-lg leading-tight"
                      style={{ color: 'var(--color-paper)' }}
                    >
                      {f.title}
                    </p>
                    <p
                      className="text-xs lg:text-sm leading-relaxed mt-1"
                      style={{ color: 'var(--color-paper)', opacity: 0.7 }}
                    >
                      {f.body}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-3">
            <p
              className="font-display-italic text-xl leading-snug"
              style={{ color: 'var(--color-paper)', opacity: 0.85 }}
            >
              “Bu işin en zor yanı{' '}
              <span className="text-accent-soft">danışanı görmektir</span>.”
            </p>
            <p
              className="font-mono text-[11px]"
              style={{ color: 'var(--color-paper)', opacity: 0.45 }}
            >
              Yalnızca eğitim amaçlıdır · gerçek psikoterapi hizmeti değildir ·
              profesyonel süpervizyonun yerini tutmaz
            </p>
          </div>
        </div>
      </aside>

      <div className="flex items-center justify-center px-6 py-16 md:py-12">
        <div className="w-full max-w-sm">
          {/* Mobile-only compact intro */}
          <div className="md:hidden mb-12 surface-deep p-5 space-y-3">
            <p className="label-caps">Bereketli Topraklar — Psikoloji Pratiği</p>
            <p className="text-sm leading-relaxed">
              Psikoloji öğrencileri için AI danışanla güvenli bir pratik odası.
              Hazırlanmış vakalarla seans yap, değerlendirme raporu oku, becerilerini izle.
            </p>
          </div>

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
              : 'AI danışanla klinik görüşme pratiği yap, değerlendirme raporu al.'}
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
                  <a
                    href="/kvkk"
                    target="_blank"
                    className="underline underline-offset-2 hover:text-ink"
                  >
                    KVKK Aydınlatma Metni
                  </a>
                  &apos;ni ve{' '}
                  <a
                    href="/etik"
                    target="_blank"
                    className="underline underline-offset-2 hover:text-ink"
                  >
                    Etik İlkeler
                  </a>
                  &apos;i okudum; bu aracın bir klinik beceri alıştırma aracı
                  olduğunu, profesyonel süpervizyon veya psikoterapi hizmeti
                  yerine geçmediğini anladım; verilerimin OpenAI altyapısında
                  işlenmesine onay veriyorum.
                </span>
              </label>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? '...' : mode === 'login' ? 'Giriş yap' : 'Hesap aç'}
            </button>

            {error && (
              <p className="text-sm text-danger border-l-2 border-danger pl-3 py-1">
                {error}
              </p>
            )}
            {info && (
              <p className="text-sm text-success border-l-2 border-success pl-3 py-1">
                {info}
              </p>
            )}
          </form>

          <p className="mt-10 text-sm text-muted">
            {mode === 'login' ? (
              <>
                Hesabın yok mu?{' '}
                <a
                  href="/signup"
                  className="btn-quiet"
                  style={{ color: 'var(--color-ink)' }}
                >
                  Kayıt ol →
                </a>
              </>
            ) : (
              <>
                Zaten hesabın var mı?{' '}
                <a
                  href="/login"
                  className="btn-quiet"
                  style={{ color: 'var(--color-ink)' }}
                >
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
