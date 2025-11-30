# Quickstart: Architecture Cleanup

**Feature**: 008-architecture-cleanup
**Date**: 2025-11-28

## Prerequisites

- Git access to the repository
- Understanding of the hybrid Supabase architecture (see `specs/007-hybrid-supabase-architecture/`)
- Text editor for modifying configuration files

## Overview

This cleanup feature involves updating ~15 files to remove MinIO references and align with the hybrid Supabase architecture. No application code changes are required.

---

## Quick Reference: Target Architecture

After cleanup, the architecture should be:

| Component | Development | Production |
|-----------|-------------|------------|
| Database | Supabase PostgreSQL (cloud) | Supabase PostgreSQL (cloud) |
| Auth | Supabase Auth | Supabase Auth |
| Storage | Cloudflare R2 | Cloudflare R2 |
| Cache | Redis (local Docker) | Redis (Docker) |

**MinIO is completely removed.**

---

## Implementation Checklist

### Phase 1: Environment Templates

- [ ] Update `.env.example`:
  - Add `NEXT_PUBLIC_SUPABASE_URL`
  - Add `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - Add `SUPABASE_JWT_SECRET`
  - Add R2 configuration section
  - Remove `MINIO_*` variables
  - Remove `SECRET_KEY`, `ACCESS_TOKEN_EXPIRE_*`, `REFRESH_TOKEN_EXPIRE_*`

### Phase 2: Docker Compose Files

- [ ] Update `docker-compose.yml`:
  - Remove `minio` service (lines 209-234)
  - Remove `minio_data` volume
  - Remove `minio` from backend `depends_on`
  - Remove `minio` from celery-worker `depends_on`
  - Remove MinIO default values from R2 environment variables

- [ ] Update `docker-compose.dev.yml`:
  - Remove `minio` service
  - Remove `minio_data` volume
  - Remove `MINIO_*` env vars from backend
  - Remove `minio` from backend `depends_on`

- [ ] Mark `docker-compose.infra.yml` as deprecated:
  - Add deprecation header at top of file
  - Note: Keep file for historical reference

### Phase 3: Shell Scripts

- [ ] Update `dev.sh`:
  - Remove `infra-legacy` command and function
  - Remove `infra-legacy-stop` command and function
  - Update help text to remove MinIO references
  - Remove lines 94-112 (legacy infrastructure functions)
  - Update lines 329-331 (legacy commands help)

- [ ] Delete `start-dev.sh`:
  - File is obsolete (uses MinIO architecture)
  - `dev.sh` provides all necessary functionality

### Phase 4: Documentation Updates

- [ ] Update `README.md`:
  - Remove MinIO Console URL (line 34)
  - Add Supabase setup instructions
  - Reference `.env.production.example` for production

- [ ] Update `QUICKSTART.md`:
  - Remove MinIO references
  - Add Supabase setup steps

- [ ] Update `DEPLOYMENT.md`:
  - Remove MinIO from production checklist
  - Update environment variable list
  - Add Cloudflare R2 setup instructions

- [ ] Update `TROUBLESHOOTING.md`:
  - Remove MinIO troubleshooting section
  - Add Supabase connection troubleshooting

- [ ] Update `WORKFLOW_SETUP.md`:
  - Remove MinIO from prerequisites
  - Update storage configuration references

- [ ] Update `CLAUDE.md`:
  - Update Active Technologies section
  - Remove `minio_service.py` references
  - Update Storage section for R2

### Phase 5: Historical Specifications

- [ ] Update `specs/002-autonomous-workflow-system/spec.md`:
  - Set Status: Completed
  - Add completion date

- [ ] Update `specs/003-workflow-enhancement/spec.md`:
  - Set Status: Completed
  - Add completion date

- [ ] Update `specs/004-agent-tools-enhancement/spec.md`:
  - Set Status: Completed
  - Add completion date

- [ ] Update `specs/005-workflow-visual-redesign/spec.md`:
  - Set Status: Completed
  - Add completion date

- [ ] Update `specs/006-production-infrastructure/spec.md`:
  - Set Status: Superseded
  - Add superseded_by reference to 007

---

## Verification Commands

After completing cleanup, verify with these commands:

```bash
# Check for remaining MinIO references in active config files
grep -r "minio" docker-compose.yml docker-compose.dev.yml .env.example

# Should return no results (or only comments)

# Verify dev.sh works
./dev.sh setup
./dev.sh start

# Verify docker-compose.prod.yml is unchanged
docker compose -f docker-compose.prod.yml config

# Check for MINIO references in documentation
grep -r "MinIO\|minio\|9001" README.md QUICKSTART.md DEPLOYMENT.md TROUBLESHOOTING.md
```

---

## Rollback

If issues are encountered:

1. Git history preserves all original files
2. `docker-compose.infra.yml` is kept as deprecated (not deleted)
3. Specs are marked as Completed/Superseded, not deleted

```bash
# Revert all changes if needed
git checkout HEAD -- .
```

---

## Success Criteria Validation

| Criteria | Validation Method |
|----------|-------------------|
| SC-001: Developer setup < 30 min | Time new developer following updated README |
| SC-002: Zero MinIO in active configs | `grep -r "minio" docker-compose.prod.yml .env.production.example` |
| SC-003: Accurate documentation | Manual review of README, QUICKSTART, DEPLOYMENT |
| SC-004: Specs have clear status | Check status field in specs 002-006 |
| SC-005: Scripts work without MinIO errors | Run `./dev.sh start` and verify no errors |
| SC-006: Deployment checklist accurate | Compare DEPLOYMENT.md to docker-compose.prod.yml |
| SC-007: Environment template complete | Verify all Supabase/R2 vars in .env.example |
