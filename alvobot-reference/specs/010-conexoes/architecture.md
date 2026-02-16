# Architecture - Conexoes (Integracoes)

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND (React)                         │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  ConnectionsPage                                         │   │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐        │   │
│  │  │ Meta Card  │  │Google Card │  │  Future    │        │   │
│  │  │ [Connect]  │  │ [Connect]  │  │  Provider  │        │   │
│  │  └────────────┘  └────────────┘  └────────────┘        │   │
│  └──────────────────────────────────────────────────────────┘   │
│                            ↓                                     │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  TanStack Query Hooks                                    │   │
│  │  • useConnections()                                      │   │
│  │  • useConnectProvider(provider)                          │   │
│  │  • useDisconnectConnection(id)                           │   │
│  └──────────────────────────────────────────────────────────┘   │
└───────────────────────────┬─────────────────────────────────────┘
                            │ HTTP + JWT
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│                       BACKEND (NestJS)                           │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  ConnectionsController                                   │   │
│  │  • POST /connections/:provider/initiate                  │   │
│  │  • GET  /connections/:provider/callback                  │   │
│  │  • GET  /connections                                     │   │
│  │  • POST /connections/:id/refresh                         │   │
│  │  • DELETE /connections/:id                               │   │
│  └──────────────────────────────────────────────────────────┘   │
│                            ↓                                     │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  ConnectionsService                                      │   │
│  │  • generateOAuthUrl(provider)                            │   │
│  │  • handleCallback(provider, code, state)                 │   │
│  │  • encryptToken(token)                                   │   │
│  │  • decryptToken(encrypted)                               │   │
│  │  • refreshToken(connectionId)                            │   │
│  │  • revokeConnection(connectionId)                        │   │
│  └──────────────────────────────────────────────────────────┘   │
│                            ↓                                     │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  OAuth Strategies                                        │   │
│  │  • FacebookStrategy (passport-facebook)                  │   │
│  │  • GoogleStrategy (passport-google-oauth20)              │   │
│  └──────────────────────────────────────────────────────────┘   │
└───────────────────────────┬─────────────────────────────────────┘
                            │ service_role key
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│                     SUPABASE (Database)                          │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  connections table                                       │   │
│  │  ┌────────────────────────────────────────────────────┐  │   │
│  │  │  id, user_id, provider, status                     │  │   │
│  │  │  access_token (encrypted)                          │  │   │
│  │  │  refresh_token (encrypted)                         │  │   │
│  │  │  token_expires_at, scopes, metadata                │  │   │
│  │  └────────────────────────────────────────────────────┘  │   │
│  └──────────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  connection_logs table                                   │   │
│  │  ┌────────────────────────────────────────────────────┐  │   │
│  │  │  id, connection_id, action, details, created_at    │  │   │
│  │  └────────────────────────────────────────────────────┘  │   │
│  └──────────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  RLS Policies                                            │   │
│  │  • Users can SELECT own connections                      │   │
│  │  • Users CANNOT INSERT (only backend with service_role)  │   │
│  │  • Users CANNOT UPDATE (only backend with service_role)  │   │
│  │  • Users can DELETE own connections                      │   │
│  └──────────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  pgcrypto Functions                                      │   │
│  │  • encrypt_token(text) → encrypted_text                  │   │
│  │  • decrypt_token(encrypted_text) → text                  │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                            ↑
                            │ OAuth callbacks
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│                   EXTERNAL SERVICES                              │
│  ┌─────────────────────┐        ┌─────────────────────┐         │
│  │  Meta (Facebook)    │        │  Google OAuth       │         │
│  │  • OAuth 2.0        │        │  • OAuth 2.0        │         │
│  │  • Graph API        │        │  • Ads API          │         │
│  │  • Pages API        │        │  • Refresh Tokens   │         │
│  │  • Messenger API    │        │                     │         │
│  └─────────────────────┘        └─────────────────────┘         │
└─────────────────────────────────────────────────────────────────┘
```

---

## OAuth Flow Sequence

### Meta (Facebook) OAuth Flow

```
USER                FRONTEND              BACKEND              META              SUPABASE
 |                     |                     |                   |                   |
 |-- Click "Connect" ->|                     |                   |                   |
 |                     |-- POST /initiate -->|                   |                   |
 |                     |                     |-- Generate state->|                   |
 |                     |                     |-- Store in cookie |                   |
 |                     |                     |-- PKCE challenge->|                   |
 |                     |<-- Auth URL --------|                   |                   |
 |<-- Redirect to Meta-|                     |                   |                   |
 |                     |                     |                   |                   |
 |-- Authorize on Meta--------------------- >|                   |                   |
 |                     |                     |                   |                   |
 |<-- Redirect to callback (code, state) --->|                   |                   |
 |                     |                     |-- Validate state->|                   |
 |                     |                     |-- Exchange code ->|                   |
 |                     |                     |<-- Access Token --|                   |
 |                     |                     |-- Get User Info ->|                   |
 |                     |                     |<-- User Data -----|                   |
 |                     |                     |-- Encrypt tokens ---------------------->|
 |                     |                     |-- INSERT connection ------------------>|
 |                     |                     |<-- Connection saved -------------------|
 |<-- Redirect to /connections?status=success|                   |                   |
 |                     |-- GET /connections->|                   |                   |
 |                     |                     |-- SELECT (anon key) ------------------>|
 |                     |                     |<-- Connections (no tokens!) ------------|
 |<-- Show connection -|                     |                   |                   |
```

### Google OAuth Flow

Similar ao Meta, com diferenca:
- Google fornece `refresh_token` nativamente
- `access_type=offline` para receber refresh token
- `prompt=consent` para forcar consentimento

---

## Security Architecture

### Token Storage Flow

```
┌──────────────────────────────────────────────────────────────┐
│  1. OAuth Provider retorna access_token                      │
│     "EAABwzLixnjYBO..."                                      │
└────────────────────────┬─────────────────────────────────────┘
                         ↓
┌──────────────────────────────────────────────────────────────┐
│  2. Backend (NestJS) recebe token                            │
│     NUNCA envia para frontend                                │
└────────────────────────┬─────────────────────────────────────┘
                         ↓
┌──────────────────────────────────────────────────────────────┐
│  3. Encrypt usando pgcrypto                                  │
│     SELECT encrypt_token('EAABwzLixnjYBO...', ENCRYPTION_KEY)│
│     → "base64_encrypted_blob"                                │
└────────────────────────┬─────────────────────────────────────┘
                         ↓
┌──────────────────────────────────────────────────────────────┐
│  4. Armazena encrypted em Supabase                           │
│     INSERT INTO connections (                                │
│       access_token = 'base64_encrypted_blob',                │
│       refresh_token = 'base64_encrypted_blob2'               │
│     )                                                        │
└────────────────────────┬─────────────────────────────────────┘
                         ↓
┌──────────────────────────────────────────────────────────────┐
│  5. Quando precisar usar token                               │
│     SELECT decrypt_token(access_token, ENCRYPTION_KEY)       │
│     → "EAABwzLixnjYBO..." (apenas no backend!)              │
└────────────────────────┬─────────────────────────────────────┘
                         ↓
┌──────────────────────────────────────────────────────────────┐
│  6. Usar token para chamar API externa                       │
│     POST https://graph.facebook.com/me                       │
│     Authorization: Bearer EAABwzLixnjYBO...                  │
└──────────────────────────────────────────────────────────────┘
```

### PKCE Flow (Proof Key for Code Exchange)

```
┌──────────────────────────────────────────────────────────────┐
│  1. Generate code_verifier                                   │
│     crypto.randomBytes(32) → "dBjftJeZ4CVP..."              │
└────────────────────────┬─────────────────────────────────────┘
                         ↓
┌──────────────────────────────────────────────────────────────┐
│  2. Generate code_challenge                                  │
│     SHA256(code_verifier) → "E9Melhoa2OwvFr..."             │
└────────────────────────┬─────────────────────────────────────┘
                         ↓
┌──────────────────────────────────────────────────────────────┐
│  3. Send code_challenge in authorization request             │
│     ?code_challenge=E9Melhoa2OwvFr...                        │
│     &code_challenge_method=S256                              │
└────────────────────────┬─────────────────────────────────────┘
                         ↓
┌──────────────────────────────────────────────────────────────┐
│  4. Store code_verifier temporarily (server-side)            │
│     session[oauth_state] = { verifier: "dBjftJeZ..." }      │
└────────────────────────┬─────────────────────────────────────┘
                         ↓
┌──────────────────────────────────────────────────────────────┐
│  5. On callback, send code_verifier in token exchange        │
│     POST /oauth/token                                        │
│     { code, code_verifier: "dBjftJeZ..." }                  │
└────────────────────────┬─────────────────────────────────────┘
                         ↓
┌──────────────────────────────────────────────────────────────┐
│  6. OAuth provider validates                                 │
│     SHA256(code_verifier) == code_challenge ? ✅ : ❌        │
└──────────────────────────────────────────────────────────────┘
```

---

## Data Flow Diagrams

### Listing Connections (Frontend)

```
Frontend (React)                Backend (NestJS)              Supabase
    |                                 |                          |
    |-- useConnections() ------------>|                          |
    |   (JWT in header)               |                          |
    |                                 |-- Extract user_id ------>|
    |                                 |   from JWT               |
    |                                 |                          |
    |                                 |-- SELECT connections --->|
    |                                 |   WHERE user_id = ?      |
    |                                 |   (RLS enforced)         |
    |                                 |                          |
    |                                 |<-- Encrypted tokens -----|
    |                                 |                          |
    |                                 |-- Sanitize response ---->|
    |                                 |   (remove tokens!)       |
    |                                 |                          |
    |<-- Connections (safe) ----------|                          |
    |   { id, status, provider,       |                          |
    |     metadata, NO TOKENS }       |                          |
    |                                 |                          |
    |-- Render UI --------------------|                          |
```

### Auto-Refresh Token (Background Job)

```
Cron Job (every 1 hour)       Backend Service           Supabase         OAuth Provider
    |                              |                       |                 |
    |-- Trigger ------------------>|                       |                 |
    |                              |-- SELECT connections->|                 |
    |                              |   WHERE expires_at    |                 |
    |                              |   < NOW() + 24h       |                 |
    |                              |<-- Expiring tokens ---|                 |
    |                              |                       |                 |
    |                              |-- Decrypt tokens ---->|                 |
    |                              |<-- Plaintext tokens --|                 |
    |                              |                       |                 |
    |                              |-- Refresh request ------------------->|
    |                              |   (refresh_token)                      |
    |                              |<-- New access_token -------------------|
    |                              |                       |                 |
    |                              |-- Encrypt new token ->|                 |
    |                              |<-- Encrypted ---------|                 |
    |                              |                       |                 |
    |                              |-- UPDATE connection ->|                 |
    |                              |   SET access_token,   |                 |
    |                              |   expires_at          |                 |
    |                              |<-- Updated -----------|                 |
    |                              |                       |                 |
    |                              |-- INSERT log -------->|                 |
    |                              |   (action: refreshed) |                 |
    |<-- Success ------------------|                       |                 |
```

---

## Component Architecture

### Frontend Components Hierarchy

```
ConnectionsPage
├── PageHeader
│   └── PageTitle: "Conexoes"
├── EmptyState (if no connections)
│   ├── EmptyIcon
│   ├── EmptyMessage: "Nenhuma conexao ainda"
│   └── EmptyAction: "Conectar primeira conta"
└── ConnectionList (if has connections)
    ├── ConnectionCard (Meta)
    │   ├── ProviderLogo (Meta logo)
    │   ├── ProviderName: "Meta (Facebook/Instagram)"
    │   ├── ConnectionStatus (badge)
    │   │   ├── StatusIcon (green check / yellow warning / red X)
    │   │   └── StatusText: "Ativa" / "Expirando" / "Erro"
    │   ├── ConnectionMetadata
    │   │   ├── AccountName: "John Doe"
    │   │   ├── PagesCount: "3 paginas autorizadas"
    │   │   └── LastUsed: "Ultima vez: 2 horas atras"
    │   └── ConnectionActions
    │       ├── ViewDetailsButton → ConnectionDetailsModal
    │       ├── RefreshButton (if expiring)
    │       └── DisconnectButton → DisconnectModal
    ├── ConnectionCard (Google)
    │   └── [similar structure]
    └── AddConnectionCard
        └── ConnectButton (for new providers)

Modals:
├── ConnectionDetailsModal
│   ├── AccountInfo
│   ├── ScopesList
│   ├── ExpirationInfo
│   └── ActivityLog (useConnectionLogs)
└── DisconnectModal
    ├── ConfirmMessage: "Tem certeza?"
    ├── WarningMessage: "Automacoes usando esta conexao vao parar"
    ├── CancelButton
    └── ConfirmButton (red, danger)
```

---

## State Management

### Zustand Store (Client State)

```typescript
interface ConnectionsStore {
  // UI state
  selectedConnectionId: string | null
  isDetailsModalOpen: boolean
  isDisconnectModalOpen: boolean

  // Actions
  selectConnection: (id: string) => void
  openDetailsModal: () => void
  closeDetailsModal: () => void
  openDisconnectModal: () => void
  closeDisconnectModal: () => void
}
```

### TanStack Query (Server State)

```typescript
// Queries (GET)
useConnections()          // GET /api/connections
useConnection(id)         // GET /api/connections/:id
useConnectionLogs(id)     // GET /api/connections/:id/logs

// Mutations (POST/DELETE)
useConnectProvider()      // POST /api/connections/:provider/initiate
useRefreshConnection()    // POST /api/connections/:id/refresh
useDisconnectConnection() // DELETE /api/connections/:id
```

---

## Error Handling Strategy

### Error Types

```typescript
enum ConnectionError {
  OAUTH_CANCELED = 'oauth_canceled',
  OAUTH_FAILED = 'oauth_failed',
  TOKEN_EXPIRED = 'token_expired',
  REFRESH_FAILED = 'refresh_failed',
  INVALID_STATE = 'invalid_state',
  RATE_LIMITED = 'rate_limited',
  NETWORK_ERROR = 'network_error',
  PERMISSION_DENIED = 'permission_denied',
}
```

### Error Flow

```
Error occurs in backend
         ↓
Caught by NestJS Exception Filter
         ↓
Logged (without sensitive data)
         ↓
Transformed to user-friendly message
         ↓
Returned as HTTP error response
         ↓
Frontend catches error
         ↓
TanStack Query onError handler
         ↓
Display toast notification
         ↓
Update connection status (if applicable)
         ↓
Log to connection_logs table
```

---

## Performance Considerations

### Caching Strategy

```typescript
// TanStack Query config
{
  queryKey: ['connections'],
  staleTime: 5 * 60 * 1000,      // 5 minutos
  cacheTime: 10 * 60 * 1000,     // 10 minutos
  refetchOnWindowFocus: true,     // Refresh ao voltar para aba
  refetchOnReconnect: true,       // Refresh ao reconectar
}
```

### Database Indexes

```sql
-- Performance critical indexes
CREATE INDEX idx_connections_user_id ON connections(user_id);
CREATE INDEX idx_connections_status ON connections(status);
CREATE INDEX idx_connections_token_expires_at ON connections(token_expires_at);

-- For auto-refresh query
CREATE INDEX idx_connections_expiring ON connections(token_expires_at)
  WHERE status = 'active';
```

### Rate Limiting

```typescript
// NestJS Throttler config
{
  ttl: 60,     // 60 segundos
  limit: {
    '/initiate': 10,    // 10 OAuth initiations / minuto
    '/callback': 20,    // 20 callbacks / minuto (pode retry)
    '/refresh': 5,      // 5 manual refreshes / minuto
    '/list': 30,        // 30 list requests / minuto
  }
}
```

---

## Deployment Architecture

### Environment Setup

```
┌────────────────────────────────────────────────────────┐
│  Development (localhost)                               │
│  • Frontend: http://localhost:3000                     │
│  • Backend:  http://localhost:3001                     │
│  • Database: local Supabase / dev instance             │
│  • OAuth:    Test apps, test users                     │
└────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────┐
│  Staging (staging.alvobot.com)                         │
│  • Frontend: https://staging.alvobot.com               │
│  • Backend:  https://api-staging.alvobot.com           │
│  • Database: Supabase staging project                  │
│  • OAuth:    Production apps, limited scope            │
└────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────┐
│  Production (app.alvobot.com)                          │
│  • Frontend: https://app.alvobot.com                   │
│  • Backend:  https://api.alvobot.com                   │
│  • Database: Supabase production project               │
│  • OAuth:    Production apps, full scope               │
│  • Secrets:  AWS Secrets Manager / GCP Secret Manager  │
└────────────────────────────────────────────────────────┘
```

---

## Monitoring & Observability

### Metrics to Track

```typescript
// Connection metrics
- Total connections by provider
- Active vs expired connections
- OAuth success rate
- Token refresh success rate
- Average time to connect

// Performance metrics
- OAuth flow duration (p50, p95, p99)
- API response times
- Database query times
- Error rates by type

// Security metrics
- Failed state validations (CSRF attempts)
- Rate limit hits
- Unauthorized access attempts
```

### Logging Strategy

```typescript
// Structured logs
{
  timestamp: ISO8601,
  level: 'info' | 'warn' | 'error',
  event: 'oauth_initiated' | 'oauth_completed' | 'token_refreshed' | ...,
  user_id: string,
  connection_id?: string,
  provider?: 'meta' | 'google',
  metadata: {
    // Context-specific data
    // NEVER log tokens!
  },
  duration_ms?: number,
  error?: {
    code: string,
    message: string,
    // sanitized stack trace
  }
}
```

---

## Future Enhancements (Out of Scope for MVP)

```
┌─────────────────────────────────────────────────────────┐
│  1. Additional Providers                                │
│     • Twitter (X)                                       │
│     • LinkedIn                                          │
│     • TikTok                                            │
│     • Pinterest                                         │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  2. Advanced Features                                   │
│     • Multiple connections per provider                 │
│     • Granular permission management                    │
│     • Connection health dashboard                       │
│     • API quota monitoring                              │
│     • Webhook listeners                                 │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  3. Security Enhancements                               │
│     • Key rotation strategy                             │
│     • Migrate to KMS (AWS/GCP)                          │
│     • 2FA for sensitive operations                      │
│     • Audit trail UI                                    │
└─────────────────────────────────────────────────────────┘
```
