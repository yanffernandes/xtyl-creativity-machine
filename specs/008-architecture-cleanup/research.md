# Research: Architecture Cleanup for Hybrid Supabase Migration

**Feature**: 008-architecture-cleanup
**Date**: 2025-11-28
**Status**: Complete

## Summary

This document captures research findings for the architecture cleanup effort. Since this is a documentation/configuration cleanup feature (not new functionality), research focuses on identifying specific files, their current state, and required changes.

---

## 1. Docker Compose File Analysis

### Decision: Remove MinIO from all compose files, keep docker-compose.prod.yml as canonical

**Rationale**: The hybrid Supabase architecture (007) uses Cloudflare R2 for production storage and Supabase for database/auth. MinIO is no longer needed. The `docker-compose.prod.yml` already correctly reflects this architecture.

**Alternatives considered**:
- Keep MinIO for local development fallback → Rejected per clarification (complete removal)
- Create separate docker-compose.local.yml for MinIO → Rejected (adds confusion)

### File-by-File Analysis

| File | Current State | Action Required |
|------|--------------|-----------------|
| `docker-compose.yml` | Contains MinIO service (lines 209-234), backend depends on MinIO | Remove MinIO service, update backend/celery-worker dependencies, update comments |
| `docker-compose.dev.yml` | Contains MinIO service (lines 71-85), env vars (35-37) | Remove MinIO service and env vars, add Supabase notes |
| `docker-compose.infra.yml` | Contains PostgreSQL, Redis, MinIO for legacy dev | Mark as DEPRECATED at top, rename or remove |
| `docker-compose.prod.yml` | Correctly configured for Supabase + R2 | No changes needed (canonical reference) |

### MinIO References to Remove

```yaml
# From docker-compose.yml backend service:
depends_on:
  minio:  # REMOVE
    condition: service_healthy

# From environment variables:
R2_ENDPOINT: ${R2_ENDPOINT:-http://minio:9000}  # Keep R2 vars but remove MinIO defaults
R2_ACCESS_KEY: ${R2_ACCESS_KEY:-minioadmin}     # Remove minioadmin default
R2_SECRET_KEY: ${R2_SECRET_KEY:-minioadmin}     # Remove minioadmin default
R2_PUBLIC_URL: ${R2_PUBLIC_URL:-http://localhost:9000/xtyl-storage}  # Remove localhost minio default

# Entire service to remove:
minio:
  image: minio/minio:latest
  ...

# Volume to remove:
minio_data:
  driver: local
```

---

## 2. Environment Configuration Analysis

### Decision: Update .env.example with Supabase variables, remove MinIO

**Rationale**: `.env.example` is the template developers copy. It should reflect the canonical hybrid architecture.

### Current State: .env.example

```
# Missing Supabase variables:
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_JWT_SECRET

# Contains deprecated MinIO variables:
MINIO_ENDPOINT=minio:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin

# Contains deprecated custom JWT auth:
SECRET_KEY=your-super-secret-key-change-this
ACCESS_TOKEN_EXPIRE_MINUTES=10080
REFRESH_TOKEN_EXPIRE_DAYS=30
```

### Required Changes

1. Add Supabase configuration section
2. Add Cloudflare R2 configuration section
3. Remove MinIO variables entirely
4. Remove custom JWT auth variables (replaced by Supabase Auth)
5. Use `.env.production.example` as reference for correct structure

---

## 3. Shell Script Analysis

### Decision: Remove legacy MinIO commands from dev.sh, delete start-dev.sh

**Rationale**:
- `dev.sh` already has proper Supabase-first architecture (lines 333-336) but still has legacy MinIO commands
- `start-dev.sh` uses old docker-compose with MinIO (line 18) - obsolete

### dev.sh Analysis

**Keep**:
- Redis commands (redis, redis-stop, infra, infra-stop)
- Backend/frontend commands
- setup, start, stop, status commands
- Architecture documentation in help text

**Remove**:
- `infra-legacy` command (lines 94-105) - starts PostgreSQL, Redis, MinIO
- `infra-legacy-stop` command (lines 107-112)
- References to `docker-compose.infra.yml`
- Help text mentioning MinIO (lines 329-331)

### start-dev.sh Analysis

**Action**: Delete file entirely

**Rationale**:
- Line 18 uses `docker compose up -d db redis minio backend celery-worker`
- Assumes local PostgreSQL and MinIO
- `dev.sh` already provides all necessary functionality
- Keeping two scripts causes confusion

---

## 4. Documentation File Analysis

### README.md

**Current Issues**:
- Line 34: References MinIO Console `http://localhost:9001`
- Line 21: Uses `docker-compose.dev.yml` which has MinIO
- No mention of Supabase setup

**Required Changes**:
- Remove MinIO Console URL
- Update Docker commands to use appropriate compose file
- Add Supabase setup instructions
- Add note about `.env.production.example` for production

### QUICKSTART.md, DEPLOYMENT.md, TROUBLESHOOTING.md, WORKFLOW_SETUP.md

**Pattern**: All need MinIO references removed and Supabase guidance added

---

## 5. Historical Specification Analysis

### Specifications to Mark as Completed/Superseded

| Spec | Current Status | New Status | Notes |
|------|---------------|------------|-------|
| 002-autonomous-workflow-system | Draft | Completed | Core workflow system implemented |
| 003-workflow-enhancement | Draft | Completed | Enhancements implemented |
| 004-agent-tools-enhancement | Draft | Completed | Agent tools implemented |
| 005-workflow-visual-redesign | Draft | Completed | Visual redesign implemented |
| 006-production-infrastructure | Draft | Superseded by 007 | Hybrid architecture supersedes |
| 007-hybrid-supabase-architecture | Active | Active | Current canonical architecture |

### Status Update Format

```markdown
**Status**: Completed
**Completed**: 2025-11-28
**Note**: Implementation complete. For current architecture, see 007-hybrid-supabase-architecture.
```

For superseded specs:
```markdown
**Status**: Superseded
**Superseded by**: [007-hybrid-supabase-architecture](../007-hybrid-supabase-architecture/spec.md)
**Note**: This specification has been superseded by the hybrid Supabase architecture.
```

---

## 6. CLAUDE.md Analysis

### Current Issues

- Line 24-26 in Active Technologies: Still references MinIO-based storage
- Line 129: References `minio_service.py` in Key Files (file deleted)
- Line 171: References MinIO in Storage section
- Need to update to reflect Supabase + R2 architecture

### Required Changes

1. Update Active Technologies to reflect Supabase + R2
2. Remove references to deleted files (`minio_service.py`, `auth.py`)
3. Update Storage section to reflect R2
4. Add Supabase Auth to authentication section

---

## 7. Files Summary

### Files to Delete

| File | Reason |
|------|--------|
| `start-dev.sh` | Obsolete - uses old MinIO architecture |

### Files to Significantly Modify

| File | Changes |
|------|---------|
| `docker-compose.yml` | Remove MinIO service, dependencies, volume |
| `docker-compose.dev.yml` | Remove MinIO service, env vars |
| `.env.example` | Add Supabase vars, remove MinIO vars |
| `dev.sh` | Remove infra-legacy commands, update help text |
| `README.md` | Update for Supabase architecture |

### Files to Mark as Deprecated

| File | Action |
|------|--------|
| `docker-compose.infra.yml` | Add DEPRECATED header, keep for reference |

### Files Requiring Minor Updates

| File | Changes |
|------|---------|
| `QUICKSTART.md` | Remove MinIO references |
| `DEPLOYMENT.md` | Update production checklist |
| `TROUBLESHOOTING.md` | Remove MinIO troubleshooting |
| `WORKFLOW_SETUP.md` | Update prerequisites |
| `CLAUDE.md` | Update technology references |
| Specs 002-006 | Update status to Completed/Superseded |

### Files Already Correct (No Changes)

| File | Notes |
|------|-------|
| `docker-compose.prod.yml` | Already uses Supabase + R2 |
| `.env.production.example` | Already has correct variables |

---

## 8. Implementation Order

Based on dependency analysis, recommended order:

1. **Environment Templates** - `.env.example` (developers need correct template first)
2. **Docker Compose Files** - Remove MinIO from `docker-compose.yml`, `docker-compose.dev.yml`
3. **Shell Scripts** - Update `dev.sh`, delete `start-dev.sh`
4. **User Documentation** - README, QUICKSTART, DEPLOYMENT, TROUBLESHOOTING, WORKFLOW_SETUP
5. **Agent Context** - CLAUDE.md
6. **Historical Specs** - Mark 002-006 as Completed/Superseded
7. **Deprecation Markers** - Mark `docker-compose.infra.yml` as deprecated

---

## Unknowns Resolved

All unknowns from Technical Context have been resolved:

| Unknown | Resolution |
|---------|------------|
| MinIO retention strategy | Complete removal confirmed |
| Development database | Supabase cloud (no local PostgreSQL) |
| Storage fallback | Supabase Storage via Supabase CLI for local dev |
| Script redundancy | `start-dev.sh` is redundant with `dev.sh` |
