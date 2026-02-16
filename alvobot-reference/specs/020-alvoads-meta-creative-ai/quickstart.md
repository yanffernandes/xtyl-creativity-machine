# Quickstart: AlvoADS Meta - Geracao Automatizada de Criativos por IA

**Date**: 2026-01-02
**Feature**: [spec.md](./spec.md)

## Prerequisites

- Node.js 18+
- Acesso ao Supabase (URL + Service Key)
- API Keys:
  - OpenAI API Key (DALL-E)
  - Google AI API Key (Imagen)
- Backend e Frontend rodando localmente

## Environment Setup

### Backend (.env)

```env
# Existing
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=xxx
OPENAI_API_KEY=xxx

# New for this feature
GOOGLE_AI_API_KEY=xxx  # Para Imagen 3
```

### Frontend (.env)

```env
# No changes needed - uses existing Supabase config
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=xxx
VITE_API_URL=http://localhost:3001
```

## Installation

```bash
# 1. Install Google AI SDK in backend
cd backend
npm install @google/genai

# 2. Run database migration
# Via Supabase Dashboard or CLI
supabase db push

# 3. Seed the image prompt
# Run the SQL in supabase/seeds/system_prompts_image_generator.sql

# 4. Create storage bucket
# Via Supabase Dashboard: Storage > Create bucket "meta-creatives" (public)
```

## Quick Test

### 1. Test Image Generation (Backend)

```bash
# Start backend
cd backend && npm run start:dev

# Test with curl
curl -X POST http://localhost:3001/api/meta/creatives/generate-images \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "articles": [{"id": 1, "title": "Teste", "keyword": "teste"}],
    "count": 1,
    "model": "dall-e-3",
    "format": "1:1"
  }'
```

### 2. Test Credits Preview

```bash
curl -X POST http://localhost:3001/api/meta/creatives/credits/preview \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "imageCount": 5,
    "generateAdCopy": true
  }'
```

### 3. Test Library Listing

```bash
curl http://localhost:3001/api/meta/creatives/library \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Frontend Integration

### Access the Creative Step

1. Navigate to `/alvoads-meta/new`
2. Complete steps: Account, Page, Targeting, Articles, AdSets Config
3. The new **Criativos** step will appear
4. Select model, format, add optional directions
5. Click "Gerar Imagens por IA"
6. Approve/reject images in the grid
7. Proceed to text generation

## Key Files Created/Modified

### Backend
- `backend/src/modules/meta/services/ai-creative.service.ts` - Extended with Imagen
- `backend/src/modules/meta/services/creative-library.service.ts` - NEW
- `backend/src/modules/meta/creative.controller.ts` - NEW
- `backend/src/modules/meta/dto/generate-image.dto.ts` - NEW

### Frontend
- `frontend/src/features/alvoads-meta/components/wizard/StepCreatives.tsx` - NEW
- `frontend/src/features/alvoads-meta/components/wizard/CreativeGrid.tsx` - NEW
- `frontend/src/features/alvoads-meta/api/useCreatives.ts` - NEW
- `frontend/src/features/alvoads-meta/stores/metaAdsWizardStore.ts` - Extended

### Database
- `supabase/migrations/20260102_creative_library.sql` - NEW tables
- `supabase/seeds/system_prompts_image_generator.sql` - NEW prompt

## Troubleshooting

### "Créditos insuficientes"
- Verify user has active subscription with credits
- Check `user_credits_summary` view in Supabase

### Image generation fails
- Check API keys are valid
- Verify network connectivity
- Check logs: `docker logs backend`

### Images not saving
- Verify Supabase Storage bucket exists
- Check RLS policies allow inserts
- Verify storage path structure

### Imagen 3 not working
- Ensure GOOGLE_AI_API_KEY is set
- Verify API is enabled in Google Cloud Console
- Check if fallback to DALL-E is triggering

## Development Tips

1. **Test models individually**: Use the API directly to verify each model works
2. **Monitor credits**: Watch `credit_transactions` table during testing
3. **Check storage**: Verify images appear in `meta-creatives` bucket
4. **Review prompts**: Inspect `system_prompts` for `meta-ads.image-prompt-generator`

## Next Steps

After setup:
1. Run `/speckit.tasks` to generate implementation tasks
2. Start with backend services
3. Then frontend components
4. Integration testing
5. E2E testing with real campaigns
