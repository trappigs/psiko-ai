import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { CaseIndex } from '@/components/case/CaseIndex';
import { WelcomeModal } from '@/components/onboarding/WelcomeModal';
import { StarterHint } from '@/components/onboarding/StarterHint';
import { AppShell } from '@/components/shell/AppShell';
import { FreeSessionTrigger } from '@/components/case/FreeSessionTrigger';

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
    .eq('source', 'curated')
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

  const { data: openSeriesRows } = await sb
    .from('case_series')
    .select('id, case_id')
    .eq('user_id', user.id)
    .eq('status', 'open');
  const openSeriesByCaseId: Record<string, string> = {};
  for (const r of openSeriesRows ?? []) openSeriesByCaseId[r.case_id] = r.id;

  const list = (cases ?? []) as Array<{
    id: string;
    title: string;
    presenting: string;
    difficulty: 'easy' | 'medium' | 'hard';
  }>;

  const isFirstTime = doneIds.length === 0 && !openSession;
  const starter = isFirstTime ? list.find((c) => c.difficulty === 'easy') ?? list[0] : null;

  return (
    <AppShell userEmail={user.email}>
      <div className="max-w-4xl mx-auto px-6 md:px-10 py-8 md:py-12">
        <header className="mb-10 md:mb-14">
          <p className="label-caps mb-3">Vaka kütüphanesi</p>
          <h1 className="font-display text-4xl md:text-5xl leading-[1.05] tracking-tight">
            Bugün <em className="font-display-italic text-accent">kim</em> ile çalışacaksın?
          </h1>
          <p className="text-ink-soft mt-3 text-sm md:text-base max-w-lg">
            Bir vaka seç, dosyasını oku, hazır olduğunda seansa başla. Süpervizör raporu seans
            sonu seni bekliyor.
          </p>
        </header>

        {openSession && (
          <div className="surface mb-8 px-5 py-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="w-2 h-2 rounded-full bg-accent animate-pulse"></span>
              <p className="text-sm">
                <span className="font-medium">Açık bir seans var</span>
                <span className="text-muted"> — yarıda kaldı.</span>
              </p>
            </div>
            <a href={`/seans/${openSession.id}`} className="btn-outline shrink-0">
              Devam et
            </a>
          </div>
        )}

        <FreeSessionTrigger />

        {starter && <StarterHint starter={starter} />}

        <CaseIndex cases={list} doneIds={doneIds} openSeriesByCaseId={openSeriesByCaseId} />
      </div>

      <WelcomeModal shouldShow={isFirstTime} />
    </AppShell>
  );
}
