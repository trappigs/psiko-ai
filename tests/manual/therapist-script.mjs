/**
 * Senaryo: belirli bir vakada terapist gibi 7-8 soru sor, AI yanıtlarını gözle.
 * Vaka: "Çocukluk şiddeti tanığı — 38 yaş, erkek" — duygu küntlüğü + gizli baba-anne-koruyamadım hedefi.
 *
 * Hedef: gerçekçilik, beden dili, direnç-açılma dengesi, gizli hedefe doğru ilerleme.
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

const CASE_TITLE_LIKE = '%Çocukluk şiddeti%';

const TURNS = [
  'Hoş geldin. Bana biraz nasıl bir nedenle geldiğinden bahseder misin?',
  'Eşin terapiyi önerdi dedin — onun gözünden ne görünüyor sana?',
  'Soğuk kalmak demek senin için ne anlama geliyor?',
  '"Sevdiğimi söyleyemiyorum" derken son ne zaman böyle bir an oldu, eşinle ya da çocuklarınla?',
  'Çocukken evde duyguları nasıl konuşurdunuz? Annenle, babanla?',
  'Babanı hatırlarken aklına gelen bir an var mı?',
  'Ablanı korumak gibi bir his hatırlıyor musun, küçükken?',
  'Bu odada konuştuklarımız bittikten sonra eve dönerken ne hissedeceğini düşünüyorsun?',
];

async function buildAuthCookie() {
  const { data } = await sb.auth.signInWithPassword({ email: 'test@psk.local', password: 'Test123456!' });
  return `${COOKIE_NAME}=base64-${Buffer.from(JSON.stringify(data.session)).toString('base64')}`;
}

async function pickCase() {
  const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  const { data } = await admin.from('cases').select('id, title').ilike('title', CASE_TITLE_LIKE).limit(1).single();
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

async function endSession(cookie, sessionId) {
  await fetch(`${BASE}/api/seans/end`, {
    method: 'POST', headers: { 'content-type': 'application/json', cookie },
    body: JSON.stringify({ session_id: sessionId }),
  });
}

async function getReport(cookie, sessionId) {
  await fetch(`${BASE}/api/rapor/${sessionId}`, { method: 'POST', headers: { cookie } });
  const r = await fetch(`${BASE}/api/rapor/${sessionId}`, { headers: { cookie } });
  return (await r.json()).report;
}

async function main() {
  const cookie = await buildAuthCookie();
  const c = await pickCase();
  console.log(`\n## Vaka: ${c.title}`);
  const sessionId = await startSession(cookie, c.id);

  for (const q of TURNS) {
    console.log(`\n**Terapist:** ${q}`);
    const { reply, error } = await send(cookie, sessionId, q);
    if (error) {
      console.log(`ERR: ${error}`);
      break;
    }
    console.log(`\n**Danışan:** ${reply}`);
  }

  await endSession(cookie, sessionId);
  console.log('\n---\n## Süpervizör raporu');
  const report = await getReport(cookie, sessionId);
  if (!report) {
    console.log('rapor üretilemedi');
    return;
  }
  console.log(`\n**Özet:** ${report.summary}`);
  console.log('\n**Güçlü Yanlar:**');
  for (const s of report.strengths) console.log(`- ${s}`);
  console.log('\n**Geliştirilebilir:**');
  for (const s of report.improvements) console.log(`- ${s}`);
  console.log('\n**Kaçırılan:**');
  for (const s of report.missed_signals) console.log(`- ${s}`);
  console.log(`\n**Sonraki adım:** ${report.next_steps}`);
}

main().catch((e) => { console.error('FATAL:', e); process.exit(1); });
