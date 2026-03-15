/**
 * Standalone Playwright diagnostic script (no test framework needed).
 * Run: node apps/web/e2e/diag.mjs
 */
import { chromium } from 'playwright';

const BASE = 'http://localhost:4000';
const EMAIL = 'playwright-test@xtyl.test';
const PASS = 'PlaywrightTest123!';

// Use the installed chromium binary
const CHROMIUM_PATH = '/Users/yanfernandes/Library/Caches/ms-playwright/chromium-1208/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';

async function main() {
  const browser = await chromium.launch({
    headless: true,
    executablePath: CHROMIUM_PATH,
  });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();

  const errors = [];
  const fails = [];

  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', err => errors.push('PAGE ERROR: ' + err.message));
  page.on('response', async res => {
    const url = res.url();
    if (res.status() >= 400 && !url.includes('hot-update') && !url.includes('__vite') && !url.includes('favicon') && !url.includes('supabase.co')) {
      let body = '';
      try { body = (await res.text()).slice(0, 300); } catch {}
      fails.push(`HTTP ${res.status()} ${url}\n  → ${body}`);
    }
  });
  page.on('requestfailed', req => {
    const url = req.url();
    if (!url.includes('hot-update') && !url.includes('__vite') && !url.includes('favicon') && !url.includes('supabase.co') && !url.includes('analytics')) {
      fails.push(`REFUSED ${url}\n  → ${req.failure()?.errorText}`);
    }
  });

  const flush = (label) => {
    console.log(`\n${'='.repeat(60)}\n=== ${label}`);
    console.log(`URL: ${page.url()}`);
    if (errors.length) console.log('CONSOLE ERRORS:\n  ' + errors.join('\n  '));
    if (fails.length) console.log('NETWORK FAILS:\n  ' + fails.join('\n  '));
    if (!errors.length && !fails.length) console.log('✅ No errors');
    errors.length = 0; fails.length = 0;
  };

  // 1. Login
  console.log('Navigating to login...');
  await page.goto(`${BASE}/login`);
  await page.waitForLoadState('networkidle');
  await page.locator('input[type="email"]').fill(EMAIL);
  await page.locator('input[type="password"]').fill(PASS);
  await page.locator('button[type="submit"]').click();

  try {
    await page.waitForFunction(() => !window.location.pathname.includes('/login'), { timeout: 15000 });
  } catch {}
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(3000);
  flush('AFTER LOGIN');
  await page.screenshot({ path: '/tmp/diag-01-login.png' });

  // 2. Look for workspace
  let workspaceId = '';
  const wsMatch = page.url().match(/\/workspace\/([^/]+)/);
  if (wsMatch) {
    workspaceId = wsMatch[1];
  } else {
    const wsLinks = await page.locator('a[href*="/workspace/"]').all();
    for (const l of wsLinks) {
      const href = await l.getAttribute('href') || '';
      const m = href.match(/\/workspace\/([^/?]+)/);
      if (m) { workspaceId = m[1]; break; }
    }
  }
  console.log('Workspace ID:', workspaceId || 'NOT FOUND');

  if (!workspaceId) {
    console.log('No workspace found. Trying to create one...');
    await page.screenshot({ path: '/tmp/diag-before-create-ws.png' });

    // Click "Create New Workspace" button first if it exists
    const createNewBtn = page.locator('button:has-text("Create New Workspace"), a:has-text("Create New Workspace"), button:has-text("Nova"), button:has-text("New Workspace")').first();
    if (await createNewBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await createNewBtn.click();
      await page.waitForTimeout(1500);
      await page.screenshot({ path: '/tmp/diag-create-ws-modal.png' });
    }

    // Fill in any visible text input (for workspace name)
    const nameInput = page.locator('input[type="text"], input:not([type])').first();
    if (await nameInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await nameInput.fill('Playwright Workspace');
      // Click the Create/Submit button
      const createBtn = page.locator('button:has-text("Create"), button:has-text("Criar")').first();
      await createBtn.click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(4000);
      flush('AFTER CREATE WORKSPACE');
      await page.screenshot({ path: '/tmp/diag-after-create-ws.png' });

      // Re-check for workspace in URL or links
      const wsMatch2 = page.url().match(/\/workspace\/([^/]+)/);
      if (wsMatch2) workspaceId = wsMatch2[1];
      if (!workspaceId) {
        const wsLinks2 = await page.locator('a[href*="/workspace/"]').all();
        for (const l of wsLinks2) {
          const href = await l.getAttribute('href') || '';
          const m = href.match(/\/workspace\/([^/?]+)/);
          if (m) { workspaceId = m[1]; break; }
        }
      }
    }

    if (!workspaceId) {
      console.log('Still no workspace. Page:', (await page.locator('body').innerText().catch(() => '')).slice(0, 500));
      await browser.close();
      return;
    }
  }

  // 3. Workspace page
  await page.goto(`${BASE}/workspace/${workspaceId}`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);
  flush('WORKSPACE PAGE');
  await page.screenshot({ path: '/tmp/diag-02-workspace.png' });

  // 4. Find project
  let projectId = '';
  const projectLinks = await page.locator('a[href*="/project/"]').all();
  for (const l of projectLinks) {
    const href = await l.getAttribute('href') || '';
    const m = href.match(/\/project\/([^/]+)/);
    if (m) { projectId = m[1]; break; }
  }
  // If no project link, try clicking on the first project card/item
  if (!projectId) {
    const projectCard = page.locator('text=Playwright Test Project').first();
    if (await projectCard.isVisible({ timeout: 3000 }).catch(() => false)) {
      await projectCard.click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);
      const urlMatch = page.url().match(/\/project\/([^/]+)/);
      if (urlMatch) projectId = urlMatch[1];
    }
  }
  console.log('Project ID:', projectId || 'NOT FOUND');

  if (!projectId) {
    console.log('No project. Trying to create one...');
    await page.screenshot({ path: '/tmp/diag-before-create-proj.png' });

    // Check if create form already has input (form may already be open)
    let nameInput = page.locator('input[type="text"], input:not([type])').first();
    if (!(await nameInput.isVisible({ timeout: 2000 }).catch(() => false))) {
      // Need to open the create project modal/form
      const newProjBtn = page.locator('button:has-text("New"), button:has-text("Novo"), button:has-text("Criar Projeto"), button:has-text("Create"), button[aria-label*="project" i], button:has-text("+")').first();
      if (await newProjBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await newProjBtn.click();
        await page.waitForTimeout(1000);
      }
      nameInput = page.locator('input[type="text"], input:not([type]), [role="dialog"] input').first();
    }

    if (await nameInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await nameInput.fill('Playwright Test Project');
      const submitBtn = page.locator('button:has-text("Criar"), button:has-text("Create"), button[type="submit"]').first();
      await submitBtn.click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(5000);
      flush('AFTER CREATE PROJECT');
      await page.screenshot({ path: '/tmp/diag-after-create-proj.png' });

      const urlMatch = page.url().match(/\/project\/([^/]+)/);
      if (urlMatch) projectId = urlMatch[1];
      if (!projectId) {
        const projectLinks2 = await page.locator('a[href*="/project/"]').all();
        for (const l of projectLinks2) {
          const href = await l.getAttribute('href') || '';
          const m = href.match(/\/project\/([^/]+)/);
          if (m) { projectId = m[1]; break; }
        }
      }
    }

    if (!projectId) {
      console.log('Still no project. Buttons on page:');
      const btns = await page.locator('button').all();
      for (const b of btns.slice(0, 15)) {
        const t = await b.innerText().catch(() => '');
        if (t.trim()) console.log('  Button:', t.trim());
      }
      console.log('Body:', (await page.locator('body').innerText().catch(() => '')).slice(0, 500));
      await browser.close();
      return;
    }
  }

  // 5. Project page
  await page.goto(`${BASE}/workspace/${workspaceId}/project/${projectId}`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(4000);
  flush('PROJECT PAGE (4s)');
  await page.screenshot({ path: '/tmp/diag-03-project.png' });

  // 6. Studio
  await page.goto(`${BASE}/workspace/${workspaceId}/project/${projectId}/studio`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(4000);
  flush('STUDIO PAGE');
  await page.screenshot({ path: '/tmp/diag-04-studio.png' });

  // 7. Settings
  await page.goto(`${BASE}/workspace/${workspaceId}/project/${projectId}/settings`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(3000);
  flush('SETTINGS PAGE');
  await page.screenshot({ path: '/tmp/diag-05-settings.png' });

  await browser.close();
  console.log('\n✅ Done. Screenshots at /tmp/diag-*.png');
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
