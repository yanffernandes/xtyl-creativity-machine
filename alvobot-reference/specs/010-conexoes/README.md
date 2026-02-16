# Spec 010: Conexoes (Integracoes)

Sistema de gerenciamento de conexoes com servicos externos (Meta, Google) usando OAuth 2.0 com maxima seguranca.

## Visao Geral

Esta feature permite que usuarios do AlvoBot conectem suas contas do Meta (Facebook/Instagram) e Google Ads para automacao de publicacoes, disparo de mensagens via Messenger e criacao de anuncios.

**Principio fundamental**: OAuth tokens NUNCA devem estar acessiveis no frontend. Toda a gestao de tokens acontece no backend com encryption at rest.

## Documentacao

### Essencial (Comece aqui)

1. **[spec.md](./spec.md)** - Especificacao completa da feature
   - User stories com acceptance criteria
   - Requisitos funcionais, de seguranca e visuais
   - Success criteria mensuraveis
   - Data model e API contracts

2. **[quickstart.md](./quickstart.md)** - Guia rapido para desenvolvedores
   - Setup em 30 minutos
   - Facebook App e Google App setup
   - Environment variables
   - Workflow de desenvolvimento
   - Debugging tips

3. **[plan.md](./plan.md)** - Plano de implementacao detalhado
   - Timeline de 3 semanas (15 dias uteis)
   - 5 fases: Database, Meta OAuth, Google OAuth, Frontend, Testing
   - Tasks diarios com deliverables claros
   - Milestones e metricas de sucesso

### Aprofundamento

4. **[architecture.md](./architecture.md)** - Arquitetura do sistema
   - Diagramas de componentes
   - Fluxo OAuth sequencial
   - Security architecture (encryption, PKCE)
   - Data flow diagrams
   - Performance considerations

5. **[research.md](./research.md)** - Pesquisa e decisoes tecnicas
   - OAuth 2.0 best practices
   - Meta (Facebook) OAuth detalhado
   - Google OAuth detalhado
   - Token storage security (pgcrypto vs KMS)
   - State management (CSRF protection)
   - Testing strategy

6. **[checklists/requirements.md](./checklists/requirements.md)** - Checklist completo
   - Todos os requisitos funcionais
   - Todos os requisitos de seguranca
   - Success criteria
   - Database, endpoints, components, hooks
   - Testing checklist

## Quick Links

### Para Product Managers
- [User Stories e Acceptance Criteria](./spec.md#user-scenarios--testing-mandatory)
- [Success Criteria](./spec.md#success-criteria-mandatory)
- [Timeline e Milestones](./plan.md#milestones)

### Para Desenvolvedores Backend
- [Database Schema](./spec.md#database-schema)
- [API Contracts](./spec.md#api-contracts)
- [OAuth Flow Implementation](./research.md#oauth-20-best-practices)
- [Security Best Practices](./architecture.md#security-architecture)

### Para Desenvolvedores Frontend
- [Component Architecture](./architecture.md#component-architecture)
- [TanStack Query Hooks](./architecture.md#state-management)
- [UI Components](./plan.md#day-12-ui-components)

### Para QA/Testing
- [Testing Strategy](./research.md#testing-strategy)
- [Manual Testing Guide](./quickstart.md#manual-testing-5-min)
- [E2E Scenarios](./plan.md#day-14-testing)

### Para DevOps
- [Deployment Architecture](./architecture.md#deployment-architecture)
- [Environment Variables](./quickstart.md#3-environment-variables-5-min)
- [Monitoring Strategy](./architecture.md#monitoring--observability)

## Key Features

- OAuth 2.0 flow com PKCE (maxima seguranca)
- Tokens encrypted at rest (pgcrypto)
- Auto-refresh de tokens antes da expiracao
- Row Level Security (RLS) - usuarios isolados
- Suporte para Meta (Facebook/Instagram)
- Suporte para Google Ads
- Notificacoes de expiracao/erro
- Audit trail de uso de conexoes

## Security Highlights

- **Zero Token Exposure**: Tokens NUNCA aparecem no frontend
- **Encryption at Rest**: pgcrypto com rotation strategy planejada
- **PKCE**: Proof Key for Code Exchange (RFC 7636)
- **CSRF Protection**: State parameter validation
- **RLS**: Row Level Security no Supabase
- **Rate Limiting**: Protecao contra abuse
- **Audit Trail**: Logs de todas as operacoes

## Tech Stack

### Backend
- NestJS 10+
- Passport (passport-facebook, passport-google-oauth20)
- Supabase Admin Client (service_role)
- pgcrypto (PostgreSQL encryption)

### Frontend
- React 18+ (ja migrado)
- TanStack Query (server state)
- Zustand (client state)
- React Router v6

### Database
- Supabase PostgreSQL
- RLS policies
- Encrypted columns

## Timeline

- **Week 1**: Database setup + Meta OAuth flow
- **Week 2**: Google OAuth + API endpoints
- **Week 3**: Frontend UI + Testing + Deploy

Total: **3 semanas (15 dias uteis)**

## Success Metrics

- OAuth flow com <1% de taxa de erro
- <60 segundos para conectar qualquer provedor
- 100% dos tokens encrypted
- 0% dos tokens expostos em API responses
- 95%+ taxa de sucesso em auto-refresh
- <500ms para listar conexoes
- Zero vulnerabilidades CSRF encontradas em audit

## Getting Started

1. Leia [quickstart.md](./quickstart.md) para setup inicial
2. Configure Facebook App e Google App (links no quickstart)
3. Siga o [plan.md](./plan.md) para implementacao dia-a-dia
4. Use [checklists/requirements.md](./checklists/requirements.md) para track progress

## Questions?

Consulte a documentacao completa nos links acima. Cada documento tem uma secao especifica:

- **Como funciona?** → [architecture.md](./architecture.md)
- **Por que essa decisao?** → [research.md](./research.md)
- **Como implementar?** → [plan.md](./plan.md) + [quickstart.md](./quickstart.md)
- **Como testar?** → [research.md#testing-strategy](./research.md#testing-strategy)
- **O que preciso fazer?** → [checklists/requirements.md](./checklists/requirements.md)

---

**Status**: Draft
**Created**: 2025-12-11
**Branch**: `010-conexoes`
