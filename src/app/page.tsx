import { createClient } from '@/lib/supabase/server';
import { CaseGrid } from '@/components/case/CaseGrid';
import { redirect } from 'next/navigation';

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

  return (
    <main className="max-w-6xl mx-auto px-4 py-10 md:py-14">
      <header className="flex items-end justify-between flex-wrap gap-6 mb-12">
        <div>
          <p className="label-caps mb-2">Vaka kütüphanesi</p>
          <h1 className="text-5xl md:text-6xl font-display leading-[0.95]">
            Bugün <em className="font-display-italic">kim</em> ile çalışacaksın?
          </h1>
          <p className="text-ink-soft mt-3 max-w-md">
            Bir vaka seç, AI danışanla pratik yap, oturum sonu süpervizör raporunu oku.
          </p>
        </div>
        <nav className="flex items-center gap-5 text-sm">
          <a href="/gecmis" className="btn-quiet">Geçmiş</a>
          <a href="/ayarlar" className="btn-quiet">Ayarlar</a>
        </nav>
      </header>

      {openSession && (
        <div className="surface mb-10 p-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="font-mono text-xs text-accent">●</span>
            <p className="text-sm">Devam eden bir seansın var.</p>
          </div>
          <a href={`/seans/${openSession.id}`} className="text-sm font-medium underline underline-offset-4 decoration-accent hover:text-accent">
            Devam et →
          </a>
        </div>
      )}

      <CaseGrid cases={(cases ?? []) as never} />
    </main>
  );
}
