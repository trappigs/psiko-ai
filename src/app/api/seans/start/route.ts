import { createClient } from '@/lib/supabase/server';
import { startSession } from '@/lib/session-actions';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const caseId = body.case_id;
  if (!caseId) return NextResponse.json({ error: 'case_id_required' }, { status: 400 });
  try {
    const r = await startSession(user.id, caseId);
    return NextResponse.json(r);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'internal';
    if (msg.startsWith('limit:')) {
      return NextResponse.json({ error: msg }, { status: 429 });
    }
    return NextResponse.json({ error: 'internal' }, { status: 500 });
  }
}
