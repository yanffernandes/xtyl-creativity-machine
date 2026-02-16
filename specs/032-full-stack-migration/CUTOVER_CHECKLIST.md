# Production Cutover Checklist (T093)

**Migration:** 032-full-stack-migration  
**Date:** [TO BE FILLED]  
**Engineer:** [TO BE FILLED]

---

## Pre-Cutover (24 hours before)

### 1. Backup & Safety

- [ ] **Database Backup**
  ```bash
  # Create full database backup
  pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql
  ```

- [ ] **Code Freeze**: No new commits to main branch
- [ ] **Team Notification**: Notify all team members of maintenance window
- [ ] **User Notification**: Post maintenance notice (if applicable)

### 2. Pre-Flight Checks

- [ ] **Run Data Validation**
  ```bash
  bun run apps/api/scripts/validate-data.ts
  ```
  - [ ] All tables accessible
  - [ ] JSONB fields parse correctly
  - [ ] pgvector operations working
  - [ ] R2 URLs resolve

- [ ] **Run Smoke Tests**
  ```bash
  export TEST_USER_TOKEN="..." # Get from test user
  bun run apps/api/scripts/smoke-test.ts
  ```
  - [ ] All critical endpoints respond

- [ ] **Build & Test Locally**
  ```bash
  bun install
  bun run build
  bun run typecheck
  ```
  - [ ] No TypeScript errors
  - [ ] All apps build successfully

---

## Cutover Window (2 hours)

### Phase 1: Stop Old System (15 min)

- [ ] **Stop Python Backend**
  ```bash
  # On production server
  supervisorctl stop xtyl-api  # or equivalent
  # OR
  docker-compose down backend
  ```

- [ ] **Stop Next.js Frontend**
  ```bash
  supervisorctl stop xtyl-web  # or equivalent
  # OR
  docker-compose down frontend
  ```

- [ ] **Verify No In-Flight Jobs**
  ```bash
  # Check Celery queue is empty
  celery -A backend inspect active
  
  # Check no active workflow executions
  psql $DATABASE_URL -c "SELECT COUNT(*) FROM workflow_executions WHERE status = 'running';"
  ```

### Phase 2: Deploy New System (30 min)

- [ ] **Pull Latest Code**
  ```bash
  git checkout 032-full-stack-migration
  git pull origin 032-full-stack-migration
  ```

- [ ] **Install Dependencies**
  ```bash
  bun install
  ```

- [ ] **Build Applications**
  ```bash
  bun run build
  ```

- [ ] **Update Environment Variables**
  ```bash
  cp .env.example .env.production
  # Edit .env.production with production values
  ```
  - [ ] DATABASE_URL
  - [ ] SUPABASE_URL, SUPABASE_ANON_KEY
  - [ ] OPENROUTER_API_KEY
  - [ ] FAL_API_KEY
  - [ ] CLOUDFLARE_R2 credentials
  - [ ] REDIS_URL
  - [ ] BREVO_API_KEY

- [ ] **Start Redis**
  ```bash
  docker-compose up -d redis
  ```

- [ ] **Start API (NestJS)**
  ```bash
  # Option 1: PM2
  pm2 start ecosystem.config.js --only api
  
  # Option 2: Docker
  docker-compose up -d api
  
  # Option 3: Direct
  cd apps/api && bun run start:prod
  ```

- [ ] **Start Frontend (Vite)**
  ```bash
  # Option 1: PM2
  pm2 start ecosystem.config.js --only web
  
  # Option 2: Docker
  docker-compose up -d web
  
  # Option 3: Serve static build
  cd apps/web && bun run preview
  ```

### Phase 3: Validation (45 min)

- [ ] **Health Checks**
  ```bash
  # API health
  curl http://localhost:3000/health
  
  # Frontend loads
  curl http://localhost:5173  # or production port
  ```

- [ ] **Run Post-Deploy Validation**
  ```bash
  bun run apps/api/scripts/validate-data.ts
  bun run apps/api/scripts/smoke-test.ts
  ```

- [ ] **Manual Testing - Critical Flows**
  - [ ] Login works
  - [ ] Create project
  - [ ] Upload image/document
  - [ ] Generate image (Studio)
  - [ ] Run workflow
  - [ ] Chat conversation
  - [ ] Share document

- [ ] **Check Logs**
  ```bash
  # API logs
  pm2 logs api --lines 100
  # OR
  docker-compose logs api --tail=100
  
  # Look for errors
  grep -i error logs/api.log | tail -20
  ```

- [ ] **Monitor Database Connections**
  ```bash
  psql $DATABASE_URL -c "SELECT count(*) FROM pg_stat_activity WHERE datname = 'xtyl';"
  ```

- [ ] **Monitor Redis**
  ```bash
  redis-cli INFO stats
  ```

### Phase 4: Go/No-Go Decision (15 min)

**Criteria for GO:**
- [ ] All health checks green
- [ ] All smoke tests pass
- [ ] Critical user flows work
- [ ] No errors in logs (last 15 minutes)
- [ ] Database queries < 100ms average
- [ ] Memory usage normal (<80%)

**If NO-GO:**
- [ ] Rollback to old system (see Rollback section below)

### Phase 5: Final Steps (15 min)

- [ ] **Update DNS/Load Balancer** (if applicable)
- [ ] **Enable Monitoring Alerts**
  - [ ] Sentry errors
  - [ ] API response time
  - [ ] Database connection pool
- [ ] **Post Announcement**: System is back online
- [ ] **Monitor for 30 minutes**: Watch logs and user reports

---

## Post-Cutover (24 hours)

### Hour 1-4: Intensive Monitoring

- [ ] Check error rates every 30 min
- [ ] Monitor performance metrics
- [ ] Watch for user reports
- [ ] Check all SSE streams working (chat, workflows, image gen)

### Hour 4-24: Standard Monitoring

- [ ] Review error logs 2x per day
- [ ] Check performance dashboards
- [ ] Verify background jobs running (BullMQ)

### Week 1: Stability

- [ ] Review weekly metrics
- [ ] User feedback collection
- [ ] Performance optimization if needed
- [ ] Delete old Python backend code (if all good)

---

## Rollback Procedure

**If issues occur within first 30 minutes:**

1. **Stop New System**
   ```bash
   pm2 stop api web
   # OR
   docker-compose down
   ```

2. **Restore Old System**
   ```bash
   git checkout main
   supervisorctl start xtyl-api xtyl-web
   # OR
   docker-compose up -d backend frontend
   ```

3. **Verify Rollback**
   - [ ] Old system loads
   - [ ] Login works
   - [ ] Critical flows work

4. **Notify Team**
   - Document what went wrong
   - Schedule retry with fixes

---

## Emergency Contacts

- **DevOps Lead:** [CONTACT]
- **Database Admin:** [CONTACT]
- **Supabase Support:** support@supabase.io
- **Cloudflare Support:** [CONTACT]

---

## Success Criteria

✅ **Migration is successful when:**
- All 171 API endpoints respond correctly
- All 36+ frontend routes load
- Critical user flows work end-to-end
- No data loss (validation passes)
- Performance meets or exceeds old system
- No P0/P1 errors in first 24 hours

---

**Cutover Date:** [TO BE FILLED]  
**Completed By:** [TO BE FILLED]  
**Sign-off:** [TO BE FILLED]
