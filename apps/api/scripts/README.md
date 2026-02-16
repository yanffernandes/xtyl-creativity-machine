# 🔍 Validation Scripts - Phase 5 (US6)

Data continuity validation scripts for the 032-full-stack-migration.

## Overview

These scripts validate that the new NestJS backend can correctly read and write data from the existing database, ensuring zero data loss during migration.

## Scripts

| Script | Task | Purpose |
|--------|------|---------|
| `validate-data.ts` | T092 | Validates record counts across all 30+ tables |
| `validate-jsonb.ts` | T094 | Validates JSONB field structure and parseability |
| `validate-rls.ts` | T159 | Validates Row Level Security policies |
| `validate-all.sh` | Master | Runs all validations in sequence |

## Usage

### Prerequisites

```bash
# 1. Ensure DATABASE_URL is set
export DATABASE_URL="postgresql://..."

# OR load from .env
source .env

# 2. Optional: Set Supabase credentials for RLS testing
export SUPABASE_URL="https://..."
export SUPABASE_ANON_KEY="..."
```

### Run Individual Scripts

```bash
# Data count validation
bun --bun apps/api/scripts/validate-data.ts

# JSONB field validation
bun --bun apps/api/scripts/validate-jsonb.ts

# RLS policy validation
bun --bun apps/api/scripts/validate-rls.ts
```

### Run All Validations

```bash
# Master script (recommended)
./apps/api/scripts/validate-all.sh
```

Expected output:
```
╔════════════════════════════════════════════════════════╗
║   Master Validation Script - Phase 5 (US6)           ║
║   Validates data continuity for migration            ║
╚════════════════════════════════════════════════════════╝

[1/3] Running Data Count Validation...
✓ users                        5 records
✓ workspaces                   3 records
✓ projects                    12 records (2 deleted)
...
✓ Data count validation passed

[2/3] Running JSONB Field Validation...
✓ documents.generation_metadata       45 valid JSONB records
✓ workflow_templates.nodes_json       8 valid JSONB records
...
✓ JSONB validation passed

[3/3] Running RLS Policy Validation...
✓ documents                    RLS enabled
✓ projects                     RLS enabled
...
✓ RLS validation passed

╔════════════════════════════════════════════════════════╗
║                    Validation Summary                  ║
╚════════════════════════════════════════════════════════╝

✅ ALL VALIDATIONS PASSED
The new backend is ready for migration cutover.
```

## What Gets Validated

### 1. Data Count Validation (`validate-data.ts`)

- ✅ Record counts for all 30+ core tables
- ✅ Soft-delete counts (deleted_at IS NOT NULL)
- ✅ Active record counts (total - deleted)
- ✅ Sample record retrieval (verifies table readability)
- ⚠️ Warns if critical tables (users, workspaces, projects) have 0 records

**Exit code**: 0 = success, 1 = errors found

### 2. JSONB Field Validation (`validate-jsonb.ts`)

- ✅ JSONB fields are parseable (jsonb_typeof() is not null)
- ✅ JSONB structure validation (arrays, objects)
- ✅ Custom validators for critical fields:
  - `documents.generation_metadata` → has model or prompt
  - `workflow_templates.nodes_json` → is array
  - `workflow_templates.edges_json` → is array
  - `chat_conversations.messages_json` → all messages have role + content
- ⚠️ Samples 10 records per field for deep validation

**Exit code**: 0 = success, 1 = errors found

### 3. RLS Policy Validation (`validate-rls.ts`)

- ✅ RLS enabled on critical tables (documents, projects, chat, memories)
- ✅ RLS policies defined (checks pg_policies)
- ✅ Anonymous Supabase client returns 0 rows (RLS working)
- ⚠️ Requires SUPABASE_URL + ANON_KEY for full testing

**Exit code**: 0 = success, 1 = errors found

## When to Run

### During Development
Run after implementing new features that touch the database:
```bash
./apps/api/scripts/validate-all.sh
```

### Before Cutover (Pre-Migration)
Run 24 hours before cutover to establish baseline:
```bash
# Save output to file for comparison
./apps/api/scripts/validate-all.sh | tee validation-pre-cutover.log
```

### During Cutover (Migration Window)
Run again during the 2-hour maintenance window:
```bash
# Compare with pre-cutover baseline
./apps/api/scripts/validate-all.sh | tee validation-cutover.log
diff validation-pre-cutover.log validation-cutover.log
```

Record counts should be **identical** or slightly higher (if new data was created).

### Post-Cutover (After Go-Live)
Run 24 hours after cutover to verify stability:
```bash
./apps/api/scripts/validate-all.sh | tee validation-post-cutover.log
```

## Troubleshooting

### Issue: "DATABASE_URL environment variable not set"
**Solution**: Load your `.env` file
```bash
source .env
./apps/api/scripts/validate-all.sh
```

### Issue: "Failed to validate table X: relation does not exist"
**Solution**: Run database migrations
```bash
cd apps/api
bun run drizzle-kit push  # or your migration command
```

### Issue: "CRITICAL: RLS not enabled on documents"
**Solution**: Enable RLS via Supabase dashboard
```sql
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
```

### Issue: "JSONB validation failed"
**Solution**: Check for corrupt JSONB data
```sql
-- Find invalid JSONB
SELECT id, generation_metadata
FROM documents
WHERE generation_metadata IS NOT NULL
  AND jsonb_typeof(generation_metadata) IS NULL;
```

### Issue: "No RLS policies found for documents"
**Solution**: Create RLS policies
```sql
-- Example: Users can only see documents in their workspace
CREATE POLICY "Users can view own workspace documents"
ON documents FOR SELECT
USING (
  project_id IN (
    SELECT id FROM projects
    WHERE workspace_id = (SELECT workspace_id FROM users WHERE id = auth.uid())
  )
);
```

## Integration with CI/CD

Add to GitHub Actions (future):
```yaml
- name: Run data validation
  run: ./apps/api/scripts/validate-all.sh
  env:
    DATABASE_URL: ${{ secrets.DATABASE_URL }}
    SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
    SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
```

## Related Documentation

- [Cutover Checklist](../../specs/032-full-stack-migration/cutover-checklist.md)
- [Data Model](../../specs/032-full-stack-migration/data-model.md)
- [Tasks](../../specs/032-full-stack-migration/tasks.md)

## Maintenance

These scripts should be updated when:
- New tables are added to the database
- New JSONB fields are introduced
- RLS policies change
- Critical tables change (add to validation list)

---

**Last Updated**: 2026-02-16
**Maintained By**: @yanfernandes
