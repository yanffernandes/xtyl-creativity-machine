# Data Model: Architecture Cleanup

**Feature**: 008-architecture-cleanup
**Date**: 2025-11-28

## Overview

This feature involves documentation and configuration cleanup only. **No database schema changes are required.** This document serves as a reference for the conceptual entities being cleaned up.

---

## Entities (Configuration Domain)

These are the conceptual entities being modified in this cleanup effort. They are not database tables but configuration artifacts.

### ConfigurationFile

Represents a Docker Compose or environment configuration file.

| Attribute | Type | Description |
|-----------|------|-------------|
| path | string | File path relative to repository root |
| type | enum | `docker-compose`, `env-template`, `shell-script` |
| architecture_version | enum | `legacy`, `hybrid-supabase`, `production` |
| status | enum | `active`, `deprecated`, `deleted` |
| minio_references | integer | Count of MinIO-related configuration items |

**Lifecycle**:
- `active` → `deprecated` (add deprecation header)
- `active` → `deleted` (file removed)
- References updated from MinIO → R2/Supabase

### DocumentationFile

Represents a user-facing documentation file.

| Attribute | Type | Description |
|-----------|------|-------------|
| path | string | File path relative to repository root |
| format | enum | `markdown` |
| audience | enum | `developer`, `devops`, `all` |
| outdated_references | list | List of outdated technology references |

**Lifecycle**:
- Content updated to reflect hybrid Supabase architecture
- MinIO references removed
- Supabase references added

### SpecificationFile

Represents a feature specification document.

| Attribute | Type | Description |
|-----------|------|-------------|
| id | string | Feature number and short name (e.g., `007-hybrid-supabase-architecture`) |
| status | enum | `Draft`, `Active`, `Completed`, `Superseded` |
| superseded_by | string | Reference to superseding spec (if applicable) |
| completion_date | date | Date when feature was completed |

**State Transitions**:
```
Draft → Active → Completed
Draft → Active → Superseded
```

---

## Reference: Hybrid Supabase Architecture

For reference, the target architecture (007) uses these external services:

### Supabase Services (External)

- **PostgreSQL**: Cloud database with pgvector extension
- **Auth**: User authentication via JWT
- **Storage**: Optional file storage (Supabase Storage)

### Cloudflare Services (External)

- **R2**: Object storage for images and assets
- **R2 Public URL**: CDN endpoint for public assets

### Local Services (Docker)

- **Redis**: Caching and Celery task queue

---

## No Database Migrations Required

This cleanup feature:
- Does NOT add new database tables
- Does NOT modify existing database schemas
- Does NOT require database migrations
- Affects ONLY configuration files, documentation, and specification status
