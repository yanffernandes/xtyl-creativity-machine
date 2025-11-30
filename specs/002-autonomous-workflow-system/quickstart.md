# Quickstart Guide: Autonomous Workflow System

This guide will help you set up and test the autonomous workflow system for XTYL locally.

## Prerequisites

Before starting, ensure you have:

- **Docker & Docker Compose** (v20.10+)
- **Node.js** (v20+)
- **Python** (v3.11+)
- **Git** (for cloning the repository)
- Existing XTYL system base installation

## Setup Steps

### 1. Install Dependencies

#### Backend Dependencies

```bash
cd backend
pip install celery[redis] redis
pip install -r requirements.txt
```

#### Frontend Dependencies

```bash
cd frontend
npm install reactflow @xyflow/react
npm install
```

### 2. Start Services

Start all required services using Docker Compose:

```bash
# From project root
docker-compose -f docker-compose.dev.yml up -d
```

This starts:
- PostgreSQL (database)
- Redis (task queue)
- MinIO (object storage)
- Backend API
- Frontend development server
- Celery worker

Verify services are running:

```bash
docker-compose -f docker-compose.dev.yml ps
```

Expected output should show all services as "Up".

### 3. Run Database Migration

Create the workflow system tables:

```bash
cd backend
alembic upgrade head
```

This creates:
- `workflow_templates` - Stores reusable workflow definitions
- `workflow_executions` - Tracks workflow runs
- `workflow_nodes` - Individual node configurations
- `workflow_edges` - Node connections
- `node_executions` - Node execution state and logs
- `document_attachments` - Image/file attachments

### 4. Seed Template Data

Populate the system with pre-built workflow templates:

```bash
cd backend
python scripts/seed_workflow_templates.py
```

This creates 10 production-ready templates:
- Blog Post Generator
- Social Media Campaign
- Product Launch Package
- SEO Content Suite
- Email Drip Campaign
- Video Script Pipeline
- Podcast Episode Package
- Case Study Generator
- Newsletter Builder
- Landing Page Creator

Verify templates were created:

```bash
curl http://localhost:8000/api/workflows/templates | jq
```

## Development Workflow

### Creating a Custom Workflow

1. **Navigate to Workflow Builder**
   ```
   http://localhost:3000/workspace/{workspace_id}/workflows
   ```

2. **Start New Workflow**
   - Click "Create Custom Workflow"
   - Enter workflow name and description

3. **Build Workflow**
   - Drag nodes from the palette:
     - Content Generation (blog post, social, email)
     - Image Generation (DALL-E, Stable Diffusion)
     - Review & Approval (human checkpoint)
     - Conditional Logic (branching)
   - Configure each node (click to open settings panel)
   - Connect nodes by dragging from output to input ports

4. **Save as Template**
   - Click "Save as Template"
   - Set visibility (personal/team/public)
   - Add tags for discoverability

5. **Test Run**
   - Click "Test Workflow"
   - Provide test inputs
   - Monitor execution in real-time

### Testing Workflow Execution

#### Launch a Workflow

```bash
# Using curl
curl -X POST http://localhost:8000/api/workflows/execute \
  -H "Content-Type: application/json" \
  -d '{
    "template_id": "blog-post-generator",
    "parameters": {
      "topic": "The Future of AI in Marketing",
      "tone": "professional",
      "word_count": 1500,
      "generate_images": true
    },
    "project_id": "your-project-id"
  }'
```

#### Monitor Execution

1. **Via Dashboard**
   - Navigate to Active Workflows panel
   - Watch progress bar and node status updates
   - View live logs in execution details

2. **Via API**
   ```bash
   # Get execution status
   curl http://localhost:8000/api/workflows/executions/{execution_id}

   # Get node execution details
   curl http://localhost:8000/api/workflows/executions/{execution_id}/nodes

   # Stream logs
   curl http://localhost:8000/api/workflows/executions/{execution_id}/logs
   ```

3. **Via Database**
   ```bash
   docker exec -it postgres psql -U xtyl -d xtyl_db

   SELECT id, status, current_node, progress
   FROM workflow_executions
   WHERE id = 'execution-id';
   ```

#### Verify Output

Check that documents were created:

```bash
curl http://localhost:8000/api/projects/{project_id}/documents
```

### Debugging Celery Tasks

#### View Worker Logs

```bash
# Real-time logs
docker logs -f celery-worker

# Last 100 lines
docker logs --tail 100 celery-worker

# Filter for errors
docker logs celery-worker 2>&1 | grep ERROR
```

#### Inspect Redis Queue

```bash
# Connect to Redis
docker exec -it redis redis-cli

# List all workflow keys
KEYS workflow:*

# Get execution state
GET workflow:execution:{execution_id}:state

# List active tasks
LRANGE celery 0 -1

# Monitor commands in real-time
MONITOR
```

#### Check Task Queue Status

```bash
# Celery inspect
docker exec celery-worker celery -A app.celery inspect active
docker exec celery-worker celery -A app.celery inspect scheduled
docker exec celery-worker celery -A app.celery inspect reserved

# Check worker stats
docker exec celery-worker celery -A app.celery inspect stats
```

#### Manual Task Execution (Testing)

```python
# In Python shell
from app.tasks import execute_workflow_node

# Execute node directly
result = execute_workflow_node.apply_async(
    args=['node-id', 'execution-id'],
    countdown=0
)

# Check result
result.get(timeout=30)
```

## Common Issues

### Issue: Celery Worker Not Starting

**Symptoms:** No logs from celery-worker container, workflows stuck in "pending"

**Solutions:**
```bash
# Check Redis connection
docker exec celery-worker redis-cli ping
# Expected: PONG

# Verify Celery config
docker exec celery-worker env | grep CELERY

# Restart worker with verbose logging
docker-compose -f docker-compose.dev.yml restart celery-worker
docker logs -f celery-worker
```

### Issue: Workflow Stuck in "Pending"

**Symptoms:** Execution starts but never progresses

**Solutions:**
```bash
# Check worker logs for errors
docker logs celery-worker 2>&1 | grep -A 10 "ERROR"

# Verify execution record exists
curl http://localhost:8000/api/workflows/executions/{id}

# Check if task was queued
docker exec redis redis-cli LLEN celery

# Manually trigger next node
curl -X POST http://localhost:8000/api/workflows/executions/{id}/retry
```

### Issue: Node Validation Fails

**Symptoms:** "Invalid node configuration" error when saving workflow

**Solutions:**
```bash
# Verify node schema matches expected format
curl http://localhost:8000/api/workflows/node-types/{type}/schema

# Common issues:
# - Missing required field (e.g., "prompt" for content generation)
# - Invalid enum value (e.g., tone must be "professional", "casual", or "formal")
# - Wrong data type (e.g., word_count must be integer, not string)

# Example valid configuration:
{
  "type": "content_generation",
  "config": {
    "prompt": "Write a blog post about {{topic}}",
    "model": "gpt-4",
    "max_tokens": 2000,
    "temperature": 0.7
  }
}
```

### Issue: Images Not Attaching to Documents

**Symptoms:** Document created but images missing

**Solutions:**
```bash
# Check document_attachments table
docker exec postgres psql -U xtyl -d xtyl_db -c \
  "SELECT * FROM document_attachments WHERE document_id = 'doc-id';"

# Verify MinIO upload
curl http://localhost:9000/xtyl-bucket/images/{image_id}

# Check node output includes image URLs
curl http://localhost:8000/api/workflows/executions/{id}/nodes/{node_id}

# Example expected output:
{
  "outputs": {
    "content": "...",
    "images": [
      {
        "url": "http://localhost:9000/xtyl-bucket/images/abc123.png",
        "prompt": "futuristic AI dashboard"
      }
    ]
  }
}
```

### Issue: Port Conflicts

**Symptoms:** "Address already in use" when starting services

**Solutions:**
```bash
# Check what's using the port
lsof -i :8000  # Backend
lsof -i :3000  # Frontend
lsof -i :6379  # Redis
lsof -i :5432  # PostgreSQL

# Kill process or change ports in docker-compose.dev.yml
# Then restart services
docker-compose -f docker-compose.dev.yml down
docker-compose -f docker-compose.dev.yml up -d
```

## Testing Checklist

Use this checklist to verify your setup is working correctly:

### Basic Functionality
- [ ] All Docker services running (`docker-compose ps`)
- [ ] Backend API responding (`curl http://localhost:8000/health`)
- [ ] Frontend accessible (`http://localhost:3000`)
- [ ] Redis connection working (`docker exec redis redis-cli ping`)
- [ ] Database migrations applied (`docker exec postgres psql -U xtyl -d xtyl_db -c "\dt"`)

### Template System
- [ ] Templates seeded (10 templates visible in UI)
- [ ] Can view template details
- [ ] Can duplicate template
- [ ] Can filter templates by category

### Workflow Builder
- [ ] Can create new custom workflow
- [ ] Can drag and drop nodes
- [ ] Can configure node settings
- [ ] Can connect nodes (edges appear)
- [ ] Can delete nodes and edges
- [ ] Can save workflow as template
- [ ] Validation prevents invalid connections

### Workflow Execution
- [ ] Launch template-based workflow
- [ ] Workflow transitions to "running" status
- [ ] Progress updates in real-time
- [ ] Node statuses update (pending → running → completed)
- [ ] Workflow completes successfully
- [ ] Documents created in project

### Advanced Features
- [ ] Pause execution (status changes to "paused")
- [ ] Resume execution (continues from paused node)
- [ ] Retry failed node (re-runs specific node)
- [ ] View execution logs (timestamps and messages visible)
- [ ] Attach images to document (visible in document view)
- [ ] Conditional branching works (correct path taken)
- [ ] Human approval checkpoint (workflow waits for approval)

### Error Handling
- [ ] Invalid input shows error message
- [ ] Failed node can be retried
- [ ] Workflow can be cancelled
- [ ] Error logs captured
- [ ] Partial results preserved on failure

## Next Steps

After completing setup and testing:

1. **Explore Templates**
   - Review the 10 seeded templates
   - Understand different node types and patterns
   - Identify templates relevant to your use case

2. **Create Custom Workflow**
   - Start with a simple 2-3 node workflow
   - Test thoroughly before adding complexity
   - Save successful workflows as templates

3. **Monitor Performance**
   - Track execution times
   - Identify bottlenecks
   - Optimize node configurations

4. **Read Documentation**
   - `/specs/002-autonomous-workflow-system/spec.md` - Full specification
   - `/specs/002-autonomous-workflow-system/plan.md` - Implementation plan
   - `/specs/002-autonomous-workflow-system/tasks.md` - Development tasks

## Support

If you encounter issues not covered in this guide:

1. Check service logs: `docker-compose -f docker-compose.dev.yml logs`
2. Review the full specification in `/specs/002-autonomous-workflow-system/`
3. Examine existing workflow templates for working examples
4. Query the database directly to inspect state

## Quick Reference Commands

```bash
# Start all services
docker-compose -f docker-compose.dev.yml up -d

# View logs
docker-compose -f docker-compose.dev.yml logs -f [service-name]

# Restart service
docker-compose -f docker-compose.dev.yml restart [service-name]

# Stop all services
docker-compose -f docker-compose.dev.yml down

# Reset database (WARNING: Deletes all data)
docker-compose -f docker-compose.dev.yml down -v
docker-compose -f docker-compose.dev.yml up -d
cd backend && alembic upgrade head

# Run migration
cd backend && alembic upgrade head

# Seed templates
cd backend && python scripts/seed_workflow_templates.py

# Check Celery worker status
docker exec celery-worker celery -A app.celery inspect active

# Connect to Redis CLI
docker exec -it redis redis-cli

# Connect to PostgreSQL
docker exec -it postgres psql -U xtyl -d xtyl_db

# Run tests
cd backend && pytest tests/test_workflows.py
cd frontend && npm test
```
