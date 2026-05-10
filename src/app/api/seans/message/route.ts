import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { buildClientSystemPrompt, type CaseProfile } from '@/lib/openai/client-prompt';
import { getOpenAI, isMockMode, MODEL } from '@/lib/openai/client';
import { mockClientStream } from '@/lib/openai/mock';
import { isExpired } from '@/lib/session';
import { defaultLimits, isOverDailyLimit } from '@/lib/usage';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

type SessionRow = {
  id: string;
  user_id: string;
  status: 'in_progress' | 'completed' | 'abandoned';
  started_at: string;
  case: CaseProfile | null;
};

export async function POST(request: Request) {
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const sessionId: string | undefined = body.session_id;
  const content: string | undefined = body.content;
  if (!sessionId || !content) {
    return NextResponse.json({ error: 'invalid_input' }, { status: 400 });
  }

  const svc = createServiceClient();

  const { data: sessionData } = await svc
    .from('sessions')
    .select(
      'id, user_id, status, started_at, case:cases(presenting, background, personality, speech_style, goals_hidden)'
    )
    .eq('id', sessionId)
    .single();
  const session = sessionData as unknown as SessionRow | null;
  if (!session || session.user_id !== user.id) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  if (session.status !== 'in_progress') {
    return NextResponse.json({ error: 'session_not_active' }, { status: 409 });
  }
  if (isExpired(new Date(session.started_at))) {
    return NextResponse.json({ error: 'session_expired' }, { status: 410 });
  }

  const today = new Date().toISOString().split('T')[0];
  const { data: usage } = await svc
    .from('usage_daily')
    .select('session_count, token_count')
    .eq('user_id', user.id)
    .eq('day', today)
    .maybeSingle();
  if (isOverDailyLimit(usage, defaultLimits())) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
  }

  await svc.from('messages').insert({
    session_id: sessionId,
    role: 'student',
    content,
  });

  const { data: prevMsgs } = await svc
    .from('messages')
    .select('role, content')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true });

  if (!session.case) {
    return NextResponse.json({ error: 'case_missing' }, { status: 500 });
  }
  const systemPrompt = buildClientSystemPrompt(session.case);

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      let fullText = '';
      try {
        if (isMockMode()) {
          for await (const ch of mockClientStream(content)) {
            fullText += ch;
            controller.enqueue(encoder.encode(ch));
          }
        } else {
          const openai = getOpenAI();
          const completion = await openai.chat.completions.create({
            model: MODEL,
            stream: true,
            messages: [
              { role: 'system', content: systemPrompt },
              ...((prevMsgs ?? []) as { role: string; content: string }[]).map((m) => ({
                role: m.role === 'student' ? ('user' as const) : ('assistant' as const),
                content: m.content,
              })),
            ],
          });
          for await (const part of completion) {
            const delta = part.choices[0]?.delta?.content ?? '';
            if (delta) {
              fullText += delta;
              controller.enqueue(encoder.encode(delta));
            }
          }
        }

        const tokens = Math.ceil(fullText.length / 4) + Math.ceil(content.length / 4);
        const { data: inserted } = await svc
          .from('messages')
          .insert({
            session_id: sessionId,
            role: 'client',
            content: fullText,
            token_count: tokens,
          })
          .select('id')
          .single();
        await svc.from('usage_daily').upsert(
          {
            user_id: user.id,
            day: today,
            session_count: usage?.session_count ?? 1,
            token_count: (usage?.token_count ?? 0) + tokens,
          },
          { onConflict: 'user_id,day' }
        );
        if (inserted?.id) {
          controller.enqueue(encoder.encode(`\n\n__MSG_ID__:${inserted.id}__`));
        }
      } catch (e) {
        controller.error(e);
        return;
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' },
  });
}
