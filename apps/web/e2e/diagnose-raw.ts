import { chromium } from 'playwright';

async function diagnose() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const errors: string[] = [];
  const networkFails: string[] = [];

  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', err => errors.push('PAGE ERROR: ' + err.message));
  page.on('response', async res => {
    if (res.status() >= 400 && !res.url().includes('hot-update') && !res.url().includes('__vite')) {
      let body = '';
      try { body = (await res.text()).slice(0, 200); } catch {}
      networkFails.push(`${res.status()} ${res.url()} → ${body}`);
    }
  });

  // Step 1: visit login page
  console.log('\n=== LOGIN PAGE ===');
  await page.goto('http://localhost:4000/login', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  console.log('URL:', page.url());
  console.log('Console errors:', errors.slice());
  console.log('Network fails:', networkFails.slice());
  errors.length = 0; networkFails.length = 0;

  // Grab the page title/content
  const title = await page.title();
  const bodyText = await page.locator('body').innerText().catch(() => '');
  console.log('Title:', title);
  console.log('Body (first 500):', bodyText.slice(0, 500));

  // Step 2: check what localStorage/sessionStorage has
  const storage = await page.evaluate(() => {
    const result: Record<string, string> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)!;
      if (key.includes('supabase') || key.includes('auth') || key.includes('token')) {
        result[key] = localStorage.getItem(key)?.slice(0, 100) || '';
      }
    }
    return result;
  });
  console.log('\nRelevant localStorage keys:', Object.keys(storage));

  // Step 3: Check what supabase env is configured
  const envCheck = await page.evaluate(() => {
    return {
      // @ts-ignore
      supabaseUrl: (window as any).__SUPABASE_URL__ || 'not set',
    };
  });
  console.log('Env:', envCheck);

  // Step 4: Look at form inputs on login page
  const inputs = await page.locator('input').all();
  console.log('\nInputs on login page:', inputs.length);
  for (const input of inputs) {
    const type = await input.getAttribute('type');
    const name = await input.getAttribute('name');
    const placeholder = await input.getAttribute('placeholder');
    console.log(`  input[type="${type}"] name="${name}" placeholder="${placeholder}"`);
  }

  const buttons = await page.locator('button').all();
  console.log('Buttons on login page:', buttons.length);
  for (const btn of buttons.slice(0, 5)) {
    const text = await btn.innerText().catch(() => '');
    const type = await btn.getAttribute('type');
    console.log(`  button[type="${type}"]: "${text.trim()}"`);
  }

  await browser.close();
}

diagnose().catch(console.error);
