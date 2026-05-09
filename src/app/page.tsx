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
    .order('created_at', { ascending: false });

  const { data: openSession } = await sb
    .from('sessions')
    .select('id, case_id, started_at')
    .eq('user_id', user.id)
    .eq('status', 'in_progress')
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return (
    <main className="max-w-5xl mx-auto p-6">
      <header className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Vakalar</h1>
        <nav className="flex gap-4 text-sm">
          <a href="/gecmis" className="underline">
            Geçmiş
          </a>
          <a href="/ayarlar" className="underline">
            Ayarlar
          </a>
        </nav>
      </header>

      {openSession && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded flex items-center justify-between">
          <span>Devam eden bir seansın var.</span>
          <a href={`/seans/${openSession.id}`} className="underline font-medium">
            Devam et
          </a>
        </div>
      )}

      <CaseGrid cases={(cases ?? []) as never} />
    </main>
  );
}
