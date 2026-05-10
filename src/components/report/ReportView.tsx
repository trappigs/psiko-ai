'use client';
import { useEffect, useState } from 'react';
import { REPORT_FOOTER } from '@/lib/disclaimer';
import { MessageFeedback, type FeedbackState } from '@/components/chat/MessageFeedback';

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
      <div className="max-w-3xl mx-auto p-6 text-center">
        <p>Süpervizör seansını inceliyor…</p>
      </div>
    );
  }
  if (error || !report) {
    return (
      <div className="max-w-3xl mx-auto p-6 text-center space-y-3">
        <p className="text-red-700">{error ?? 'Rapor yok.'}</p>
        <button onClick={generate} className="bg-black text-white px-4 py-2 rounded">
          Tekrar dene
        </button>
      </div>
    );
  }

  return (
    <main className="max-w-3xl mx-auto p-6 space-y-6">
      <header>
        <a href="/" className="text-sm underline">
          ← Vakalara dön
        </a>
        <h1 className="text-2xl font-bold mt-2">{props.caseTitle}</h1>
        <p className="text-sm text-gray-500">Seans Raporu</p>
      </header>

      <section>
        <h2 className="font-semibold mb-2">Özet</h2>
        <p>{report.summary}</p>
      </section>

      <div className="grid md:grid-cols-2 gap-6">
        <section>
          <h3 className="font-semibold mb-2">✅ Güçlü Yanların</h3>
          <ul className="list-disc pl-5 space-y-1">
            {report.strengths.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </section>
        <section>
          <h3 className="font-semibold mb-2">⚠️ Geliştirilebilir Alanlar</h3>
          <ul className="list-disc pl-5 space-y-1">
            {report.improvements.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </section>
      </div>

      <section>
        <h3 className="font-semibold mb-2">🔍 Kaçırılan İşaretler</h3>
        <ul className="list-disc pl-5 space-y-1">
          {report.missed_signals.map((s, i) => (
            <li key={i}>{s}</li>
          ))}
        </ul>
      </section>

      <section>
        <h3 className="font-semibold mb-2">📋 Sonraki Adımlar</h3>
        <p>{report.next_steps}</p>
      </section>

      <details
        open={showTranscript}
        onToggle={(e) => setShowTranscript((e.target as HTMLDetailsElement).open)}
      >
        <summary className="cursor-pointer font-semibold">
          Transkripti gör — danışan yanıtlarına geri bildirim verebilirsin
        </summary>
        <div className="mt-3 space-y-3">
          {props.messages.map((m) => (
            <div key={m.id}>
              <p className={m.role === 'student' ? 'pl-4' : ''}>
                <strong>{m.role === 'student' ? 'S' : 'D'}:</strong> {m.content}
              </p>
              {m.role === 'client' && (
                <MessageFeedback messageId={m.id} initial={m.feedback ?? null} />
              )}
            </div>
          ))}
        </div>
      </details>

      <p className="text-xs text-gray-500 italic">{REPORT_FOOTER}</p>

      <a href="/" className="inline-block bg-black text-white px-4 py-2 rounded">
        Yeni seans başlat
      </a>
    </main>
  );
}
