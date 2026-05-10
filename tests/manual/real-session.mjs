/**
 * Manuel uçtan uca test — gerçek OpenAI ile.
 * Çalıştırma: node tests/manual/real-session.mjs
 *
 * Adımlar:
 *   1. test@psk.local olarak giriş yap
 *   2. İlk vakaya seans başlat
 *   3. 4 öğrenci mesajı gönder, AI yanıtlarını oku
 *   4. Seansı bitir
 *   5. Raporu üret ve bas
 */
import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const env = fs
  .readFileSync('.env.local', 'utf8')
  .split(/\r?\n/)
  .reduce((acc, l) => {
    const m = l.match(/^([^#=]+)=(.*)$/);
    if (m) acc[m[1].trim()] = m[2].trim();
    return acc;
  }, {});

const BASE = process.env.BASE_URL ?? 'http://localhost:3030';
const PROJECT_REF = new URL(env.NEXT_PUBLIC_SUPABASE_URL).hostname.split('.')[0];
const COOKIE_NAME = `sb-${PROJECT_REF}-auth-token`;

const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

function log(label, value) {
  const v = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
  console.log(`\n=== ${label} ===\n${v}`);
}

async function buildAuthCookie() {
  const { data, error } = await sb.auth.signInWithPassword({
    email: 'test@psk.local',
    password: 'Test123456!',
  });
  if (error) throw error;
  // @supabase/ssr stores session as base64-encoded JSON prefixed with "base64-"
  const sessionJson = JSON.stringify(data.session);
  const value = 'base64-' + Buffer.from(sessionJson).toString('base64');
  return { cookie: `${COOKIE_NAME}=${value}`, userId: data.user.id };
}

async function pickFirstCase(serviceKey) {
  const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, serviceKey, {
    auth: { persistSession: false },
  });
  const { data } = await admin.from('cases').select('id, title').limit(1).single();
  return data;
}

async function main() {
  const { cookie, userId } = await buildAuthCookie();
  log('LOGIN OK', { userId });

  const c = await pickFirstCase(env.SUPABASE_SERVICE_ROLE_KEY);
  log('CASE', c);

  const startRes = await fetch(`${BASE}/api/seans/start`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', cookie },
    body: JSON.stringify({ case_id: c.id }),
  });
  const startBody = await startRes.json();
  log(`START [${startRes.status}]`, startBody);
  if (!startRes.ok) process.exit(1);
  const sessionId = startBody.session_id;

  const studentMessages = [
    'Merhaba, hoş geldin. Bugün nasıl hissediyorsun?',
    'Bunun ne zaman başladığını biraz anlatabilir misin?',
    'Ailenle ilişkin nasıl?',
    'Babanla aranızda neler oluyor?',
  ];

  for (const msg of studentMessages) {
    log('STUDENT', msg);
    const res = await fetch(`${BASE}/api/seans/message`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie },
      body: JSON.stringify({ session_id: sessionId, content: msg }),
    });
    if (!res.ok) {
      log(`MESSAGE FAILED [${res.status}]`, await res.text());
      process.exit(1);
    }
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let acc = '';
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      acc += decoder.decode(value, { stream: true });
    }
    log('CLIENT (AI)', acc);
  }

  const endRes = await fetch(`${BASE}/api/seans/end`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', cookie },
    body: JSON.stringify({ session_id: sessionId }),
  });
  log(`END [${endRes.status}]`, await endRes.json());

  log('REPORT GEN', 'üretiliyor...');
  const reportPostRes = await fetch(`${BASE}/api/rapor/${sessionId}`, {
    method: 'POST',
    headers: { cookie },
  });
  log(`REPORT POST [${reportPostRes.status}]`, await reportPostRes.json());

  const reportGetRes = await fetch(`${BASE}/api/rapor/${sessionId}`, { headers: { cookie } });
  const reportGet = await reportGetRes.json();
  log('REPORT', reportGet.report);
}

main().catch((e) => {
  console.error('FATAL:', e);
  process.exit(1);
});
