# Quickstart: Google Search Console Indexing

## Prerequisites
- Backend running on port 3001
- Frontend running on port 5173
- Supabase configured (service role key in backend)

## Environment Variables (Backend)
Add to `/Users/erickheslan/Documents/Alvobot/alvobot-app/backend/.env`:
- GOOGLE_OAUTH_CLIENT_ID=...
- GOOGLE_OAUTH_CLIENT_SECRET=...
- GOOGLE_OAUTH_REDIRECT_URI=...
- GOOGLE_SCOPES="https://www.googleapis.com/auth/webmasters https://www.googleapis.com/auth/indexing"

## Start Services
```bash
cd /Users/erickheslan/Documents/Alvobot/alvobot-app/backend && npm run start:dev
cd /Users/erickheslan/Documents/Alvobot/alvobot-app/frontend && npm run dev
```

## Smoke Tests
- Conectar Google Search Console e listar propriedades
- Abrir datatable de artigos e ver status de indexação
- Solicitar indexação individual e em massa (status enfileirado)

## Validation Notes
- Checklist de execução revisado em 2026-01-25.
