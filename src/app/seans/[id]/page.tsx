import { createClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import { ChatWindow } from '@/components/chat/ChatWindow';

type SessionRow = {
  id: string;
  status: 'in_progress' | 'completed' | 'abandoned';
  started_at: string;
  case: { id: string; title: string } | null;
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
    .select('id, status, started_at, case:cases(id, title)')
    .eq('id', id)
    .single();
  const session = data as unknown as SessionRow | null;
  if (!session) notFound();
  if (session.status === 'completed') redirect(`/rapor/${id}`);

  const { data: messages } = await sb
    .from('messages')
    .select('id, role, content, created_at')
    .eq('session_id', id)
    .order('created_at', { ascending: true });

  return (
    <ChatWindow
      sessionId={id}
      caseTitle={session.case?.title ?? ''}
      startedAt={session.started_at}
      initialMessages={(messages ?? []) as never}
    />
  );
}
