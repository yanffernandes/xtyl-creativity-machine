# Quickstart: Default System Templates Migration

**Feature**: 019-default-templates
**Date**: 2025-12-04
**Purpose**: Step-by-step guide to execute the templates migration.

## Prerequisites

Before running the migration:

1. ✅ **Backend environment running** with database access
2. ✅ **Alembic migrations configured** (`backend/migrations/` directory exists)
3. ✅ **Database connection** configured in `.env` file
4. ✅ **Python 3.11+** installed with all backend dependencies

---

## Quick Start (Recommended)

### Step 1: Generate Migration File

```bash
cd backend
alembic revision -m "seed_default_templates"
```

This creates: `backend/migrations/versions/<timestamp>_seed_default_templates.py`

### Step 2: Implement Migration

Copy the migration implementation from the tasks implementation phase. The migration will include:
- Deterministic UUID generation function
- Template data structures (51 AI templates + 15-20 workflows)
- Idempotent insert logic (check before insert)
- Logging for verification

### Step 3: Run Migration

```bash
# Test on local database first
alembic upgrade head

# Verify templates were inserted
python -c "from database import get_db; from models import Template, WorkflowTemplate; db = next(get_db()); print(f'Templates: {db.query(Template).filter(Template.is_system==True).count()}'); print(f'Workflows: {db.query(WorkflowTemplate).filter(WorkflowTemplate.is_system==True).count()}')"
```

Expected output:
```
Templates: 51
Workflows: 15-20
```

### Step 4: Test Idempotency

```bash
# Run migration again - should not create duplicates
alembic upgrade head

# Verify count unchanged
python -c "from database import get_db; from models import Template, WorkflowTemplate; db = next(get_db()); print(f'Templates: {db.query(Template).filter(Template.is_system==True).count()}'); print(f'Workflows: {db.query(WorkflowTemplate).filter(WorkflowTemplate.is_system==True).count()}')"
```

Count should remain the same.

---

## Manual Verification Steps

### 1. Verify Templates in Database

```sql
-- Check AI assistant templates
SELECT category, COUNT(*) as count
FROM templates
WHERE is_system = true
GROUP BY category
ORDER BY category;

-- Expected:
-- ads: 15
-- creative: 7
-- email: 8
-- landing_page: 7
-- seo: 7
-- social_media: 7

-- Check workflow templates
SELECT category, COUNT(*) as count
FROM workflow_templates
WHERE is_system = true
GROUP BY category
ORDER BY category;

-- Expected total: 15-20 workflows
```

### 2. Test Template Retrieval via API

```bash
# Get all AI templates
curl http://localhost:8000/templates?is_system=true

# Get templates by category
curl http://localhost:8000/templates?is_system=true&category=ads

# Get all workflow templates
curl http://localhost:8000/workflows?is_system=true

# Get workflow templates by category
curl http://localhost:8000/workflows?is_system=true&category=paid_ads
```

### 3. Test in Frontend UI

1. Navigate to `/workspace/{id}/templates` in browser
2. Verify 51 templates are visible
3. Filter by each category - verify counts match
4. Select a template - verify variables are properly formatted
5. Navigate to `/workspace/{id}/workflows`
6. Verify 15-20 workflow templates are visible
7. Click "Use Template" on a workflow - verify it loads correctly

---

## Rollback Procedure

If templates cause issues or need to be removed:

### Option 1: Alembic Downgrade

```bash
# Roll back one migration
alembic downgrade -1

# Verify templates removed
python -c "from database import get_db; from models import Template, WorkflowTemplate; db = next(get_db()); print(f'System Templates: {db.query(Template).filter(Template.is_system==True).count()}'); print(f'System Workflows: {db.query(WorkflowTemplate).filter(WorkflowTemplate.is_system==True).count()}')"
```

Expected output after downgrade:
```
System Templates: 0
System Workflows: 0
```

### Option 2: Manual SQL Delete

```sql
-- Delete all system templates (safe - won't affect user templates)
DELETE FROM templates WHERE is_system = true;
DELETE FROM workflow_templates WHERE is_system = true;

-- Verify deletion
SELECT COUNT(*) FROM templates WHERE is_system = true;  -- Should be 0
SELECT COUNT(*) FROM workflow_templates WHERE is_system = true;  -- Should be 0
```

---

## Production Deployment

### Recommended Approach

1. **Test on Staging First**
   ```bash
   # On staging environment
   alembic upgrade head
   ```

2. **Verify in Staging**
   - Test API endpoints
   - Test frontend UI
   - Verify template quality by generating sample content

3. **Deploy to Production**
   ```bash
   # Production deployment (via Docker Compose or deployment platform)
   docker-compose up -d  # Restart services with new migration
   # Migration runs automatically on backend startup
   ```

4. **Monitor Logs**
   ```bash
   docker logs -f backend-container-name | grep "seed_default_templates"
   ```

### Deployment Checklist

- [ ] Migration tested on local database
- [ ] Idempotency verified (re-run doesn't create duplicates)
- [ ] Template quality manually tested (sample content generation)
- [ ] API endpoints tested (templates retrievable)
- [ ] Frontend UI tested (templates display correctly)
- [ ] Migration tested on staging environment
- [ ] Rollback procedure tested and documented
- [ ] Production deployment scheduled (low-traffic window)
- [ ] Post-deployment verification plan prepared

---

## Troubleshooting

### Issue: Migration Fails with "Column not found"

**Cause**: Database schema doesn't match expected structure

**Solution**:
```bash
# Check current schema
alembic current

# Ensure all previous migrations are applied
alembic upgrade head

# Verify tables exist
python -c "from models import Template, WorkflowTemplate; print('Models loaded successfully')"
```

### Issue: Duplicate Templates Created

**Cause**: Idempotency logic not working correctly

**Solution**:
```bash
# Manually clean duplicates
python scripts/clean_duplicate_templates.py  # Create this script if needed

# Or use SQL
DELETE FROM templates t1
WHERE t1.is_system = true
  AND EXISTS (
    SELECT 1 FROM templates t2
    WHERE t2.name = t1.name
      AND t2.category = t1.category
      AND t2.is_system = true
      AND t2.created_at < t1.created_at
  );
```

### Issue: UUIDs Don't Match on Re-Run

**Cause**: Deterministic UUID generation not implemented correctly

**Solution**:
Verify UUID generation function uses consistent inputs:
```python
import uuid

def generate_template_uuid(name: str, category: str) -> str:
    combined = f"{name}:{category}"
    namespace = uuid.UUID('6ba7b810-9dad-11d1-80b4-00c04fd430c8')
    return str(uuid.uuid5(namespace, combined))

# Test consistency
id1 = generate_template_uuid("Test Template", "ads")
id2 = generate_template_uuid("Test Template", "ads")
assert id1 == id2, "UUIDs should match!"
```

### Issue: Frontend Doesn't Show Templates

**Possible Causes**:
1. Templates not marked as `is_system=true`
2. Templates not marked as `is_active=true`
3. Frontend filtering incorrectly

**Solution**:
```sql
-- Verify template flags
SELECT id, name, is_system, is_active
FROM templates
LIMIT 5;

-- Fix if needed
UPDATE templates SET is_system = true, is_active = true WHERE workspace_id IS NULL;
UPDATE workflow_templates SET is_system = true WHERE workspace_id IS NULL;
```

---

## Performance Monitoring

### Expected Migration Time

- Local development: **5-10 seconds**
- Staging/Production: **10-15 seconds**

If migration takes longer than 30 seconds, investigate:
- Database connection latency
- Index performance
- Duplicate check query efficiency

### Post-Deployment Monitoring

Monitor these metrics for 24 hours after deployment:

1. **Template Usage Rate**: Should increase from 0% to 50%+ within first day
2. **API Response Times**: `/templates` and `/workflows` endpoints should remain under 500ms
3. **Error Rates**: No increase in template-related errors
4. **User Engagement**: Track how many users browse/use templates

---

## Support & Documentation

### Related Files

- `specs/019-default-templates/spec.md` - Feature specification
- `specs/019-default-templates/plan.md` - Implementation plan
- `specs/019-default-templates/research.md` - Marketing framework research
- `specs/019-default-templates/data-model.md` - Database schema documentation
- `specs/019-default-templates/contracts/` - Example template JSON structures

### Additional Resources

- Alembic Documentation: https://alembic.sqlalchemy.org/
- Template Design Guidelines: See `research.md` Section 6
- Marketing Frameworks: See `research.md` Sections 1-3

### Getting Help

If you encounter issues:
1. Check troubleshooting section above
2. Review migration logs for error messages
3. Verify database schema matches `data-model.md`
4. Test on local database first before production
5. Document issue and contact development team

---

## Success Criteria Verification

After deployment, verify success criteria from spec.md:

- ✅ **SC-001**: Users can find templates within 2 minutes (manual UI test)
- ✅ **SC-002**: Each category has 5+ templates (SQL count query)
- ✅ **SC-003**: Track template usage rate over first week (should reach 80%)
- ✅ **SC-004**: Test template content generation - 90% success rate expected
- ✅ **SC-005**: Test workflow execution - 95% success rate expected
- ✅ **SC-008**: Verify idempotency - re-run creates zero duplicates

---

## Next Steps

After successful migration:

1. Monitor template usage analytics
2. Gather user feedback on template quality
3. Plan v2 migration with updated templates (6 months)
4. Consider adding more workflow templates based on usage patterns
5. Create user documentation/tutorials for template usage

---

**Migration Complete!** System templates are now available to all users.
