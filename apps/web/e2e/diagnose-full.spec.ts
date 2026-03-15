import { test } from '@playwright/test';

/**
 * Full app diagnostic: login → workspace → project → studio → settings.
 * Captures console/network errors and saves screenshots to /tmp/diag-*.png.
 * Uses E2E_TEST_EMAIL and E2E_TEST_PASSWORD from .env.test (no saved auth).
 */

test('full app diagnostic', async ({ page }) => {
  const email = process.env.E2E_TEST_EMAIL;
  const password = process.env.E2E_TEST_PASSWORD;
  if (!email || !password) {
    throw new Error(
      'E2E_TEST_EMAIL and E2E_TEST_PASSWORD must be set (e.g. in .env.test). ' +
      'See .env.test.example.'
    );
  }

  const errors: string[] = [];
  const fails: string[] = [];

  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', err => errors.push('PAGE ERROR: ' + err.message));
  page.on('response', async res => {
    const url = res.url();
    if (res.status() >= 400 && !url.includes('hot-update') && !url.includes('__vite') && !url.includes('favicon')) {
      let body = '';
      try { body = (await res.text()).slice(0, 300); } catch {}
      fails.push(`${res.status()} ${url}\n  → ${body}`);
    }
  });

  const flush = (label: string) => {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`=== ${label}`);
    console.log(`URL: ${page.url()}`);
    if (errors.length) console.log('CONSOLE ERRORS:\n  ' + errors.join('\n  '));
    if (fails.length) console.log('NETWORK FAILS:\n  ' + fails.join('\n  '));
    if (!errors.length && !fails.length) console.log('✅ No errors');
    errors.length = 0; fails.length = 0;
  };

  // ── 1. Login ─────────────────────────────────────────────
  await page.goto('/login');
  await page.waitForLoadState('networkidle');
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.locator('button[type="submit"]').click();

  // Wait for redirect away from login
  await page.waitForFunction(() => !window.location.pathname.includes('/login'), { timeout: 15000 });
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);
  flush('AFTER LOGIN');

  const postLoginUrl = page.url();
  console.log('Post-login URL:', postLoginUrl);

  // Screenshot after login
  await page.screenshot({ path: '/tmp/diag-01-login.png' });

  // ── 2. Look for workspace or create one ──────────────────
  // Check if there's a workspace in the URL
  let workspaceId = '';
  const wsMatch = page.url().match(/\/workspace\/([^/]+)/);
  if (wsMatch) {
    workspaceId = wsMatch[1];
    console.log('Already in workspace:', workspaceId);
  } else {
    // Look for workspace link in page
    const wsLink = page.locator('a[href*="/workspace/"]').first();
    if (await wsLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      const href = await wsLink.getAttribute('href') || '';
      const m = href.match(/\/workspace\/([^/]+)/);
      if (m) workspaceId = m[1];
      await wsLink.click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1500);
      flush('AFTER WORKSPACE CLICK');
    } else {
      console.log('No workspace found. Page HTML:', (await page.content()).slice(0, 1000));
    }
  }

  await page.screenshot({ path: '/tmp/diag-02-workspace.png' });

  if (!workspaceId) {
    console.log('Could not find workspace, stopping.');
    return;
  }

  // ── 3. Navigate to workspace page ────────────────────────
  await page.goto(`/workspace/${workspaceId}`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);
  flush('WORKSPACE PAGE');

  // Look for a project or create one
  let projectId = '';
  const projectLink = page.locator('a[href*="/project/"]').first();
  if (await projectLink.isVisible({ timeout: 5000 }).catch(() => false)) {
    const href = await projectLink.getAttribute('href') || '';
    const m = href.match(/\/project\/([^/]+)/);
    if (m) projectId = m[1];
    console.log('Found project:', projectId);
  } else {
    console.log('No project link found on workspace page');
    // Try to find create button
    const visible = await page.locator('button').all();
    for (const btn of visible.slice(0, 10)) {
      const t = await btn.innerText().catch(() => '');
      if (t.trim()) console.log('  Button:', t.trim());
    }
  }

  await page.screenshot({ path: '/tmp/diag-03-workspace-page.png' });

  if (!projectId) {
    console.log('Stopping: no project found');
    return;
  }

  // ── 4. Navigate to project page ──────────────────────────
  await page.goto(`/workspace/${workspaceId}/project/${projectId}`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(3000);
  flush('PROJECT PAGE (3s)');
  await page.screenshot({ path: '/tmp/diag-04-project.png' });

  // ── 5. Check chat sidebar ─────────────────────────────────
  const chatInput = page.locator('textarea[placeholder*="Converse"], textarea[placeholder*="Mensagem"], textarea[placeholder*="message" i], textarea[placeholder*="chat" i]').first();
  if (await chatInput.isVisible({ timeout: 3000 }).catch(() => false)) {
    console.log('✅ Chat input visible');
    await chatInput.fill('Olá, teste');
    await page.waitForTimeout(500);
    flush('AFTER TYPING IN CHAT');
  } else {
    console.log('⚠️ Chat input NOT visible');
    // Print all textareas
    const areas = await page.locator('textarea').all();
    for (const a of areas) {
      const ph = await a.getAttribute('placeholder').catch(() => '');
      console.log('  textarea placeholder:', ph);
    }
  }

  await page.screenshot({ path: '/tmp/diag-05-chat.png' });

  // ── 6. Navigate to studio page ────────────────────────────
  await page.goto(`/workspace/${workspaceId}/project/${projectId}/studio`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(3000);
  flush('STUDIO PAGE');
  await page.screenshot({ path: '/tmp/diag-06-studio.png' });

  // ── 7. Navigate to settings ───────────────────────────────
  await page.goto(`/workspace/${workspaceId}/project/${projectId}/settings`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);
  flush('SETTINGS PAGE');
  await page.screenshot({ path: '/tmp/diag-07-settings.png' });

  console.log('\nDone. Screenshots at /tmp/diag-*.png');
});
