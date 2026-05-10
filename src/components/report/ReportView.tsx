'use client';
import { useEffect, useRef, useState } from 'react';
import { REPORT_FOOTER } from '@/lib/disclaimer';
import { MessageFeedback, type FeedbackState } from '@/components/chat/MessageFeedback';
import { RichText } from '@/components/chat/RichText';
import { MicroskillsBreakdown } from './MicroskillsBreakdown';
import type { Microskills, FormulationComparison } from '@/lib/openai/supervisor-prompt';
import type { Formulation } from '@/lib/formulation';

type Report = {
  summary: string;
  strengths: string[];
  improvements: string[];
  missed_signals: string[];
  next_steps: string;
  microskills: Microskills;
  formulation_comparison: FormulationComparison | null;
} | null;

type Msg = {
  id: string;
  role: 'student' | 'client';
  content: string;
  created_at: string;
  feedback?: FeedbackState;
};

function FormulationField({ label, text }: { label: string; text: string }) {
  return (
    <div>
      <p className="label-caps mb-1.5">{label}</p>
      <p className="font-display-italic leading-relaxed text-ink">{text}</p>
    </div>
  );
}

export function ReportView(props: {
  sessionId: string;
  caseId: string;
  caseTitle: string;
  formulation: Formulation | null;
  report: Report;
  messages: Msg[];
}) {
  const [report, setReport] = useState<Report>(props.report);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showTranscript, setShowTranscript] = useState(false);

  const mountedRef = useRef(true);
  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!report && !loading) generate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function generate() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/rapor/${props.sessionId}`, { method: 'POST' });
      if (!mountedRef.current) return;
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        const detail = body.detail ? ` (${body.detail})` : '';
        setError(`Rapor üretilemedi${detail}.`);
        setLoading(false);
        return;
      }
      const r = await fetch(`/api/rapor/${props.sessionId}`)
        .then((r) => r.json())
        .catch(() => ({ report: null }));
      if (!mountedRef.current) return;
      setReport(r.report);
      setLoading(false);
    } catch (e) {
      if (!mountedRef.current) return;
      const msg = e instanceof Error ? e.message : 'Bilinmeyen hata';
      setError(`Bağlantı hatası: ${msg}`);
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <main className="max-w-2xl mx-auto px-6 py-32 text-center">
        <p className="font-display-italic text-4xl text-muted leading-tight">
          Süpervizör
          <br />
          seansını okuyor…
        </p>
        <div className="typing-dots inline-flex mt-8" aria-label="yükleniyor">
          <span></span>
          <span></span>
          <span></span>
        </div>
      </main>
    );
  }
  if (error || !report) {
    return (
      <main className="max-w-2xl mx-auto px-6 py-32 text-center space-y-6">
        <p className="font-display-italic text-3xl text-danger">
          {error ?? 'Rapor henüz yok.'}
        </p>
        <button onClick={generate} className="btn-primary">
          Tekrar dene
        </button>
      </main>
    );
  }

  return (
    <main className="max-w-2xl mx-auto px-6 md:px-10 py-10 md:py-16">
      <a href="/" className="btn-quiet text-xs">← Vakalar</a>

      <header className="mt-12 mb-16">
        <p className="label-caps mb-4">Süpervizör raporu</p>
        <h1 className="font-display text-5xl md:text-6xl leading-[0.98]">
          <em className="font-display-italic">{props.caseTitle}</em>
        </h1>
        <p className="mt-6 text-sm text-muted font-mono">
          {new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </header>

      <hr className="rule mb-16" />

      {props.formulation && (
        <section className="mb-16 surface-deep px-6 py-6">
          <p className="label-caps mb-4">Senin formülasyonun</p>
          <div className="space-y-5">
            {props.formulation.presenting && (
              <FormulationField label="Sunulan sorun" text={props.formulation.presenting} />
            )}
            {props.formulation.hypothesis && (
              <FormulationField label="Hipotez" text={props.formulation.hypothesis} />
            )}
            {props.formulation.patterns && (
              <FormulationField label="Örüntüler" text={props.formulation.patterns} />
            )}
            {props.formulation.next_session && (
              <FormulationField
                label="Sonraki seans planı"
                text={props.formulation.next_session}
              />
            )}
          </div>
          <p className="text-xs text-muted italic mt-6">
            Aşağıdaki süpervizör değerlendirmesini okurken kendi formülasyonunla karşılaştır:
            nerede buluştun, nerede ayrıldın?
          </p>
        </section>
      )}

      <section className="mb-16">
        <p className="label-caps mb-4">
          {props.formulation ? 'Süpervizör özeti' : 'Özet'}
        </p>
        <p className="text-xl md:text-2xl leading-relaxed font-display-italic text-ink">
          {report.summary}
        </p>
      </section>

      {report.formulation_comparison && props.formulation && (
        <section className="mb-16">
          <p className="label-caps mb-6">Formülasyon karşılaştırması</p>

          {report.formulation_comparison.verdict && (
            <p className="font-display-italic text-2xl leading-snug mb-8 text-ink">
              “{report.formulation_comparison.verdict}”
            </p>
          )}

          <div className="grid md:grid-cols-3 gap-8">
            {report.formulation_comparison.aligned.length > 0 && (
              <div>
                <p className="label-caps mb-3 text-success">Buluştuğunuz</p>
                <ul className="space-y-3">
                  {report.formulation_comparison.aligned.map((s, i) => (
                    <li
                      key={i}
                      className="text-sm leading-relaxed border-l-2 border-success pl-3"
                    >
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {report.formulation_comparison.student_caught.length > 0 && (
              <div>
                <p className="label-caps mb-3" style={{ color: 'var(--color-gilt)' }}>
                  Senin yakaladığın
                </p>
                <ul className="space-y-3">
                  {report.formulation_comparison.student_caught.map((s, i) => (
                    <li
                      key={i}
                      className="text-sm leading-relaxed border-l-2 pl-3"
                      style={{ borderColor: 'var(--color-gilt)' }}
                    >
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {report.formulation_comparison.supervisor_added.length > 0 && (
              <div>
                <p className="label-caps mb-3 text-accent">Süpervizörün eklediği</p>
                <ul className="space-y-3">
                  {report.formulation_comparison.supervisor_added.map((s, i) => (
                    <li
                      key={i}
                      className="text-sm leading-relaxed border-l-2 border-accent pl-3"
                    >
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </section>
      )}

      <div className="ornament mb-16" aria-hidden></div>

      <div className="grid md:grid-cols-2 gap-12 mb-16">
        <section>
          <p className="label-caps mb-4 text-success">I · Güçlü yanlar</p>
          <ul className="space-y-4">
            {report.strengths.map((s, i) => (
              <li key={i} className="text-[15px] leading-relaxed border-l-2 border-success pl-4">
                {s}
              </li>
            ))}
          </ul>
        </section>
        <section>
          <p className="label-caps mb-4 text-warn">II · Geliştirilebilir</p>
          <ul className="space-y-4">
            {report.improvements.map((s, i) => (
              <li key={i} className="text-[15px] leading-relaxed border-l-2 border-warn pl-4">
                {s}
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="mb-16">
        <p className="label-caps mb-4 text-accent">III · Kaçırılan işaretler</p>
        <ul className="space-y-4">
          {report.missed_signals.map((s, i) => (
            <li key={i} className="text-[15px] leading-relaxed border-l-2 border-accent pl-4">
              {s}
            </li>
          ))}
        </ul>
      </section>

      <hr className="rule-soft mb-16" />

      <section className="mb-16">
        <MicroskillsBreakdown skills={report.microskills} />
      </section>

      <hr className="rule-soft mb-16" />

      <section className="mb-20">
        <p className="label-caps mb-4">Sonraki adımlar</p>
        <p className="text-2xl md:text-3xl leading-snug font-display-italic">
          {report.next_steps}
        </p>
      </section>

      <hr className="rule-soft mb-12" />

      <details
        open={showTranscript}
        onToggle={(e) => setShowTranscript((e.target as HTMLDetailsElement).open)}
        className="mb-16"
      >
        <summary className="cursor-pointer label-caps hover:text-ink transition-colors">
          ▸ Transkript — yanıtlara geri bildirim
        </summary>
        <div className="mt-8 space-y-8">
          {props.messages.map((m) => (
            <div key={m.id}>
              <span
                className={`speaker-label ${m.role === 'student' ? 'speaker-label--student' : ''}`}
              >
                {m.role === 'student' ? '— Sen, terapist' : '— Danışan'}
              </span>
              <div className={m.role === 'client' ? 'bubble-client' : 'bubble-student'}>
                {m.role === 'client' ? <RichText text={m.content} /> : m.content}
              </div>
              {m.role === 'client' && (
                <div className="mt-2">
                  <MessageFeedback messageId={m.id} initial={m.feedback ?? null} />
                </div>
              )}
            </div>
          ))}
        </div>
      </details>

      <p className="text-xs text-muted italic mb-10">{REPORT_FOOTER}</p>

      {!props.formulation && (
        <div className="surface-deep px-5 py-4 mb-10 text-sm leading-relaxed">
          Bu seans için kendi formülasyonunu yazmadın.{' '}
          <a
            href={`/seans/${props.sessionId}/formulasyon`}
            className="underline underline-offset-2 hover:text-accent"
          >
            Şimdi yazabilirsin →
          </a>
        </div>
      )}

      <div className="flex items-center gap-4 flex-wrap">
        <a href={`/seans/start?case=${props.caseId}`} className="btn-primary">
          Bu vakayı tekrar dene →
        </a>
        <a href="/" className="btn-outline">
          Başka vaka
        </a>
        <a href="/gecmis" className="btn-quiet">
          Tüm raporlar
        </a>
      </div>
    </main>
  );
}
