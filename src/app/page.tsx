import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { CaseIndex } from '@/components/case/CaseIndex';

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
  const doneIds = Array.from(new Set((doneRows ?? []).map((r) => r.case_id))).filter(Boolean) as string[];

  const list = (cases ?? []) as Array<{
    id: string;
    title: string;
    presenting: string;
    difficulty: 'easy' | 'medium' | 'hard';
  }>;

  return (
    <main className="max-w-6xl mx-auto px-6 md:px-10 py-8 md:py-12">
      <nav className="flex items-center justify-between mb-20">
        <p className="label-caps-strong">Bereketli Topraklar — Psikoloji Pratiği</p>
        <div className="flex items-center gap-6">
          <a href="/ilerleme" className="btn-quiet">İlerleme</a>
          <a href="/gecmis" className="btn-quiet">Geçmiş</a>
          <a href="/ayarlar" className="btn-quiet">Ayarlar</a>
        </div>
      </nav>

      <header className="grid md:grid-cols-12 gap-8 mb-24 md:mb-32 items-end">
        <div className="md:col-span-9">
          <p className="label-caps mb-6">Vol. 01 · Vaka kütüphanesi</p>
          <h1 className="font-display leading-[0.92] text-[3.5rem] md:text-[7rem] tracking-tight">
            Bugün
            <br />
            <em className="font-display-italic text-accent">kim</em> ile
            <br />
            çalışacaksın?
          </h1>
        </div>
        <div className="md:col-span-3 md:text-right">
          <p className="font-display-italic text-2xl md:text-3xl leading-tight text-ink-soft">
            “Bir vaka seç,
            <br />
            seansı yaşa,
            <br />
            süpervizörü dinle.”
          </p>
          <p className="label-caps mt-6">— Editör</p>
        </div>
      </header>

      <div className="ornament mb-16" aria-hidden></div>

      {openSession && (
        <div className="surface-deep mb-16 px-6 py-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="font-mono text-xs text-accent tracking-wider">●  AÇIK SEANS</span>
            <p className="font-display-italic text-lg">
              Bir konuşma yarıda kaldı.
            </p>
          </div>
          <a href={`/seans/${openSession.id}`} className="btn-outline">
            Devam et →
          </a>
        </div>
      )}

      <CaseIndex cases={list} doneIds={doneIds} />

      <footer className="mt-32 pt-10 border-t border-rule flex items-center justify-between text-xs text-muted">
        <p className="label-caps">Pratik · Süpervizyon · Türkçe</p>
        <p className="font-mono">{new Date().getFullYear()}</p>
      </footer>
    </main>
  );
}
