import { createClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import { ReportView } from '@/components/report/ReportView';
import { loadFeedbackByMessageId } from '@/lib/message-feedback';
import type { Json } from '@/lib/types';
import type { Microskills, MicroskillEntry } from '@/lib/openai/supervisor-prompt';

type SessionWithCase = {
  id: string;
  status: 'in_progress' | 'completed' | 'abandoned';
  user_id: string;
  case: { id: string; title: string } | null;
};

type ReportRow = {
  summary: string;
  strengths: Json;
  improvements: Json;
  missed_signals: Json;
  next_steps: string;
  microskills: Json;
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
    .select('id, status, user_id, case:cases(id, title)')
    .eq('id', sessionId)
    .single();
  const session = data as unknown as SessionWithCase | null;
  if (!session || session.user_id !== user.id) notFound();

  const { data: rawReport } = await sb
    .from('reports')
    .select('summary, strengths, improvements, missed_signals, next_steps, microskills')
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
    <ReportView
      sessionId={sessionId}
      caseId={session.case?.id ?? ''}
      caseTitle={session.case?.title ?? ''}
      report={
        report
          ? {
              summary: report.summary,
              strengths: toStringList(report.strengths),
              improvements: toStringList(report.improvements),
              missed_signals: toStringList(report.missed_signals),
              next_steps: report.next_steps,
              microskills: parseMicroskills(report.microskills),
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
    />
  );
}
