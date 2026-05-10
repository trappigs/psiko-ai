/**
 * Regresyon: Yüzeysel sorularla (greeting + "neden böyle" tekrar) gizli hedef
 * (çocukluk anısı / aile travması) AÇILMAMALI.
 */
import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const env = fs.readFileSync('.env.local', 'utf8').split(/\r?\n/).reduce((acc, l) => {
  const m = l.match(/^([^#=]+)=(.*)$/);
  if (m) acc[m[1].trim()] = m[2].trim();
  return acc;
}, {});

const BASE = process.env.BASE_URL ?? 'http://localhost:3030';
const PROJECT_REF = new URL(env.NEXT_PUBLIC_SUPABASE_URL).hostname.split('.')[0];
const COOKIE_NAME = `sb-${PROJECT_REF}-auth-token`;
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

const TURNS = ['hoş geldiniz', 'neden böyle sizce', 'hmm neden böyle'];

// Kullanıcının bildirdiği vaka: çocukluk şiddeti tanığı
// Bu erken sorulara ÇOCUKLUK / BABASI / ANNESI / TRAVMA içeriği SIZMAMALI.
const DEEP_LEAK = /(çocuk(luğum|ken)|baba.*(anne|öfke|sert|fiziksel|şiddet|vur)|annem.*(şiddet|baskı|sertl|sus)|14 yaş|şiddete tanık|ablamla|annemi koruyam)/i;

async function buildAuthCookie() {
  const { data } = await sb.auth.signInWithPassword({ email: 'test@psk.local', password: 'Test123456!' });
  return `${COOKIE_NAME}=base64-${Buffer.from(JSON.stringify(data.session)).toString('base64')}`;
}

async function pickCase(titleLike) {
  const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  const { data } = await admin.from('cases').select('id, title').ilike('title', titleLike).limit(1).single();
  return data;
}

async function startSession(cookie, caseId) {
  const r = await fetch(`${BASE}/api/seans/start`, {
    method: 'POST', headers: { 'content-type': 'application/json', cookie },
    body: JSON.stringify({ case_id: caseId }),
  });
  if (!r.ok) throw new Error(`start ${r.status} ${await r.text()}`);
  return (await r.json()).session_id;
}

async function send(cookie, sessionId, content) {
  const r = await fetch(`${BASE}/api/seans/message`, {
    method: 'POST', headers: { 'content-type': 'application/json', cookie },
    body: JSON.stringify({ session_id: sessionId, content }),
  });
  if (!r.ok) return { error: `${r.status} ${await r.text()}` };
  let acc = '';
  const dec = new TextDecoder();
  for await (const chunk of r.body) acc += dec.decode(chunk, { stream: true });
  return { reply: acc.replace(/\n\n__MSG_ID__:[0-9a-f-]+__\s*$/, '').trim() };
}

async function main() {
  const cookie = await buildAuthCookie();
  const c = await pickCase('%Çocukluk şiddeti%');
  console.log(`\nVaka: ${c.title}`);
  const sessionId = await startSession(cookie, c.id);

  let leaked = false;
  for (const q of TURNS) {
    console.log(`\nT: ${q}`);
    const { reply, error } = await send(cookie, sessionId, q);
    if (error) {
      console.log(`ERR: ${error}`);
      break;
    }
    console.log(`D: ${reply}`);
    const m = reply.match(DEEP_LEAK);
    if (m) {
      console.log(`❌ EARLY LEAK: '${m[0]}'`);
      leaked = true;
    } else {
      console.log('✅ KATMAN 1-2 (yüzey) korundu');
    }
  }
  console.log(leaked ? '\n=== FAIL: erken ifşa ===' : '\n=== PASS: katman korundu ===');
}

main().catch((e) => { console.error('FATAL:', e); process.exit(1); });
