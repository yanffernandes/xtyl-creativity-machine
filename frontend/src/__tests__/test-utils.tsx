/**
 * Test utilities for React component testing.
 *
 * Provides a custom render function that wraps components with
 * all necessary providers (QueryClient, Theme, etc.).
 */

import React, { ReactElement, ReactNode } from 'react';
import { render, RenderOptions, RenderResult } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import userEvent from '@testing-library/user-event';

// ============================================================================
// Query Client for Tests
// ============================================================================

/**
 * Create a new QueryClient for each test.
 * Configured with defaults suitable for testing:
 * - No retries (fail fast)
 * - No garbage collection
 * - Stale time of 0 (always refetch)
 */
function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: Infinity,
        staleTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

// ============================================================================
// Provider Wrapper
// ============================================================================

interface WrapperProps {
  children: ReactNode;
}

/**
 * Create a wrapper component with all providers.
 * Add any additional providers your app uses here.
 */
function createWrapper(): React.FC<WrapperProps> {
  const queryClient = createTestQueryClient();

  return function Wrapper({ children }: WrapperProps) {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );
  };
}

// ============================================================================
// Custom Render Function
// ============================================================================

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  queryClient?: QueryClient;
}

/**
 * Custom render function that wraps the component with all necessary providers.
 *
 * @example
 * ```tsx
 * import { render, screen } from '@/__tests__/test-utils';
 *
 * test('renders component', () => {
 *   render(<MyComponent />);
 *   expect(screen.getByText('Hello')).toBeInTheDocument();
 * });
 * ```
 */
function customRender(
  ui: ReactElement,
  options?: CustomRenderOptions
): RenderResult {
  const Wrapper = createWrapper();
  return render(ui, { wrapper: Wrapper, ...options });
}

// ============================================================================
// User Event Setup
// ============================================================================

/**
 * Setup userEvent for more realistic user interactions.
 *
 * @example
 * ```tsx
 * import { render, screen, setupUser } from '@/__tests__/test-utils';
 *
 * test('handles click', async () => {
 *   const user = setupUser();
 *   render(<Button onClick={handleClick}>Click me</Button>);
 *   await user.click(screen.getByRole('button'));
 *   expect(handleClick).toHaveBeenCalled();
 * });
 * ```
 */
function setupUser() {
  return userEvent.setup();
}

// ============================================================================
// Mock Data Helpers
// ============================================================================

/**
 * Create mock user data for testing.
 */
export function createMockUser(overrides = {}) {
  return {
    id: 'test-user-id',
    email: 'test@example.com',
    full_name: 'Test User',
    is_super_admin: false,
    is_blocked: false,
    ...overrides,
  };
}

/**
 * Create mock project data for testing.
 */
export function createMockProject(overrides = {}) {
  return {
    id: 'test-project-id',
    name: 'Test Project',
    description: 'A test project',
    workspace_id: 'test-workspace-id',
    settings: {},
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Create mock document data for testing.
 */
export function createMockDocument(overrides = {}) {
  return {
    id: 'test-document-id',
    title: 'Test Document',
    content: '# Test Content\n\nThis is test content.',
    status: 'draft',
    project_id: 'test-project-id',
    media_type: 'text',
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Create mock workflow data for testing.
 */
export function createMockWorkflow(overrides = {}) {
  return {
    id: 'test-workflow-id',
    name: 'Test Workflow',
    description: 'A test workflow',
    category: 'custom',
    nodes_json: [
      { id: 'start_1', type: 'start', data: { input_variables: ['input'] } },
      { id: 'finish_1', type: 'finish', data: {} },
    ],
    edges_json: [{ id: 'e1', source: 'start_1', target: 'finish_1' }],
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Create mock conversation data for testing.
 */
export function createMockConversation(overrides = {}) {
  return {
    id: 'test-conversation-id',
    project_id: 'test-project-id',
    title: 'Test Conversation',
    messages_json: [],
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

// ============================================================================
// Wait Helpers
// ============================================================================

/**
 * Wait for a specified amount of time.
 * Useful for waiting for async operations in tests.
 */
export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Wait for the next tick of the event loop.
 */
export function waitForNextTick(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

// ============================================================================
// Re-exports
// ============================================================================

// Re-export everything from @testing-library/react
export * from '@testing-library/react';

// Export custom utilities
export { customRender as render, setupUser, createTestQueryClient };
