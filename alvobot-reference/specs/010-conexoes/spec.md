# Feature Specification: Conexoes (Integracoes)

**Feature Branch**: `010-conexoes`
**Created**: 2025-12-11
**Status**: ✅ Implementado
**Input**: Feature de gerenciamento de conexoes com servicos externos (Meta, Google) com OAuth flow seguro

## Status de Implementacao

### ✅ Implementado (Meta OAuth)
- **US1 - Conectar Meta**: COMPLETO
  - Backend: `POST /meta/oauth/initiate`, `GET /meta/oauth/callback`
  - Backend: Endpoints de gerenciamento de páginas
  - Frontend: `MetaCallbackPage.tsx` com fluxo de seleção de páginas
  - Frontend: `ConnectionsPage.tsx` com UI completa

### ✅ Implementado (Google OAuth)
- **US2 - Conectar Google**: COMPLETO
  - Backend: `POST /google/oauth/initiate`, `GET /google/oauth/callback`
  - Backend: `GoogleOAuthService` com refresh token support
  - Frontend: `GoogleCallbackPage.tsx` com fluxo de callback
  - Frontend: Botão "Conectar Google" funcional em ConnectionsPage

### ⚠️ Parcialmente Implementado
- **US3 - Gerenciar Conexões**: Frontend OK, logs não implementados
- **US4 - Status e Notificações**: Não implementado

## Clarifications

### Session 2025-12-11

- Q: Como armazenar os tokens OAuth? → A: Backend (service_role), nunca no frontend
- Q: Qual fluxo OAuth usar? → A: Authorization Code Flow com PKCE para maxima seguranca
- Q: Como lidar com tokens expirados? → A: Auto-refresh quando possivel, botao de reconectar quando falhar

## Overview

Sistema de gerenciamento de conexoes (integracoes) com servicos externos, permitindo que usuarios conectem suas contas do Meta (Facebook/Instagram) e Google para automacao de publicacoes, disparo de mensagens via Messenger e criacao de anuncios.

### Security-First Architecture

**Principio fundamental**: OAuth tokens NUNCA devem estar acessiveis no frontend.

```
Frontend (React)
    ↓ Inicia OAuth flow
Backend (NestJS)
    ↓ Gerencia OAuth callbacks
    ↓ Armazena tokens (encrypted)
Supabase (Database)
    ↓ connections table (RLS habilitado)
    ↓ tokens armazenados encrypted
```

### Current State

- Nao existe sistema de conexoes implementado
- Usuario precisa inserir credenciais manualmente
- Sem gerenciamento de tokens
- Sem renovacao automatica

### Target State

- **Frontend**: Interface para gerenciar conexoes, iniciar OAuth flows, ver status
- **Backend**: Endpoints OAuth, gerenciamento de tokens, refresh automatico
- **Database**: Tabela `connections` com tokens encrypted e metadata
- **Security**: Tokens encrypted at rest, PKCE flow, HTTPOnly cookies para state

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Conectar Meta (Facebook/Instagram) (Priority: P1)

Usuario pode conectar sua conta do Meta (Facebook/Instagram) usando OAuth para autorizar o AlvoBot a publicar conteudo e enviar mensagens via Messenger.

**Why this priority**: Meta e a principal plataforma de marketing digital. Sem essa conexao, o AlvoBot nao pode executar suas funcoes principais de automacao.

**Independent Test**: Pode ser testado criando uma nova conexao Meta, autorizando paginas, e verificando que o status mostra "ativa" e as permissoes foram concedidas.

**Acceptance Scenarios**:

1. **Given** usuario na pagina de conexoes, **When** clica em "Conectar Meta", **Then** e redirecionado para OAuth do Facebook
2. **Given** usuario autoriza o app no Facebook, **When** callback retorna, **Then** conexao aparece como "ativa" com dados da conta
3. **Given** usuario conectou Meta, **When** visualiza a conexao, **Then** ve quais paginas foram autorizadas e permissoes concedidas
4. **Given** conexao Meta esta ativa, **When** token expira, **Then** sistema tenta renovar automaticamente ou mostra alerta para reconectar

---

### User Story 2 - Conectar Google Ads (Priority: P2)

Usuario pode conectar sua conta Google para criar e gerenciar campanhas do Google Ads via AlvoBot.

**Why this priority**: Google Ads e a segunda maior plataforma de anuncios. Importante mas menos critico que Meta no MVP.

**Independent Test**: Pode ser testado conectando uma conta Google, autorizando Google Ads API, e verificando que as contas de anuncios estao visiveis.

**Acceptance Scenarios**:

1. **Given** usuario na pagina de conexoes, **When** clica em "Conectar Google", **Then** e redirecionado para OAuth do Google
2. **Given** usuario autoriza o app no Google, **When** callback retorna, **Then** conexao aparece como "ativa" com email da conta
3. **Given** usuario conectou Google, **When** visualiza a conexao, **Then** ve quais contas do Google Ads estao vinculadas
4. **Given** conexao Google esta ativa, **When** token expira, **Then** sistema renova automaticamente usando refresh token

---

### User Story 3 - Gerenciar Conexoes Existentes (Priority: P1)

Usuario pode visualizar todas as suas conexoes ativas, ver status (ativa, expirada, erro), e desconectar quando necessario.

**Why this priority**: Gerenciamento basico e essencial. Usuario precisa ter controle sobre quais contas estao conectadas.

**Independent Test**: Pode ser testado criando multiplas conexoes, verificando status, e desconectando uma delas.

**Acceptance Scenarios**:

1. **Given** usuario tem conexoes ativas, **When** acessa a pagina de conexoes, **Then** ve lista com todas as conexoes, status, e data da ultima atualizacao
2. **Given** uma conexao esta com erro, **When** usuario visualiza a lista, **Then** ve icone de erro e mensagem explicativa
3. **Given** usuario quer desconectar, **When** clica em "Desconectar" e confirma, **Then** conexao e removida e tokens sao revogados
4. **Given** conexao precisa ser renovada, **When** usuario clica em "Reconectar", **Then** e redirecionado para novo OAuth flow

---

### User Story 4 - Status e Notificacoes de Conexao (Priority: P2)

Usuario e notificado quando uma conexao expira, falha, ou precisa de atencao, e pode ver historico de atividade.

**Why this priority**: Proativo em evitar falhas. Usuario nao deve descobrir que conexao falhou apenas quando uma automacao nao funciona.

**Independent Test**: Pode ser testado simulando expiracao de token e verificando que notificacao aparece.

**Acceptance Scenarios**:

1. **Given** token de uma conexao expira, **When** sistema detecta, **Then** usuario recebe notificacao e email alertando
2. **Given** tentativa de renovacao falha, **When** usuario acessa conexoes, **Then** ve status "Erro" com botao "Reconectar"
3. **Given** conexao esta ativa, **When** usuario visualiza detalhes, **Then** ve data de expiracao do token e ultimo uso
4. **Given** conexao foi usada recentemente, **When** usuario ve historico, **Then** vê logs de quando foi usada e para que

---

### Edge Cases

- O que acontece se usuario revoga permissoes diretamente no Facebook/Google? (Detectar e marcar como "erro", solicitar reconexao)
- Como lidar com OAuth flow cancelado pelo usuario? (Mostrar mensagem "Conexao cancelada", permitir tentar novamente)
- O que fazer se refresh token tambem expira? (Forcar nova autenticacao completa via OAuth)
- Como evitar CSRF attacks no OAuth callback? (Usar state parameter com PKCE e validar no backend)
- O que acontece se multiplas abas tentam conectar simultaneamente? (Usar lock/flag no backend para prevenir duplicacao)

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Sistema DEVE permitir que usuario inicie OAuth flow para Meta (Facebook/Instagram) via botao "Conectar Meta"
- **FR-002**: Sistema DEVE redirecionar usuario para OAuth do Facebook com scopes corretos (pages_manage_posts, pages_messaging, pages_read_engagement)
- **FR-003**: Sistema DEVE receber callback OAuth do Facebook, trocar code por access token no backend (NUNCA no frontend)
- **FR-004**: Sistema DEVE armazenar access token e refresh token de forma encrypted na tabela `connections`
- **FR-005**: Sistema DEVE permitir que usuario inicie OAuth flow para Google Ads via botao "Conectar Google"
- **FR-006**: Sistema DEVE redirecionar usuario para OAuth do Google com scopes corretos (https://www.googleapis.com/auth/adwords)
- **FR-007**: Sistema DEVE receber callback OAuth do Google, trocar code por access token no backend
- **FR-008**: Sistema DEVE exibir lista de todas as conexoes do usuario com status (ativa, expirada, erro)
- **FR-009**: Sistema DEVE mostrar detalhes de cada conexao (nome da conta, permissoes, data de criacao, ultima atualizacao)
- **FR-010**: Sistema DEVE permitir que usuario desconecte uma conexao, revogando tokens no servico externo
- **FR-011**: Sistema DEVE implementar refresh automatico de tokens antes da expiracao
- **FR-012**: Sistema DEVE notificar usuario quando uma conexao expira ou falha
- **FR-013**: Sistema DEVE permitir reconexao via botao "Reconectar" que reinicia OAuth flow
- **FR-014**: Sistema DEVE implementar RLS (Row Level Security) para que usuarios vejam apenas suas proprias conexoes

### Security Requirements

- **SR-001**: Sistema NUNCA DEVE expor access tokens ou refresh tokens no frontend (API responses, localStorage, etc.)
- **SR-002**: Sistema DEVE usar Authorization Code Flow com PKCE (Proof Key for Code Exchange)
- **SR-003**: Sistema DEVE validar state parameter no OAuth callback para prevenir CSRF
- **SR-004**: Sistema DEVE armazenar tokens encrypted at rest no banco de dados
- **SR-005**: Sistema DEVE usar HTTPOnly cookies para state tokens durante OAuth flow
- **SR-006**: Sistema DEVE revogar tokens no servico externo ao desconectar
- **SR-007**: Sistema DEVE validar origem do callback (prevent open redirect)
- **SR-008**: Sistema DEVE implementar rate limiting nos endpoints OAuth para prevenir abuse
- **SR-009**: Sistema DEVE logar tentativas de acesso a tokens (audit trail)
- **SR-010**: Sistema DEVE usar service_role do Supabase apenas no backend para operacoes com tokens

### Visual Requirements

- **VR-001**: Sistema DEVE mostrar card para cada provedor (Meta, Google) com logo, status, e botao de acao
- **VR-002**: Sistema DEVE usar icones de status claros (check verde = ativa, exclamacao amarela = expirando, X vermelho = erro)
- **VR-003**: Sistema DEVE mostrar loading state durante OAuth flow e ao carregar conexoes
- **VR-004**: Sistema DEVE exibir modal de confirmacao ao desconectar
- **VR-005**: Sistema DEVE mostrar badges com numero de paginas/contas conectadas
- **VR-006**: Sistema DEVE ter layout responsivo para mobile

### Key Entities

- **Connection**: Conexao com servico externo
  - `id`: UUID (PK)
  - `user_id`: UUID (FK para auth.users) - RLS filter
  - `provider`: enum ('meta', 'google')
  - `provider_account_id`: string (ID da conta no provedor)
  - `provider_account_name`: string (nome/email da conta)
  - `access_token`: text (encrypted)
  - `refresh_token`: text (encrypted, nullable)
  - `token_expires_at`: timestamp
  - `scopes`: jsonb (permissoes concedidas)
  - `metadata`: jsonb (dados extras: paginas autorizadas, contas de anuncios, etc.)
  - `status`: enum ('active', 'expired', 'error', 'revoked')
  - `last_used_at`: timestamp
  - `created_at`: timestamp
  - `updated_at`: timestamp

- **ConnectionLog**: Historico de uso das conexoes
  - `id`: UUID (PK)
  - `connection_id`: UUID (FK)
  - `action`: enum ('created', 'refreshed', 'used', 'error', 'revoked')
  - `details`: jsonb
  - `created_at`: timestamp

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Usuario consegue conectar conta Meta via OAuth em menos de 60 segundos
- **SC-002**: Usuario consegue conectar conta Google via OAuth em menos de 60 segundos
- **SC-003**: 100% dos tokens sao armazenados encrypted no banco de dados
- **SC-004**: 0% dos tokens aparecem em responses da API para o frontend
- **SC-005**: Sistema renova tokens automaticamente com 95% de sucesso antes da expiracao
- **SC-006**: Usuario recebe notificacao em ate 5 minutos quando uma conexao expira
- **SC-007**: OAuth flow tem menos de 1% de taxa de erro em condicoes normais
- **SC-008**: Tempo de resposta do endpoint de listagem de conexoes e menor que 500ms
- **SC-009**: 100% dos OAuth callbacks validam state parameter (zero vulnerabilidades CSRF)
- **SC-010**: RLS policies bloqueiam 100% das tentativas de acesso a conexoes de outros usuarios

## Data Model

### Database Schema

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enums
CREATE TYPE connection_provider AS ENUM ('meta', 'google');
CREATE TYPE connection_status AS ENUM ('active', 'expired', 'error', 'revoked');
CREATE TYPE connection_log_action AS ENUM ('created', 'refreshed', 'used', 'error', 'revoked');

-- Connections table
CREATE TABLE connections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider connection_provider NOT NULL,
  provider_account_id TEXT NOT NULL,
  provider_account_name TEXT NOT NULL,
  access_token TEXT NOT NULL, -- encrypted via pgcrypto
  refresh_token TEXT, -- encrypted via pgcrypto
  token_expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  scopes JSONB NOT NULL DEFAULT '[]'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  status connection_status NOT NULL DEFAULT 'active',
  last_used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

  -- Unique constraint: one connection per user per provider account
  UNIQUE(user_id, provider, provider_account_id)
);

-- Connection logs table
CREATE TABLE connection_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  connection_id UUID NOT NULL REFERENCES connections(id) ON DELETE CASCADE,
  action connection_log_action NOT NULL,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_connections_user_id ON connections(user_id);
CREATE INDEX idx_connections_status ON connections(status);
CREATE INDEX idx_connections_token_expires_at ON connections(token_expires_at);
CREATE INDEX idx_connection_logs_connection_id ON connection_logs(connection_id);
CREATE INDEX idx_connection_logs_created_at ON connection_logs(created_at);

-- RLS Policies
ALTER TABLE connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE connection_logs ENABLE ROW LEVEL SECURITY;

-- Users can only see their own connections
CREATE POLICY "Users can view own connections"
  ON connections FOR SELECT
  USING (auth.uid() = user_id);

-- Users cannot insert connections directly (only via backend OAuth flow)
CREATE POLICY "Backend can insert connections"
  ON connections FOR INSERT
  WITH CHECK (false); -- Blocked for frontend, backend uses service_role

-- Users cannot update connections directly (only via backend)
CREATE POLICY "Backend can update connections"
  ON connections FOR UPDATE
  USING (false); -- Blocked for frontend, backend uses service_role

-- Users can delete (disconnect) their own connections
CREATE POLICY "Users can delete own connections"
  ON connections FOR DELETE
  USING (auth.uid() = user_id);

-- Users can view logs of their own connections
CREATE POLICY "Users can view own connection logs"
  ON connection_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM connections
      WHERE connections.id = connection_logs.connection_id
      AND connections.user_id = auth.uid()
    )
  );

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_connections_updated_at
  BEFORE UPDATE ON connections
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

### Encryption Functions

```sql
-- Function to encrypt tokens (using pgcrypto)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Encrypt function (backend will call this)
CREATE OR REPLACE FUNCTION encrypt_token(token TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN encode(
    pgp_sym_encrypt(
      token,
      current_setting('app.encryption_key')
    ),
    'base64'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Decrypt function (backend will call this)
CREATE OR REPLACE FUNCTION decrypt_token(encrypted_token TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN pgp_sym_decrypt(
    decode(encrypted_token, 'base64'),
    current_setting('app.encryption_key')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## API Contracts

### Frontend → Backend

#### 1. GET /api/connections
Lista todas as conexoes do usuario autenticado.

**Request**:
```typescript
// Headers
Authorization: Bearer <supabase_jwt>

// No body
```

**Response**:
```typescript
{
  data: [
    {
      id: string
      provider: 'meta' | 'google'
      provider_account_id: string
      provider_account_name: string
      status: 'active' | 'expired' | 'error' | 'revoked'
      scopes: string[]
      metadata: {
        // Para Meta
        pages?: Array<{ id: string, name: string }>
        // Para Google
        accounts?: Array<{ id: string, name: string }>
      }
      token_expires_at: string // ISO 8601
      last_used_at: string | null
      created_at: string
      updated_at: string
      // NOTE: access_token e refresh_token NUNCA aparecem aqui
    }
  ]
}
```

#### 2. POST /api/connections/:provider/initiate
Inicia OAuth flow para o provedor especificado.

**Request**:
```typescript
// Headers
Authorization: Bearer <supabase_jwt>

// Body (opcional, para passar parametros extras)
{
  redirect_uri?: string // Override default redirect
}
```

**Response**:
```typescript
{
  authorization_url: string // URL para redirecionar usuario
  state: string // State token (tambem em HTTPOnly cookie)
}
```

#### 3. GET /api/connections/:provider/callback
Callback OAuth (usuario e redirecionado aqui pelo provedor).

**Request**:
```typescript
// Query params
?code=<authorization_code>
&state=<state_token>
```

**Response**:
- Redirect para `/connections?status=success&provider=meta`
- Ou redirect para `/connections?status=error&message=<error>`

#### 4. POST /api/connections/:id/refresh
Força refresh do token manualmente.

**Request**:
```typescript
// Headers
Authorization: Bearer <supabase_jwt>
```

**Response**:
```typescript
{
  success: boolean
  connection: {
    id: string
    status: 'active' | 'error'
    token_expires_at: string
    updated_at: string
  }
}
```

#### 5. DELETE /api/connections/:id
Desconecta (revoga tokens e remove conexao).

**Request**:
```typescript
// Headers
Authorization: Bearer <supabase_jwt>
```

**Response**:
```typescript
{
  success: boolean
  message: string
}
```

#### 6. GET /api/connections/:id/logs
Busca historico de uso da conexao.

**Request**:
```typescript
// Headers
Authorization: Bearer <supabase_jwt>

// Query params (opcional)
?limit=50&offset=0
```

**Response**:
```typescript
{
  data: [
    {
      id: string
      action: 'created' | 'refreshed' | 'used' | 'error' | 'revoked'
      details: Record<string, any>
      created_at: string
    }
  ],
  total: number
}
```

## Tech Stack

### Frontend
- React 18+ (ja migrado)
- Zustand (client state)
- TanStack Query (server state)
- React Router v6 (routing)

### Backend
- NestJS 10+ (ja existente)
- Passport (OAuth strategies)
- @nestjs/passport
- passport-facebook
- passport-google-oauth20
- Supabase Admin Client (service_role para tokens)

### Security
- pgcrypto (PostgreSQL encryption)
- PKCE (RFC 7636)
- HTTPOnly cookies (state management)
- Rate limiting (helmet, throttler)

## Implementation Plan

### Phase 1: Database & Security (Week 1)
1. Criar tabelas `connections` e `connection_logs`
2. Implementar RLS policies
3. Criar funcoes de encryption/decryption
4. Configurar encryption key em environment variables

### Phase 2: Backend OAuth - Meta (Week 1-2)
1. Instalar `passport-facebook`
2. Criar `ConnectionsModule` no NestJS
3. Implementar `POST /connections/meta/initiate`
4. Implementar `GET /connections/meta/callback`
5. Implementar `POST /connections/:id/refresh` para Meta
6. Implementar `DELETE /connections/:id`
7. Criar service para encryption/decryption de tokens
8. Adicionar cron job para auto-refresh de tokens

### Phase 3: Backend OAuth - Google (Week 2)
1. Instalar `passport-google-oauth20`
2. Implementar `POST /connections/google/initiate`
3. Implementar `GET /connections/google/callback`
4. Implementar `POST /connections/:id/refresh` para Google
5. Testar fluxo completo

### Phase 4: Frontend UI (Week 2-3)
1. Criar `features/connections/` structure
2. Implementar `ConnectionsPage` com lista de conexoes
3. Criar `ConnectionCard` component
4. Implementar `useConnections` hook (TanStack Query)
5. Implementar `useConnectProvider` hook
6. Criar `DisconnectModal` component
7. Adicionar toast notifications para status
8. Implementar loading states e error handling

### Phase 5: Testing & Polish (Week 3)
1. Testes E2E para OAuth flows
2. Testes de seguranca (verificar tokens nao vazam)
3. Testes de RLS policies
4. Documentacao de setup (Facebook App, Google Console)
5. Deploy e teste em staging

## Assumptions

- Frontend ja esta migrado para React (spec 003-react-migration)
- Backend NestJS esta rodando e acessivel
- Supabase esta configurado e funcionando
- Usuario tem conhecimento basico de OAuth 2.0
- Meta e Google apps ja estao criados e configurados (ou serao criados durante implementacao)
- Ambiente tem variavel de ambiente para encryption key

## Out of Scope

- Conexoes com outros provedores (Twitter, LinkedIn, TikTok) - futuro
- Gerenciamento de permissoes granulares (quais paginas usar) - MVP usa todas autorizadas
- Dashboard de uso de API quotas - futuro
- Multiplas conexoes do mesmo provedor para o mesmo usuario - MVP permite apenas 1 por provedor
- Webhook listeners para notificacoes dos provedores - futuro
- Export/import de configuracoes de conexoes - futuro

## Risks & Mitigations

### Risk 1: OAuth flow pode falhar silenciosamente
**Mitigation**: Implementar logging extensivo e notificacoes de erro detalhadas

### Risk 2: Tokens podem vazar por logging acidental
**Mitigation**: Sanitizar logs, nunca logar tokens, usar masking

### Risk 3: Rate limiting das APIs externas
**Mitigation**: Implementar exponential backoff e queue para requisicoes

### Risk 4: Usuario pode revogar permissoes diretamente no provedor
**Mitigation**: Health check periodico das conexoes, notificar usuario imediatamente

### Risk 5: Encryption key pode ser comprometida
**Mitigation**: Usar key rotation strategy, armazenar key em secret manager (nao em .env no repo)

## References

- [OAuth 2.0 RFC](https://datatracker.ietf.org/doc/html/rfc6749)
- [PKCE RFC](https://datatracker.ietf.org/doc/html/rfc7636)
- [Facebook Login for Business](https://developers.facebook.com/docs/facebook-login/overview)
- [Google OAuth 2.0](https://developers.google.com/identity/protocols/oauth2)
- [Supabase RLS](https://supabase.com/docs/guides/auth/row-level-security)
- [pgcrypto](https://www.postgresql.org/docs/current/pgcrypto.html)
