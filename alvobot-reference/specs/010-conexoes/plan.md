# Implementation Plan - Conexoes (Integracoes)

## Timeline: 3 weeks (15 dias uteis)

## Phase 1: Database & Security Foundation (Days 1-3)

### Day 1: Database Schema
**Goal**: Criar estrutura de dados segura para armazenar conexoes

Tasks:
1. Criar migration para tabelas `connections` e `connection_logs`
2. Implementar enums (provider, status, action)
3. Criar indexes otimizados
4. Testar schema localmente

**Deliverable**: Migration executada com sucesso em dev

---

### Day 2: Security Layer
**Goal**: Implementar encryption e RLS

Tasks:
1. Criar funcoes de encryption/decryption com pgcrypto
2. Configurar encryption key em .env (usar secret manager em prod)
3. Implementar RLS policies para connections
4. Implementar RLS policies para connection_logs
5. Testar policies (usuarios nao veem conexoes de outros)

**Deliverable**: Tokens encrypted at rest, RLS funcionando

---

### Day 3: Backend Module Setup
**Goal**: Estrutura base do modulo de conexoes no NestJS

Tasks:
1. Criar `src/modules/connections/` structure
2. Criar `ConnectionsModule`, `ConnectionsController`, `ConnectionsService`
3. Criar DTOs (CreateConnectionDto, ConnectionResponseDto)
4. Criar Guards para autenticacao JWT
5. Configurar Supabase Admin Client (service_role)

**Deliverable**: Module skeleton pronto para OAuth implementation

---

## Phase 2: OAuth Flow - Meta (Days 4-7)

### Day 4: Meta OAuth - Initiate
**Goal**: Usuario consegue iniciar OAuth flow para Meta

Tasks:
1. Instalar `passport-facebook` e configurar strategy
2. Implementar `POST /api/connections/meta/initiate`
3. Gerar authorization_url com PKCE
4. Criar state token e armazenar em HTTPOnly cookie
5. Testar redirect para Facebook

**Deliverable**: Botao "Conectar Meta" redireciona para Facebook OAuth

---

### Day 5: Meta OAuth - Callback
**Goal**: Receber callback do Facebook e armazenar tokens

Tasks:
1. Implementar `GET /api/connections/meta/callback`
2. Validar state parameter (CSRF protection)
3. Trocar authorization code por access_token
4. Buscar dados da conta Meta (user info, pages)
5. Encrypt tokens usando funcao do banco
6. Inserir registro em `connections` via service_role
7. Criar log de "created" em `connection_logs`
8. Redirecionar para `/connections?status=success`

**Deliverable**: OAuth flow completo, tokens armazenados encrypted

---

### Day 6: Meta Token Management
**Goal**: Refresh automatico e revogacao

Tasks:
1. Implementar `POST /api/connections/:id/refresh`
2. Criar cron job para auto-refresh (antes de expirar)
3. Implementar logica de retry com exponential backoff
4. Implementar `DELETE /api/connections/:id` com revogacao
5. Testar refresh manual e automatico

**Deliverable**: Tokens renovam automaticamente, desconectar funciona

---

### Day 7: Meta Error Handling & Notifications
**Goal**: Lidar com erros gracefully

Tasks:
1. Implementar deteccao de token expirado
2. Atualizar status para "expired" ou "error"
3. Criar notificacao quando conexao expira
4. Implementar retry logic para falhas temporarias
5. Adicionar logging detalhado (sem expor tokens)

**Deliverable**: Sistema recupera de erros e notifica usuario

---

## Phase 3: OAuth Flow - Google (Days 8-10)

### Day 8: Google OAuth - Initiate & Callback
**Goal**: OAuth flow completo para Google

Tasks:
1. Instalar `passport-google-oauth20`
2. Configurar Google OAuth strategy
3. Implementar `POST /api/connections/google/initiate`
4. Implementar `GET /api/connections/google/callback`
5. Buscar contas do Google Ads vinculadas
6. Testar flow completo

**Deliverable**: Conectar Google funciona end-to-end

---

### Day 9: Google Token Management
**Goal**: Refresh e revogacao para Google

Tasks:
1. Implementar refresh para Google tokens
2. Adaptar cron job para incluir Google
3. Testar revogacao de tokens Google
4. Verificar que refresh token persiste corretamente

**Deliverable**: Google tokens renovam automaticamente

---

### Day 10: Connection List & Details
**Goal**: Endpoints para listar e visualizar conexoes

Tasks:
1. Implementar `GET /api/connections`
2. Implementar `GET /api/connections/:id`
3. Implementar `GET /api/connections/:id/logs`
4. Sanitizar responses (NUNCA incluir tokens)
5. Adicionar paginacao para logs
6. Testar performance (<500ms)

**Deliverable**: Frontend pode buscar conexoes sem expor tokens

---

## Phase 4: Frontend Implementation (Days 11-13)

### Day 11: Feature Structure & API Layer
**Goal**: Estrutura base e TanStack Query hooks

Tasks:
1. Criar `src/features/connections/` structure
   - api/
   - components/
   - pages/
   - types/
2. Criar types TypeScript (Connection, ConnectionStatus, Provider)
3. Implementar hooks TanStack Query:
   - `useConnections()`
   - `useConnection(id)`
   - `useConnectProvider(provider)`
   - `useDisconnectConnection(id)`
   - `useRefreshConnection(id)`
   - `useConnectionLogs(id)`
4. Testar hooks com mock data

**Deliverable**: API layer pronta para UI

---

### Day 12: UI Components
**Goal**: Componentes visuais da feature

Tasks:
1. Criar `ConnectionsPage` (layout principal)
2. Criar `ConnectionCard` (card para cada provedor)
3. Criar `ConnectionList` (grid de cards)
4. Criar `ConnectionStatus` badge component
5. Criar `ConnectButton` component
6. Criar `DisconnectModal` component
7. Criar `ConnectionDetailsModal` component
8. Implementar loading states
9. Implementar empty state ("Nenhuma conexao ainda")

**Deliverable**: UI completa e interativa

---

### Day 13: Integration & Polish
**Goal**: Integrar tudo e refinar UX

Tasks:
1. Conectar hooks aos components
2. Implementar toast notifications (sucesso/erro)
3. Adicionar loading skeletons
4. Implementar error boundaries
5. Testar fluxo completo no frontend
6. Adicionar icones e logos (Meta, Google)
7. Refinar responsividade mobile
8. Adicionar mensagens de erro amigaveis

**Deliverable**: Feature completa e polida

---

## Phase 5: Testing & Documentation (Days 14-15)

### Day 14: Testing
**Goal**: Testes automatizados e manuais

Tasks:
1. **E2E Tests**:
   - OAuth flow Meta completo
   - OAuth flow Google completo
   - Desconectar e reconectar
   - Refresh automatico
2. **Security Tests**:
   - Verificar tokens nao vazam em responses
   - Testar RLS policies (usuarios isolados)
   - Verificar state validation (CSRF)
   - Testar rate limiting
3. **Integration Tests**:
   - Callback handling com erros
   - Token expiration scenarios
   - Concurrent requests
4. **Manual Testing**:
   - Testar em multiplos browsers
   - Testar em mobile
   - Testar com conexoes reais Meta/Google

**Deliverable**: Suite de testes passando, bugs identificados e corrigidos

---

### Day 15: Documentation & Deploy
**Goal**: Documentar setup e fazer deploy

Tasks:
1. **Documentation**:
   - Como criar Facebook App (developer console)
   - Como criar Google App (cloud console)
   - Lista de scopes necessarios
   - Environment variables necessarias
   - Security best practices
   - Troubleshooting guide
2. **Deploy Preparation**:
   - Configurar encryption key em secret manager (nao .env)
   - Configurar Meta App em producao
   - Configurar Google App em producao
   - Atualizar redirect URIs para dominio de producao
3. **Deploy**:
   - Deploy backend (NestJS)
   - Deploy frontend (React)
   - Rodar migrations em producao
   - Smoke tests em producao

**Deliverable**: Feature documentada e em producao

---

## Milestones

- **End of Week 1**: Database e Meta OAuth funcionando
- **End of Week 2**: Google OAuth e endpoints de listagem prontos
- **End of Week 3**: Frontend completo, testado, e deployed

## Dependencies

- Supabase configurado e rodando
- NestJS backend acessivel
- React frontend migrado (spec 003)
- Facebook Developer Account com App criado
- Google Cloud Console com App criado
- Encryption key gerada e armazenada de forma segura

## Risks & Contingencies

**Risk**: Facebook/Google mudam suas APIs ou policies
**Contingency**: Monitorar changelogs, implementar error handling robusto

**Risk**: Encryption key vaza
**Contingency**: Key rotation strategy documentada, usar secret manager

**Risk**: Rate limiting das APIs externas
**Contingency**: Exponential backoff, queue de requisicoes, upgrade de plano se necessario

**Risk**: OAuth flow e complexo e pode ter bugs dificeis de debugar
**Contingency**: Logging extensivo (sem expor tokens), testar em ambiente de dev primeiro

## Success Metrics

- OAuth flow com <1% de taxa de erro
- <60 segundos para conectar qualquer provedor
- 100% dos tokens encrypted
- 0 vazamentos de tokens (verificado por audit)
- 95%+ taxa de sucesso em auto-refresh
- <500ms para listar conexoes
- Zero vulnerabilidades CSRF/XSS encontradas em security audit
