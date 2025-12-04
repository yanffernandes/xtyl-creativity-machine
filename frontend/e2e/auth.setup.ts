import { test as setup, expect } from '@playwright/test';

/**
 * Authentication Setup
 *
 * This runs before all tests to authenticate and save the session.
 * The saved session is reused by all other tests.
 */

const authFile = './e2e/.auth/user.json';

setup('authenticate', async ({ page }) => {
  const testEmail = process.env.E2E_TEST_EMAIL;
  const testPassword = process.env.E2E_TEST_PASSWORD;

  if (!testEmail || !testPassword) {
    throw new Error(
      'E2E_TEST_EMAIL and E2E_TEST_PASSWORD must be set in .env.test\n' +
      'Copy .env.test.example to .env.test and fill in the values.'
    );
  }

  // Go to login page
  await page.goto('/');

  // Wait for the page to load
  await page.waitForLoadState('networkidle');

  // Check if already logged in (redirected to dashboard)
  const currentUrl = page.url();
  if (currentUrl.includes('/w/') || currentUrl.includes('/workspace')) {
    console.log('Already authenticated, saving session...');
    await page.context().storageState({ path: authFile });
    return;
  }

  // Find and fill email input
  const emailInput = page.locator('input[type="email"], input[name="email"], input[placeholder*="email" i]').first();
  await expect(emailInput).toBeVisible({ timeout: 10000 });
  await emailInput.fill(testEmail);

  // Find and fill password input
  const passwordInput = page.locator('input[type="password"], input[name="password"]').first();
  await expect(passwordInput).toBeVisible();
  await passwordInput.fill(testPassword);

  // Click login button
  const loginButton = page.locator('button[type="submit"], button:has-text("Sign in"), button:has-text("Login"), button:has-text("Entrar")').first();
  await loginButton.click();

  // Wait for successful login - should redirect to workspace/dashboard
  await expect(page).toHaveURL(/\/(w|workspace)\//, { timeout: 30000 });

  // Verify we're logged in by checking for common dashboard elements
  await expect(
    page.locator('[data-testid="sidebar"], nav, .sidebar, [class*="sidebar"]').first()
  ).toBeVisible({ timeout: 10000 });

  console.log('Authentication successful!');

  // Save the authentication state
  await page.context().storageState({ path: authFile });
});
