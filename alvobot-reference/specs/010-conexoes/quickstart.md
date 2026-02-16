# Quickstart - Conexoes (Integracoes)

Guia rapido para desenvolvedores implementarem a feature de conexoes.

## Pre-requisitos

- [ ] Supabase configurado e rodando
- [ ] Backend NestJS funcionando
- [ ] Frontend React migrado (spec 003)
- [ ] PostgreSQL com pgcrypto habilitado
- [ ] Facebook Developer Account
- [ ] Google Cloud Console Account

---

## Setup (30 minutos)

### 1. Facebook App Setup (10 min)

1. Acesse [Facebook Developers](https://developers.facebook.com/)
2. Crie novo App (tipo: Business)
3. Adicione produto "Facebook Login"
4. Configure OAuth Redirect URIs:
   ```
   http://localhost:3001/api/connections/meta/callback (dev)
   https://app.alvobot.com/api/connections/meta/callback (prod)
   ```
5. Copie App ID e App Secret

**Scopes necessarios:**
- `pages_manage_posts`
- `pages_read_engagement`
- `pages_messaging`
- `instagram_basic`
- `instagram_content_publish`

> **Note:** Alguns scopes requerem App Review. Para dev, use "Test Users".

---

### 2. Google App Setup (10 min)

1. Acesse [Google Cloud Console](https://console.cloud.google.com/)
2. Crie novo projeto "AlvoBot"
3. Habilite "Google Ads API"
4. Crie OAuth 2.0 credentials:
   - Application type: Web application
   - Authorized redirect URIs:
     ```
     http://localhost:3001/api/connections/google/callback (dev)
     https://app.alvobot.com/api/connections/google/callback (prod)
     ```
5. Configure OAuth consent screen
6. Copie Client ID e Client Secret

**Scopes necessarios:**
- `https://www.googleapis.com/auth/userinfo.email`
- `https://www.googleapis.com/auth/userinfo.profile`
- `https://www.googleapis.com/auth/adwords`

---

### 3. Environment Variables (5 min)

**Backend (.env)**:
```bash
# Meta (Facebook)
META_APP_ID=your_facebook_app_id
META_APP_SECRET=your_facebook_app_secret
META_REDIRECT_URI=http://localhost:3001/api/connections/meta/callback

# Google
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:3001/api/connections/google/callback

# Encryption
ENCRYPTION_KEY=generate-a-secure-random-32-char-key-here

# Supabase (ja existente)
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=xxx
```

**Gerar encryption key:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Frontend (.env)**:
```bash
VITE_API_URL=http://localhost:3001
```

---

### 4. Database Setup (5 min)

```bash
# 1. Criar migration
cd backend
npm run migration:create -- CreateConnectionsTables

# 2. Copiar SQL do data-model.md para a migration

# 3. Rodar migration
npm run migration:run

# 4. Verificar
psql $DATABASE_URL -c "\dt connections*"
```

---

## Development Workflow

### Backend: Implementar OAuth Flow (Day 1-2)

```bash
cd backend

# 1. Instalar dependencias
npm install @nestjs/passport passport passport-facebook passport-google-oauth20

# 2. Criar module
nest g module connections
nest g controller connections
nest g service connections

# 3. Estrutura de arquivos
src/modules/connections/
├── connections.module.ts
├── connections.controller.ts
├── connections.service.ts
├── dto/
│   ├── connection-response.dto.ts
│   └── create-connection.dto.ts
├── strategies/
│   ├── facebook.strategy.ts
│   └── google.strategy.ts
└── guards/
    └── jwt-auth.guard.ts

# 4. Implementar endpoints (ver spec.md - API Contracts)

# 5. Testar localmente
npm run start:dev
curl http://localhost:3001/api/connections
```

---

### Frontend: Implementar UI (Day 3)

```bash
cd frontend

# 1. Criar feature structure
mkdir -p src/features/connections/{api,components,pages,types}

# 2. Estrutura de arquivos
src/features/connections/
├── api/
│   └── useConnections.ts
├── components/
│   ├── ConnectionCard.tsx
│   ├── ConnectionList.tsx
│   ├── ConnectionStatus.tsx
│   ├── ConnectButton.tsx
│   └── DisconnectModal.tsx
├── pages/
│   └── ConnectionsPage.tsx
└── types/
    └── connection.ts

# 3. Implementar hooks (TanStack Query)

# 4. Implementar components

# 5. Adicionar rota
// src/App.tsx
<Route path="/connections" element={<ConnectionsPage />} />

# 6. Testar
npm run dev
# Abrir http://localhost:3000/connections
```

---

## Testing Quick Guide

### Manual Testing (5 min)

1. **Conectar Meta:**
   ```
   1. Login no frontend
   2. Ir para /connections
   3. Clicar "Conectar Meta"
   4. Autorizar no Facebook (usar Test User)
   5. Verificar que conexao aparece como "Ativa"
   ```

2. **Conectar Google:**
   ```
   1. Clicar "Conectar Google"
   2. Autorizar no Google
   3. Verificar que conexao aparece
   ```

3. **Desconectar:**
   ```
   1. Clicar "Desconectar" em uma conexao
   2. Confirmar
   3. Verificar que sumiu da lista
   ```

### Automated Testing

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Security audit
npm audit
```

---

## Debugging Tips

### OAuth Flow Issues

**Problema:** Redirect nao funciona
```bash
# Verificar redirect URI no Facebook/Google console
# Deve ser EXATAMENTE igual ao configurado em .env
```

**Problema:** State validation fails
```bash
# Verificar cookies
# HTTPOnly cookie 'oauth_state' deve estar presente
# Verificar que dominio do cookie esta correto
```

**Problema:** Tokens nao salvam
```bash
# Verificar encryption
psql $DATABASE_URL -c "SELECT encrypt_token('test');"

# Verificar RLS
psql $DATABASE_URL -c "SELECT * FROM connections;"
# Deve retornar vazio (RLS bloqueia SELECT direto)
```

### Common Errors

**Error:** `Invalid OAuth state`
- **Causa:** Cookie expirou ou state nao foi gerado
- **Fix:** Verificar geracao de state e HTTPOnly cookie

**Error:** `Token encryption failed`
- **Causa:** ENCRYPTION_KEY nao configurada
- **Fix:** Adicionar ENCRYPTION_KEY no .env

**Error:** `RLS policy violation`
- **Causa:** Tentando acessar conexao de outro usuario
- **Fix:** Verificar JWT e user_id

---

## Quick Reference

### Useful Commands

```bash
# Ver logs do backend
cd backend && npm run start:dev

# Ver logs de conexoes
psql $DATABASE_URL -c "SELECT * FROM connection_logs ORDER BY created_at DESC LIMIT 10;"

# Limpar conexoes de teste
psql $DATABASE_URL -c "DELETE FROM connections WHERE provider = 'meta';"

# Testar encryption
psql $DATABASE_URL -c "SELECT decrypt_token(encrypt_token('test'));"

# Ver RLS policies
psql $DATABASE_URL -c "\d+ connections"
```

### Endpoints para testar

```bash
# Backend health check
curl http://localhost:3001/health

# Listar conexoes (precisa de JWT)
curl -H "Authorization: Bearer $JWT" http://localhost:3001/api/connections

# Iniciar OAuth Meta
curl -X POST -H "Authorization: Bearer $JWT" \
  http://localhost:3001/api/connections/meta/initiate
```

---

## Next Steps

Apos setup concluido:

1. [ ] Implementar backend OAuth flows (spec.md - Phase 2-3)
2. [ ] Implementar frontend UI (spec.md - Phase 4)
3. [ ] Escrever testes (spec.md - Phase 5)
4. [ ] Deploy para staging
5. [ ] Teste manual completo
6. [ ] Deploy para producao

---

## Support & Resources

- **Spec completo:** `/specs/010-conexoes/spec.md`
- **Plan detalhado:** `/specs/010-conexoes/plan.md`
- **Research:** `/specs/010-conexoes/research.md`
- **Meta Docs:** https://developers.facebook.com/docs/facebook-login
- **Google Docs:** https://developers.google.com/identity/protocols/oauth2
