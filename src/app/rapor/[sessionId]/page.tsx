import { createClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import { ReportView } from '@/components/report/ReportView';
import { loadFeedbackByMessageId } from '@/lib/message-feedback';
import type { Json } from '@/lib/types';

type SessionWithCase = {
  id: string;
  status: 'in_progress' | 'completed' | 'abandoned';
  user_id: string;
  case: { title: string } | null;
};

type ReportRow = {
  summary: string;
  strengths: Json;
  improvements: Json;
  missed_signals: Json;
  next_steps: string;
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
    .select('id, status, user_id, case:cases(title)')
    .eq('id', sessionId)
    .single();
  const session = data as unknown as SessionWithCase | null;
  if (!session || session.user_id !== user.id) notFound();

  const { data: rawReport } = await sb
    .from('reports')
    .select('summary, strengths, improvements, missed_signals, next_steps')
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
      caseTitle={session.case?.title ?? ''}
      report={
        report
          ? {
              summary: report.summary,
              strengths: toStringList(report.strengths),
              improvements: toStringList(report.improvements),
              missed_signals: toStringList(report.missed_signals),
              next_steps: report.next_steps,
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
