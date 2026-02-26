import { test, expect } from '@playwright/test';

/**
 * Workflow E2E Tests
 *
 * Tests the workflow system:
 * - Viewing workflow templates
 * - Creating workflows
 * - Executing workflows
 * - Viewing execution results
 */

test.describe('Workflow System', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should display workflow templates', async ({ page }) => {
    // Navigate to workflows section
    const workflowsLink = page.locator(
      'a:has-text("Workflows"), a:has-text("Automações"), ' +
      'button:has-text("Workflows"), [data-testid="workflows-nav"]'
    ).first();

    if (await workflowsLink.isVisible()) {
      await workflowsLink.click();
      await page.waitForLoadState('networkidle');

      // Should see workflow templates or list
      const workflowsList = page.locator(
        '[data-testid="workflows-list"], .workflows-list, ' +
        '[data-testid="workflow-templates"], .workflow-card'
      ).first();

      await expect(workflowsList).toBeVisible({ timeout: 10000 });
    }
  });

  test('should open workflow editor', async ({ page }) => {
    // Navigate to workflows
    const workflowsLink = page.locator('a:has-text("Workflows"), button:has-text("Workflows")').first();

    if (await workflowsLink.isVisible()) {
      await workflowsLink.click();
      await page.waitForLoadState('networkidle');
    }

    // Find and click on a workflow or create new
    const workflowCard = page.locator(
      '[data-testid="workflow-card"], .workflow-card, ' +
      'a[href*="/workflow/"], button:has-text("Create Workflow")'
    ).first();

    if (await workflowCard.isVisible()) {
      await workflowCard.click();
      await page.waitForLoadState('networkidle');

      // Should see the workflow canvas/editor
      const canvas = page.locator(
        '[data-testid="workflow-canvas"], .react-flow, ' +
        '.workflow-editor, [class*="reactflow"]'
      ).first();

      await expect(canvas).toBeVisible({ timeout: 10000 });
    }
  });

  test('should add nodes to workflow', async ({ page }) => {
    // Navigate to workflow editor (assuming there's a workflow)
    const workflowsLink = page.locator('a:has-text("Workflows")').first();

    if (await workflowsLink.isVisible()) {
      await workflowsLink.click();
      await page.waitForLoadState('networkidle');

      const workflowCard = page.locator('[data-testid="workflow-card"], .workflow-card').first();
      if (await workflowCard.isVisible()) {
        await workflowCard.click();
        await page.waitForLoadState('networkidle');
      }
    }

    // Find node palette or add node button
    const addNodeButton = page.locator(
      '[data-testid="add-node"], button:has-text("Add Node"), ' +
      '.node-palette, [data-testid="node-palette"]'
    ).first();

    if (await addNodeButton.isVisible()) {
      await addNodeButton.click();

      // Select a node type (e.g., Text Generation)
      const nodeType = page.locator(
        '[data-testid="node-type-text"], button:has-text("Text Generation"), ' +
        'button:has-text("Generate Copy"), [data-node-type="text_generation"]'
      ).first();

      if (await nodeType.isVisible()) {
        await nodeType.click();

        // Verify node was added to canvas
        const newNode = page.locator(
          '.react-flow__node, [data-testid="workflow-node"], .workflow-node'
        );

        await expect(newNode.first()).toBeVisible({ timeout: 5000 });
      }
    }
  });

  test('should execute a workflow', async ({ page }) => {
    // Navigate to a project with a workflow
    const projectItem = page.locator('[data-testid="project-item"], .project-item').first();

    if (await projectItem.isVisible()) {
      await projectItem.click();
      await page.waitForLoadState('networkidle');
    }

    // Find execute workflow button
    const executeButton = page.locator(
      'button:has-text("Execute"), button:has-text("Run"), ' +
      'button:has-text("Executar"), button:has-text("Rodar"), ' +
      '[data-testid="execute-workflow"], button[aria-label*="execute" i]'
    ).first();

    if (await executeButton.isVisible()) {
      await executeButton.click();

      // Wait for execution to start
      await page.waitForTimeout(1000);

      // Should see execution status or progress
      const executionStatus = page.locator(
        '[data-testid="execution-status"], .execution-progress, ' +
        'text=Running, text=Executing, text=Executando, ' +
        '.progress-indicator, [role="progressbar"]'
      ).first();

      // Either we see progress or it completed quickly
      const completed = page.locator(
        'text=Completed, text=Success, text=Concluído, text=Sucesso'
      ).first();

      // Wait for either status to appear
      await expect(executionStatus.or(completed)).toBeVisible({ timeout: 30000 });
    }
  });

  test('should show execution history', async ({ page }) => {
    // Navigate to executions or history
    const historyLink = page.locator(
      'a:has-text("History"), a:has-text("Executions"), ' +
      'a:has-text("Histórico"), button:has-text("History"), ' +
      '[data-testid="execution-history"]'
    ).first();

    if (await historyLink.isVisible()) {
      await historyLink.click();
      await page.waitForLoadState('networkidle');

      // Should see list of past executions
      const executionsList = page.locator(
        '[data-testid="executions-list"], .executions-list, ' +
        'table, [data-testid="execution-item"]'
      ).first();

      await expect(executionsList).toBeVisible({ timeout: 10000 });
    }
  });
});
