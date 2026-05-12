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
  series_id: string;
  time_gap_label: string | null;
  case: CaseProfile | null;
};

type SummaryShape = {
  headline: string;
  key_events: string[];
  promises: string[];
  hypothesis_update: string;
};

type LivingFormulation = {
  presenting?: string;
  hypothesis?: string;
  patterns?: string;
  next_session?: string;
};

const FULL_TRANSCRIPT_COUNT = 2;

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
      'id, user_id, status, started_at, series_id, time_gap_label, case:cases(presenting, background, personality, speech_style, goals_hidden, insight_level, defense_style, register)'
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

  const { data: seriesSessions } = await svc
    .from('sessions')
    .select('id, status, started_at, summary')
    .eq('series_id', session.series_id)
    .order('started_at', { ascending: true });

  const completedOthers = (seriesSessions ?? []).filter(
    (s) => s.id !== sessionId && s.status === 'completed'
  );
  const fullSessions = completedOthers.slice(-FULL_TRANSCRIPT_COUNT);
  const olderSessions = completedOthers.slice(0, -FULL_TRANSCRIPT_COUNT);

  let fullHistory: Array<{ role: string; content: string }> = [];
  if (fullSessions.length > 0) {
    const { data: rows } = await svc
      .from('messages')
      .select('role, content, created_at, session_id')
      .in('session_id', fullSessions.map((s) => s.id))
      .order('created_at', { ascending: true });
    fullHistory = (rows ?? []).map((m) => ({ role: m.role, content: m.content }));
  }

  const summaries: SummaryShape[] = olderSessions
    .map((s) => s.summary as SummaryShape | null)
    .filter(
      (s): s is SummaryShape =>
        !!s && typeof s === 'object' && typeof s.headline === 'string'
    );

  const { data: seriesRow } = await svc
    .from('case_series')
    .select('formulation')
    .eq('id', session.series_id)
    .maybeSingle();
  const livingFormulation = (seriesRow?.formulation as LivingFormulation | null) ?? null;

  const { data: currentMsgs } = await svc
    .from('messages')
    .select('role, content')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true });

  const prevMsgs = [...fullHistory, ...(currentMsgs ?? [])];

  if (!session.case) {
    return NextResponse.json({ error: 'case_missing' }, { status: 500 });
  }
  let systemPrompt = buildClientSystemPrompt(session.case);

  if (livingFormulation) {
    const parts = [
      livingFormulation.presenting && `Sunulan: ${livingFormulation.presenting}`,
      livingFormulation.hypothesis && `Hipotez: ${livingFormulation.hypothesis}`,
      livingFormulation.patterns && `Örüntü: ${livingFormulation.patterns}`,
      livingFormulation.next_session && `Sonraki seans hedefi: ${livingFormulation.next_session}`,
    ].filter(Boolean);
    if (parts.length > 0) {
      systemPrompt += `\n\nTerapistin bu vakaya dair mevcut formülasyonu (bağlam için, kendi rolünü bozma):\n${parts.join('\n')}`;
    }
  }

  if (summaries.length > 0) {
    const block = summaries
      .map(
        (s, i) =>
          `Seans ${i + 1}: ${s.headline}\n  Olaylar: ${s.key_events.join('; ')}\n  Sözler: ${s.promises.join('; ') || '—'}\n  Hipotez: ${s.hypothesis_update}`
      )
      .join('\n\n');
    systemPrompt += `\n\nGeçmiş seans özetleri (eskiden yeniye):\n${block}`;
  }

  if (fullSessions.length > 0) {
    systemPrompt += `\n\nSon ${fullSessions.length} seansın tam transcript'i aşağıdaki user/assistant mesajlarında; ardından bugünkü seans devam ediyor.`;
  }

  if (session.time_gap_label) {
    systemPrompt += `\n\nSon seansla bu seans arasında "${session.time_gap_label}" geçti. Açılışını ve referanslarını buna göre kur.`;
  }

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
