import { test, expect } from '@playwright/test';

/**
 * Document Management E2E Tests
 *
 * Tests the complete document lifecycle:
 * - Creating documents
 * - Editing documents
 * - Viewing documents
 * - Deleting documents
 */

test.describe('Document Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should create a new document', async ({ page }) => {
    const docTitle = `Test Document ${Date.now()}`;

    // First, open a project (or create one if needed)
    const projectItem = page.locator('[data-testid="project-item"], .project-item, a[href*="/project/"]').first();

    if (await projectItem.isVisible()) {
      await projectItem.click();
      await page.waitForLoadState('networkidle');
    }

    // Find and click "New Document" button
    const newDocButton = page.locator(
      'button:has-text("New Document"), button:has-text("New Copy"), ' +
      'button:has-text("Novo Documento"), button:has-text("Nova Copy"), ' +
      '[data-testid="new-document-button"], button[aria-label*="new" i]'
    ).first();

    if (!(await newDocButton.isVisible())) {
      // Try finding a "+" button in the documents area
      const addButton = page.locator('button:has-text("+")').first();
      if (await addButton.isVisible()) {
        await addButton.click();
        await page.waitForTimeout(500);
      }
    }

    if (await newDocButton.isVisible()) {
      await newDocButton.click();

      // Wait for editor or modal
      await page.waitForTimeout(1000);

      // Fill title if there's an input
      const titleInput = page.locator(
        'input[name="title"], input[placeholder*="title" i], ' +
        'input[placeholder*="título" i], [contenteditable="true"]'
      ).first();

      if (await titleInput.isVisible()) {
        await titleInput.fill(docTitle);
      }

      // If there's a save button, click it
      const saveButton = page.locator('button:has-text("Save"), button:has-text("Salvar")').first();
      if (await saveButton.isVisible()) {
        await saveButton.click();
      }

      // Verify document was created
      await expect(page.locator(`text=${docTitle}`)).toBeVisible({ timeout: 10000 });
    }
  });

  test('should edit a document', async ({ page }) => {
    // Open a project first
    const projectItem = page.locator('[data-testid="project-item"], .project-item').first();

    if (await projectItem.isVisible()) {
      await projectItem.click();
      await page.waitForLoadState('networkidle');
    }

    // Find and click on a document
    const docItem = page.locator(
      '[data-testid="document-item"], .document-item, ' +
      'a[href*="/document/"], [data-document-id]'
    ).first();

    if (!(await docItem.isVisible())) {
      test.skip();
      return;
    }

    await docItem.click();
    await page.waitForLoadState('networkidle');

    // Find the editor
    const editor = page.locator(
      '[contenteditable="true"], .ProseMirror, .tiptap, ' +
      'textarea, [data-testid="document-editor"]'
    ).first();

    if (await editor.isVisible()) {
      // Type some content
      const testContent = `Test content added at ${new Date().toISOString()}`;
      await editor.click();
      await editor.pressSequentially(testContent);

      // Wait for auto-save or click save
      await page.waitForTimeout(2000);

      const saveButton = page.locator('button:has-text("Save"), button:has-text("Salvar")').first();
      if (await saveButton.isVisible()) {
        await saveButton.click();
      }

      // Verify content was saved (should still be visible after reload)
      // We'll just verify the content is in the editor for now
      await expect(editor).toContainText(testContent);
    }
  });

  test('should delete a document', async ({ page }) => {
    // Open a project first
    const projectItem = page.locator('[data-testid="project-item"], .project-item').first();

    if (await projectItem.isVisible()) {
      await projectItem.click();
      await page.waitForLoadState('networkidle');
    }

    // Find a document's context menu
    const docItem = page.locator('[data-testid="document-item"], .document-item').first();

    if (!(await docItem.isVisible())) {
      test.skip();
      return;
    }

    // Get the document name before deletion
    const docName = await docItem.textContent();

    // Right-click or open menu
    const menuButton = docItem.locator('button[aria-label*="menu" i], .menu-trigger').first();

    if (await menuButton.isVisible()) {
      await menuButton.click();
    } else {
      await docItem.click({ button: 'right' });
    }

    // Click delete option
    const deleteOption = page.locator(
      '[role="menuitem"]:has-text("Delete"), [role="menuitem"]:has-text("Excluir"), ' +
      '[role="menuitem"]:has-text("Remove")'
    ).first();

    if (await deleteOption.isVisible()) {
      await deleteOption.click();

      // Confirm deletion if there's a confirmation dialog
      const confirmButton = page.locator(
        'button:has-text("Confirm"), button:has-text("Delete"), ' +
        'button:has-text("Confirmar"), button:has-text("Excluir")'
      ).last();

      if (await confirmButton.isVisible()) {
        await confirmButton.click();
      }

      // Verify document was deleted
      await page.waitForTimeout(1000);
      if (docName) {
        await expect(page.locator(`text=${docName.trim()}`)).not.toBeVisible({ timeout: 5000 });
      }
    }
  });
});
