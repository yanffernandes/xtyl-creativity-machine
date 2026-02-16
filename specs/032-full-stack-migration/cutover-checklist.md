# 🚀 Cutover Checklist - Full-Stack Migration

**Feature**: 032-full-stack-migration
**Target Date**: TBD
**Maintenance Window**: Up to 2 hours
**Rollback Plan**: Keep old system on standby for 24 hours

---

## Pre-Cutover (1 Week Before)

### Infrastructure Preparation

- [ ] **Verify Easypanel Configuration**
  - [ ] Ensure Docker images build successfully
  - [ ] Test environment variables on staging
  - [ ] Verify Redis connection (cache + BullMQ)
  - [ ] Confirm Supabase connection string works
  - [ ] Test Cloudflare R2 access (read/write)

- [ ] **Database Backup**
  - [ ] Create full PostgreSQL backup via Supabase dashboard
  - [ ] Download backup to secure location (S3/R2)
  - [ ] Verify backup integrity (test restore on dev)
  - [ ] Document backup timestamp and size

- [ ] **DNS & SSL**
  - [ ] Verify SSL certificates are valid (30+ days remaining)
  - [ ] Prepare DNS records for blue/green deployment (if applicable)
  - [ ] Test health check endpoints (`/health`, `/api/health`)

- [ ] **Monitoring Setup**
  - [ ] Configure Sentry for error tracking (if using observability)
  - [ ] Set up logging aggregation (if applicable)
  - [ ] Prepare monitoring dashboard for cutover metrics

---

## Pre-Cutover (24 Hours Before)

### Team Coordination

- [ ] **Communication**
  - [ ] Notify all users of maintenance window (email/in-app message)
  - [ ] Post maintenance notice on status page (if exists)
  - [ ] Coordinate with team on cutover time (suggest off-peak hours)

- [ ] **Validation Scripts**
  - [ ] Run data validation script: `bun --bun apps/api/scripts/validate-data.ts`
  - [ ] Verify all 30+ tables have expected record counts
  - [ ] Check JSONB fields are parseable
  - [ ] Validate pgvector embeddings (1536-dim for memories)
  - [ ] Document baseline metrics (record counts, file counts)

- [ ] **Build & Test New System**
  - [ ] Build all Docker images: `docker-compose build`
  - [ ] Run full test suite: `bun test`
  - [ ] Perform smoke tests on staging environment
  - [ ] Verify SSE streaming works (chat, workflow execution, batch image gen)
  - [ ] Test key user flows end-to-end:
    - [ ] Login/signup
    - [ ] Create project
    - [ ] Generate image (fal.ai integration)
    - [ ] Run workflow
    - [ ] Chat with AI
    - [ ] Manage copies/campaigns

---

## Cutover (Maintenance Window - 2 Hours)

### Phase 1: Shutdown Old System (0-15 minutes)

- [ ] **Mark system as under maintenance**
  - [ ] Display maintenance page on frontend
  - [ ] Return 503 Service Unavailable on API

- [ ] **Stop old services**
  - [ ] Stop FastAPI backend (Python)
  - [ ] Stop Next.js frontend (if running separately)
  - [ ] Verify no active connections to database

- [ ] **Wait for in-flight jobs to complete**
  - [ ] Check Celery queue (old system) - should be empty
  - [ ] Check workflow executions table:
    ```sql
    SELECT COUNT(*) FROM workflow_executions WHERE status = 'running';
    ```
  - [ ] If any jobs are running, wait up to 10 minutes for completion
  - [ ] Mark stuck jobs as `failed` if necessary:
    ```sql
    UPDATE workflow_executions
    SET status = 'failed', error_message = 'Interrupted by system migration'
    WHERE status = 'running' AND updated_at < NOW() - INTERVAL '10 minutes';
    ```

---

### Phase 2: Data Validation (15-30 minutes)

- [ ] **Run validation script (second time)**
  - [ ] `bun --bun apps/api/scripts/validate-data.ts`
  - [ ] Compare record counts with pre-cutover baseline
  - [ ] Verify zero data loss (counts should match exactly)

- [ ] **Manual spot checks**
  - [ ] Pick 5 random users, verify their data is accessible:
    ```sql
    SELECT u.id, u.email,
           COUNT(DISTINCT p.id) as project_count,
           COUNT(DISTINCT d.id) as document_count
    FROM users u
    LEFT JOIN projects p ON p.workspace_id = u.workspace_id
    LEFT JOIN documents d ON d.project_id = p.id
    GROUP BY u.id
    LIMIT 5;
    ```
  - [ ] Verify file URLs resolve (pick 10 random documents with `file_url`)
  - [ ] Check recent workflow executions have valid `execution_context` (JSONB)

- [ ] **Verify RLS policies** (Supabase Row Level Security)
  - [ ] Test frontend direct access to `documents` table with user JWT
  - [ ] Confirm users can only see their own workspace data
  - [ ] Test: User A cannot access User B's documents

---

### Phase 3: Deploy New System (30-60 minutes)

- [ ] **Deploy via Easypanel**
  - [ ] Deploy API container (NestJS + Bun)
  - [ ] Deploy Web container (Vite + React 19 + nginx)
  - [ ] Deploy Admin container (Vite + React 19 + nginx)
  - [ ] Verify all containers started successfully

- [ ] **Health checks**
  - [ ] API health: `GET /health` → 200 OK
  - [ ] Database connection: Check logs for "Database connected"
  - [ ] Redis connection: Check logs for "BullMQ connected"
  - [ ] Storage: Upload test file to R2, verify URL

- [ ] **Start background workers**
  - [ ] Verify BullMQ queues are processing:
    - `workflow-execution` (concurrency: 2)
    - `image-generation` (concurrency: 3)
    - `memory-extraction` (concurrency: 2)
    - `usage-logging` (concurrency: 10)
    - `email-sending` (concurrency: 5)
  - [ ] Check Bull Board dashboard: `/admin/queues` (dev/staging)

---

### Phase 4: Smoke Tests (60-90 minutes)

- [ ] **Authentication**
  - [ ] Test login with existing user
  - [ ] Test signup (create new user)
  - [ ] Test password reset flow
  - [ ] Verify JWT token validation

- [ ] **Core Features**
  - [ ] Create new project
  - [ ] Upload document
  - [ ] Generate image via Image Studio
    - [ ] Text-to-image
    - [ ] Image-to-image
    - [ ] Concept selector (88 creative concepts)
  - [ ] Run workflow
    - [ ] Create simple 3-node workflow
    - [ ] Execute and watch SSE stream
    - [ ] Verify outputs in execution context
  - [ ] Chat with AI
    - [ ] Send message
    - [ ] Verify SSE streaming
    - [ ] Test tool approval (if applicable)
  - [ ] Manage copy library
    - [ ] Create copy
    - [ ] Edit copy
    - [ ] Delete copy

- [ ] **Admin Panel**
  - [ ] Login as admin
  - [ ] View dashboard stats
  - [ ] Check model configuration
  - [ ] Review audit log (should show admin actions)

- [ ] **Performance Check**
  - [ ] Measure API response times for key endpoints:
    - `GET /projects` → < 200ms
    - `POST /image-generation/generate` → < 500ms (queue job)
    - `POST /chat/completions` (SSE) → first token < 2s
  - [ ] Verify no memory leaks (check container memory usage)

---

### Phase 5: Go Live (90-105 minutes)

- [ ] **Remove maintenance mode**
  - [ ] Remove maintenance page from frontend
  - [ ] Enable API access (remove 503 responses)

- [ ] **Monitor logs**
  - [ ] Watch API logs for errors (tail -f or Easypanel console)
  - [ ] Watch for database connection issues
  - [ ] Watch for Redis/BullMQ errors
  - [ ] Monitor Sentry for new errors

- [ ] **Notify users**
  - [ ] Send "system is back online" email
  - [ ] Post update on status page
  - [ ] Announce in Slack/Discord (if applicable)

---

### Phase 6: Post-Cutover Monitoring (105-120 minutes)

- [ ] **Watch for issues**
  - [ ] Monitor error rates (Sentry dashboard)
  - [ ] Check active user count (should gradually increase)
  - [ ] Watch for failed jobs in BullMQ
  - [ ] Review user feedback (support tickets, chat, social)

- [ ] **Performance validation**
  - [ ] Compare response times with baseline (should be equal or faster)
  - [ ] Check database connection pool usage
  - [ ] Verify no memory leaks over 30 minutes

- [ ] **Data integrity spot check**
  - [ ] Verify new records are created successfully:
    - [ ] New project created by user → appears in database
    - [ ] New document created → file uploaded to R2
    - [ ] New workflow execution → results saved correctly

---

## Post-Cutover (First 24 Hours)

### Continuous Monitoring

- [ ] **Hour 1-4: Critical monitoring**
  - [ ] Watch for errors/crashes
  - [ ] Respond to user reports immediately
  - [ ] Keep old system on standby (DO NOT DECOMMISSION YET)

- [ ] **Hour 4-12: Active monitoring**
  - [ ] Check every 2 hours for issues
  - [ ] Review error logs
  - [ ] Verify background jobs processing correctly

- [ ] **Hour 12-24: Passive monitoring**
  - [ ] Check every 4 hours
  - [ ] Confirm system is stable
  - [ ] Review aggregate metrics (API calls, error rates, performance)

### Rollback Criteria (If Needed)

**Trigger rollback if:**
- Critical feature is broken (users cannot login, create projects, or generate images)
- Data loss detected (record counts decreased unexpectedly)
- Performance degradation > 50% (API response times doubled)
- Error rate > 10% (more than 10% of requests failing)
- Database corruption detected
- Redis/BullMQ completely non-functional

**Rollback procedure:**
1. Stop new NestJS system
2. Restore old FastAPI + Next.js system
3. Verify old system works with current database state
4. Notify users of temporary rollback
5. Investigate root cause
6. Schedule new cutover after fix

---

## Post-Cutover (First Week)

- [ ] **Day 1: Stability validation**
  - [ ] Run data validation script again
  - [ ] Compare record counts with pre-cutover
  - [ ] Verify all workflows executed successfully
  - [ ] Check for failed background jobs

- [ ] **Day 2-3: Performance review**
  - [ ] Analyze API response times (p50, p95, p99)
  - [ ] Review database query performance
  - [ ] Check Redis hit rate
  - [ ] Identify any performance regressions

- [ ] **Day 4-7: Decommission old system**
  - [ ] If new system is stable, shut down old services
  - [ ] Archive old codebase (tag git commit)
  - [ ] Keep old database backup for 30 days
  - [ ] Document lessons learned

---

## Success Criteria

✅ **Required for cutover success:**

1. **Zero data loss**: All record counts match pre-cutover baseline
2. **All features functional**: Users can perform all key operations (login, create, generate, workflow, chat)
3. **Performance maintained**: API response times equal or better than old system
4. **Error rate < 1%**: Less than 1% of requests fail
5. **No critical bugs**: No P0 or P1 bugs reported in first 24 hours
6. **Background jobs working**: All queues processing jobs successfully
7. **SSE streaming working**: Chat, workflow execution, and batch image generation streams functional
8. **RLS policies working**: Users can only access their own data via Supabase client

---

## Team Roles

| Role | Responsible | Contact |
|------|-------------|---------|
| **Cutover Lead** | @yanfernandes | [contact] |
| **Database Admin** | [TBD] | [contact] |
| **DevOps** | [TBD] | [contact] |
| **Frontend Engineer** | [TBD] | [contact] |
| **Backend Engineer** | @yanfernandes | [contact] |
| **Support Lead** | [TBD] | [contact] |

---

## Emergency Contacts

- **Supabase Support**: [URL or email]
- **Easypanel Support**: [URL or email]
- **Cloudflare Support**: [URL or email]
- **On-call Engineer**: [phone/slack]

---

## Notes

- **Recommended cutover time**: Sunday 2-4 AM (local time, off-peak)
- **Maintenance window**: Up to 2 hours (expected: 90 minutes)
- **Rollback decision point**: 60 minutes after go-live
- **Old system standby period**: 24 hours (keep running but offline)

---

**Last Updated**: 2026-02-16
**Next Review**: 1 week before cutover
**Maintained By**: @yanfernandes
