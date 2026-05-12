import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id: seriesId } = await context.params;
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const presenting = typeof body.presenting === 'string' ? body.presenting.trim() : '';
  const hypothesis = typeof body.hypothesis === 'string' ? body.hypothesis.trim() : '';
  const patterns = typeof body.patterns === 'string' ? body.patterns.trim() : '';
  const next_session =
    typeof body.next_session === 'string' ? body.next_session.trim() : '';

  if (!presenting && !hypothesis && !patterns && !next_session) {
    return NextResponse.json({ error: 'empty' }, { status: 400 });
  }

  const { data: series } = await sb
    .from('case_series')
    .select('id, user_id')
    .eq('id', seriesId)
    .maybeSingle();
  if (!series || series.user_id !== user.id) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  const formulation = {
    presenting: presenting || undefined,
    hypothesis: hypothesis || undefined,
    patterns: patterns || undefined,
    next_session: next_session || undefined,
    written_at: new Date().toISOString(),
  };

  const { error } = await sb
    .from('case_series')
    .update({ formulation })
    .eq('id', seriesId);
  if (error) return NextResponse.json({ error: 'save_failed' }, { status: 500 });

  return NextResponse.json({ ok: true });
}
