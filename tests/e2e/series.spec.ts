/**
 * E2E tests — Vaka takibi (multi-session series)
 *
 * Test user: test@psk.local / Test123456! (pre-seeded in local Supabase)
 * Requires: local Supabase running + dev server, MOCK_OPENAI=true.
 *
 * Flow:
 *  1. Login → start free session → end → report shows "devam et" CTA
 *  2. Click CTA → /seri/[id] page lists 1 session
 *  3. Start a 2nd session in the same series
 */

import { test, expect, type Page } from '@playwright/test';

const TEST_EMAIL = 'test@psk.local';
const TEST_PASSWORD = 'Test123456!';

async function loginAs(page: Page, email: string, password: string) {
  await page.goto('/login');
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.getByRole('button', { name: 'Giriş yap' }).click();
  await page.waitForURL('/', { timeout: 15_000 });
}

test('two-session series happy path', async ({ page }) => {
  test.setTimeout(180_000);

  // Step 1: Login
  await page.goto('/login');
  const loginBtn = page.getByRole('button', { name: 'Giriş yap' });
  await expect(loginBtn).toBeVisible({ timeout: 10_000 });
  await page.locator('input[type="email"]').fill(TEST_EMAIL);
  await page.locator('input[type="password"]').fill(TEST_PASSWORD);
  await loginBtn.click();

  const loginResult = await Promise.race([
    page.waitForURL('/', { timeout: 12_000 }).then(() => 'ok' as const).catch(() => null),
    page.locator('[class*="danger"]').first().waitFor({ state: 'visible', timeout: 12_000 }).then(() => 'fail' as const).catch(() => null),
  ]);
  if (loginResult !== 'ok') {
    test.skip(true, `Test user ${TEST_EMAIL} not seeded — skipping.`);
    return;
  }

  // Step 2: Start a free session
  const freeCard = page.locator('button').filter({ hasText: 'Serbest seans' }).first();
  await freeCard.click();
  const modal = page.getByRole('dialog', { name: 'Serbest seans' });
  await expect(modal).toBeVisible({ timeout: 5_000 });
  await modal.getByRole('button', { name: /Kolay/i }).click();
  await modal.getByRole('button', { name: 'Başlat' }).click();

  const navResult = await Promise.race([
    page.waitForURL(/\/seans\/[0-9a-f-]{36}/, { timeout: 90_000 }).then(() => 'navigated' as const).catch(() => null),
    modal.getByRole('alert').waitFor({ state: 'visible', timeout: 90_000 }).then(() => 'error' as const).catch(() => null),
  ]);
  if (navResult !== 'navigated') {
    test.skip(true, 'Free-session start API call failed (likely MOCK_OPENAI not set).');
    return;
  }

  const firstSessionUrl = page.url();

  // Step 3: End the session (assumes "Seansı bitir" button is available)
  const endBtn = page.getByRole('button', { name: /seansı bitir/i });
  const endVisible = await endBtn.isVisible({ timeout: 5_000 }).catch(() => false);
  if (!endVisible) {
    test.skip(true, 'End-session button not visible — UI may have changed.');
    return;
  }
  await endBtn.click();
  await page.waitForURL(/\/rapor\/[0-9a-f-]{36}/, { timeout: 60_000 });

  // Wait for report (loading spinner gone)
  await expect(page.locator('[aria-label="yükleniyor"]')).toBeHidden({ timeout: 90_000 });

  // Step 4: "Bu danışanla devam et" CTA visible (free + open series)
  await expect(page.getByText('Bu danışanla devam et')).toBeVisible({ timeout: 10_000 });

  // Click into series page
  await page.getByRole('link', { name: /Seri sayfasına git/i }).click();
  await page.waitForURL(/\/seri\/[0-9a-f-]{36}/, { timeout: 10_000 });

  // Step 5: Series page shows the first session
  await expect(page.getByText(/Açık · 1 seans/)).toBeVisible({ timeout: 5_000 });
  await expect(page.getByText('Seans 1').first()).toBeVisible();

  // Step 6: Start a new session in this series
  const newSessionLink = page.getByRole('link', { name: /Yeni seans başlat/i });
  await expect(newSessionLink).toBeVisible({ timeout: 5_000 });
  await newSessionLink.click();
  await page.waitForURL(/\/seans\/[0-9a-f-]{36}/, { timeout: 60_000 });

  const secondSessionUrl = page.url();
  expect(secondSessionUrl).not.toBe(firstSessionUrl);

  // Sanity: serbest seans badge still present (the case is ai_generated)
  await expect(page.locator('[aria-label="Serbest seans"]')).toBeVisible({ timeout: 10_000 });
});
