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
  in_progress: 'Açık',
  completed: 'Tamam',
  abandoned: 'Yarım',
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
    <main className="max-w-4xl mx-auto px-6 md:px-10 py-10 md:py-14">
      <nav className="flex items-center justify-between mb-16">
        <a href="/" className="btn-quiet">← Vakalar</a>
        <p className="label-caps">Arşiv</p>
      </nav>

      <header className="mb-16">
        <p className="label-caps mb-3">Geçmiş seanslar</p>
        <h1 className="font-display text-5xl md:text-6xl leading-[0.98]">
          Bir <em className="font-display-italic">arşiv</em>
          <br />
          birikiyor.
        </h1>
      </header>

      {sessions.length === 0 ? (
        <div className="py-24 text-center">
          <p className="font-display-italic text-3xl text-muted mb-8">
            Henüz bir seans yapmadın.
          </p>
          <a href="/" className="btn-primary">İlk seansını başlat →</a>
        </div>
      ) : (
        <ol className="list-none">
          {sessions.map((s, i) => {
            const num = String(sessions.length - i).padStart(2, '0');
            const href =
              s.status === 'completed'
                ? `/rapor/${s.id}`
                : s.status === 'in_progress'
                  ? `/seans/${s.id}`
                  : null;
            const Body = (
              <>
                <span className="index-num">№ {num}</span>
                <span className="min-w-0">
                  <span className="block index-title">
                    <em className="font-display-italic">{s.case?.title ?? '—'}</em>
                  </span>
                  <span className="block mt-2 text-sm text-muted font-mono tracking-wide">
                    {new Date(s.started_at).toLocaleString('tr-TR', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                    {' · '}
                    {s.message_count} mesaj
                  </span>
                </span>
                <span className={`index-meta ${STATUS_COLOR[s.status]}`}>
                  {STATUS_LABEL[s.status]}
                </span>
                <span className="font-mono text-base text-muted">
                  {href ? '→' : ''}
                </span>
              </>
            );
            return (
              <li key={s.id}>
                {href ? (
                  <a href={href} className="index-row">
                    {Body}
                  </a>
                ) : (
                  <div className="index-row" style={{ cursor: 'default' }}>
                    {Body}
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </main>
  );
}
