import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import {
  buildSupervisorPrompt,
  parseSupervisorReply,
  type CaseSummary,
  type ParsedReport,
} from '@/lib/openai/supervisor-prompt';
import { getOpenAI, isMockMode, MODEL } from '@/lib/openai/client';
import { mockSupervisorReport } from '@/lib/openai/mock';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

type SessionWithCase = {
  user_id: string;
  case: CaseSummary | null;
};

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { data: report } = await sb
    .from('reports')
    .select('*')
    .eq('session_id', sessionId)
    .maybeSingle();
  return NextResponse.json({ report });
}

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const svc = createServiceClient();
  const { data: existing } = await svc
    .from('reports')
    .select('id')
    .eq('session_id', sessionId)
    .maybeSingle();
  if (existing) return NextResponse.json({ ok: true, already: true });

  const { data: sessionData } = await svc
    .from('sessions')
    .select('user_id, case:cases(title, presenting, diagnosis_hint)')
    .eq('id', sessionId)
    .single();
  const session = sessionData as unknown as SessionWithCase | null;
  if (!session || session.user_id !== user.id) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  if (!session.case) {
    return NextResponse.json({ error: 'case_missing' }, { status: 500 });
  }

  const { data: msgs } = await svc
    .from('messages')
    .select('role, content')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true });

  const prompt = buildSupervisorPrompt(
    session.case,
    ((msgs ?? []) as { role: 'student' | 'client'; content: string }[]) ?? []
  );

  let parsed: ParsedReport | null = null;
  let modelVersion = MODEL;
  for (let attempt = 0; attempt < 2 && !parsed; attempt++) {
    if (isMockMode()) {
      parsed = mockSupervisorReport();
      modelVersion = 'mock';
      break;
    }
    const openai = getOpenAI();
    const r = await openai.chat.completions.create({
      model: MODEL,
      messages: [{ role: 'system', content: prompt }],
      response_format: { type: 'json_object' },
    });
    parsed = parseSupervisorReply(r.choices[0]?.message?.content ?? '');
  }
  if (!parsed) return NextResponse.json({ error: 'parse_failed' }, { status: 502 });

  const { error } = await svc.from('reports').insert({
    session_id: sessionId,
    summary: parsed.summary,
    strengths: parsed.strengths,
    improvements: parsed.improvements,
    missed_signals: parsed.missed_signals,
    next_steps: parsed.next_steps,
    microskills: parsed.microskills,
    model_version: modelVersion,
  });
  if (error) return NextResponse.json({ error: 'insert_failed' }, { status: 500 });

  return NextResponse.json({ ok: true });
}
