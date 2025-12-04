/**
 * MSW (Mock Service Worker) handlers for API mocking in tests.
 *
 * These handlers intercept network requests at the network level,
 * enabling realistic API mocking without modifying application code.
 */

import { http, HttpResponse, delay } from 'msw';
import { setupServer } from 'msw/node';

// Base API URL (matches the application's API base)
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// ============================================================================
// Mock Data
// ============================================================================

const mockUser = {
  id: 'test-user-id',
  email: 'test@example.com',
  full_name: 'Test User',
  is_super_admin: false,
  is_blocked: false,
};

const mockWorkspace = {
  id: 'test-workspace-id',
  name: 'Test Workspace',
  description: 'A test workspace',
  created_at: new Date().toISOString(),
};

const mockProject = {
  id: 'test-project-id',
  name: 'Test Project',
  description: 'A test project',
  workspace_id: 'test-workspace-id',
  settings: {},
  created_at: new Date().toISOString(),
};

const mockDocument = {
  id: 'test-document-id',
  title: 'Test Document',
  content: '# Test Content\n\nThis is test content.',
  status: 'draft',
  project_id: 'test-project-id',
  media_type: 'text',
  created_at: new Date().toISOString(),
};

const mockWorkflow = {
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
};

const mockExecution = {
  id: 'test-execution-id',
  template_id: 'test-workflow-id',
  status: 'completed',
  config_json: { variables: {} },
  execution_context: {},
  created_at: new Date().toISOString(),
};

const mockConversation = {
  id: 'test-conversation-id',
  project_id: 'test-project-id',
  title: 'Test Conversation',
  messages_json: [],
  created_at: new Date().toISOString(),
};

const mockModels = [
  {
    id: 'anthropic/claude-sonnet-4-20250514',
    name: 'Claude Sonnet 4',
    provider: 'anthropic',
  },
  {
    id: 'openai/gpt-4o',
    name: 'GPT-4o',
    provider: 'openai',
  },
];

// ============================================================================
// Request Handlers
// ============================================================================

export const handlers = [
  // Health check
  http.get(`${API_BASE}/health`, () => {
    return HttpResponse.json({ status: 'healthy' });
  }),

  // -------------------------------------------------------------------------
  // Auth endpoints
  // -------------------------------------------------------------------------
  http.get(`${API_BASE}/auth/me`, () => {
    return HttpResponse.json(mockUser);
  }),

  // -------------------------------------------------------------------------
  // Projects endpoints
  // -------------------------------------------------------------------------
  http.get(`${API_BASE}/projects`, () => {
    return HttpResponse.json([mockProject]);
  }),

  http.get(`${API_BASE}/projects/:id`, ({ params }) => {
    return HttpResponse.json({ ...mockProject, id: params.id });
  }),

  http.post(`${API_BASE}/projects`, async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({
      ...mockProject,
      ...body,
      id: 'new-project-id',
    });
  }),

  http.put(`${API_BASE}/projects/:id`, async ({ params, request }) => {
    const body = await request.json();
    return HttpResponse.json({
      ...mockProject,
      ...body,
      id: params.id,
    });
  }),

  http.delete(`${API_BASE}/projects/:id`, () => {
    return HttpResponse.json({ success: true });
  }),

  // -------------------------------------------------------------------------
  // Documents endpoints
  // -------------------------------------------------------------------------
  http.get(`${API_BASE}/documents`, ({ request }) => {
    const url = new URL(request.url);
    const projectId = url.searchParams.get('project_id');
    return HttpResponse.json([{ ...mockDocument, project_id: projectId || mockDocument.project_id }]);
  }),

  http.get(`${API_BASE}/documents/:id`, ({ params }) => {
    return HttpResponse.json({ ...mockDocument, id: params.id });
  }),

  http.post(`${API_BASE}/documents`, async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({
      ...mockDocument,
      ...body,
      id: 'new-document-id',
    });
  }),

  http.put(`${API_BASE}/documents/:id`, async ({ params, request }) => {
    const body = await request.json();
    return HttpResponse.json({
      ...mockDocument,
      ...body,
      id: params.id,
    });
  }),

  http.delete(`${API_BASE}/documents/:id`, () => {
    return HttpResponse.json({ success: true });
  }),

  // -------------------------------------------------------------------------
  // Workflows endpoints
  // -------------------------------------------------------------------------
  http.get(`${API_BASE}/workflows`, () => {
    return HttpResponse.json([mockWorkflow]);
  }),

  http.get(`${API_BASE}/workflows/:id`, ({ params }) => {
    return HttpResponse.json({ ...mockWorkflow, id: params.id });
  }),

  http.post(`${API_BASE}/workflows`, async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({
      ...mockWorkflow,
      ...body,
      id: 'new-workflow-id',
    });
  }),

  http.put(`${API_BASE}/workflows/:id`, async ({ params, request }) => {
    const body = await request.json();
    return HttpResponse.json({
      ...mockWorkflow,
      ...body,
      id: params.id,
    });
  }),

  http.delete(`${API_BASE}/workflows/:id`, () => {
    return HttpResponse.json({ success: true });
  }),

  // -------------------------------------------------------------------------
  // Workflow Executions endpoints
  // -------------------------------------------------------------------------
  http.post(`${API_BASE}/workflows/:id/execute`, async ({ params }) => {
    return HttpResponse.json({
      ...mockExecution,
      template_id: params.id,
      id: 'new-execution-id',
    });
  }),

  http.get(`${API_BASE}/workflows/executions/:id`, ({ params }) => {
    return HttpResponse.json({ ...mockExecution, id: params.id });
  }),

  http.get(`${API_BASE}/workflows/executions/:id/stream`, ({ params }) => {
    // Return SSE stream for execution updates
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const events = [
          { event: 'status', data: JSON.stringify({ status: 'running' }) },
          { event: 'progress', data: JSON.stringify({ node_id: 'start_1', progress: 50 }) },
          { event: 'complete', data: JSON.stringify({ status: 'completed' }) },
        ];

        for (const event of events) {
          await delay(100);
          controller.enqueue(encoder.encode(`event: ${event.event}\ndata: ${event.data}\n\n`));
        }
        controller.close();
      },
    });

    return new HttpResponse(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  }),

  // -------------------------------------------------------------------------
  // Chat endpoints
  // -------------------------------------------------------------------------
  http.get(`${API_BASE}/conversations`, () => {
    return HttpResponse.json([mockConversation]);
  }),

  http.get(`${API_BASE}/conversations/:id`, ({ params }) => {
    return HttpResponse.json({ ...mockConversation, id: params.id });
  }),

  http.post(`${API_BASE}/chat`, async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({
      message: 'This is a mock chat response.',
      conversation_id: body.conversation_id || 'new-conversation-id',
    });
  }),

  http.post(`${API_BASE}/chat/stream`, async () => {
    // Return SSE stream for chat
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const chunks = ['Hello', ' ', 'world', '!'];
        for (const chunk of chunks) {
          await delay(50);
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ content: chunk })}\n\n`)
          );
        }
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      },
    });

    return new HttpResponse(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  }),

  // -------------------------------------------------------------------------
  // Models endpoints
  // -------------------------------------------------------------------------
  http.get(`${API_BASE}/chat/models`, () => {
    return HttpResponse.json(mockModels);
  }),

  http.get(`${API_BASE}/image-generation/models`, () => {
    return HttpResponse.json([
      { id: 'google/gemini-3-pro-image-preview', name: 'Gemini 3 Pro Image' },
    ]);
  }),

  // -------------------------------------------------------------------------
  // Image Generation endpoints
  // -------------------------------------------------------------------------
  http.post(`${API_BASE}/image-generation/generate`, async () => {
    await delay(500); // Simulate processing time
    return HttpResponse.json({
      url: 'https://mock-image-url.com/generated.png',
      revised_prompt: 'A beautiful landscape',
    });
  }),
];

// ============================================================================
// Server Setup
// ============================================================================

export const server = setupServer(...handlers);

// ============================================================================
// Helper Functions for Tests
// ============================================================================

/**
 * Add a custom handler for a specific test.
 * Use this to override default handlers or add test-specific responses.
 */
export function addHandler(handler: ReturnType<typeof http.get>) {
  server.use(handler);
}

/**
 * Reset handlers to default after test modifications.
 */
export function resetHandlers() {
  server.resetHandlers();
}

/**
 * Create a handler that returns an error response.
 */
export function createErrorHandler(
  method: 'get' | 'post' | 'put' | 'delete',
  path: string,
  status: number = 500,
  message: string = 'Internal Server Error'
) {
  const handler = http[method](`${API_BASE}${path}`, () => {
    return HttpResponse.json({ detail: message }, { status });
  });
  server.use(handler);
}

/**
 * Create a handler that simulates network delay.
 */
export function createDelayedHandler(
  method: 'get' | 'post' | 'put' | 'delete',
  path: string,
  delayMs: number,
  response: unknown
) {
  const handler = http[method](`${API_BASE}${path}`, async () => {
    await delay(delayMs);
    return HttpResponse.json(response);
  });
  server.use(handler);
}
