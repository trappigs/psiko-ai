import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

type SessionRow = {
  id: string;
  status: 'in_progress' | 'completed' | 'abandoned';
  started_at: string;
  ended_at: string | null;
  message_count: number;
  case: { title: string } | null;
};

const STATUS_LABEL: Record<SessionRow['status'], string> = {
  in_progress: 'Devam ediyor',
  completed: 'Tamamlandı',
  abandoned: 'Yarıda bırakıldı',
};

const STATUS_COLOR: Record<SessionRow['status'], string> = {
  in_progress: 'text-accent',
  completed: 'text-success',
  abandoned: 'text-muted',
};

export default async function Page() {
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) redirect('/login');

  const { data } = await sb
    .from('sessions')
    .select('id, status, started_at, ended_at, message_count, case:cases(title)')
    .eq('user_id', user.id)
    .order('started_at', { ascending: false });
  const sessions = (data ?? []) as unknown as SessionRow[];

  return (
    <main className="max-w-3xl mx-auto px-4 py-10 md:py-14">
      <header className="flex items-end justify-between mb-10 gap-4">
        <div>
          <p className="label-caps mb-2">Arşiv</p>
          <h1 className="font-display text-4xl md:text-5xl">Geçmiş seanslar</h1>
        </div>
        <a href="/" className="btn-quiet text-xs">← Vakalar</a>
      </header>

      {sessions.length === 0 ? (
        <div className="surface-deep p-10 text-center">
          <p className="font-display-italic text-2xl text-muted">Henüz bir seans yapmadın.</p>
          <a href="/" className="btn-primary mt-6">İlk seansını başlat →</a>
        </div>
      ) : (
        <div className="surface divide-y divide-rule">
          {sessions.map((s) => (
            <div key={s.id} className="p-5 flex items-center justify-between gap-4 hover:bg-paper-deep transition-colors">
              <div className="min-w-0 flex-1">
                <p className="font-display text-lg leading-tight truncate">{s.case?.title ?? '—'}</p>
                <p className="text-xs text-muted mt-1">
                  {new Date(s.started_at).toLocaleString('tr-TR', {
                    day: 'numeric',
                    month: 'long',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                  {' · '}
                  {s.message_count} mesaj
                </p>
              </div>
              <span className={`text-xs font-medium ${STATUS_COLOR[s.status]} shrink-0`}>
                {STATUS_LABEL[s.status]}
              </span>
              <div className="shrink-0">
                {s.status === 'completed' ? (
                  <a href={`/rapor/${s.id}`} className="btn-quiet text-xs">Raporu gör →</a>
                ) : s.status === 'in_progress' ? (
                  <a href={`/seans/${s.id}`} className="btn-quiet text-xs">Devam et →</a>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
