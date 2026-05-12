import { createClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import { AppShell } from '@/components/shell/AppShell';
import { CloseSeriesButton } from '@/components/series/CloseSeriesButton';
import { LivingFormulationCard } from '@/components/series/LivingFormulationCard';
import { parseFormulation } from '@/lib/formulation';

type SeriesRow = {
  id: string;
  user_id: string;
  status: 'open' | 'closed';
  created_at: string;
  closed_at: string | null;
  formulation: unknown;
  case: {
    id: string;
    title: string;
    source: 'curated' | 'ai_generated';
  } | null;
};

type SessionRow = {
  id: string;
  status: 'in_progress' | 'completed' | 'abandoned';
  started_at: string;
  ended_at: string | null;
  message_count: number;
};

const STATUS_LABEL: Record<SessionRow['status'], string> = {
  in_progress: 'Açık',
  completed: 'Tamam',
  abandoned: 'Yarım',
};

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) redirect('/login');

  const { data: seriesData } = await sb
    .from('case_series')
    .select('id, user_id, status, created_at, closed_at, formulation, case:cases(id, title, source)')
    .eq('id', id)
    .single();
  const series = seriesData as unknown as SeriesRow | null;
  if (!series || series.user_id !== user.id || !series.case) notFound();

  const { data: sessionsData } = await sb
    .from('sessions')
    .select('id, status, started_at, ended_at, message_count')
    .eq('series_id', id)
    .order('started_at', { ascending: true });
  const sessions = (sessionsData ?? []) as SessionRow[];

  const isOpen = series.status === 'open';
  const activeSession = sessions.find((s) => s.status === 'in_progress');
  const isCurated = series.case.source === 'curated';
  const livingFormulation = parseFormulation(series.formulation);

  return (
    <AppShell userEmail={user.email}>
      <div className="max-w-3xl mx-auto px-6 md:px-10 py-8 md:py-12">
        <nav className="mb-8">
          <a href="/" className="btn-quiet text-xs">← Anasayfa</a>
        </nav>

        <header className="mb-10">
          <p className="label-caps mb-3">Vaka takibi</p>
          <h1 className="font-display text-4xl md:text-5xl leading-[1.05] tracking-tight">
            <em className="font-display-italic">{series.case.title}</em>
          </h1>
          <div className="flex items-center gap-3 mt-4 flex-wrap">
            <span className={`label-caps ${isOpen ? 'text-accent' : 'text-muted'}`}>
              {isOpen ? 'Açık' : 'Kapalı'} · {sessions.length} seans
            </span>
            {isCurated && (
              <>
                <span className="text-rule">·</span>
                <a href={`/vaka/${series.case.id}`} className="text-xs text-muted underline">
                  Vaka dosyası
                </a>
              </>
            )}
            {!isCurated && (
              <>
                <span className="text-rule">·</span>
                <span className="text-xs text-muted italic">Serbest seans — dosya gizli</span>
              </>
            )}
          </div>
        </header>

        <LivingFormulationCard seriesId={series.id} formulation={livingFormulation} />

        {sessions.length === 0 ? (
          <p className="surface p-10 text-center text-sm text-muted">Henüz seans yok.</p>
        ) : (
          <ol className="surface divide-y divide-rule overflow-hidden mb-10">
            {sessions.map((s, i) => {
              const num = String(i + 1).padStart(2, '0');
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
                    <span className="block index-title">Seans {i + 1}</span>
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
                  <span className="index-meta">{STATUS_LABEL[s.status]}</span>
                  <span className="font-mono text-base text-muted">{href ? '→' : ''}</span>
                </>
              );
              return (
                <li key={s.id}>
                  {href ? (
                    <a href={href} className="index-row">{Body}</a>
                  ) : (
                    <div className="index-row" style={{ cursor: 'default' }}>{Body}</div>
                  )}
                </li>
              );
            })}
          </ol>
        )}

        {isOpen && (
          <div className="flex items-center justify-between gap-4 flex-wrap pt-6 border-t border-rule">
            {activeSession ? (
              <a href={`/seans/${activeSession.id}`} className="btn-primary">
                Açık seansa dön →
              </a>
            ) : (
              <a href={`/seans/start?case=${series.case.id}`} className="btn-primary">
                Yeni seans başlat →
              </a>
            )}
            <CloseSeriesButton seriesId={series.id} />
          </div>
        )}
      </div>
    </AppShell>
  );
}
