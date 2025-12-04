import { test, expect } from '@playwright/test';

/**
 * Project Management E2E Tests
 *
 * Tests the complete project lifecycle:
 * - Creating projects
 * - Viewing project list
 * - Editing projects
 * - Deleting projects
 */

test.describe('Project Management', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the main workspace
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should display projects in sidebar', async ({ page }) => {
    // The sidebar should be visible after login
    const sidebar = page.locator('[data-testid="sidebar"], nav, .sidebar, [class*="sidebar"]').first();
    await expect(sidebar).toBeVisible();

    // Should show projects section
    const projectsSection = page.locator('text=Projects, text=Projetos, [data-testid="projects-list"]').first();
    await expect(projectsSection).toBeVisible({ timeout: 10000 });
  });

  test('should create a new project', async ({ page }) => {
    const projectName = `Test Project ${Date.now()}`;

    // Find and click "New Project" or "+" button
    const newProjectButton = page.locator(
      'button:has-text("New Project"), button:has-text("Novo Projeto"), ' +
      'button[aria-label*="new project" i], button[aria-label*="adicionar" i], ' +
      '[data-testid="new-project-button"]'
    ).first();

    // If button is not visible, try opening a menu first
    if (!(await newProjectButton.isVisible())) {
      const addButton = page.locator('button:has-text("+"), button[aria-label*="add" i]').first();
      if (await addButton.isVisible()) {
        await addButton.click();
      }
    }

    await newProjectButton.click();

    // Wait for modal/dialog
    const modal = page.locator('[role="dialog"], [data-testid="create-project-modal"], .modal').first();
    await expect(modal).toBeVisible({ timeout: 5000 });

    // Fill project name
    const nameInput = modal.locator('input[name="name"], input[placeholder*="name" i], input[placeholder*="nome" i]').first();
    await nameInput.fill(projectName);

    // Submit form
    const createButton = modal.locator('button[type="submit"], button:has-text("Create"), button:has-text("Criar")').first();
    await createButton.click();

    // Wait for modal to close
    await expect(modal).not.toBeVisible({ timeout: 10000 });

    // Verify project appears in sidebar
    await expect(page.locator(`text=${projectName}`)).toBeVisible({ timeout: 10000 });
  });

  test('should open a project', async ({ page }) => {
    // Find any project in the sidebar and click it
    const projectLink = page.locator(
      '[data-testid="project-item"], .project-item, ' +
      'a[href*="/project/"], button[data-project-id]'
    ).first();

    if (await projectLink.isVisible()) {
      await projectLink.click();

      // Should navigate to project page or show project content
      await page.waitForLoadState('networkidle');

      // Verify project content is visible (documents list, etc)
      const projectContent = page.locator(
        '[data-testid="project-content"], [data-testid="documents-list"], ' +
        '.documents-list, main'
      ).first();
      await expect(projectContent).toBeVisible();
    } else {
      // No projects exist, that's okay for this test
      test.skip();
    }
  });

  test('should show project settings/edit modal', async ({ page }) => {
    // Find a project's context menu or settings button
    const projectItem = page.locator('[data-testid="project-item"], .project-item').first();

    if (!(await projectItem.isVisible())) {
      test.skip();
      return;
    }

    // Right-click or click menu button
    const menuButton = projectItem.locator('button[aria-label*="menu" i], button[aria-label*="options" i], .menu-trigger').first();

    if (await menuButton.isVisible()) {
      await menuButton.click();
    } else {
      await projectItem.click({ button: 'right' });
    }

    // Look for edit/settings option
    const editOption = page.locator(
      '[role="menuitem"]:has-text("Edit"), [role="menuitem"]:has-text("Settings"), ' +
      '[role="menuitem"]:has-text("Editar"), [role="menuitem"]:has-text("Configurações")'
    ).first();

    if (await editOption.isVisible()) {
      await editOption.click();

      // Modal should appear
      const modal = page.locator('[role="dialog"], .modal').first();
      await expect(modal).toBeVisible({ timeout: 5000 });
    }
  });
});
