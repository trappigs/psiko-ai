import { createClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import { FormulationForm } from '@/components/formulation/FormulationForm';
import { parseFormulation } from '@/lib/formulation';

type SessionRow = {
  id: string;
  user_id: string;
  status: 'in_progress' | 'completed' | 'abandoned';
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
    .from('sessions')
    .select('id, user_id, status, formulation, case:cases(title)')
    .eq('id', id)
    .single();
  const session = data as unknown as SessionRow | null;
  if (!session || session.user_id !== user.id) notFound();

  const existing = parseFormulation(session.formulation);

  return (
    <main className="max-w-2xl mx-auto px-6 md:px-10 py-10 md:py-14">
      <nav className="mb-12">
        <a href={`/rapor/${id}`} className="btn-quiet text-xs">
          Atla, doğrudan rapora git →
        </a>
      </nav>

      <header className="mb-10">
        <p className="label-caps mb-3">Refleksif egzersiz</p>
        <h1 className="font-display text-4xl md:text-5xl leading-[1.02]">
          <em className="font-display-italic">Senin</em> formülasyonun
        </h1>
        <p className="text-ink-soft mt-4 leading-relaxed text-sm max-w-md">
          Süpervizör raporunu okumadan önce, kendi okumanı yaz. Bu adım klinik eğitiminin can
          damarı: kendi formülasyonunu önce kelimelere dök, sonra süpervizörünkiyle nerede
          buluştuğunu, nerede ayrıldığını gör.
        </p>
        <p className="text-xs text-muted mt-3 italic">
          Vaka: <em className="font-display-italic">{session.case?.title ?? '—'}</em>
        </p>
      </header>

      <FormulationForm sessionId={id} initial={existing ?? null} />
    </main>
  );
}
