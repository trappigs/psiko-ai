/**
 * Mobil görünüm snapshot'u — iPhone SE ve Pixel 7 viewport'larında ana sayfaları
 * ekran görüntüsü olarak kaydet.
 *
 * Çalıştırma:
 *   1. npm run dev (veya zaten çalışıyor olsun)
 *   2. node tests/manual/mobile-screens.mjs
 *
 * Çıktı: tests/manual/screenshots/{device}/{page}.png
 */
import fs from 'fs';
import path from 'path';
import { chromium, devices } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

const env = fs.readFileSync('.env.local', 'utf8').split(/\r?\n/).reduce((acc, l) => {
  const m = l.match(/^([^#=]+)=(.*)$/);
  if (m) acc[m[1].trim()] = m[2].trim();
  return acc;
}, {});

const BASE = process.env.BASE_URL ?? 'http://localhost:3030';
const OUT = 'tests/manual/screenshots';

const VIEWPORTS = [
  { name: 'iphone-se', device: devices['iPhone SE'] },
  { name: 'pixel-7', device: devices['Pixel 7'] },
];

const PAGES_NO_AUTH = [
  { slug: 'login', path: '/login' },
  { slug: 'signup', path: '/signup' },
];

async function loginAs(page) {
  // Hızlı yol: anon Supabase'le login olup cookie'leri set et
  const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const { data } = await sb.auth.signInWithPassword({
    email: 'test@psk.local',
    password: 'Test123456!',
  });
  if (!data.session) throw new Error('login failed');
  const projectRef = new URL(env.NEXT_PUBLIC_SUPABASE_URL).hostname.split('.')[0];
  const cookieName = `sb-${projectRef}-auth-token`;
  const cookieValue = 'base64-' + Buffer.from(JSON.stringify(data.session)).toString('base64');
  await page.context().addCookies([
    {
      name: cookieName,
      value: cookieValue,
      url: BASE,
      sameSite: 'Lax',
    },
  ]);
  return data.session.user.id;
}

async function snap(page, slug, deviceName) {
  const dir = path.join(OUT, deviceName);
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `${slug}.png`);
  await page.screenshot({ path: file, fullPage: true });
  console.log(`✓ ${deviceName}/${slug}.png`);
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();

  for (const v of VIEWPORTS) {
    const ctx = await browser.newContext(v.device);
    const page = await ctx.newPage();

    // public pages (no auth)
    for (const p of PAGES_NO_AUTH) {
      await page.goto(`${BASE}${p.path}`, { waitUntil: 'domcontentloaded' });
      await snap(page, p.slug, v.name);
    }

    // login + protected pages
    await loginAs(page);

    const protectedPages = [
      { slug: 'home', path: '/' },
      { slug: 'gecmis', path: '/gecmis' },
      { slug: 'ilerleme', path: '/ilerleme' },
      { slug: 'ayarlar', path: '/ayarlar' },
      { slug: 'kvkk', path: '/kvkk' },
    ];

    for (const p of protectedPages) {
      try {
        await page.goto(`${BASE}${p.path}`, { waitUntil: 'domcontentloaded', timeout: 20000 });
        await page.waitForTimeout(800);
        // dismiss welcome modal if visible
        const closeBtn = await page.$('button:has-text("Anladım")');
        if (closeBtn) await closeBtn.click().catch(() => {});
        await snap(page, p.slug, v.name);
      } catch (e) {
        console.log(`  ⚠ ${v.name}/${p.slug} atlandı: ${e.message.slice(0, 80)}`);
      }
    }

    // pick first vaka, open briefing
    const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });
    const { data: c } = await sb.from('cases').select('id').limit(1).single();
    if (c) {
      try {
        await page.goto(`${BASE}/vaka/${c.id}`, { waitUntil: 'domcontentloaded', timeout: 20000 });
        await page.waitForTimeout(500);
        await snap(page, 'vaka-briefing', v.name);
      } catch (e) {
        console.log(`  ⚠ ${v.name}/vaka-briefing atlandı: ${e.message.slice(0, 80)}`);
      }
    }

    await ctx.close();
  }

  await browser.close();
  console.log(`\nÇıktılar: ${OUT}/`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
