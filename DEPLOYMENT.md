# XTYL Creativity Machine - Deployment Guide

## Production Deployment (Docker Compose)

### Prerequisites

- Docker Engine 24.0+
- Docker Compose V2
- 4GB+ RAM available
- 20GB+ storage

### Quick Start

1. **Clone repository**:
```bash
git clone https://github.com/your-org/xtyl-creativity-machine.git
cd xtyl-creativity-machine
```

2. **Configure environment**:
```bash
cp .env.example .env
# Edit .env with your production values
```

3. **Set required secrets** (IMPORTANT):
```bash
# Generate strong SECRET_KEY
openssl rand -hex 32

# Edit .env and update:
# - SECRET_KEY (JWT signing key)
# - POSTGRES_PASSWORD (database password)
# - MINIO_ACCESS_KEY / MINIO_SECRET_KEY (storage credentials)
# - BREVO_API_KEY (email service)
# - OPENROUTER_API_KEY (AI models)
# - NEXT_PUBLIC_API_URL (your backend URL for frontend)
```

4. **Build and start**:
```bash
docker-compose up -d
```

5. **Initialize database**:
```bash
# Wait for services to be healthy (check with: docker-compose ps)
# Database migrations are applied automatically on backend startup
```

6. **Verify services**:
```bash
docker-compose ps
# All services should show (healthy)

# Check logs if needed:
docker-compose logs backend
docker-compose logs celery-worker
docker-compose logs frontend
```

### Services Overview

- **backend** (port 8000): FastAPI application (API + health checks)
- **frontend** (port 3000): Next.js application
- **db** (internal): PostgreSQL 16 with pgvector
- **redis** (internal): Redis 7 (cache + Celery broker)
- **celery-worker** (internal): Async workflow execution engine
- **minio** (port 9000 + 9001): S3-compatible object storage

### Workflow System Setup

The autonomous workflow system requires:

1. **Celery worker running** (included in docker-compose.yml)
2. **Redis available** (message broker + result backend)
3. **Workflow templates created** via API after first workspace exists

#### Creating Initial Workflow Templates

After first user creates a workspace:

```bash
# Example: Create "Facebook Ads Campaign" template via API
curl -X POST http://localhost:8000/api/workflows/templates \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "workspace_id": "YOUR_WORKSPACE_ID",
    "name": "Facebook Ads Campaign",
    "description": "Generate 10 ad copies + 5 creatives for Facebook campaigns",
    "category": "social_media",
    "nodes_json": [...],
    "edges_json": [...],
    "default_params_json": {
      "copy_count": 10,
      "image_count": 5
    }
  }'
```

See [specs/002-autonomous-workflow-system/](specs/002-autonomous-workflow-system/) for detailed workflow system documentation.

### Environment Variables (Production)

#### Required:
- `SECRET_KEY`: JWT signing key (use `openssl rand -hex 32`)
- `DATABASE_URL`: PostgreSQL connection string
- `POSTGRES_PASSWORD`: Database password (match DATABASE_URL)
- `OPENROUTER_API_KEY`: AI model access
- `BREVO_API_KEY`: Email service for user verification
- `NEXT_PUBLIC_API_URL`: Backend URL (must be accessible from browser)

#### Optional (with defaults):
- `ACCESS_TOKEN_EXPIRE_MINUTES`: JWT expiration (default: 10080 = 7 days)
- `CELERY_BROKER_URL`: Redis broker (default: redis://redis:6379/0)
- `CELERY_RESULT_BACKEND`: Redis result storage (default: redis://redis:6379/1)
- `MINIO_BUCKET`: Storage bucket name (default: xtyl-storage)

### Health Checks

- Backend: http://localhost:8000/health
- Frontend: http://localhost:3000
- MinIO Console: http://localhost:9001

### Monitoring Celery Workers

```bash
# View active tasks
docker exec xtyl-creativity-machine-celery-worker-1 celery -A backend.celery_app inspect active

# View worker stats
docker exec xtyl-creativity-machine-celery-worker-1 celery -A backend.celery_app inspect stats

# View registered tasks
docker exec xtyl-creativity-machine-celery-worker-1 celery -A backend.celery_app inspect registered
```

### Database Management

#### Run migrations manually (if needed):
```bash
docker exec xtyl-creativity-machine-backend-1 alembic upgrade head
```

#### Backup database:
```bash
docker exec xtyl-creativity-machine-db-1 pg_dump -U xtyl xtyl_db > backup_$(date +%Y%m%d).sql
```

#### Restore database:
```bash
cat backup_20250125.sql | docker exec -i xtyl-creativity-machine-db-1 psql -U xtyl -d xtyl_db
```

### Scaling

#### Increase Celery workers:
```bash
docker-compose up -d --scale celery-worker=3
```

#### Adjust resource limits:

Edit `docker-compose.yml` under each service's `deploy.resources` section.

### Troubleshooting

#### Celery worker not processing tasks:
```bash
# Check worker logs
docker-compose logs celery-worker

# Verify Redis connection
docker exec xtyl-creativity-machine-celery-worker-1 redis-cli -h redis ping
# Should return: PONG
```

#### Frontend can't reach backend:
- Verify `NEXT_PUBLIC_API_URL` in .env matches your backend URL
- Rebuild frontend: `docker-compose up -d --build frontend`

#### Database connection errors:
- Check `DATABASE_URL` matches PostgreSQL credentials
- Verify db service is healthy: `docker-compose ps db`

### Production Checklist

- [ ] Change all default passwords (SECRET_KEY, POSTGRES_PASSWORD, MINIO keys)
- [ ] Configure reverse proxy (Nginx/Traefik) with HTTPS
- [ ] Set up SSL certificates (Let's Encrypt)
- [ ] Configure proper `FRONTEND_URL` and `NEXT_PUBLIC_API_URL` for your domain
- [ ] Set up backups for postgres_data and minio_data volumes
- [ ] Configure firewall (only expose 80/443, block 8000/9000/9001)
- [ ] Enable monitoring (Prometheus + Grafana recommended)
- [ ] Set up log aggregation (optional: Loki, ELK)
- [ ] Configure email service (Brevo) with production credentials
- [ ] Test workflow execution end-to-end

### New Features

#### Autonomous Workflow System (Feature 002)

See [specs/002-autonomous-workflow-system/](specs/002-autonomous-workflow-system/) for complete documentation.

**What's new**:
- Visual workflow builder using ReactFlow
- Pre-built templates for common marketing scenarios
- Document-image attachment system (link copies to creatives)
- Async batch generation of content (10+ items in one workflow)
- Real-time execution monitoring
- Pause/resume/retry failed nodes

**Database changes**:
- 4 new tables: `workflow_templates`, `workflow_executions`, `agent_jobs`, `document_attachments`
- Migration: `backend/migrations/008_create_workflow_tables.sql`

**API endpoints**:
- `GET /api/workflows/templates` - List workflow templates
- `POST /api/executions/launch` - Start workflow execution
- `GET /api/executions/{id}` - Monitor progress
- `POST /api/documents/{id}/attachments` - Attach images to copy

### Support

For issues, see [GitHub Issues](https://github.com/your-org/xtyl-creativity-machine/issues)

---

**Version**: 1.1.0 (with Autonomous Workflow System)
**Last Updated**: 2025-11-25
