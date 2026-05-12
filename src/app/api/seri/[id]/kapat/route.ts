import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id: seriesId } = await context.params;
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { data: series } = await sb
    .from('case_series')
    .select('id, status')
    .eq('id', seriesId)
    .maybeSingle();
  if (!series) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  if (series.status === 'closed') {
    return NextResponse.json({ error: 'already_closed' }, { status: 409 });
  }

  const { data: active } = await sb
    .from('sessions')
    .select('id')
    .eq('series_id', seriesId)
    .eq('status', 'in_progress')
    .maybeSingle();
  if (active) {
    return NextResponse.json({ error: 'active_session_exists' }, { status: 409 });
  }

  const { error } = await sb
    .from('case_series')
    .update({ status: 'closed', closed_at: new Date().toISOString() })
    .eq('id', seriesId);
  if (error) return NextResponse.json({ error: 'internal' }, { status: 500 });

  return NextResponse.json({ ok: true });
}
