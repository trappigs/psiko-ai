import { createClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import { FormulationForm } from '@/components/formulation/FormulationForm';
import { AppShell } from '@/components/shell/AppShell';
import { parseFormulation } from '@/lib/formulation';

type SessionRow = {
  id: string;
  user_id: string;
  status: 'in_progress' | 'completed' | 'abandoned';
  formulation: unknown;
  series_id: string;
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
    .from('sessions')
    .select('id, user_id, status, formulation, series_id, case:cases(title)')
    .eq('id', id)
    .single();
  const session = data as unknown as SessionRow | null;
  if (!session || session.user_id !== user.id) notFound();

  const { data: seriesRow } = await sb
    .from('case_series')
    .select('formulation')
    .eq('id', session.series_id)
    .maybeSingle();

  const existing =
    parseFormulation(seriesRow?.formulation) ?? parseFormulation(session.formulation);

  return (
    <AppShell userEmail={user.email}>
      <div className="max-w-2xl mx-auto px-6 md:px-10 py-8 md:py-12">
        <nav className="mb-8">
          <a href={`/rapor/${id}`} className="btn-quiet text-xs">
            Atla, doğrudan rapora git →
          </a>
        </nav>

        <header className="mb-10">
          <p className="label-caps mb-3">Refleksif egzersiz</p>
          <h1 className="font-display text-4xl md:text-5xl leading-[1.05] tracking-tight">
            <em className="font-display-italic text-accent">Senin</em> formülasyonun
          </h1>
          <p className="text-ink-soft mt-3 leading-relaxed text-sm md:text-base max-w-lg">
            Değerlendirme raporunu okumadan önce, kendi okumanı yaz. Klinik eğitiminin can damarı.
            Sonra değerlendiricininkiyle nerede buluştuğunu, nerede ayrıldığını gör.
          </p>
          <p className="text-xs text-muted mt-3">
            Vaka: <span className="text-ink">{session.case?.title ?? '—'}</span>
          </p>
        </header>

        <FormulationForm sessionId={id} initial={existing ?? null} />
      </div>
    </AppShell>
  );
}
