import { createClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import { ChatWindow } from '@/components/chat/ChatWindow';
import { loadFeedbackByMessageId } from '@/lib/message-feedback';
import type { Msg } from '@/components/chat/MessageList';
import type { CaseSheet } from '@/components/case/CaseBriefing';

type SessionRow = {
  id: string;
  status: 'in_progress' | 'completed' | 'abandoned';
  started_at: string;
  case: {
    id: string;
    title: string;
    presenting: string;
    diagnosis_hint: string | null;
    background: string;
    personality: string;
    speech_style: string;
    difficulty: 'easy' | 'medium' | 'hard';
    insight_level: string | null;
    defense_style: string | null;
    register: string | null;
  } | null;
};

type MessageRow = {
  id: string;
  role: 'student' | 'client';
  content: string;
  created_at: string;
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
    .select(
      'id, status, started_at, case:cases(id, title, presenting, diagnosis_hint, background, personality, speech_style, difficulty, insight_level, defense_style, register)'
    )
    .eq('id', id)
    .single();
  const session = data as unknown as SessionRow | null;
  if (!session || !session.case) notFound();
  if (session.status === 'completed') redirect(`/rapor/${id}`);

  const caseSheet: CaseSheet = {
    id: session.case.id,
    title: session.case.title,
    presenting: session.case.presenting,
    diagnosis_hint: session.case.diagnosis_hint,
    background: session.case.background,
    personality: session.case.personality,
    speech_style: session.case.speech_style,
    difficulty: session.case.difficulty,
    insight_level: session.case.insight_level,
    defense_style: session.case.defense_style,
    register: session.case.register,
  };

  const { data: messages } = await sb
    .from('messages')
    .select('id, role, content, created_at')
    .eq('session_id', id)
    .order('created_at', { ascending: true });
  const rows = (messages ?? []) as MessageRow[];

  const feedbackByMsgId = await loadFeedbackByMessageId(
    sb,
    rows.filter((m) => m.role === 'client').map((m) => m.id)
  );

  const initialMessages: Msg[] = rows.map((m) => ({
    id: m.id,
    role: m.role,
    content: m.content,
    created_at: m.created_at,
    persistedId: m.id,
    feedback: feedbackByMsgId[m.id] ?? null,
  }));

  return (
    <ChatWindow
      sessionId={id}
      caseSheet={caseSheet}
      startedAt={session.started_at}
      initialMessages={initialMessages}
    />
  );
}
