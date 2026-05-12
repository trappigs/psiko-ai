import { createClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import { AppShell } from '@/components/shell/AppShell';
import { LivingFormulationCard } from '@/components/series/LivingFormulationCard';
import { CloseSeriesForm } from '@/components/series/CloseSeriesForm';
import { parseFormulation } from '@/lib/formulation';

type SeriesRow = {
  id: string;
  user_id: string;
  status: 'open' | 'closed';
  formulation: unknown;
  case: { id: string; title: string } | null;
};

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) redirect('/login');

  const { data } = await sb
    .from('case_series')
    .select('id, user_id, status, formulation, case:cases(id, title)')
    .eq('id', id)
    .maybeSingle();
  const series = data as unknown as SeriesRow | null;
  if (!series || series.user_id !== user.id || !series.case) notFound();
  if (series.status === 'closed') redirect(`/seri/${id}/kapanis`);

  const { count: sessionCount } = await sb
    .from('sessions')
    .select('id', { count: 'exact', head: true })
    .eq('series_id', id)
    .eq('status', 'completed');

  const livingFormulation = parseFormulation(series.formulation);

  return (
    <AppShell userEmail={user.email}>
      <div className="max-w-2xl mx-auto px-6 md:px-10 py-8 md:py-12">
        <nav className="mb-8">
          <a href={`/seri/${id}`} className="btn-quiet text-xs">
            ← Seri sayfası
          </a>
        </nav>

        <header className="mb-10">
          <p className="label-caps mb-3">Vaka kapanıyor</p>
          <h1 className="font-display text-4xl md:text-5xl leading-[1.05] tracking-tight">
            <em className="font-display-italic">{series.case.title}</em>
          </h1>
          <p className="text-ink-soft mt-3 text-sm md:text-base max-w-lg leading-relaxed">
            {sessionCount ?? 0} seans yaptın. Bir sonraki adımda değerlendirici seri bütününü
            okuyup kapanış raporu üretecek.
          </p>
        </header>

        <LivingFormulationCard seriesId={series.id} formulation={livingFormulation} />

        <CloseSeriesForm seriesId={series.id} />
      </div>
    </AppShell>
  );
}
