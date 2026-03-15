import { test, expect } from '@playwright/test';

/**
 * Diagnostic test - captures all console errors and failed network requests
 * to identify what's broken in the app.
 */
test('diagnose app errors', async ({ page }) => {
  const consoleErrors: string[] = [];
  const networkErrors: { url: string; status: number; body: string }[] = [];

  // Capture console errors
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  // Capture failed requests
  page.on('response', async (response) => {
    if (response.status() >= 400) {
      let body = '';
      try {
        body = await response.text();
        body = body.slice(0, 300);
      } catch {}
      networkErrors.push({
        url: response.url(),
        status: response.status(),
        body,
      });
    }
  });

  // --- Step 1: Login ---
  const email = process.env.E2E_TEST_EMAIL!;
  const password = process.env.E2E_TEST_PASSWORD!;

  await page.goto('/');
  await page.waitForLoadState('networkidle');

  const emailInput = page.locator('input[type="email"], input[name="email"]').first();
  if (await emailInput.isVisible({ timeout: 5000 }).catch(() => false)) {
    await emailInput.fill(email);
    const passwordInput = page.locator('input[type="password"]').first();
    await passwordInput.fill(password);
    const loginBtn = page.locator('button[type="submit"]').first();
    await loginBtn.click();
    await page.waitForURL(/\/(workspace|dashboard|w\/)/, { timeout: 30000 }).catch(() => {});
  }

  await page.waitForLoadState('networkidle');

  console.log('\n=== AFTER LOGIN ===');
  console.log('URL:', page.url());
  console.log('Console errors:', consoleErrors.slice());
  console.log('Network errors:', networkErrors.slice());
  consoleErrors.length = 0;
  networkErrors.length = 0;

  // --- Step 2: Find a project and navigate to it ---
  // Try clicking on any project link in the sidebar
  const projectLink = page.locator('a[href*="/project/"]').first();
  if (await projectLink.isVisible({ timeout: 5000 }).catch(() => false)) {
    const href = await projectLink.getAttribute('href');
    console.log('Navigating to project:', href);
    await projectLink.click();
    await page.waitForLoadState('networkidle');

    console.log('\n=== IN PROJECT PAGE ===');
    console.log('URL:', page.url());
    console.log('Console errors:', consoleErrors.slice());
    console.log('Network errors:', networkErrors.map(e => `${e.status} ${e.url}\n  ${e.body}`).join('\n'));
    consoleErrors.length = 0;
    networkErrors.length = 0;

    // --- Step 3: Try opening chat ---
    await page.waitForTimeout(3000);
    console.log('\n=== AFTER 3s (chat/sidebar loaded) ===');
    console.log('Console errors:', consoleErrors.slice());
    console.log('Network errors:', networkErrors.map(e => `${e.status} ${e.url}\n  ${e.body}`).join('\n'));
    consoleErrors.length = 0;
    networkErrors.length = 0;

    // --- Step 4: Try studio ---
    const currentUrl = page.url();
    const studioUrl = currentUrl.replace(/\/?$/, '/studio');
    await page.goto(studioUrl);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    console.log('\n=== IN STUDIO ===');
    console.log('URL:', page.url());
    console.log('Console errors:', consoleErrors.slice());
    console.log('Network errors:', networkErrors.map(e => `${e.status} ${e.url}\n  ${e.body}`).join('\n'));
  } else {
    console.log('No project link found. Page content:');
    console.log(await page.content().then(c => c.slice(0, 2000)));
  }

  // Screenshot at end
  await page.screenshot({ path: '/tmp/xtyl-diagnose.png', fullPage: true });
  console.log('\nScreenshot saved to /tmp/xtyl-diagnose.png');
});
