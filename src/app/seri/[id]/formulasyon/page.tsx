import { createClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import { FormulationForm } from '@/components/formulation/FormulationForm';
import { AppShell } from '@/components/shell/AppShell';
import { parseFormulation } from '@/lib/formulation';

type SeriesRow = {
  id: string;
  user_id: string;
  formulation: unknown;
  case: { title: string } | null;
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
    .select('id, user_id, formulation, case:cases(title)')
    .eq('id', id)
    .maybeSingle();
  const series = data as unknown as SeriesRow | null;
  if (!series || series.user_id !== user.id) notFound();

  const existing = parseFormulation(series.formulation);

  return (
    <AppShell userEmail={user.email}>
      <div className="max-w-2xl mx-auto px-6 md:px-10 py-8 md:py-12">
        <nav className="mb-8">
          <a href={`/seri/${id}`} className="btn-quiet text-xs">
            ← Seri sayfası
          </a>
        </nav>

        <header className="mb-10">
          <p className="label-caps mb-3">Yaşayan formülasyon</p>
          <h1 className="font-display text-4xl md:text-5xl leading-[1.05] tracking-tight">
            <em className="font-display-italic text-accent">{series.case?.title ?? '—'}</em>
          </h1>
          <p className="text-ink-soft mt-3 leading-relaxed text-sm md:text-base max-w-lg">
            Bu vakaya dair gelişen formülasyonun. Her seansta üstüne yazabilirsin.
          </p>
        </header>

        <FormulationForm
          sessionId={id}
          initial={existing ?? null}
          endpoint={`/api/seri/${id}/formulasyon`}
          bodyKey="series_id"
          redirectTo={`/seri/${id}`}
        />
      </div>
    </AppShell>
  );
}
