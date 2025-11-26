# Quick Setup Guide - Autonomous Workflow System

## Prerequisites

- PostgreSQL database running
- Redis server running
- MinIO server running
- Python 3.9+ with dependencies installed
- Node.js 18+ with npm

## Step-by-Step Setup

### 1. Apply Database Migration

```bash
# Navigate to backend directory
cd backend

# Run the migration SQL file
psql $DATABASE_URL -f migrations/008_create_workflow_tables.sql

# Verify tables were created
psql $DATABASE_URL -c "\dt workflow*"
psql $DATABASE_URL -c "\dt document_attachments"
```

Expected output:
```
                  List of relations
 Schema |         Name         | Type  |  Owner
--------+----------------------+-------+----------
 public | workflow_templates   | table | xtyl
 public | workflow_executions  | table | xtyl
 public | agent_jobs           | table | xtyl
 public | document_attachments | table | xtyl
```

### 2. Seed System Templates

```bash
# Still in backend directory
python seed_workflow_templates.py
```

Expected output:
```
🌱 Seeding workflow templates...

✓ Created Facebook Ads Campaign template (ID: xxx)
✓ Created Instagram Post template (ID: xxx)
✓ Created Blog Article template (ID: xxx)

✅ Successfully seeded 3 workflow templates!
   - Facebook Ads Campaign
   - Instagram Post
   - Blog Article with Featured Image
```

### 3. Start Celery Worker

Open a new terminal:

```bash
cd backend

# Start Celery worker for workflow execution
celery -A celery_app worker --loglevel=info --queues=workflows
```

Expected output:
```
-------------- celery@hostname v5.3.4 (emerald-rush)
--- ***** -----
-- ******* ---- Darwin-25.1.0-arm64-arm-64bit 2025-11-25 ...
- *** --- * ---
- ** ---------- [config]
- ** ---------- .> app:         xtyl_workflows:0x...
- ** ---------- .> transport:   redis://redis:6379/0
- ** ---------- .> results:     redis://redis:6379/0
- *** --- * --- .> concurrency: 8 (prefork)
-- ******* ---- .> task events: ON
--- ***** -----
 -------------- [queues]
                .> workflows        exchange=workflows(direct) key=workflow.default

[tasks]
  . tasks.workflow_tasks.execute_workflow
  . tasks.workflow_tasks.pause_workflow
  . tasks.workflow_tasks.resume_workflow
  . tasks.workflow_tasks.stop_workflow

[2025-11-25 ...] [MainProcess] mingle: searching for neighbors
[2025-11-25 ...] [MainProcess] mingle: all alone
[2025-11-25 ...] [MainProcess] celery@hostname ready.
```

### 4. Start Backend API

Open another new terminal:

```bash
cd backend

# Start FastAPI server
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Expected output:
```
INFO:     Will watch for changes in these directories: ['/path/to/backend']
INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
INFO:     Started reloader process [xxxxx] using StatReload
INFO:     Started server process [xxxxx]
INFO:     Waiting for application startup.
INFO:     Application startup complete.
```

### 5. Verify Backend Installation

Test the API endpoints:

```bash
# List workflow templates (should show 3 system templates)
curl http://localhost:8000/workflows/templates?workspace_id=system&include_system=true

# Check health
curl http://localhost:8000/health
```

### 6. Start Frontend

Open another new terminal:

```bash
cd frontend

# Install dependencies (if not already done)
npm install

# Start development server
npm run dev
```

Expected output:
```
▲ Next.js 14.x.x
- Local:        http://localhost:3000
- Network:      http://192.168.x.x:3000

✓ Ready in 2.3s
```

## Verification Checklist

### Backend Verification

- [ ] PostgreSQL has 4 new tables (workflow_templates, workflow_executions, agent_jobs, document_attachments)
- [ ] 3 system templates exist in workflow_templates table
- [ ] Celery worker is running and connected to Redis
- [ ] FastAPI server is running on port 8000
- [ ] `/workflows/templates` endpoint returns templates
- [ ] `/health` endpoint shows all services healthy

### Frontend Verification

- [ ] Next.js dev server running on port 3000
- [ ] No TypeScript compilation errors
- [ ] Can import workflows-api module
- [ ] Workflow components can be imported

## Testing the Workflow System

### Test 1: List Templates via API

```bash
curl http://localhost:8000/workflows/templates?workspace_id=system&include_system=true | jq
```

Should return 3 templates with complete data.

### Test 2: Launch a Workflow

```bash
# First, get a project ID from your database
PROJECT_ID="your-project-id-here"

# Launch Facebook Ads workflow
curl -X POST http://localhost:8000/workflows/executions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "template_id": "FACEBOOK_ADS_TEMPLATE_ID",
    "project_id": "'$PROJECT_ID'",
    "config_json": {
      "product_description": "AI-powered analytics platform",
      "target_audience": "B2B SaaS companies",
      "key_benefit": "Real-time insights",
      "visual_style": "modern, professional"
    }
  }' | jq
```

### Test 3: Check Execution Status

```bash
EXECUTION_ID="execution-id-from-previous-step"

curl http://localhost:8000/workflows/executions/$EXECUTION_ID/status \
  -H "Authorization: Bearer YOUR_TOKEN" | jq
```

Should show:
- Status (pending, running, completed)
- Progress percentage
- Job statistics
- Current node being executed

### Test 4: Monitor Celery Logs

In the Celery terminal, you should see:

```
[2025-11-25 ...] [Worker-1] Task tasks.workflow_tasks.execute_workflow[xxx] received
[2025-11-25 ...] [Worker-1] Executing node: generate_headline (generate_copy)
[2025-11-25 ...] [Worker-1] Executing node: generate_body (generate_copy)
[2025-11-25 ...] [Worker-1] Executing node: generate_image (generate_image)
[2025-11-25 ...] [Worker-1] Task tasks.workflow_tasks.execute_workflow[xxx] succeeded
```

## Troubleshooting

### Celery Worker Not Starting

**Problem**: `Cannot connect to redis://redis:6379/0`

**Solution**:
```bash
# Check if Redis is running
redis-cli ping
# Should return: PONG

# Update REDIS_URL in .env if needed
export REDIS_URL="redis://localhost:6379/0"
```

### Migration Fails

**Problem**: Tables already exist

**Solution**:
```bash
# Drop existing tables (WARNING: loses data)
psql $DATABASE_URL -c "DROP TABLE IF EXISTS document_attachments CASCADE;"
psql $DATABASE_URL -c "DROP TABLE IF EXISTS agent_jobs CASCADE;"
psql $DATABASE_URL -c "DROP TABLE IF EXISTS workflow_executions CASCADE;"
psql $DATABASE_URL -c "DROP TABLE IF EXISTS workflow_templates CASCADE;"

# Re-run migration
psql $DATABASE_URL -f migrations/008_create_workflow_tables.sql
```

### Seed Script Shows Duplicates

**Problem**: System templates already exist

**Solution**:
```bash
# Delete existing system templates
psql $DATABASE_URL -c "DELETE FROM workflow_templates WHERE is_system = true;"

# Re-run seed script
python seed_workflow_templates.py
```

### Workflow Execution Fails

**Problem**: Node execution errors

**Solution**:
1. Check Celery logs for detailed error messages
2. Verify OPENROUTER_API_KEY is set and has credits
3. Check that project_id exists in database
4. Verify MinIO is accessible for image storage

### Frontend API Errors

**Problem**: CORS or connection errors

**Solution**:
```bash
# Verify backend is running
curl http://localhost:8000/health

# Check NEXT_PUBLIC_API_URL in frontend/.env
echo $NEXT_PUBLIC_API_URL
# Should be: http://localhost:8000
```

## Environment Variables

Make sure these are set:

### Backend (.env)
```bash
DATABASE_URL=postgresql://xtyl:xtylpassword@localhost:5432/xtyl_db
REDIS_URL=redis://localhost:6379/0
OPENROUTER_API_KEY=your-api-key
MINIO_ENDPOINT=localhost:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET=xtyl-storage
```

### Frontend (.env.local)
```bash
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## Next Steps

After successful setup:

1. **Test in UI**: Navigate to `http://localhost:3000` and test workflow components
2. **Create Custom Templates**: Use the API to create your own workflow templates
3. **Monitor Executions**: Use ExecutionMonitor component to track workflow progress
4. **Review Documents**: Check that generated documents and images appear in the project
5. **Test Attachments**: Verify images are attached to documents correctly

## Production Deployment

For production deployment:

1. Set `DEBUG=False` in backend
2. Use production-grade Redis (e.g., AWS ElastiCache)
3. Scale Celery workers horizontally
4. Enable Celery monitoring (Flower)
5. Set up logging and error tracking
6. Configure proper authentication and authorization
7. Use environment-specific database
8. Set up CDN for MinIO/image assets

## Support

If you encounter issues:

1. Check Celery worker logs
2. Check FastAPI server logs
3. Check browser console for frontend errors
4. Review database logs
5. Verify all services are running (PostgreSQL, Redis, MinIO)

## Resources

- Backend API Docs: http://localhost:8000/docs
- Celery Monitoring: Install Flower for visual monitoring
- Database GUI: Use pgAdmin or TablePlus to inspect tables
- Redis GUI: Use RedisInsight to monitor queues
