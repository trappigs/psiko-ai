import { createClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import { AppShell } from '@/components/shell/AppShell';

type SeriesRow = {
  id: string;
  user_id: string;
  status: 'open' | 'closed';
  closed_at: string | null;
  case: { id: string; title: string } | null;
};

type ReportRow = {
  closing_reflection: string | null;
  summary: string;
  arc: string;
  themes: string[];
  growth: string[];
  missed_opportunities: string[];
  final_formulation: {
    presenting?: string;
    hypothesis?: string;
    patterns?: string;
    next_session?: string;
  } | null;
  next_steps: string;
  generated_at: string;
};

function toStringList(v: unknown): string[] {
  return Array.isArray(v) ? v.map((x) => String(x)) : [];
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) redirect('/login');

  const { data: seriesData } = await sb
    .from('case_series')
    .select('id, user_id, status, closed_at, case:cases(id, title)')
    .eq('id', id)
    .maybeSingle();
  const series = seriesData as unknown as SeriesRow | null;
  if (!series || series.user_id !== user.id || !series.case) notFound();

  const { data: rawReport } = await sb
    .from('case_series_reports')
    .select(
      'closing_reflection, summary, arc, themes, growth, missed_opportunities, final_formulation, next_steps, generated_at'
    )
    .eq('series_id', id)
    .maybeSingle();
  if (!rawReport) notFound();

  const report: ReportRow = {
    closing_reflection: (rawReport.closing_reflection as string) ?? null,
    summary: rawReport.summary as string,
    arc: rawReport.arc as string,
    themes: toStringList(rawReport.themes),
    growth: toStringList(rawReport.growth),
    missed_opportunities: toStringList(rawReport.missed_opportunities),
    final_formulation:
      (rawReport.final_formulation as ReportRow['final_formulation']) ?? null,
    next_steps: rawReport.next_steps as string,
    generated_at: rawReport.generated_at as string,
  };

  return (
    <AppShell userEmail={user.email}>
      <main className="max-w-2xl mx-auto px-6 md:px-10 py-10 md:py-16">
        <a href={`/seri/${id}`} className="btn-quiet text-xs">
          ← Seri sayfası
        </a>

        <header className="mt-12 mb-16">
          <p className="label-caps mb-4">Kapanış raporu</p>
          <h1 className="font-display text-5xl md:text-6xl leading-[0.98]">
            <em className="font-display-italic">{series.case.title}</em>
          </h1>
          <p className="mt-6 text-sm text-muted font-mono">
            {new Date(report.generated_at).toLocaleDateString('tr-TR', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </p>
        </header>

        <hr className="rule mb-16" />

        <section className="mb-16">
          <p className="label-caps mb-3">Özet</p>
          <p className="text-base leading-relaxed">{report.summary}</p>
        </section>

        <section className="mb-16">
          <p className="label-caps mb-3">Vakanın yayı</p>
          <p className="font-display-italic text-xl leading-relaxed text-ink">
            {report.arc}
          </p>
        </section>

        <div className="grid md:grid-cols-2 gap-10 mb-16">
          {report.themes.length > 0 && (
            <section>
              <p className="label-caps mb-3">Temalar</p>
              <ul className="space-y-3">
                {report.themes.map((t, i) => (
                  <li
                    key={i}
                    className="text-sm leading-relaxed border-l-2 border-rule pl-3"
                  >
                    {t}
                  </li>
                ))}
              </ul>
            </section>
          )}
          {report.growth.length > 0 && (
            <section>
              <p className="label-caps mb-3 text-accent">Senin gelişimin</p>
              <ul className="space-y-3">
                {report.growth.map((g, i) => (
                  <li
                    key={i}
                    className="text-sm leading-relaxed border-l-2 border-accent pl-3"
                  >
                    {g}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        {report.missed_opportunities.length > 0 && (
          <section className="mb-16">
            <p
              className="label-caps mb-3"
              style={{ color: 'var(--color-gilt)' }}
            >
              Yakalanmamış fırsatlar
            </p>
            <ul className="space-y-3">
              {report.missed_opportunities.map((m, i) => (
                <li
                  key={i}
                  className="text-sm leading-relaxed border-l-2 pl-3"
                  style={{ borderColor: 'var(--color-gilt)' }}
                >
                  {m}
                </li>
              ))}
            </ul>
          </section>
        )}

        {report.final_formulation && (
          <section className="surface-deep px-6 py-6 mb-16">
            <p className="label-caps mb-4">Final formülasyon</p>
            <div className="space-y-4">
              {report.final_formulation.presenting && (
                <Row label="Sunulan sorun" text={report.final_formulation.presenting} />
              )}
              {report.final_formulation.hypothesis && (
                <Row label="Hipotez" text={report.final_formulation.hypothesis} />
              )}
              {report.final_formulation.patterns && (
                <Row label="Örüntüler" text={report.final_formulation.patterns} />
              )}
              {report.final_formulation.next_session && (
                <Row
                  label="Sonraki seans (planlanan)"
                  text={report.final_formulation.next_session}
                />
              )}
            </div>
          </section>
        )}

        {report.closing_reflection && (
          <section className="mb-16">
            <p className="label-caps mb-3">Kapanış notun</p>
            <p className="font-display-italic text-lg leading-relaxed text-ink-soft">
              {report.closing_reflection}
            </p>
          </section>
        )}

        <section className="mb-16">
          <p className="label-caps mb-3">Sonraki adımlar</p>
          <p className="text-base leading-relaxed">{report.next_steps}</p>
        </section>
      </main>
    </AppShell>
  );
}

function Row({ label, text }: { label: string; text: string }) {
  return (
    <div>
      <p className="label-caps mb-1 text-xs">{label}</p>
      <p className="text-base leading-relaxed font-display-italic">{text}</p>
    </div>
  );
}
