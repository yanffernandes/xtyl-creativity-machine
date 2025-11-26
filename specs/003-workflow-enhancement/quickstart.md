# Quickstart Guide: Workflow Enhancement Development

**Feature**: 003-workflow-enhancement
**Date**: 2025-11-25
**Audience**: Developers implementing the workflow system

## Overview

This guide helps developers get started with building and testing the complete workflow system. It covers:
- Setting up the development environment
- Understanding the workflow architecture
- Creating your first workflow
- Testing workflow execution
- Debugging common issues

## Prerequisites

- Docker Desktop installed and running
- Node.js 20+ and npm 9+
- Python 3.11+
- PostgreSQL client (optional, for manual queries)
- Git

## Architecture Overview

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│  Frontend (Next.js 16 + ReactFlow)                          │
│  - Visual workflow editor                                    │
│  - Real-time execution monitoring (SSE)                      │
│  - Node palette and configuration panels                     │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ HTTP/REST API
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  Backend (FastAPI)                                           │
│  - Workflow CRUD endpoints (/workflows)                      │
│  - Execution control endpoints (/workflows/executions)       │
│  - Variable resolution engine                                │
│  - Workflow validation                                        │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ Task Queue
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  Celery Workers                                              │
│  - Async workflow execution                                  │
│  - Node-by-node processing                                   │
│  - AI API calls (OpenRouter)                                 │
└─────────────────────────────────────────────────────────────┘
                            │
                    ┌───────┴───────┐
                    │               │
                    ▼               ▼
        ┌──────────────────┐  ┌──────────────────┐
        │  PostgreSQL      │  │  Redis           │
        │  - Workflows     │  │  - Task queue    │
        │  - Executions    │  │  - Exec state    │
        │  - Node outputs  │  │  - Model cache   │
        └──────────────────┘  └──────────────────┘
```

### Data Flow

1. **User creates workflow**: Frontend → POST /workflows → PostgreSQL
2. **User executes workflow**: Frontend → POST /workflows/{id}/execute → Celery task created
3. **Celery worker processes**:
   - Fetch workflow definition from PostgreSQL
   - Execute nodes in topological order
   - Resolve variables from previous outputs
   - Store results in PostgreSQL
   - Update execution state in Redis
4. **Frontend monitors**: SSE stream → GET /workflows/executions/{id}/stream → Real-time updates

---

## Development Environment Setup

### Step 1: Clone and Install Dependencies

```bash
# Navigate to project root
cd /Users/yanfernandes/GitHub/xtyl-creativity-machine

# Backend dependencies (Python)
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
cd ..

# Frontend dependencies (Node.js)
cd frontend
npm install
cd ..
```

### Step 2: Configure Environment Variables

```bash
# Copy example environment file
cp .env.example .env

# Edit .env and ensure these variables are set:
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/xtyl_db

# Redis
REDIS_URL=redis://localhost:6379/0

# OpenRouter API
OPENROUTER_API_KEY=your_openrouter_api_key_here

# Celery
CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND=redis://localhost:6379/0

# MinIO (for image storage)
MINIO_ENDPOINT=localhost:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET=xtyl-media
```

### Step 3: Start Services with Docker Compose

```bash
# Start PostgreSQL, Redis, MinIO
docker compose -f docker-compose.dev.yml up -d db redis minio

# Wait for services to be ready (10-15 seconds)
sleep 15

# Verify services are running
docker compose -f docker-compose.dev.yml ps
```

### Step 4: Apply Database Migrations

```bash
# The backend automatically applies migrations on startup
# But you can manually apply them:
cd backend
python -m alembic upgrade head
cd ..
```

### Step 5: Start Development Servers

**Terminal 1 - Backend API**:
```bash
cd backend
source venv/bin/activate
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

**Terminal 2 - Celery Worker**:
```bash
cd backend
source venv/bin/activate
celery -A celery_app worker --loglevel=info
```

**Terminal 3 - Frontend**:
```bash
cd frontend
npm run dev
```

### Step 6: Verify Setup

Open your browser and navigate to:
- Frontend: http://localhost:3000
- Backend API docs: http://localhost:8000/docs
- MinIO console: http://localhost:9001 (login: minioadmin/minioadmin)

---

## Creating Your First Workflow

### Method 1: Using the Visual Editor (Frontend)

1. **Navigate to workflows**:
   - Go to http://localhost:3000/workspace/{workspace-id}/workflows
   - Click "New Workflow"

2. **Drag nodes from palette**:
   - Drag "Start" node → Place at (100, 100)
   - Drag "Text Generation" node → Place at (400, 100)
   - Drag "Finish" node → Place at (700, 100)

3. **Connect nodes**:
   - Click and drag from Start node's output handle to Text Gen's input handle
   - Click and drag from Text Gen's output handle to Finish's input handle

4. **Configure nodes**:

   **Start Node**:
   - Click Start node to open configuration panel
   - Add input variable:
     - Name: `topic`
     - Type: `text`
     - Required: `true`
     - Description: "The topic to write about"

   **Text Generation Node**:
   - Click Text Gen node
   - Label: "Generate Article"
   - Prompt: `Write a 200-word article about {{start.topic}}`
   - Model: `openai/gpt-4-turbo`
   - Max Tokens: `500`
   - Temperature: `0.7`

   **Finish Node**:
   - Click Finish node
   - Save to Project: `true`
   - Document Title: `Article: {{start.topic}}`
   - Notify User: `true`

5. **Save workflow**:
   - Click "Save Workflow"
   - Name: "Simple Article Generator"
   - Category: "content_generation"

### Method 2: Using the API (Backend)

```bash
# Create workflow via API
curl -X POST http://localhost:8000/api/workflows \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "name": "Simple Article Generator",
    "description": "Generates a short article on any topic",
    "category": "content_generation",
    "workspace_id": "workspace-123",
    "project_id": null,
    "nodes": [
      {
        "id": "start-1",
        "type": "start",
        "position": {"x": 100, "y": 100},
        "data": {
          "label": "Start",
          "inputVariables": [
            {
              "name": "topic",
              "type": "text",
              "required": true,
              "description": "The topic to write about"
            }
          ]
        }
      },
      {
        "id": "textgen-2",
        "type": "text_generation",
        "position": {"x": 400, "y": 100},
        "data": {
          "label": "Generate Article",
          "prompt": "Write a 200-word article about {{start.topic}}",
          "model": "openai/gpt-4-turbo",
          "maxTokens": 500,
          "temperature": 0.7
        }
      },
      {
        "id": "finish-3",
        "type": "finish",
        "position": {"x": 700, "y": 100},
        "data": {
          "label": "Save Article",
          "saveToProject": true,
          "documentTitle": "Article: {{start.topic}}",
          "notifyUser": true
        }
      }
    ],
    "edges": [
      {
        "id": "e1",
        "source": "start-1",
        "target": "textgen-2"
      },
      {
        "id": "e2",
        "source": "textgen-2",
        "target": "finish-3"
      }
    ]
  }'
```

---

## Executing Your First Workflow

### Execute via Frontend

1. Navigate to workflow detail page
2. Click "Run Workflow" button
3. Enter input variables in modal:
   - Topic: "Artificial Intelligence in Healthcare"
4. Click "Start Execution"
5. Watch real-time progress in ExecutionMonitor panel

### Execute via API

```bash
# Get workflow ID from previous creation
WORKFLOW_ID="workflow-abc123"

# Execute workflow
curl -X POST http://localhost:8000/api/workflows/${WORKFLOW_ID}/execute \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "project_id": "project-456",
    "input_variables": {
      "topic": "Artificial Intelligence in Healthcare"
    },
    "notify_on_completion": true
  }'

# Response:
{
  "execution_id": "exec-789",
  "status": "running",
  "stream_url": "/api/workflows/executions/exec-789/stream"
}
```

### Monitor Execution Progress (SSE)

```bash
# Stream real-time progress
curl -N http://localhost:8000/api/workflows/executions/exec-789/stream \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Output:
# event: node_started
# data: {"node_id": "textgen-2", "node_name": "Generate Article", "timestamp": "2025-11-25T18:45:23Z"}
#
# event: node_completed
# data: {"node_id": "textgen-2", "outputs": {"content": "AI in healthcare is revolutionizing..."}, "timestamp": "2025-11-25T18:45:45Z"}
#
# event: execution_completed
# data: {"status": "completed", "total_cost": 0.012, "generated_documents": ["doc-999"]}
```

---

## Testing Workflows

### Unit Tests (Backend)

**Test Variable Resolution**:

```python
# backend/tests/test_variable_resolver.py
import pytest
from services.variable_resolver import VariableResolver

def test_simple_variable_resolution():
    resolver = VariableResolver()
    context = {
        "start-1": {"topic": "AI"},
        "textgen-2": {"content": "AI is amazing", "word_count": 3}
    }

    prompt = "Write about {{start-1.topic}} with {{textgen-2.word_count}} words"
    result = resolver.resolve(prompt, context)

    assert result == "Write about AI with 3 words"

def test_missing_variable_error():
    resolver = VariableResolver()
    context = {"start-1": {"topic": "AI"}}

    prompt = "Reference {{nonexistent.field}}"

    with pytest.raises(ValueError, match="Node nonexistent not found"):
        resolver.resolve(prompt, context)

# Run tests
pytest backend/tests/test_variable_resolver.py -v
```

**Test Node Execution**:

```python
# backend/tests/test_node_executor.py
import pytest
from services.node_executor import NodeExecutor

@pytest.mark.asyncio
async def test_text_generation_node():
    executor = NodeExecutor()
    node = {
        "id": "textgen-1",
        "type": "text_generation",
        "data": {
            "prompt": "Say hello",
            "model": "openai/gpt-3.5-turbo",
            "maxTokens": 10
        }
    }

    result = await executor.execute_node(node, execution_context={})

    assert "content" in result
    assert len(result["content"]) > 0
    assert result["model_used"] == "openai/gpt-3.5-turbo"

# Run tests
pytest backend/tests/test_node_executor.py -v
```

### Integration Tests (End-to-End)

```python
# backend/tests/test_workflow_execution.py
import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_complete_workflow_execution(async_client: AsyncClient):
    # Create workflow
    workflow_data = {
        "name": "Test Workflow",
        "workspace_id": "ws-123",
        "nodes": [...],  # Full workflow definition
        "edges": [...]
    }

    create_response = await async_client.post("/api/workflows", json=workflow_data)
    assert create_response.status_code == 201
    workflow_id = create_response.json()["id"]

    # Execute workflow
    execute_response = await async_client.post(
        f"/api/workflows/{workflow_id}/execute",
        json={
            "project_id": "proj-456",
            "input_variables": {"topic": "Testing"}
        }
    )
    assert execute_response.status_code == 202
    execution_id = execute_response.json()["execution_id"]

    # Poll for completion (simplified - use SSE in production)
    import asyncio
    for _ in range(30):  # 30 second timeout
        status_response = await async_client.get(f"/api/workflows/executions/{execution_id}")
        status = status_response.json()["status"]
        if status in ["completed", "failed"]:
            break
        await asyncio.sleep(1)

    assert status == "completed"
    assert len(status_response.json()["generated_documents"]) > 0

# Run tests
pytest backend/tests/test_workflow_execution.py -v
```

### Frontend Component Tests

```typescript
// frontend/src/components/workflow/__tests__/WorkflowCanvas.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import WorkflowCanvas from '../WorkflowCanvas';

describe('WorkflowCanvas', () => {
  it('renders empty canvas', () => {
    render(<WorkflowCanvas nodes={[]} edges={[]} />);
    expect(screen.getByText('Drag nodes from palette')).toBeInTheDocument();
  });

  it('adds node on drop', () => {
    const onNodesChange = jest.fn();
    render(<WorkflowCanvas nodes={[]} edges={[]} onNodesChange={onNodesChange} />);

    // Simulate drag and drop
    const canvas = screen.getByRole('region');
    fireEvent.drop(canvas, {
      dataTransfer: {
        getData: () => JSON.stringify({ type: 'text_generation' })
      }
    });

    expect(onNodesChange).toHaveBeenCalled();
  });
});

// Run tests
npm test -- WorkflowCanvas.test.tsx
```

---

## Debugging Common Issues

### Issue 1: Celery Worker Not Starting

**Symptoms**:
- Workflow executions stay in "pending" status
- No logs in Celery terminal

**Solution**:
```bash
# Check Redis connection
redis-cli ping  # Should return "PONG"

# Check Celery broker URL
echo $CELERY_BROKER_URL  # Should be redis://localhost:6379/0

# Restart Celery with verbose logging
celery -A celery_app worker --loglevel=debug
```

### Issue 2: Variable Resolution Fails

**Symptoms**:
- Execution fails with "Variable not found" error
- Node prompt shows `{{node.field}}` instead of resolved value

**Debug Steps**:
1. Check execution logs:
   ```bash
   curl http://localhost:8000/api/workflows/executions/{execution_id}/logs
   ```

2. Verify execution context:
   ```sql
   SELECT execution_context FROM workflow_executions WHERE id = 'exec-123';
   ```

3. Ensure node names match:
   - Node ID in workflow: `textgen-2`
   - Variable reference: `{{textgen-2.content}}` ✅
   - Incorrect: `{{text_gen.content}}` ❌

### Issue 3: OpenRouter API Errors

**Symptoms**:
- Text/image generation nodes fail
- Error: "API key invalid" or "Model not found"

**Solution**:
```bash
# Verify API key
echo $OPENROUTER_API_KEY

# Test API manually
curl https://openrouter.ai/api/v1/models \
  -H "Authorization: Bearer $OPENROUTER_API_KEY"

# Check model availability
curl http://localhost:8000/api/workflows/models?type=text
```

### Issue 4: SSE Stream Not Updating

**Symptoms**:
- Frontend execution monitor shows no progress
- SSE connection drops

**Debug Steps**:
1. Check browser console for SSE errors
2. Verify backend sends events:
   ```bash
   curl -N http://localhost:8000/api/workflows/executions/{id}/stream
   ```
3. Check CORS configuration in `backend/main.py`
4. Ensure Redis is running (execution state cached there)

---

## Advanced Workflows

### Example 1: Loop Workflow

```json
{
  "nodes": [
    {
      "id": "start-1",
      "type": "start",
      "data": {
        "inputVariables": [
          {"name": "base_prompt", "type": "text", "required": true}
        ]
      }
    },
    {
      "id": "loop-2",
      "type": "loop",
      "data": {
        "label": "Generate 5 Variations",
        "iterations": 5
      }
    },
    {
      "id": "textgen-3",
      "type": "text_generation",
      "data": {
        "prompt": "Variation {{loop.iteration}} of: {{start.base_prompt}}",
        "model": "openai/gpt-4-turbo"
      }
    },
    {
      "id": "finish-4",
      "type": "finish",
      "data": {
        "documentTitle": "Variation {{loop.iteration}}"
      }
    }
  ],
  "edges": [
    {"source": "start-1", "target": "loop-2"},
    {"source": "loop-2", "target": "textgen-3"},
    {"source": "textgen-3", "target": "finish-4"}
  ]
}
```

### Example 2: Conditional Workflow

```json
{
  "nodes": [
    {
      "id": "textgen-1",
      "type": "text_generation",
      "data": {
        "prompt": "Write a tweet about AI",
        "model": "openai/gpt-4-turbo"
      }
    },
    {
      "id": "conditional-2",
      "type": "conditional",
      "data": {
        "condition": "{{textgen-1.character_count}} <= 280"
      }
    },
    {
      "id": "finish-3",
      "type": "finish",
      "data": {"label": "Tweet is valid"}
    },
    {
      "id": "textgen-4",
      "type": "text_generation",
      "data": {
        "prompt": "Shorten this to 280 chars: {{textgen-1.content}}",
        "model": "openai/gpt-4-turbo"
      }
    }
  ],
  "edges": [
    {"source": "textgen-1", "target": "conditional-2"},
    {"source": "conditional-2", "target": "finish-3", "sourceHandle": "true"},
    {"source": "conditional-2", "target": "textgen-4", "sourceHandle": "false"},
    {"source": "textgen-4", "target": "finish-3"}
  ]
}
```

### Example 3: Context-Aware Workflow

```json
{
  "nodes": [
    {
      "id": "context-1",
      "type": "context_retrieval",
      "data": {
        "label": "Fetch Brand Guidelines",
        "filters": {
          "status": "approved",
          "tags": ["brand"]
        },
        "maxResults": 5
      }
    },
    {
      "id": "processing-2",
      "type": "processing",
      "data": {
        "prompt": "Extract brand colors from: {{context-1.documents}}",
        "model": "openai/gpt-4-turbo",
        "outputFormat": "json"
      }
    },
    {
      "id": "textgen-3",
      "type": "text_generation",
      "data": {
        "prompt": "Write a brand description using these colors: {{processing-2.result}}"
      }
    }
  ],
  "edges": [
    {"source": "context-1", "target": "processing-2"},
    {"source": "processing-2", "target": "textgen-3"}
  ]
}
```

### Example 4: Structured Outputs with Field Extraction

**Use Case**: Generate multiple content pieces (title, caption, prompt) in one node, then use specific fields in downstream nodes.

```json
{
  "nodes": [
    {
      "id": "start-1",
      "type": "start",
      "data": {
        "inputVariables": [
          {"name": "campaign_theme", "type": "text", "required": true}
        ]
      }
    },
    {
      "id": "copywriter-2",
      "type": "text_generation",
      "data": {
        "label": "Generate Marketing Copy",
        "prompt": "Create marketing content for {{start-1.campaign_theme}}. Return JSON with: {\"title\": \"...\", \"caption\": \"...\", \"image_prompt\": \"...\"}",
        "model": "openai/gpt-4-turbo",
        "outputFormat": "json"
      }
    },
    {
      "id": "image-3",
      "type": "image_generation",
      "data": {
        "label": "Generate Banner",
        "prompt": "{{copywriter-2.image_prompt}}",
        "model": "black-forest-labs/flux-pro",
        "size": "1024x1024"
      }
    },
    {
      "id": "finish-4",
      "type": "finish",
      "data": {
        "documentTitle": "{{copywriter-2.title}}",
        "saveToProject": true
      }
    }
  ],
  "edges": [
    {"source": "start-1", "target": "copywriter-2"},
    {"source": "copywriter-2", "target": "image-3"},
    {"source": "image-3", "target": "finish-4"}
  ]
}
```

**How It Works**:

1. **Copywriter Node** generates JSON with multiple fields:
   ```json
   {
     "title": "Summer Vibes Sale",
     "caption": "Hot deals for the season",
     "image_prompt": "Beach scene with palm trees and bright sun, vibrant colors"
   }
   ```

2. **OutputParser** automatically extracts fields:
   - `copywriter-2.content` → Full original response
   - `copywriter-2.title` → "Summer Vibes Sale"
   - `copywriter-2.caption` → "Hot deals for the season"
   - `copywriter-2.image_prompt` → "Beach scene with..."

3. **Image Node** uses only `{{copywriter-2.image_prompt}}` → Sends just the prompt to image API

4. **Finish Node** uses `{{copywriter-2.title}}` → Document saved with specific title

**Supported Output Formats**:
- **Text** (default): Only `.content` field available
- **JSON**: All JSON keys become individual fields (`.title`, `.caption`, etc.)
- **Markdown**: Headings become fields (e.g., `## Title` → `.title`)

**Variable Autocomplete**: When typing `{{copywriter-2.`, autocomplete shows all parsed fields grouped:
```
copywriter-2
  ├─ content         (Full response)
  ├─ title           (Extracted from JSON)
  ├─ caption         (Extracted from JSON)
  └─ image_prompt    (Extracted from JSON)
```

---

## Useful Commands

### Database Queries

```sql
-- View all workflows in workspace
SELECT id, name, category, created_at
FROM workflow_templates
WHERE workspace_id = 'ws-123'
ORDER BY created_at DESC;

-- View execution history
SELECT id, status, progress_percent, total_cost, created_at
FROM workflow_executions
WHERE workspace_id = 'ws-123'
ORDER BY created_at DESC
LIMIT 10;

-- View node outputs for execution
SELECT node_id, node_name, outputs, execution_order
FROM node_outputs
WHERE execution_id = 'exec-789'
ORDER BY execution_order;

-- Calculate workspace costs
SELECT
  SUM(total_cost) as total_spent,
  COUNT(*) as total_executions,
  AVG(total_cost) as avg_cost_per_execution
FROM workflow_executions
WHERE workspace_id = 'ws-123'
  AND created_at >= NOW() - INTERVAL '30 days';
```

### Redis Commands

```bash
# View execution state
redis-cli GET "execution:exec-789"

# View cached models
redis-cli GET "models:text"

# View Celery tasks
redis-cli KEYS "celery-task-*"
```

---

## Next Steps

1. **Read the spec**: Review `/specs/003-workflow-enhancement/spec.md` for requirements
2. **Study data model**: Understand entities in `/specs/003-workflow-enhancement/data-model.md`
3. **Review API contracts**: See `/specs/003-workflow-enhancement/contracts/*.yaml`
4. **Generate tasks**: Run `/speckit.tasks` to create implementation task list
5. **Start coding**: Follow generated `tasks.md` incrementally

---

## Additional Resources

- **ReactFlow Docs**: https://reactflow.dev/
- **Celery Docs**: https://docs.celeryq.dev/
- **FastAPI Docs**: https://fastapi.tiangolo.com/
- **OpenRouter API**: https://openrouter.ai/docs
- **Server-Sent Events**: https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events

---

## Support

For questions or issues:
1. Check existing GitHub issues
2. Review execution logs in database
3. Check Celery worker logs
4. Consult team on Slack #workflow-dev channel
