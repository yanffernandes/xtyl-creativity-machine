# Implementation Plan: Architecture Cleanup for Hybrid Supabase Migration

**Branch**: `008-architecture-cleanup` | **Date**: 2025-11-28 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/008-architecture-cleanup/spec.md`

## Summary

This cleanup feature removes all MinIO references and outdated architecture documentation from the codebase following the migration to hybrid Supabase architecture (007). The work involves updating docker-compose files, environment templates, shell scripts, and documentation to reflect the canonical Supabase + Cloudflare R2 architecture. No application code changes are required.

## Technical Context

**Language/Version**: Markdown, YAML, Bash (documentation and configuration cleanup only)
**Primary Dependencies**: None (no runtime dependencies - pure file editing)
**Storage**: N/A (cleanup of storage configuration references, not storage implementation)
**Testing**: Manual verification - documentation review and script execution testing
**Target Platform**: Development and production environments
**Project Type**: web (frontend + backend architecture, but this feature is documentation-only)
**Performance Goals**: N/A (no runtime performance impact)
**Constraints**: Must not break existing development workflow; must preserve git history
**Scale/Scope**: ~15 files to modify/delete across docker-compose, env templates, documentation, and specs

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. AI-First Development | ✅ N/A | Cleanup does not affect AI capabilities |
| II. API-First Architecture | ✅ N/A | No API changes |
| III. User Experience Excellence | ✅ Pass | Improves developer onboarding experience through accurate docs |
| IV. Production-Ready Deployments | ✅ Pass | Ensures docker-compose files reflect actual production architecture |
| V. Data Integrity & Security | ✅ Pass | Removes outdated MinIO references; documents correct Supabase auth |
| VI. Scalability & Performance | ✅ N/A | No runtime changes |
| VII. Testing & Quality Assurance | ✅ Pass | Manual testing of updated scripts and documentation |

**Gate Status**: ✅ PASSED - No violations. Cleanup feature aligns with all applicable principles.

## Project Structure

### Documentation (this feature)

```text
specs/008-architecture-cleanup/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output (minimal for cleanup)
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (N/A for cleanup)
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Files to Modify (repository root)

```text
# Docker Compose Files
docker-compose.yml          # Remove MinIO service, update references
docker-compose.dev.yml      # Remove MinIO env vars, update for Supabase
docker-compose.infra.yml    # Mark as DEPRECATED

# Environment Templates
.env.example                # Add Supabase vars, remove MinIO vars

# Documentation Files
README.md                   # Update architecture overview
QUICKSTART.md               # Update setup instructions
DEPLOYMENT.md               # Update production checklist
TROUBLESHOOTING.md          # Remove MinIO troubleshooting
WORKFLOW_SETUP.md           # Update prerequisites
CLAUDE.md                   # Update technology references

# Shell Scripts
dev.sh                      # Remove/deprecate MinIO commands
start-dev.sh                # Update or remove if redundant

# Historical Specifications
specs/002-autonomous-workflow-system/spec.md    # Mark Completed
specs/003-workflow-enhancement/spec.md          # Mark Completed
specs/004-agent-tools-enhancement/spec.md       # Mark Completed
specs/005-workflow-visual-redesign/spec.md      # Mark Completed
specs/006-production-infrastructure/spec.md     # Mark Superseded by 007
```

**Structure Decision**: No source code changes. This is a documentation and configuration cleanup feature operating on existing repository structure.

## Complexity Tracking

> No violations identified. This is a straightforward cleanup operation.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| None | - | - |

---

## Generated Artifacts

| Artifact | Status | Path |
|----------|--------|------|
| Research | ✅ Complete | [research.md](./research.md) |
| Data Model | ✅ Complete | [data-model.md](./data-model.md) |
| Quickstart | ✅ Complete | [quickstart.md](./quickstart.md) |
| Contracts | ✅ N/A | [contracts/README.md](./contracts/README.md) |
| Tasks | ✅ Complete | [tasks.md](./tasks.md) |

## Next Steps

1. ~~Run `/speckit.tasks` to generate detailed task breakdown~~ ✅ Complete
2. ~~Run `/speckit.implement` to execute cleanup tasks~~ ✅ Complete (57/59 tasks)
3. Manual verification remaining:
   - T056: Run `./dev.sh setup` to verify no MinIO errors
   - T057: Run `./dev.sh start` to verify services start correctly

## Implementation Summary

All documentation and configuration cleanup has been completed:
- ✅ Environment templates updated (.env.example)
- ✅ Docker Compose files cleaned (docker-compose.yml, docker-compose.dev.yml)
- ✅ Documentation updated (README, QUICKSTART, DEPLOYMENT, TROUBLESHOOTING, WORKFLOW_SETUP)
- ✅ Historical specs marked complete/superseded (002-006)
- ✅ Shell scripts updated (dev.sh), obsolete script deleted (start-dev.sh)
- ✅ Legacy infrastructure file deprecated (docker-compose.infra.yml)
- ✅ Agent context updated (CLAUDE.md)
