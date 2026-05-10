/**
 * AI'nın varsayılan iyi-anlatıcı modundan ne kadar uzaklaştığını kontrol et.
 * Düşük içgörülü somatizer vakasıyla; "iç görü", "duygu", "bağlantı" tipi
 * kelimeler erken ortaya çıkıyor mu, profil söylemine uyuyor mu?
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

const TURNS = [
  'Hoş geldin. Bana biraz neyle geldiğinden bahseder misin?',
  'Bunlar ne zamandan beri böyle?',
  'Hayatında bir şeyler değişti mi bu dönemde?',
  'Eşin vefat etmeden önce nasıl bir hayat yaşıyordun?',
  'Eşin için söylemeyi hiç yapamadığın bir şey var mıydı?',
];

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
  const c = await pickCase('%ağrı şikayeti%');
  console.log(`\n## ${c.title}\n`);
  const sessionId = await startSession(cookie, c.id);
  for (const q of TURNS) {
    console.log(`**T:** ${q}`);
    const { reply } = await send(cookie, sessionId, q);
    console.log(`\n**D:** ${reply}\n`);
  }
}

main().catch((e) => { console.error('FATAL:', e); process.exit(1); });
