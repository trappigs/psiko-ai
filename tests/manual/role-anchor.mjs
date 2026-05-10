/**
 * Rol-anchor regresyonu testi: AI "hoş geldin" / "merhaba" gibi karşılama
 * sözünde terapist rolüne kaymıyor mu?
 */
import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const env = fs.readFileSync('.env.local', 'utf8').split(/\r?\n/).reduce((acc, l) => {
  const m = l.match(/^([^#=]+)=(.*)$/);
  if (m) acc[m[1].trim()] = m[2].trim();
  return acc;
}, {});

const BASE = process.env.BASE_URL ?? 'http://localhost:3001';
const PROJECT_REF = new URL(env.NEXT_PUBLIC_SUPABASE_URL).hostname.split('.')[0];
const COOKIE_NAME = `sb-${PROJECT_REF}-auth-token`;
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

const GREETINGS = [
  'hoş geldin',
  'merhaba',
  'buyrun, oturun',
  'iyi günler',
];

const ROLE_FLIP =
  /(size nasıl yardımcı|nasıl yardımcı olabilirim|nasıl hissediyorsunuz|nasıl hissettiğinizi|nelerden bahsetmek|neler konuşmak istersiniz|ne düşündüğünüzü.*paylaş|biraz daha açabilir misiniz|burada birlikte konuşabilir|yardımcı olmaya çalış|hakkınızda.*bilgi alabilir|burada olduğum için mutlu|esas burada sizinle)/i;

async function buildAuthCookie() {
  const { data } = await sb.auth.signInWithPassword({ email: 'test@psk.local', password: 'Test123456!' });
  return `${COOKIE_NAME}=base64-${Buffer.from(JSON.stringify(data.session)).toString('base64')}`;
}

async function pickCase(idx = 0) {
  const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  const { data } = await admin.from('cases').select('id, title').order('created_at').range(idx, idx);
  return data[0];
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
  // strip msg_id marker
  return { reply: acc.replace(/\n\n__MSG_ID__:[0-9a-f-]+__\s*$/, '').trim() };
}

async function main() {
  const cookie = await buildAuthCookie();
  let pass = 0;
  for (let i = 0; i < GREETINGS.length; i++) {
    const greet = GREETINGS[i];
    // her test için yeni vaka, yeni seans (cross-vaka kontrol)
    const c = await pickCase(i % 4);
    const sessionId = await startSession(cookie, c.id);
    const { reply, error } = await send(cookie, sessionId, greet);
    console.log(`\n[Vaka: ${c.title.slice(0, 40)}]`);
    console.log(`Q: ${greet}`);
    if (error) {
      console.log(`ERR: ${error}`);
      continue;
    }
    console.log(`A: ${reply}`);
    if (ROLE_FLIP.test(reply)) {
      console.log('❌ FAIL: terapist diline kaydı');
    } else {
      console.log('✅ PASS');
      pass++;
    }
  }
  console.log(`\n=== ${pass}/${GREETINGS.length} ===`);
}

main().catch((e) => { console.error('FATAL:', e); process.exit(1); });
