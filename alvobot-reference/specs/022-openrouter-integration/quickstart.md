# Quickstart: OpenRouter Integration

**Feature**: 022-openrouter-integration
**Date**: 2026-01-09

## Prerequisites

- Node.js 18+ installed
- Access to the Alvobot development environment
- OpenRouter API key (obtain from [openrouter.ai](https://openrouter.ai))

## Environment Setup

### 1. Backend Environment Variables

Add the following to `backend/.env`:

```bash
# OpenRouter API Configuration
OPENROUTER_API_KEY=sk-or-v1-your-api-key-here
```

**Important**: The `OPENROUTER_API_KEY` follows the same pattern as `OPENAI_API_KEY`. If not configured, the OpenRouter provider option will be hidden in the admin UI.

### 2. Install Dependencies

```bash
# Backend - Install OpenRouter SDK
cd backend
npm install @openrouter/sdk
```

## Database Migration

Run the migration to add provider fields to the `system_prompts` table:

```bash
# Apply migration via Supabase CLI
supabase migration up

# Or manually apply the SQL from:
# specs/022-openrouter-integration/data-model.md
```

## Verification

### 1. Verify Backend Configuration

Start the backend and check the health endpoint:

```bash
cd backend
npm run start:dev

# Test OpenRouter key validation (requires admin token)
curl -X POST http://localhost:3001/admin/openrouter/validate-key \
  -H "Authorization: Bearer <admin-jwt-token>"
```

Expected response:
```json
{
  "valid": true,
  "configured": true
}
```

### 2. Verify Frontend Integration

1. Start the frontend: `cd frontend && npm run dev`
2. Log in as admin
3. Navigate to **Admin > System Prompts**
4. Create or edit a prompt
5. Verify the **Provider** dropdown shows "OpenAI" and "OpenRouter" options
6. Select "OpenRouter" and verify the model dropdown loads available models

### 3. Verify Image Generation Configuration

1. Navigate to **Admin > Settings > Image Generation**
2. Verify the model selector shows:
   - DALL-E 3 (OpenAI)
   - Imagen 3 (Google)
   - OpenRouter models (if API key is configured)
3. Select an OpenRouter image model and save
4. Test image generation in AlvoAds Meta

## Common Issues

### OpenRouter option not appearing

**Cause**: `OPENROUTER_API_KEY` environment variable not set or invalid.

**Solution**:
1. Verify the env var is set: `echo $OPENROUTER_API_KEY`
2. Restart the backend after adding the env var
3. Check the validation endpoint returns `configured: true`

### Model list not loading

**Cause**: OpenRouter API temporarily unavailable or rate limited.

**Solution**:
1. Check OpenRouter status at [status.openrouter.ai](https://status.openrouter.ai)
2. Models are cached for 5 minutes - wait and retry
3. Check backend logs for specific error messages

### Image generation failing with OpenRouter

**Cause**: Selected model may not support image output.

**Solution**:
1. Verify the model has `image` in its `output_modalities`
2. System will automatically fall back to DALL-E-3 if configured model fails
3. Check if you have sufficient OpenRouter credits

## API Reference

See [contracts/openrouter-api.yaml](./contracts/openrouter-api.yaml) for the complete API specification.

### Key Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/admin/openrouter/models` | GET | List available OpenRouter models |
| `/admin/openrouter/validate-key` | POST | Validate API key configuration |
| `/admin/settings/image-model` | GET/PUT | Get/set default image model |
| `/admin/system-prompts/test` | POST | Test prompt (extended for OpenRouter) |

## Development Workflow

1. **Feature branch**: `022-openrouter-integration`
2. **Run tests**: `cd backend && npm test`
3. **Type check**: `cd frontend && npm run typecheck`
4. **Lint**: `npm run lint` (in both directories)

## Related Documentation

- [spec.md](./spec.md) - Feature specification
- [plan.md](./plan.md) - Implementation plan
- [research.md](./research.md) - OpenRouter API research
- [data-model.md](./data-model.md) - Database schema changes
