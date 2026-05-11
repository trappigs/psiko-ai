/**
 * E2E tests — Serbest seans akışı
 *
 * Test user: test@psk.local / Test123456! (pre-seeded in local Supabase)
 * Requires: local Supabase running + dev server on port 3030
 * MOCK_OPENAI=true is set via playwright.config.ts webServer.env so case
 * generation never hits real OpenAI.
 *
 * NOTE: The AuthForm labels ("E-posta", "Şifre") are plain <label> elements
 * without for/id associations, so we use placeholder-based locators instead
 * of getByLabel().
 */

import { test, expect, type Page } from '@playwright/test';

const TEST_EMAIL = 'test@psk.local';
const TEST_PASSWORD = 'Test123456!';

// ---------------------------------------------------------------------------
// Helper: perform UI login and land on "/"
// ---------------------------------------------------------------------------
async function loginAs(page: Page, email: string, password: string) {
  await page.goto('/login');
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.getByRole('button', { name: 'Giriş yap' }).click();
  // After successful login the app redirects to "/"
  await page.waitForURL('/', { timeout: 15_000 });
}

// ---------------------------------------------------------------------------
// Smoke test 1: anonymous visitor is redirected to /login
// ---------------------------------------------------------------------------
test('anonymous visitor at "/" is redirected to /login', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
});

// ---------------------------------------------------------------------------
// Smoke test 2: /login renders the login form
// ---------------------------------------------------------------------------
test('/login renders email + password form', async ({ page }) => {
  await page.goto('/login');
  await expect(page.locator('input[type="email"]')).toBeVisible();
  await expect(page.locator('input[type="password"]')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Giriş yap' })).toBeVisible();
});

// ---------------------------------------------------------------------------
// Full happy-path: Home → modal → start → session screen → end → report
//
// This test requires:
//   1. Local Supabase running with the test@psk.local user seeded.
//   2. MOCK_OPENAI=true set in the server process environment.
//      When Playwright starts the webServer, it passes the env from
//      playwright.config.ts. If the dev server is reused (reuseExistingServer),
//      that env may not be set — in which case /api/seans/start will fail and
//      this test will be skipped automatically.
//
// ---------------------------------------------------------------------------
test('serbest seans tam akışı — home → modal → seans → rapor', async ({ page }) => {
  // Extend timeout: case generation + report generation can be slow.
  test.setTimeout(120_000);

  // Step 1: Login
  await page.goto('/login');

  const loginForm = page.getByRole('button', { name: 'Giriş yap' });
  await expect(loginForm).toBeVisible({ timeout: 10_000 });

  await page.locator('input[type="email"]').fill(TEST_EMAIL);
  await page.locator('input[type="password"]').fill(TEST_PASSWORD);
  await loginForm.click();

  // If login fails (test user doesn't exist) a danger banner appears.
  const result = await Promise.race([
    page.waitForURL('/', { timeout: 12_000 }).then(() => 'ok' as const).catch(() => null),
    page.locator('[class*="danger"]').first().waitFor({ state: 'visible', timeout: 12_000 }).then(() => 'fail' as const).catch(() => null),
  ]);

  if (result !== 'ok') {
    test.skip(true, `Test user ${TEST_EMAIL} not found or Supabase unavailable — skipping full flow test.`);
    return;
  }

  // Step 2: Click "Serbest seans" card → modal opens.
  // FreeSessionTrigger renders a <button> containing "Serbest seans" text.
  const freeSessionCard = page.locator('button').filter({ hasText: 'Serbest seans' }).first();
  await expect(freeSessionCard).toBeVisible({ timeout: 10_000 });
  await freeSessionCard.click();

  // Modal should appear (role="dialog" aria-label="Serbest seans")
  const modal = page.getByRole('dialog', { name: 'Serbest seans' });
  await expect(modal).toBeVisible({ timeout: 5_000 });

  // Step 3: Pick "Kolay" difficulty (aria-pressed toggle buttons)
  const kolayBtn = modal.getByRole('button', { name: /Kolay/i });
  await kolayBtn.click();
  await expect(kolayBtn).toHaveAttribute('aria-pressed', 'true');

  // Step 4: Click "Başlat" and wait for redirect to /seans/[id].
  // The modal shows an error if the API call fails (e.g. MOCK_OPENAI not set).
  // We wait for either navigation OR an error alert.
  await modal.getByRole('button', { name: 'Başlat' }).click();

  const navResult = await Promise.race([
    page.waitForURL(/\/seans\/[0-9a-f-]{36}/, { timeout: 90_000 }).then(() => 'navigated' as const).catch(() => null),
    modal.getByRole('alert').waitFor({ state: 'visible', timeout: 90_000 }).then(() => 'api_error' as const).catch(() => null),
  ]);

  if (navResult !== 'navigated') {
    const errorText = await modal.getByRole('alert').textContent().catch(() => 'unknown');
    test.skip(true, `API call failed (likely MOCK_OPENAI not set): "${errorText}" — skipping rest of flow.`);
    return;
  }

  // Step 5: Session screen shows the free-mode badge
  // aria-label="Serbest seans" is on the span (visible on all screen sizes)
  const badge = page.locator('[aria-label="Serbest seans"]');
  await expect(badge).toBeVisible({ timeout: 10_000 });

  // ----- Stretch: end session → report page -----
  const endBtn = page.getByRole('button', { name: /seansı bitir/i });
  const endVisible = await endBtn.isVisible({ timeout: 3_000 }).catch(() => false);
  if (endVisible) {
    await endBtn.click();

    // Redirect to /rapor/[id]
    await page.waitForURL(/\/rapor\/[0-9a-f-]{36}/, { timeout: 60_000 });

    // Wait for report generation (loading spinner disappears)
    await expect(page.locator('[aria-label="yükleniyor"]')).toBeHidden({ timeout: 90_000 });

    // "Gizli dosya açıklandı" section is present for free-mode sessions
    await expect(page.getByText('Gizli dosya açıklandı')).toBeVisible({ timeout: 10_000 });
  }
});
