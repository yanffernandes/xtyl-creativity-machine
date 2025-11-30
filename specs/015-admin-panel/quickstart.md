# Quickstart: Admin Panel

**Feature**: 015-admin-panel
**Date**: 2025-11-30

## Prerequisites

- PostgreSQL database with existing schema
- Supabase Auth configured
- OpenRouter API access
- Node.js 18+ and Python 3.11+

## Setup Steps

### 1. Database Migration

Run the admin tables migration:

```bash
# From backend directory
psql $DATABASE_URL -f migrations/016_add_admin_tables.sql
```

### 2. Create First Super Admin

Option A: Via migration (add to 016_add_admin_tables.sql):
```sql
-- Set initial admin (update email)
UPDATE users SET is_super_admin = true
WHERE email = 'your-admin@example.com';
```

Option B: Via CLI script:
```bash
cd backend
python -m scripts.set_admin --email your-admin@example.com
```

### 3. Backend Setup

Ensure admin router is included in main.py:

```python
# backend/main.py
from routers import admin

app.include_router(admin.router)
```

### 4. Frontend Setup

The admin routes are automatically available at `/admin/*` after deployment.

### 5. Verify Installation

1. Login with your admin account
2. Navigate to `http://localhost:3000/admin`
3. You should see the admin dashboard

## API Endpoints Summary

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/admin/verify` | GET | Verify admin access |
| `/admin/models/config` | GET/PUT | AI model configuration |
| `/admin/models/available` | GET | List available models |
| `/admin/users` | GET | List all users |
| `/admin/users/{id}` | GET | User details |
| `/admin/users/{id}/block` | POST | Block user |
| `/admin/users/{id}/unblock` | POST | Unblock user |
| `/admin/workspaces` | GET | List all workspaces |
| `/admin/workspaces/{id}` | GET | Workspace details |
| `/admin/dashboard/metrics` | GET | Dashboard metrics |
| `/admin/settings/limits` | GET/PUT | Global limits |
| `/admin/settings/features` | GET/PUT | Feature flags |
| `/admin/audit` | GET | Audit log |

## Configuration

### Environment Variables

No new environment variables required. Admin panel uses existing:
- `DATABASE_URL` - PostgreSQL connection
- `SUPABASE_JWT_SECRET` - JWT validation
- `OPENROUTER_API_KEY` - Model listing

### Default Model Configuration

Initial seed creates these defaults (editable via admin panel):

| Task Type | Default Model | Fallback Model |
|-----------|---------------|----------------|
| Chat | openai/gpt-4-turbo | openai/gpt-3.5-turbo |
| Embedding | openai/text-embedding-3-small | openai/text-embedding-ada-002 |
| Vision | openai/gpt-4-turbo | anthropic/claude-3-sonnet |
| Document Analysis | openai/gpt-4-turbo | anthropic/claude-3-sonnet |
| Image Generation | openai/dall-e-3 | stabilityai/stable-diffusion-xl |
| Image Naming | openai/gpt-3.5-turbo | openai/gpt-3.5-turbo |

### Global Limits Defaults

| Limit | Default Value |
|-------|---------------|
| Tokens per user/month | 1,000,000 |
| Workspaces per user | 10 |
| Documents per project | 500 |
| Max image size | 10 MB |
| Concurrent workflows | 5 |

### Feature Flags Defaults

| Flag | Default |
|------|---------|
| Image Generation | Enabled |
| Workflows | Enabled |
| RAG | Enabled |
| Vision | Enabled |
| Maintenance Mode | Disabled |

## Common Tasks

### Change Default Chat Model

1. Go to `/admin/models`
2. In "Default Models" section, select new model for "Chat"
3. Click "Save Changes"
4. Changes apply immediately to new conversations

### Block a User

1. Go to `/admin/users`
2. Find user via search
3. Click "Block" button
4. Confirm action
5. User receives "Account blocked" message on next login attempt

### View System Metrics

1. Go to `/admin/dashboard`
2. Select time period (7d, 30d, 90d)
3. View metrics:
   - Active users
   - AI token usage
   - Error rates
   - Workspace activity

### Configure Rate Limits

1. Go to `/admin/settings`
2. Navigate to "Limits" tab
3. Adjust values (e.g., tokens per month)
4. Click "Save"
5. Limits apply to new usage immediately

## Troubleshooting

### "Admin access required" error

- Verify your user has `is_super_admin = true` in database
- Clear browser cache and login again
- Check JWT token contains correct user ID

### Model configuration not updating

- Check browser console for API errors
- Verify model IDs are valid via `/admin/models/available`
- Check audit log for any failures

### Dashboard metrics slow

- Metrics queries may be slow on large datasets
- Consider adding indexes if not present
- Check database connection pool settings

## Security Notes

- Admin actions are logged in `admin_audit_log` table
- API keys are masked in responses (only last 4 chars shown)
- Cannot block yourself or demote your own admin status
- All admin endpoints require `super_admin` role
