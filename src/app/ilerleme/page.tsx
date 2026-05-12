import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { SkillTimeline } from '@/components/progress/SkillTimeline';
import { AppShell } from '@/components/shell/AppShell';
import {
  type Microskills,
  MICROSKILL_LABELS,
  openQuestionRatio,
  totalQuestions,
} from '@/lib/openai/supervisor-prompt';
import type { Json } from '@/lib/types';

type ReportRow = {
  generated_at: string;
  microskills: Json;
  session: { id: string; case: { title: string } | null } | null;
};

function parseSkill(j: unknown) {
  if (!j || typeof j !== 'object') return { count: 0, examples: [] as string[] };
  const r = j as Record<string, unknown>;
  return {
    count: typeof r.count === 'number' ? Math.max(0, Math.floor(r.count)) : 0,
    examples: Array.isArray(r.examples) ? r.examples.map(String) : [],
  };
}

function parseMicroskills(j: Json): Microskills {
  const o = j && typeof j === 'object' && !Array.isArray(j) ? (j as Record<string, unknown>) : {};
  return {
    open_question: parseSkill(o.open_question),
    closed_question: parseSkill(o.closed_question),
    reflection: parseSkill(o.reflection),
    empathy: parseSkill(o.empathy),
    summary: parseSkill(o.summary),
    advice_or_interpretation: parseSkill(o.advice_or_interpretation),
  };
}

export default async function Page() {
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) redirect('/login');

  const { data: rawReports } = await sb
    .from('reports')
    .select('generated_at, microskills, session:sessions!inner(id, user_id, case:cases(title))')
    .eq('session.user_id', user.id)
    .order('generated_at', { ascending: true });

  const reports = ((rawReports ?? []) as unknown as ReportRow[])
    .filter((r) => r.session)
    .map((r) => ({
      date: new Date(r.generated_at),
      caseTitle: r.session?.case?.title ?? '—',
      sessionId: r.session?.id,
      skills: parseMicroskills(r.microskills),
    }));

  const openRatioPoints = reports
    .filter((r) => totalQuestions(r.skills) > 0)
    .map((r, i) => ({
      date: r.date.toISOString(),
      value: openQuestionRatio(r.skills),
      label: r.date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' }),
    }));

  const reflectionPoints = reports.map((r, i) => ({
    date: r.date.toISOString(),
    value: r.skills.reflection.count,
    label: `#${i + 1}`,
  }));

  const empathyPoints = reports.map((r, i) => ({
    date: r.date.toISOString(),
    value: r.skills.empathy.count,
    label: `#${i + 1}`,
  }));

  const advicePoints = reports.map((r, i) => ({
    date: r.date.toISOString(),
    value: r.skills.advice_or_interpretation.count,
    label: `#${i + 1}`,
  }));

  const totalReports = reports.length;
  const avgOpenRatio =
    openRatioPoints.length > 0
      ? openRatioPoints.reduce((a, b) => a + b.value, 0) / openRatioPoints.length
      : 0;

  return (
    <AppShell userEmail={user.email}>
      <div className="max-w-4xl mx-auto px-6 md:px-10 py-8 md:py-12">
        <header className="mb-10 md:mb-14">
          <p className="label-caps mb-3">Beceri gelişimi</p>
          <h1 className="font-display text-4xl md:text-5xl leading-[1.05] tracking-tight">
            İlerleme <em className="font-display-italic text-accent">kıvrımları</em>
          </h1>
          <p className="text-ink-soft mt-3 text-sm md:text-base max-w-lg">
            Her seansta değerlendirici mikro becerilerini sayar. Zaman içinde nelerin
            değiştiğini görüyorsun.
          </p>
        </header>

      {totalReports < 2 ? (
        <div className="surface-deep p-10 text-center">
          <p className="font-display-italic text-2xl text-muted">
            En az iki tamamlanmış seans olmadan ilerleme çizilemiyor.
          </p>
          <p className="text-sm text-muted mt-3 mb-6">
            Şu an {totalReports} seansın var.
          </p>
          <a href="/" className="btn-primary">Yeni seans başlat →</a>
        </div>
      ) : (
        <>
          <div className="surface-deep px-6 py-5 mb-12 grid sm:grid-cols-3 gap-6">
            <div>
              <p className="label-caps mb-1">Toplam seans</p>
              <p className="font-display text-3xl">{totalReports}</p>
            </div>
            <div>
              <p className="label-caps mb-1">Ort. açık-uçlu oranı</p>
              <p className="font-display text-3xl">
                <em className="font-display-italic text-accent">
                  {Math.round(avgOpenRatio * 100)}%
                </em>
              </p>
            </div>
            <div>
              <p className="label-caps mb-1">Son seans</p>
              <p className="font-display-italic text-lg leading-tight">
                {reports[reports.length - 1].caseTitle}
              </p>
            </div>
          </div>

          <section className="mb-12">
            <p className="label-caps mb-3">Açık-uçlu / toplam soru oranı</p>
            <div className="surface p-6">
              <SkillTimeline
                points={openRatioPoints}
                format="percent"
                accentColor="var(--color-accent)"
              />
            </div>
          </section>

          <div className="grid md:grid-cols-2 gap-8 mb-12">
            <section>
              <p className="label-caps mb-3">{MICROSKILL_LABELS.reflection}</p>
              <div className="surface p-6">
                <SkillTimeline points={reflectionPoints} format="number" />
              </div>
            </section>
            <section>
              <p className="label-caps mb-3">{MICROSKILL_LABELS.empathy}</p>
              <div className="surface p-6">
                <SkillTimeline points={empathyPoints} format="number" />
              </div>
            </section>
          </div>

          <section className="mb-16">
            <p className="label-caps mb-3 text-warn">
              {MICROSKILL_LABELS.advice_or_interpretation} — düşük olması iyidir
            </p>
            <div className="surface p-6">
              <SkillTimeline points={advicePoints} format="number" accentColor="var(--color-warn)" />
            </div>
          </section>

          <section>
            <p className="label-caps mb-4">Seans kaydı</p>
            <ol className="list-none">
              {reports.map((r, i) => (
                <li key={r.sessionId ?? i}>
                  <a href={`/rapor/${r.sessionId}`} className="index-row">
                    <span className="index-num">#{String(i + 1).padStart(2, '0')}</span>
                    <span className="min-w-0">
                      <span className="block index-title">
                        <em className="font-display-italic">{r.caseTitle}</em>
                      </span>
                      <span className="block mt-1 text-xs text-muted font-mono">
                        {r.date.toLocaleDateString('tr-TR', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </span>
                    <span className="index-meta">
                      açık-uçlu{' '}
                      {totalQuestions(r.skills) > 0
                        ? `${Math.round(openQuestionRatio(r.skills) * 100)}%`
                        : '—'}
                    </span>
                    <span className="font-mono text-base text-muted">→</span>
                  </a>
                </li>
              ))}
            </ol>
          </section>
        </>
      )}
      </div>
    </AppShell>
  );
}
