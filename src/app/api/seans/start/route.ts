import { createClient } from '@/lib/supabase/server';
import { startSession, type StartSessionInput } from '@/lib/session-actions';
import { NextResponse } from 'next/server';

function parseBody(body: unknown): StartSessionInput | { error: string } {
  if (!body || typeof body !== 'object') return { error: 'bad_body' };
  const b = body as Record<string, unknown>;

  if (typeof b.case_id === 'string' && b.case_id.length > 0) {
    return { mode: 'curated', caseId: b.case_id };
  }

  if (b.mode === 'free') {
    const d = b.difficulty;
    if (d !== 'easy' && d !== 'medium' && d !== 'hard') return { error: 'bad_difficulty' };
    const hint = typeof b.themeHint === 'string' ? b.themeHint.trim().slice(0, 120) : undefined;
    return { mode: 'free', difficulty: d, themeHint: hint && hint.length > 0 ? hint : undefined };
  }

  return { error: 'bad_body' };
}

export async function POST(request: Request) {
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const parsed = parseBody(body);
  if ('error' in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });

  try {
    const r = await startSession(user.id, parsed);
    return NextResponse.json(r);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'internal';
    if (msg.startsWith('limit:')) return NextResponse.json({ error: msg }, { status: 429 });
    if (msg.startsWith('generation_failed')) {
      return NextResponse.json({ error: 'generation_failed' }, { status: 502 });
    }
    return NextResponse.json({ error: 'internal' }, { status: 500 });
  }
}
