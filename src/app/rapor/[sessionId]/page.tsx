import { createClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import { ReportView } from '@/components/report/ReportView';
import { AppShell } from '@/components/shell/AppShell';
import { loadFeedbackByMessageId } from '@/lib/message-feedback';
import { parseFormulation } from '@/lib/formulation';
import type { Json } from '@/lib/types';
import type {
  Microskills,
  MicroskillEntry,
  FormulationComparison,
} from '@/lib/openai/supervisor-prompt';

type SessionWithCase = {
  id: string;
  status: 'in_progress' | 'completed' | 'abandoned';
  user_id: string;
  formulation: unknown;
  case: {
    id: string;
    title: string;
    source: 'curated' | 'ai_generated';
    presenting: string;
    background: string;
    personality: string;
    speech_style: string;
    goals_hidden: string;
    insight_level: string | null;
    defense_style: string | null;
    register: string | null;
    diagnosis_hint: string | null;
  } | null;
};

type ReportRow = {
  summary: string;
  strengths: Json;
  improvements: Json;
  missed_signals: Json;
  next_steps: string;
  microskills: Json;
  formulation_comparison: Json;
};

type MessageRow = {
  id: string;
  role: 'student' | 'client';
  content: string;
  created_at: string;
};

function toStringList(j: Json): string[] {
  return Array.isArray(j) ? j.map((v) => String(v)) : [];
}

function emptySkill(): MicroskillEntry {
  return { count: 0, examples: [] };
}

function parseSkill(j: unknown): MicroskillEntry {
  if (!j || typeof j !== 'object') return emptySkill();
  const r = j as Record<string, unknown>;
  return {
    count: typeof r.count === 'number' ? Math.max(0, Math.floor(r.count)) : 0,
    examples: Array.isArray(r.examples) ? r.examples.map(String).slice(0, 6) : [],
  };
}

function parseFormulationComparison(j: Json): FormulationComparison | null {
  if (!j || typeof j !== 'object' || Array.isArray(j)) return null;
  const r = j as Record<string, unknown>;
  const aligned = Array.isArray(r.aligned) ? (r.aligned as unknown[]).map(String) : [];
  const student = Array.isArray(r.student_caught)
    ? (r.student_caught as unknown[]).map(String)
    : [];
  const supervisor = Array.isArray(r.supervisor_added)
    ? (r.supervisor_added as unknown[]).map(String)
    : [];
  const verdict = typeof r.verdict === 'string' ? r.verdict : '';
  if (
    aligned.length === 0 &&
    student.length === 0 &&
    supervisor.length === 0 &&
    !verdict.trim()
  )
    return null;
  return { aligned, student_caught: student, supervisor_added: supervisor, verdict };
}

function parseMicroskills(j: Json): Microskills {
  const o =
    j && typeof j === 'object' && !Array.isArray(j) ? (j as Record<string, unknown>) : {};
  return {
    open_question: parseSkill(o.open_question),
    closed_question: parseSkill(o.closed_question),
    reflection: parseSkill(o.reflection),
    empathy: parseSkill(o.empathy),
    summary: parseSkill(o.summary),
    advice_or_interpretation: parseSkill(o.advice_or_interpretation),
  };
}

export default async function Page({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) redirect('/login');

  const { data } = await sb
    .from('sessions')
    .select('id, status, user_id, formulation, case:cases(id, title, source, presenting, background, personality, speech_style, goals_hidden, insight_level, defense_style, register, diagnosis_hint)')
    .eq('id', sessionId)
    .single();
  const session = data as unknown as SessionWithCase | null;
  if (!session || session.user_id !== user.id) notFound();
  const formulation = parseFormulation(session.formulation);

  const { data: rawReport } = await sb
    .from('reports')
    .select(
      'summary, strengths, improvements, missed_signals, next_steps, microskills, formulation_comparison'
    )
    .eq('session_id', sessionId)
    .maybeSingle();
  const report = rawReport as ReportRow | null;
  const { data: rawMessages } = await sb
    .from('messages')
    .select('id, role, content, created_at')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true });
  const messages = (rawMessages ?? []) as MessageRow[];
  const feedbackByMsgId = await loadFeedbackByMessageId(
    sb,
    messages.filter((m) => m.role === 'client').map((m) => m.id)
  );

  return (
    <AppShell userEmail={user.email}>
      <ReportView
        sessionId={sessionId}
        caseId={session.case?.id ?? ''}
        caseTitle={session.case?.title ?? ''}
        formulation={formulation}
        report={
          report
            ? {
                summary: report.summary,
                strengths: toStringList(report.strengths),
                improvements: toStringList(report.improvements),
                missed_signals: toStringList(report.missed_signals),
                next_steps: report.next_steps,
                microskills: parseMicroskills(report.microskills),
                formulation_comparison: parseFormulationComparison(
                  report.formulation_comparison
                ),
              }
            : null
        }
        messages={messages.map((m) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          created_at: m.created_at,
          feedback: m.role === 'client' ? feedbackByMsgId[m.id] ?? null : null,
        }))}
        hiddenDossier={
          session.case && session.case.source === 'ai_generated'
            ? {
                presenting: session.case.presenting,
                background: session.case.background,
                personality: session.case.personality,
                speech_style: session.case.speech_style,
                goals_hidden: session.case.goals_hidden,
                insight_level: session.case.insight_level,
                defense_style: session.case.defense_style,
                register: session.case.register,
                diagnosis_hint: session.case.diagnosis_hint,
              }
            : null
        }
      />
    </AppShell>
  );
}
