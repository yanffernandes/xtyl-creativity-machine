# Research - Conexoes (Integracoes)

## OAuth 2.0 Best Practices

### PKCE (Proof Key for Code Exchange)

**Why PKCE?**
- Protege contra authorization code interception attacks
- Especialmente importante para SPAs (Single Page Applications)
- Recomendado mesmo para confidential clients

**How it works:**
1. Cliente gera `code_verifier` (random string)
2. Cliente gera `code_challenge` = SHA256(code_verifier)
3. Envia `code_challenge` no authorization request
4. Armazena `code_verifier` localmente
5. Envia `code_verifier` no token exchange
6. Servidor valida: SHA256(code_verifier) == code_challenge

**Implementation:**
```typescript
// Generate code_verifier (43-128 characters)
function generateCodeVerifier(): string {
  return base64URLEncode(crypto.randomBytes(32))
}

// Generate code_challenge
function generateCodeChallenge(verifier: string): string {
  return base64URLEncode(sha256(verifier))
}
```

**References:**
- [RFC 7636 - PKCE](https://datatracker.ietf.org/doc/html/rfc7636)
- [OAuth 2.0 for Browser-Based Apps](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-browser-based-apps)

---

## Meta (Facebook/Instagram) OAuth

### Required Scopes for AlvoBot

```typescript
const META_SCOPES = [
  'pages_manage_posts',        // Publicar em pages
  'pages_read_engagement',     // Ler metricas de engagement
  'pages_messaging',           // Enviar mensagens via Messenger
  'instagram_basic',           // Acesso basico ao Instagram
  'instagram_content_publish', // Publicar no Instagram
  'business_management',       // Gerenciar Business Manager
]
```

### Facebook Login Flow

1. **App Setup** (Facebook Developer Console):
   - Criar App (tipo: Business)
   - Adicionar produto "Facebook Login"
   - Configurar OAuth Redirect URIs
   - Passar por App Review para scopes avancados

2. **Authorization URL**:
```
https://www.facebook.com/v18.0/dialog/oauth?
  client_id={app-id}
  &redirect_uri={redirect-uri}
  &state={state-param}
  &scope={scopes}
  &code_challenge={code-challenge}
  &code_challenge_method=S256
```

3. **Token Exchange**:
```typescript
POST https://graph.facebook.com/v18.0/oauth/access_token
{
  client_id: string
  client_secret: string
  redirect_uri: string
  code: string
  code_verifier: string // PKCE
}

Response:
{
  access_token: string
  token_type: "bearer"
  expires_in: number // segundos
}
```

4. **Long-Lived Tokens**:
Meta tokens iniciais expiram em 1 hora. Trocar por long-lived (60 dias):
```typescript
GET https://graph.facebook.com/v18.0/oauth/access_token?
  grant_type=fb_exchange_token
  &client_id={app-id}
  &client_secret={app-secret}
  &fb_exchange_token={short-lived-token}
```

5. **Page Access Tokens**:
Para publicar em pages, precisa de Page Access Tokens:
```typescript
GET https://graph.facebook.com/v18.0/me/accounts?
  access_token={user-access-token}

Response:
{
  data: [
    {
      id: string
      name: string
      access_token: string // Page token (nao expira se page tem admin)
    }
  ]
}
```

### Token Refresh Strategy

Meta nao tem refresh tokens nativos. Estrategias:
1. **Long-lived tokens**: Expiram em 60 dias, renovar antes
2. **Page tokens**: Nao expiram se usuario e admin da page
3. **Monitorar expiracao**: Notificar usuario 7 dias antes

**References:**
- [Facebook Login Documentation](https://developers.facebook.com/docs/facebook-login/guides/advanced/manual-flow)
- [Access Tokens](https://developers.facebook.com/docs/facebook-login/guides/access-tokens)
- [Page Access Tokens](https://developers.facebook.com/docs/pages/access-tokens)

---

## Google OAuth

### Required Scopes for AlvoBot

```typescript
const GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
  'https://www.googleapis.com/auth/adwords', // Google Ads
]
```

### Google OAuth Flow

1. **App Setup** (Google Cloud Console):
   - Criar projeto
   - Habilitar APIs (Google Ads API)
   - Criar OAuth 2.0 credentials
   - Configurar OAuth consent screen
   - Adicionar redirect URIs

2. **Authorization URL**:
```
https://accounts.google.com/o/oauth2/v2/auth?
  client_id={client-id}
  &redirect_uri={redirect-uri}
  &response_type=code
  &scope={scopes}
  &state={state-param}
  &code_challenge={code-challenge}
  &code_challenge_method=S256
  &access_type=offline // Para receber refresh token
  &prompt=consent // Forcar consentimento para refresh token
```

3. **Token Exchange**:
```typescript
POST https://oauth2.googleapis.com/token
{
  client_id: string
  client_secret: string
  redirect_uri: string
  code: string
  code_verifier: string // PKCE
  grant_type: "authorization_code"
}

Response:
{
  access_token: string
  refresh_token: string // Apenas se access_type=offline
  expires_in: number // 3600 (1 hora)
  token_type: "Bearer"
  scope: string
}
```

4. **Refresh Token**:
```typescript
POST https://oauth2.googleapis.com/token
{
  client_id: string
  client_secret: string
  refresh_token: string
  grant_type: "refresh_token"
}

Response:
{
  access_token: string
  expires_in: number
  token_type: "Bearer"
  scope: string
}
```

### Token Refresh Strategy

Google fornece refresh tokens nativos:
- Access token expira em 1 hora
- Refresh token nao expira (a menos que revogado)
- Auto-refresh 5 minutos antes da expiracao
- Armazenar refresh token de forma segura (encrypted)

**References:**
- [Google OAuth 2.0](https://developers.google.com/identity/protocols/oauth2)
- [Using OAuth 2.0 for Web Server Applications](https://developers.google.com/identity/protocols/oauth2/web-server)
- [Google Ads API OAuth](https://developers.google.com/google-ads/api/docs/oauth/overview)

---

## Token Storage Security

### Encryption at Rest

**Option 1: pgcrypto (PostgreSQL)**
```sql
-- Encrypt
SELECT pgp_sym_encrypt('token_value', 'encryption_key')

-- Decrypt
SELECT pgp_sym_decrypt(encrypted_token, 'encryption_key')
```

**Pros:**
- Nativo do PostgreSQL
- Simples de implementar
- Sem dependencias externas

**Cons:**
- Encryption key precisa estar em .env (risk)
- Nao tem key rotation automatica

**Option 2: AWS KMS / Google Cloud KMS**
```typescript
// Encrypt via KMS
const encrypted = await kms.encrypt({
  KeyId: 'key-id',
  Plaintext: 'token_value'
})

// Decrypt via KMS
const decrypted = await kms.decrypt({
  CiphertextBlob: encrypted
})
```

**Pros:**
- Key rotation automatica
- Audit trail de acessos
- Separacao de responsabilidades

**Cons:**
- Custo adicional
- Latencia em cada encrypt/decrypt
- Dependencia de servico externo

**Decision for MVP**: Usar **pgcrypto** por simplicidade, planejar migracao para KMS em producao.

### Key Management

**Environment Variables (.env)**:
```bash
# DEV
ENCRYPTION_KEY=dev-encryption-key-32-chars-min

# PROD (usar secret manager)
ENCRYPTION_KEY=${SECRET_MANAGER_ENCRYPTION_KEY}
```

**Best Practices:**
- NUNCA commitar encryption key no repo
- Usar diferentes keys para dev/staging/prod
- Rotacionar key periodicamente (planejar estrategia)
- Usar secret manager em producao (AWS Secrets Manager, GCP Secret Manager)

---

## State Management (CSRF Protection)

### State Parameter

**Purpose**: Prevenir CSRF attacks durante OAuth flow

**Implementation:**
```typescript
// 1. Generate state token
const state = crypto.randomBytes(32).toString('hex')

// 2. Store in HTTPOnly cookie
res.cookie('oauth_state', state, {
  httpOnly: true,
  secure: true,
  sameSite: 'lax',
  maxAge: 600000 // 10 minutos
})

// 3. Include in authorization URL
const authUrl = `${OAUTH_URL}?state=${state}&...`

// 4. Validate on callback
if (req.query.state !== req.cookies.oauth_state) {
  throw new UnauthorizedException('Invalid state')
}
```

**Additional Security:**
- Store state com timestamp (expirar apos 10 min)
- Limpar cookie apos callback bem-sucedido
- Logar tentativas de state invalido (possivel ataque)

---

## Rate Limiting

### OAuth Endpoints

Proteger contra abuse:

```typescript
// NestJS Throttler
@ThrottleGuard({
  ttl: 60,     // 60 segundos
  limit: 10    // 10 requests
})
@Post('connections/:provider/initiate')
```

**Limits recomendados:**
- `/initiate`: 10 requests / minuto / usuario
- `/callback`: 20 requests / minuto / IP (callback pode falhar e retry)
- `/refresh`: 5 requests / minuto / conexao

### External API Rate Limits

**Meta (Facebook Graph API):**
- App-level: 200 calls / hour / user
- Page-level: depende do tier da page
- Burst: 600 calls / 10 min

**Google Ads API:**
- Basic access: 15,000 operations / day
- Standard access: 100,000+ operations / day
- Rate limit errors: HTTP 429

**Strategy:**
- Implementar exponential backoff
- Cachear responses quando possivel
- Queue de requisicoes para evitar burst

---

## Monitoring & Logging

### What to Log

**DO Log:**
- OAuth flow iniciado (user_id, provider, timestamp)
- Callback recebido (user_id, provider, success/failure)
- Token refresh (connection_id, success/failure)
- Conexao revogada (user_id, connection_id, reason)
- Rate limit hits
- Erros e exceptions

**DO NOT Log:**
- Access tokens
- Refresh tokens
- Authorization codes
- Encryption keys

### Log Format

```typescript
{
  timestamp: '2025-12-11T10:30:00Z',
  level: 'info',
  event: 'oauth_callback_success',
  user_id: 'uuid',
  provider: 'meta',
  connection_id: 'uuid',
  metadata: {
    scopes: ['pages_manage_posts'],
    pages_count: 3
  }
}
```

### Alerts

- Token refresh failure rate >5%
- OAuth callback failures >10/hour
- State validation failures (possivel CSRF attack)
- Encryption/decryption errors

---

## Testing Strategy

### Unit Tests

```typescript
describe('ConnectionsService', () => {
  it('should encrypt tokens before storing', async () => {
    const token = 'access_token_123'
    const encrypted = await service.encryptToken(token)
    expect(encrypted).not.toBe(token)

    const decrypted = await service.decryptToken(encrypted)
    expect(decrypted).toBe(token)
  })

  it('should validate state parameter', () => {
    const validState = 'valid_state'
    const invalidState = 'invalid_state'

    expect(() => service.validateState(validState, validState)).not.toThrow()
    expect(() => service.validateState(validState, invalidState)).toThrow()
  })
})
```

### Integration Tests

```typescript
describe('OAuth Flow - Meta', () => {
  it('should complete full OAuth flow', async () => {
    // 1. Initiate
    const { authUrl, state } = await request(app)
      .post('/api/connections/meta/initiate')
      .set('Authorization', `Bearer ${userToken}`)
      .expect(200)

    expect(authUrl).toContain('facebook.com')
    expect(state).toBeDefined()

    // 2. Simulate callback (mock Facebook response)
    const callbackResponse = await request(app)
      .get('/api/connections/meta/callback')
      .query({ code: 'mock_code', state })
      .expect(302) // Redirect

    // 3. Verify connection created
    const connections = await request(app)
      .get('/api/connections')
      .set('Authorization', `Bearer ${userToken}`)
      .expect(200)

    expect(connections.body.data).toHaveLength(1)
    expect(connections.body.data[0].provider).toBe('meta')
    expect(connections.body.data[0].status).toBe('active')
  })
})
```

### E2E Tests

```typescript
describe('E2E: Connect Meta Account', () => {
  it('should connect Meta account via UI', async () => {
    await page.goto('/connections')

    // Click connect button
    await page.click('[data-testid="connect-meta-button"]')

    // Should redirect to Facebook (mock in test)
    // await expect(page.url()).toContain('facebook.com')

    // Simulate successful callback
    await page.goto('/connections?status=success&provider=meta')

    // Verify connection appears in list
    const connectionCard = await page.$('[data-testid="connection-meta"]')
    expect(connectionCard).toBeTruthy()

    const status = await page.$eval(
      '[data-testid="connection-meta-status"]',
      el => el.textContent
    )
    expect(status).toBe('Ativa')
  })
})
```

### Security Tests

```typescript
describe('Security Tests', () => {
  it('should not expose tokens in API responses', async () => {
    const response = await request(app)
      .get('/api/connections')
      .set('Authorization', `Bearer ${userToken}`)
      .expect(200)

    const json = JSON.stringify(response.body)
    expect(json).not.toContain('access_token')
    expect(json).not.toContain('refresh_token')
  })

  it('should enforce RLS policies', async () => {
    // User A creates connection
    await createConnection(userAToken, 'meta')

    // User B tries to access User A's connection
    const response = await request(app)
      .get('/api/connections')
      .set('Authorization', `Bearer ${userBToken}`)
      .expect(200)

    expect(response.body.data).toHaveLength(0)
  })

  it('should reject invalid state parameter', async () => {
    await request(app)
      .get('/api/connections/meta/callback')
      .query({ code: 'code', state: 'invalid_state' })
      .expect(401)
  })
})
```

---

## Libraries & Tools

### Backend (NestJS)

```json
{
  "dependencies": {
    "@nestjs/passport": "^10.0.0",
    "passport": "^0.7.0",
    "passport-facebook": "^3.0.0",
    "passport-google-oauth20": "^2.0.0",
    "@supabase/supabase-js": "^2.39.0",
    "@nestjs/throttler": "^5.0.0"
  }
}
```

### Frontend (React)

```json
{
  "dependencies": {
    "@tanstack/react-query": "^5.0.0",
    "zustand": "^4.4.0",
    "react-router-dom": "^6.20.0"
  }
}
```

---

## Alternative Approaches Considered

### 1. Frontend-only OAuth (REJECTED)

**Approach**: Usar Implicit Grant Flow, tokens no frontend

**Pros:**
- Mais simples (sem backend OAuth)
- Menos latencia

**Cons:**
- INSEGURO - tokens expostos
- Implicit Flow deprecated
- Sem refresh tokens
- CSRF vulnerabilities

**Decision**: REJEITAR. Security > Simplicidade

---

### 2. Third-party OAuth Provider (ex: Auth0)

**Approach**: Usar Auth0 Social Connections para Meta/Google

**Pros:**
- OAuth gerenciado
- Security handled
- Menos codigo para manter

**Cons:**
- Custo adicional ($$$)
- Vendor lock-in
- Menos controle sobre flow
- Complexidade adicional

**Decision**: REJEITAR para MVP. Implementar in-house e considerar Auth0 se escalar

---

### 3. Supabase Auth Social Providers

**Approach**: Usar Supabase Auth com Meta/Google providers

**Pros:**
- Integrado com Supabase
- Gerenciado automaticamente
- Simples de configurar

**Cons:**
- Limitado a autenticacao de usuarios (nao serve para integracoes)
- Nao suporta custom scopes (pages, ads)
- Tokens sao para login, nao para API calls

**Decision**: REJEITAR. Supabase Auth e para login de usuarios, nao para integracoes de servicos

---

## References & Resources

### Standards
- [OAuth 2.0 RFC 6749](https://datatracker.ietf.org/doc/html/rfc6749)
- [PKCE RFC 7636](https://datatracker.ietf.org/doc/html/rfc7636)
- [OAuth 2.0 Security Best Practices](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-security-topics)

### Meta
- [Facebook Login Documentation](https://developers.facebook.com/docs/facebook-login)
- [Facebook Graph API](https://developers.facebook.com/docs/graph-api)
- [Instagram Basic Display API](https://developers.facebook.com/docs/instagram-basic-display-api)

### Google
- [Google OAuth 2.0](https://developers.google.com/identity/protocols/oauth2)
- [Google Ads API](https://developers.google.com/google-ads/api/docs/start)

### Security
- [OWASP OAuth 2.0 Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/OAuth2_Cheat_Sheet.html)
- [PostgreSQL pgcrypto](https://www.postgresql.org/docs/current/pgcrypto.html)

### Libraries
- [Passport.js](http://www.passportjs.org/)
- [passport-facebook](https://github.com/jaredhanson/passport-facebook)
- [passport-google-oauth20](https://github.com/jaredhanson/passport-google-oauth20)
