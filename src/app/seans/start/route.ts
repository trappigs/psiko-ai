import { createClient } from '@/lib/supabase/server';
import { startSession } from '@/lib/session-actions';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const caseId = url.searchParams.get('case');
  if (!caseId) return NextResponse.redirect(new URL('/', request.url));
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return NextResponse.redirect(new URL('/login', request.url));
  try {
    const { session_id } = await startSession(user.id, caseId);
    return NextResponse.redirect(new URL(`/seans/${session_id}`, request.url));
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'internal';
    if (msg.startsWith('limit:')) {
      return NextResponse.redirect(new URL('/?limit=1', request.url));
    }
    throw e;
  }
}
