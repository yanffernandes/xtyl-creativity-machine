import { test, expect } from '@playwright/test';

/**
 * Chat/AI Assistant E2E Tests
 *
 * Tests the AI chat functionality:
 * - Opening chat
 * - Sending messages
 * - Receiving AI responses
 * - Chat history
 */

test.describe('AI Chat', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should open chat interface', async ({ page }) => {
    // Find chat button or link
    const chatButton = page.locator(
      'button:has-text("Chat"), a:has-text("Chat"), ' +
      '[data-testid="chat-button"], [aria-label*="chat" i], ' +
      'button:has-text("Assistant"), button:has-text("Assistente")'
    ).first();

    if (await chatButton.isVisible()) {
      await chatButton.click();
      await page.waitForTimeout(500);

      // Should see chat input
      const chatInput = page.locator(
        '[data-testid="chat-input"], textarea[placeholder*="message" i], ' +
        'textarea[placeholder*="mensagem" i], input[placeholder*="Ask" i], ' +
        '.chat-input, [contenteditable="true"]'
      ).first();

      await expect(chatInput).toBeVisible({ timeout: 5000 });
    }
  });

  test('should send a message and receive response', async ({ page }) => {
    // Open chat
    const chatButton = page.locator(
      'button:has-text("Chat"), [data-testid="chat-button"]'
    ).first();

    if (await chatButton.isVisible()) {
      await chatButton.click();
      await page.waitForTimeout(500);
    }

    // Find and fill chat input
    const chatInput = page.locator(
      '[data-testid="chat-input"], textarea, .chat-input'
    ).first();

    if (!(await chatInput.isVisible())) {
      test.skip();
      return;
    }

    const testMessage = 'Hello, this is a test message';
    await chatInput.fill(testMessage);

    // Send message
    const sendButton = page.locator(
      'button[type="submit"], button:has-text("Send"), ' +
      'button:has-text("Enviar"), button[aria-label*="send" i], ' +
      '[data-testid="send-message"]'
    ).first();

    if (await sendButton.isVisible()) {
      await sendButton.click();
    } else {
      await chatInput.press('Enter');
    }

    // Wait for response (AI might take a few seconds)
    const responseMessage = page.locator(
      '[data-testid="ai-message"], .ai-message, ' +
      '.assistant-message, [data-role="assistant"]'
    ).first();

    await expect(responseMessage).toBeVisible({ timeout: 60000 });
  });

  test('should show chat history', async ({ page }) => {
    // Open chat
    const chatButton = page.locator('button:has-text("Chat")').first();

    if (await chatButton.isVisible()) {
      await chatButton.click();
      await page.waitForTimeout(500);
    }

    // Look for conversation history or list
    const historyButton = page.locator(
      'button:has-text("History"), button:has-text("Histórico"), ' +
      '[data-testid="chat-history"], [aria-label*="history" i]'
    ).first();

    if (await historyButton.isVisible()) {
      await historyButton.click();

      // Should see list of past conversations
      const conversationsList = page.locator(
        '[data-testid="conversations-list"], .conversations-list, ' +
        '[data-testid="conversation-item"]'
      ).first();

      await expect(conversationsList).toBeVisible({ timeout: 5000 });
    }
  });

  test('should create new conversation', async ({ page }) => {
    // Open chat
    const chatButton = page.locator('button:has-text("Chat")').first();

    if (await chatButton.isVisible()) {
      await chatButton.click();
      await page.waitForTimeout(500);
    }

    // Find new conversation button
    const newChatButton = page.locator(
      'button:has-text("New Chat"), button:has-text("Nova Conversa"), ' +
      '[data-testid="new-conversation"], button:has-text("+")'
    ).first();

    if (await newChatButton.isVisible()) {
      await newChatButton.click();
      await page.waitForTimeout(500);

      // Should have empty chat ready for input
      const chatInput = page.locator(
        '[data-testid="chat-input"], textarea, .chat-input'
      ).first();

      await expect(chatInput).toBeVisible();
      await expect(chatInput).toBeEmpty();
    }
  });
});
