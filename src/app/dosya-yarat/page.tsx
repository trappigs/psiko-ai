import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { AppShell } from '@/components/shell/AppShell';
import { CastingFlow } from '@/components/casting/CastingFlow';

export default async function Page() {
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) redirect('/login');

  return (
    <AppShell userEmail={user.email}>
      <div className="max-w-3xl mx-auto px-6 md:px-10 py-8 md:py-12">
        <nav className="mb-8">
          <a href="/" className="btn-quiet text-xs">
            ← Anasayfa
          </a>
        </nav>

        <header className="mb-10">
          <p className="label-caps mb-3">Casting</p>
          <h1 className="font-display text-4xl md:text-5xl leading-[1.05] tracking-tight">
            İstediğin <em className="font-display-italic text-accent">danışanı</em>{' '}
            yarat
          </h1>
          <p className="text-ink-soft mt-3 text-sm md:text-base max-w-lg leading-relaxed">
            Parametreleri seç (hepsi opsiyonel). AI 3 farklı yorum üretir — incele,
            birini seç, seansa başla.
          </p>
        </header>

        <CastingFlow />
      </div>
    </AppShell>
  );
}
