import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const sessionId = body.session_id;
  if (!sessionId) return NextResponse.json({ error: 'invalid_input' }, { status: 400 });

  const svc = createServiceClient();
  const { data: session } = await svc
    .from('sessions')
    .select('id, user_id, status')
    .eq('id', sessionId)
    .single();
  if (!session || session.user_id !== user.id) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  if (session.status !== 'in_progress') {
    return NextResponse.json({ ok: true, already: true });
  }

  await svc
    .from('sessions')
    .update({ status: 'completed', ended_at: new Date().toISOString() })
    .eq('id', sessionId);

  return NextResponse.json({ ok: true });
}
