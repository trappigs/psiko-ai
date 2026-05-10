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
  const sessionId: string | undefined = body.session_id;
  if (!sessionId) return NextResponse.json({ error: 'invalid_input' }, { status: 400 });

  const presenting = typeof body.presenting === 'string' ? body.presenting.trim() : '';
  const hypothesis = typeof body.hypothesis === 'string' ? body.hypothesis.trim() : '';
  const patterns = typeof body.patterns === 'string' ? body.patterns.trim() : '';
  const next_session =
    typeof body.next_session === 'string' ? body.next_session.trim() : '';

  if (!presenting && !hypothesis && !patterns && !next_session) {
    return NextResponse.json({ error: 'empty' }, { status: 400 });
  }

  const svc = createServiceClient();
  const { data: session } = await svc
    .from('sessions')
    .select('id, user_id')
    .eq('id', sessionId)
    .single();
  if (!session || session.user_id !== user.id) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  const formulation = {
    presenting: presenting || undefined,
    hypothesis: hypothesis || undefined,
    patterns: patterns || undefined,
    next_session: next_session || undefined,
    written_at: new Date().toISOString(),
  };

  const { error } = await svc
    .from('sessions')
    .update({ formulation })
    .eq('id', sessionId);
  if (error) return NextResponse.json({ error: 'save_failed' }, { status: 500 });

  return NextResponse.json({ ok: true });
}
