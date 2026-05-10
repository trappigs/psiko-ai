import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { FEEDBACK_TAG_BY_KEY } from '@/lib/feedback-tags';
import { NextResponse } from 'next/server';

type Body = {
  message_id?: string;
  rating?: 'good' | 'bad';
  tags?: string[];
  comment?: string | null;
};

export async function POST(request: Request) {
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const body: Body = await request.json().catch(() => ({}));
  if (!body.message_id || !body.rating) {
    return NextResponse.json({ error: 'invalid_input' }, { status: 400 });
  }
  if (body.rating !== 'good' && body.rating !== 'bad') {
    return NextResponse.json({ error: 'invalid_rating' }, { status: 400 });
  }
  const tags = (body.tags ?? []).filter((t) => FEEDBACK_TAG_BY_KEY[t]);
  const comment = body.comment?.trim() || null;

  const svc = createServiceClient();

  // ownership: kullanıcı sadece kendi seansındaki mesaja feedback verebilir
  const { data: msg } = await svc
    .from('messages')
    .select('id, role, session_id, sessions(user_id)')
    .eq('id', body.message_id)
    .single();
  const ownerId = (msg as unknown as { sessions: { user_id: string } | null } | null)?.sessions
    ?.user_id;
  if (!msg || ownerId !== user.id) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  if (msg.role !== 'client') {
    return NextResponse.json({ error: 'only_client_messages' }, { status: 400 });
  }

  const { error } = await svc.from('message_feedback').upsert(
    {
      user_id: user.id,
      message_id: body.message_id,
      rating: body.rating,
      tags,
      comment,
    },
    { onConflict: 'user_id,message_id' }
  );
  if (error) return NextResponse.json({ error: 'insert_failed' }, { status: 500 });

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const url = new URL(request.url);
  const messageId = url.searchParams.get('message_id');
  if (!messageId) return NextResponse.json({ error: 'invalid_input' }, { status: 400 });

  const svc = createServiceClient();
  await svc
    .from('message_feedback')
    .delete()
    .eq('user_id', user.id)
    .eq('message_id', messageId);
  return NextResponse.json({ ok: true });
}
