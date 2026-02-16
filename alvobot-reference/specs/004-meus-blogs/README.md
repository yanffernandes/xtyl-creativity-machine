# Feature 004: Meus Blogs (Projetos)

> Sistema completo de gerenciamento de projetos WordPress com integração via REST API, teste de conectividade e instalação de plugin.

## 📋 Visão Geral

Esta feature implementa o gerenciamento de blogs WordPress na plataforma AlvoBot, permitindo que usuários:

- Adicionem novos blogs WordPress através de um wizard guiado
- Testem a conectividade com WordPress via Application Password
- Visualizem status de conexão em tempo real
- Reinstale/reative o plugin AlvoBot quando necessário
- Consultem histórico de testes de conexão
- Gerenciem credenciais de forma segura (criptografadas)

## 📚 Documentação

### Principais Documentos

1. **[spec.md](./spec.md)** - Especificação completa da feature
   - Overview e contexto
   - User stories com cenários de aceitação
   - Requisitos funcionais e não-funcionais
   - Critérios de sucesso
   - Arquitetura técnica
   - Plano de implementação em 8 fases

2. **[examples.md](./examples.md)** - Exemplos de código
   - Frontend: Hooks TanStack Query, componentes React
   - Backend: Services, Controllers, DTOs
   - Database: Migrations SQL
   - WordPress Plugin: Código PHP básico
   - Testes unitários e E2E

3. **[diagrams.md](./diagrams.md)** - Diagramas e fluxos
   - Arquitetura geral do sistema
   - Fluxo de dados do wizard de criação
   - Sequence diagrams de teste de conexão
   - State machine de status de conexão
   - Árvore de componentes React
   - ER diagram do banco de dados
   - Fluxo de criptografia de credenciais
   - Tratamento de erros

4. **[implementation-checklist.md](./implementation-checklist.md)** - Checklist de implementação
   - Definition of Done (DoD)
   - Checklist detalhado por fase
   - Critérios de qualidade (code, security, testing)
   - Checklist pré-produção
   - Checklist pós-lançamento
   - Métricas de sucesso

5. **[file-structure.md](./file-structure.md)** - Estrutura de arquivos
   - Árvore completa de diretórios
   - Arquivos por fase de implementação
   - Templates de código
   - Padrões de import/export
   - Estrutura de testes

## 🎯 Objetivos

### Objetivos de Negócio
- Permitir que usuários conectem seus blogs WordPress à plataforma
- Reduzir fricção no onboarding (wizard guiado)
- Aumentar confiabilidade com testes de conexão automáticos
- Facilitar troubleshooting com histórico de logs

### Objetivos Técnicos
- Implementar integração segura com WordPress REST API
- Criptografar credenciais de forma robusta (AES-256-GCM)
- Seguir arquitetura BaaS (Frontend → Supabase, Backend apenas para APIs externas)
- Manter código TypeScript strict, testável e bem documentado

## 🏗️ Arquitetura

```
Frontend (React) ──┬──> Supabase (RLS) ──> PostgreSQL
                   │                        └─ projects
                   │                        └─ wordpress_connection_logs
                   │
                   └──> Backend (NestJS) ──> WordPress REST API
                        └─ WordPress Module
                           ├─ Encryption
                           ├─ Test Connection
                           └─ Install Plugin
```

## 📊 Status do Projeto

- **Status Atual**: Especificação completa ✅
- **Branch**: `004-meus-blogs` (a ser criado)
- **Estimativa**: 8 fases, ~2-3 semanas
- **Prioridade**: Alta (feature core da plataforma)

## 🚀 Fases de Implementação

| Fase | Descrição | Estimativa | Status |
|------|-----------|------------|--------|
| 1 | Backend WordPress Integration | 3 dias | 🔜 Pendente |
| 2 | Database Schema & Migration | 1 dia | 🔜 Pendente |
| 3 | Frontend - Wizard de Criação | 3 dias | 🔜 Pendente |
| 4 | Frontend - Gerenciamento | 2 dias | 🔜 Pendente |
| 5 | Backend - Instalação de Plugin | 2 dias | 🔜 Pendente |
| 6 | Frontend - Listagem e Filtros | 1 dia | 🔜 Pendente |
| 7 | Logs e Histórico | 2 dias | 🔜 Pendente |
| 8 | Polish e Refinamento | 1 dia | 🔜 Pendente |

**Total estimado**: 15 dias úteis (~3 semanas)

## 🔑 Requisitos

### Dependências de Software
- Node.js 18+
- PostgreSQL (via Supabase)
- WordPress 5.5+ (no site do usuário)

### Dependências de Projeto
- React 18.2+
- NestJS 10.x
- Supabase JS Client
- TanStack Query
- Axios

### Variáveis de Ambiente

**Backend (.env):**
```bash
WORDPRESS_ENCRYPTION_KEY=your-32-char-minimum-key-here
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=xxx
SUPABASE_JWT_SECRET=xxx
```

**Frontend (.env):**
```bash
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=xxx
VITE_API_URL=http://localhost:3001
```

## 📦 Entregáveis

### Backend
- [x] Módulo WordPress completo
- [x] Endpoints de teste de conexão
- [x] Endpoints de instalação de plugin
- [x] Sistema de criptografia de credenciais
- [x] Migrations do banco de dados
- [x] Testes unitários e E2E

### Frontend
- [x] Wizard de criação de projeto
- [x] Modal de gerenciamento de projeto
- [x] Componente de status de conexão
- [x] Visualização de histórico de logs
- [x] Filtros e busca na listagem
- [x] Responsividade mobile

### Documentação
- [x] Especificação completa
- [x] Exemplos de código
- [x] Diagramas de arquitetura
- [x] Checklist de implementação
- [x] Estrutura de arquivos

## 🧪 Testes

### Cobertura Esperada
- Backend: >= 80% (services críticos: 100%)
- Frontend: >= 70% (componentes core: 90%)

### Tipos de Testes
- ✅ Unitários (services, utils, components)
- ✅ Integração (endpoints, queries)
- ✅ E2E (fluxo completo de criação)
- ✅ Manual (browsers, devices)

## 🔒 Segurança

### Medidas Implementadas
- ✅ Criptografia AES-256-GCM de credenciais
- ✅ Application Passwords nunca expostos no frontend
- ✅ JWT authentication em todos os endpoints
- ✅ RLS policies no Supabase
- ✅ Validação de inputs (prevenir SSRF)
- ✅ Rate limiting (10 req/min por usuário)

### Checklist de Segurança
- [ ] Code review focado em segurança
- [ ] Scan de vulnerabilidades (npm audit)
- [ ] Penetration testing básico
- [ ] Validação de RLS em produção

## 📈 Métricas de Sucesso

### KPIs Definidos
- Taxa de conclusão do wizard: > 80%
- Taxa de sucesso de conexão: > 95% (credenciais válidas)
- Tempo médio de criação: < 3 minutos
- Uptime do backend: > 99.5%
- Zero credenciais expostas
- NPS: >= 8/10

## 🐛 Issues Conhecidos

_(A ser preenchido durante implementação)_

## 📞 Contato

- **Responsável**: Time de Desenvolvimento AlvoBot
- **Spec criada em**: 2025-12-11
- **Última atualização**: 2025-12-11

## 📝 Changelog

### [Unreleased]

#### 2025-12-11
- Especificação inicial completa
- Documentação de exemplos de código
- Diagramas de arquitetura
- Checklist de implementação
- Estrutura de arquivos

---

**Próximos Passos:**
1. Revisar e aprovar especificação
2. Criar branch `004-meus-blogs`
3. Iniciar Fase 1: Backend WordPress Integration
4. Setup de variáveis de ambiente
5. Implementar encryption utility
