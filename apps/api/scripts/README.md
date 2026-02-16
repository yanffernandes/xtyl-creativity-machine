# Migration Validation Scripts

Scripts para validar a migração 032-full-stack-migration antes do deploy em produção.

## Quick Start

```bash
# Rodar todas as validações
./apps/api/scripts/run-all-validations.sh
```

## Scripts Individuais

### 1. Data Validation (T092, T094-T097)

Valida integridade dos dados, JSONB parsing, pgvector, e R2 URLs.

```bash
bun run apps/api/scripts/validate-data.ts
```

**Testa:**
- ✅ Record counts (30 tabelas)
- ✅ JSONB field parsing (T094)
- ✅ pgvector operations (T095)
- ✅ Celery task ID handling (T096)
- ✅ R2 storage URLs (T097)

### 2. API Smoke Tests (T091)

Testa endpoints críticos da API.

```bash
export TEST_USER_TOKEN="eyJ..."  # Get from browser localStorage
bun run apps/api/scripts/smoke-test.ts
```

**Testa:**
- ✅ Health check
- ✅ Auth endpoints
- ✅ Projects, Documents, Workflows
- ✅ Chat, Image generation
- ✅ Templates

### 3. RLS Policy Verification (T159)

Verifica Row Level Security policies.

```bash
export TEST_USER_EMAIL="test@example.com"
export TEST_USER_PASSWORD="password"
bun run apps/api/scripts/verify-rls.ts
```

**Testa:**
- ✅ Unauthenticated access blocked
- ✅ Authenticated access works
- ✅ Cross-user isolation

## Environment Variables

```bash
# Required
DATABASE_URL="postgresql://..."
SUPABASE_URL="https://xxx.supabase.co"
SUPABASE_ANON_KEY="eyJ..."

# Optional (for full testing)
TEST_USER_TOKEN="eyJ..."           # JWT token from logged-in user
TEST_USER_EMAIL="test@example.com"  # Test user credentials
TEST_USER_PASSWORD="password"
API_URL="http://localhost:3000"     # API endpoint
```

## Getting Test Credentials

### 1. Get TEST_USER_TOKEN

```bash
# Login to the app in browser
# Open DevTools > Application > Local Storage
# Copy the value of 'sb-xxx-auth-token'
# Extract the access_token field
```

### 2. Create Test User

```bash
# Use Supabase dashboard or:
curl -X POST $SUPABASE_URL/auth/v1/signup \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"SecurePass123!"}'
```

## Production Checklist

Antes do deploy em produção:

1. ✅ Run all validation scripts
2. ✅ Review `CUTOVER_CHECKLIST.md`
3. ✅ Backup database
4. ✅ Notify team of maintenance window
5. ✅ Follow cutover procedure

## Troubleshooting

**"DATABASE_URL not set"**
```bash
export DATABASE_URL="postgresql://user:pass@host:5432/db"
```

**"Some tests failed"**
- Check if API is running (`bun run dev`)
- Verify DATABASE_URL is correct
- Ensure TEST_USER_TOKEN is valid (not expired)

**"RLS tests skipped"**
- Set TEST_USER_EMAIL and TEST_USER_PASSWORD
- Ensure test user exists in database

## Files

- `validate-data.ts` - Data integrity validation
- `smoke-test.ts` - API endpoint testing
- `verify-rls.ts` - RLS policy verification
- `run-all-validations.sh` - Run all tests
- `README.md` - This file

## Related Docs

- `../../specs/032-full-stack-migration/CUTOVER_CHECKLIST.md`
- `../../specs/032-full-stack-migration/tasks.md`
- `../../specs/032-full-stack-migration/PHASE6_COMPLETION.md`
