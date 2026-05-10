import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { CaseIndex } from '@/components/case/CaseIndex';
import { WelcomeModal } from '@/components/onboarding/WelcomeModal';
import { StarterHint } from '@/components/onboarding/StarterHint';

export default async function HomePage() {
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) redirect('/login');

  const { data: cases } = await sb
    .from('cases')
    .select('id, title, presenting, difficulty')
    .eq('is_active', true)
    .order('created_at', { ascending: true });

  const { data: openSession } = await sb
    .from('sessions')
    .select('id, case_id, started_at')
    .eq('user_id', user.id)
    .eq('status', 'in_progress')
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: doneRows } = await sb
    .from('sessions')
    .select('case_id')
    .eq('user_id', user.id)
    .eq('status', 'completed');
  const doneIds = Array.from(new Set((doneRows ?? []).map((r) => r.case_id))).filter(
    Boolean
  ) as string[];

  const list = (cases ?? []) as Array<{
    id: string;
    title: string;
    presenting: string;
    difficulty: 'easy' | 'medium' | 'hard';
  }>;

  const isFirstTime = doneIds.length === 0 && !openSession;
  const starter = isFirstTime ? list.find((c) => c.difficulty === 'easy') ?? list[0] : null;

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 md:px-10 py-6 md:py-12">
      <nav className="flex items-center justify-between gap-4 mb-12 md:mb-20 flex-wrap">
        <p className="label-caps-strong">
          <span className="hidden sm:inline">Bereketli Topraklar — </span>Psikoloji Pratiği
        </p>
        <div className="flex items-center gap-4 sm:gap-6 text-sm">
          <a href="/ilerleme" className="btn-quiet">İlerleme</a>
          <a href="/gecmis" className="btn-quiet">Geçmiş</a>
          <a href="/ayarlar" className="btn-quiet">Ayarlar</a>
        </div>
      </nav>

      <header className="grid md:grid-cols-12 gap-8 mb-16 md:mb-32 items-end">
        <div className="md:col-span-9">
          <p className="label-caps mb-4 md:mb-6">Vol. 01 · Vaka kütüphanesi</p>
          <h1 className="font-display leading-[0.95] text-[2.75rem] sm:text-[4rem] md:text-[7rem] tracking-tight">
            Bugün
            <br />
            <em className="font-display-italic text-accent">kim</em> ile
            <br />
            çalışacaksın?
          </h1>
        </div>
        <div className="md:col-span-3 md:text-right">
          <p className="font-display-italic text-xl md:text-3xl leading-tight text-ink-soft">
            “Bir vaka seç,
            <br />
            seansı yaşa,
            <br />
            süpervizörü dinle.”
          </p>
          <p className="label-caps mt-4 md:mt-6">— Editör</p>
        </div>
      </header>

      <div className="ornament mb-16" aria-hidden></div>

      {openSession && (
        <div className="surface-deep mb-16 px-6 py-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="font-mono text-xs text-accent tracking-wider">●  AÇIK SEANS</span>
            <p className="font-display-italic text-lg">Bir konuşma yarıda kaldı.</p>
          </div>
          <a href={`/seans/${openSession.id}`} className="btn-outline">
            Devam et →
          </a>
        </div>
      )}

      {starter && <StarterHint starter={starter} />}

      <CaseIndex cases={list} doneIds={doneIds} />

      <footer className="mt-32 pt-10 border-t border-rule flex items-center justify-between text-xs text-muted">
        <p className="label-caps">Pratik · Süpervizyon · Türkçe</p>
        <p className="font-mono">{new Date().getFullYear()}</p>
      </footer>

      <WelcomeModal shouldShow={isFirstTime} />
    </main>
  );
}
