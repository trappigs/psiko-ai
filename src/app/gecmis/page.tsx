import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { AppShell } from '@/components/shell/AppShell';

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
    <AppShell userEmail={user.email}>
      <div className="max-w-4xl mx-auto px-6 md:px-10 py-8 md:py-12">
        <header className="mb-10 md:mb-14">
          <p className="label-caps mb-3">Arşiv</p>
          <h1 className="font-display text-4xl md:text-5xl leading-[1.05] tracking-tight">
            Geçmiş seanslar
          </h1>
          <p className="text-ink-soft mt-3 text-sm">
            {sessions.length} seans · son: {sessions[0]?.case?.title ?? '—'}
          </p>
        </header>

        {sessions.length === 0 ? (
          <div className="surface p-10 text-center">
            <p className="font-display text-2xl mb-2">Henüz seans yok</p>
            <p className="text-sm text-muted mb-6">Bir vakayla başla.</p>
            <a href="/" className="btn-primary">
              İlk seansını başlat
            </a>
          </div>
        ) : (
          <ol className="surface divide-y divide-rule overflow-hidden">
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
                      {s.case?.title ?? '—'}
                    </span>
                    <span className="block mt-1 text-xs text-muted font-mono">
                      {new Date(s.started_at).toLocaleString('tr-TR', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}{' '}
                      · {s.message_count} mesaj
                    </span>
                  </span>
                  <span className={`index-meta ${STATUS_COLOR[s.status]}`}>
                    {STATUS_LABEL[s.status]}
                  </span>
                  <span className="font-mono text-base text-muted">{href ? '→' : ''}</span>
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
      </div>
    </AppShell>
  );
}
