'use client';
import { useEffect, useState } from 'react';
import { REPORT_FOOTER } from '@/lib/disclaimer';
import { MessageFeedback, type FeedbackState } from '@/components/chat/MessageFeedback';
import { RichText } from '@/components/chat/RichText';

type Report = {
  summary: string;
  strengths: string[];
  improvements: string[];
  missed_signals: string[];
  next_steps: string;
} | null;

type Msg = {
  id: string;
  role: 'student' | 'client';
  content: string;
  created_at: string;
  feedback?: FeedbackState;
};

export function ReportView(props: {
  sessionId: string;
  caseTitle: string;
  report: Report;
  messages: Msg[];
}) {
  const [report, setReport] = useState<Report>(props.report);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showTranscript, setShowTranscript] = useState(false);

  useEffect(() => {
    if (!report && !loading) generate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function generate() {
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/rapor/${props.sessionId}`, { method: 'POST' });
    if (!res.ok) {
      setError('Rapor üretilemedi.');
      setLoading(false);
      return;
    }
    const r = await fetch(`/api/rapor/${props.sessionId}`).then((r) => r.json());
    setReport(r.report);
    setLoading(false);
  }

  if (loading) {
    return (
      <main className="max-w-2xl mx-auto px-4 py-24 text-center">
        <p className="font-display-italic text-3xl text-muted">
          Süpervizör seansını inceliyor…
        </p>
        <div className="typing-dots inline-flex mt-4" aria-label="yükleniyor">
          <span></span>
          <span></span>
          <span></span>
        </div>
      </main>
    );
  }
  if (error || !report) {
    return (
      <main className="max-w-2xl mx-auto px-4 py-24 text-center space-y-4">
        <p className="font-display-italic text-2xl text-danger">{error ?? 'Rapor henüz yok.'}</p>
        <button onClick={generate} className="btn-primary">
          Tekrar dene
        </button>
      </main>
    );
  }

  return (
    <main className="max-w-2xl mx-auto px-4 py-10 md:py-14 space-y-10">
      <header>
        <a href="/" className="btn-quiet text-xs">
          ← Vakalar
        </a>
        <p className="label-caps mt-6 mb-2">Süpervizör raporu</p>
        <h1 className="font-display text-4xl md:text-5xl leading-tight">
          {props.caseTitle}
        </h1>
      </header>

      <hr className="rule" />

      <section>
        <p className="label-caps mb-3">Özet</p>
        <p className="text-lg leading-relaxed text-ink-soft">{report.summary}</p>
      </section>

      <hr className="rule" />

      <div className="grid md:grid-cols-2 gap-10">
        <section>
          <p className="label-caps mb-3 text-success">Güçlü yanlar</p>
          <ul className="space-y-2.5">
            {report.strengths.map((s, i) => (
              <li key={i} className="flex gap-3 text-sm leading-relaxed">
                <span className="font-mono text-success text-xs mt-1">+</span>
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </section>
        <section>
          <p className="label-caps mb-3 text-warn">Geliştirilebilir</p>
          <ul className="space-y-2.5">
            {report.improvements.map((s, i) => (
              <li key={i} className="flex gap-3 text-sm leading-relaxed">
                <span className="font-mono text-warn text-xs mt-1">→</span>
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section>
        <p className="label-caps mb-3 text-accent">Kaçırılan işaretler</p>
        <ul className="space-y-2.5">
          {report.missed_signals.map((s, i) => (
            <li key={i} className="flex gap-3 text-sm leading-relaxed">
              <span className="font-mono text-accent text-xs mt-1">✱</span>
              <span>{s}</span>
            </li>
          ))}
        </ul>
      </section>

      <hr className="rule" />

      <section>
        <p className="label-caps mb-3">Sonraki adımlar</p>
        <p className="font-display-italic text-xl leading-relaxed text-ink">
          {report.next_steps}
        </p>
      </section>

      <hr className="rule" />

      <details
        open={showTranscript}
        onToggle={(e) => setShowTranscript((e.target as HTMLDetailsElement).open)}
        className="surface-deep p-5"
      >
        <summary className="cursor-pointer label-caps">
          Transkript — danışan yanıtlarına geri bildirim ver
        </summary>
        <div className="mt-5 space-y-4">
          {props.messages.map((m) => (
            <div key={m.id} className="text-sm">
              <p className={m.role === 'student' ? 'pl-0' : ''}>
                <span className="label-caps mr-2 inline-block min-w-[60px]">
                  {m.role === 'student' ? 'Sen' : 'Danışan'}
                </span>
                {m.role === 'client' ? <RichText text={m.content} /> : m.content}
              </p>
              {m.role === 'client' && (
                <div className="mt-1.5 ml-[60px]">
                  <MessageFeedback messageId={m.id} initial={m.feedback ?? null} />
                </div>
              )}
            </div>
          ))}
        </div>
      </details>

      <p className="text-xs text-muted italic">{REPORT_FOOTER}</p>

      <a href="/" className="btn-primary">
        Yeni seans başlat →
      </a>
    </main>
  );
}
