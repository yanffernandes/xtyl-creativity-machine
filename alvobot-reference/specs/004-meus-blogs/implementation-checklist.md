# Implementation Checklist - Meus Blogs (Projetos)

## Definition of Done (DoD)

Uma tarefa/feature só é considerada **PRONTA** quando TODOS os itens abaixo forem cumpridos:

### Code Quality
- [ ] Código segue padrões TypeScript strict mode
- [ ] Nenhum uso de `any` (usar `unknown` se necessário)
- [ ] ESLint passa sem warnings
- [ ] Prettier formatou todo o código
- [ ] Nomes de variáveis/funções são descritivos em inglês
- [ ] Textos de interface estão em português
- [ ] Código está comentado onde necessário (lógica complexa)
- [ ] Não há console.log ou código de debug

### Security
- [ ] Credenciais WordPress nunca expostas no frontend
- [ ] Passwords são criptografados antes de salvar no banco
- [ ] JWT Guard protege todos os endpoints WordPress
- [ ] RLS policies validadas e testadas
- [ ] Inputs são validados e sanitizados (prevenir SSRF)
- [ ] Erros não expõem informações sensíveis
- [ ] Chave de criptografia está em variável de ambiente
- [ ] Logs não contêm credenciais

### Testing
- [ ] Testes unitários escritos para serviços críticos
- [ ] Testes de integração para endpoints da API
- [ ] Teste E2E para fluxo completo de criação de projeto
- [ ] Cobertura de testes >= 70% para código novo
- [ ] Todos os testes passam (npm test)
- [ ] Testado manualmente em Chrome, Firefox, Safari
- [ ] Testado em mobile (iOS Safari, Chrome Android)

### Functionality
- [ ] Todos os requisitos funcionais implementados
- [ ] Edge cases tratados (timeout, erro de rede, etc.)
- [ ] Loading states implementados
- [ ] Error states com mensagens claras
- [ ] Empty states com call-to-action
- [ ] Validação de formulários funciona
- [ ] Feedback visual para ações do usuário

### Performance
- [ ] Tempo de teste de conexão < 10 segundos
- [ ] Listagem de projetos carrega < 2 segundos
- [ ] Queries do Supabase estão otimizadas
- [ ] Imagens/assets estão otimizados
- [ ] Não há memory leaks (verificado com DevTools)
- [ ] Bundle size não aumentou significativamente

### Accessibility
- [ ] Labels em todos os inputs de formulário
- [ ] ARIA attributes onde necessário
- [ ] Navegação por teclado funciona
- [ ] Contraste de cores adequado (WCAG AA)
- [ ] Modais são acessíveis (foco, ESC para fechar)
- [ ] Botões têm estados :focus visíveis

### Responsiveness
- [ ] Layout funciona em 320px (mobile pequeno)
- [ ] Layout funciona em 768px (tablet)
- [ ] Layout funciona em 1920px+ (desktop grande)
- [ ] Touch targets >= 44px em mobile
- [ ] Não há scroll horizontal indesejado
- [ ] Grid de projetos adapta número de colunas

### Documentation
- [ ] README atualizado (se necessário)
- [ ] Spec está atualizado com decisões tomadas
- [ ] Endpoints da API documentados
- [ ] Variáveis de ambiente documentadas
- [ ] Migration do banco documentada
- [ ] Comments em código complexo

### Git & Deploy
- [ ] Commits seguem padrão conventional commits
- [ ] Branch criada a partir da main/develop atualizada
- [ ] Pull request criado com descrição clara
- [ ] Code review aprovado por pelo menos 1 pessoa
- [ ] CI/CD pipeline passa (build, lint, test)
- [ ] Migrations do banco executadas com sucesso
- [ ] Deploy em staging testado
- [ ] Deploy em produção bem-sucedido

---

## Phase 1: Backend WordPress Integration

### Setup & Infrastructure
- [ ] Criar módulo `backend/src/modules/wordpress/`
- [ ] Instalar dependências: `@nestjs/axios`, `axios`
- [ ] Adicionar variável `WORDPRESS_ENCRYPTION_KEY` no `.env.example`
- [ ] Gerar chave de criptografia segura (32+ caracteres) no `.env`

### Encryption Utility
- [ ] Criar `utils/encryption.util.ts`
- [ ] Implementar método `encrypt(text: string): string`
- [ ] Implementar método `decrypt(encryptedText: string): string`
- [ ] Usar algoritmo AES-256-GCM
- [ ] Criar testes unitários para encryption util
- [ ] Testar encrypt/decrypt com Application Password real
- [ ] Validar que mesmo texto gera encrypted diferentes (IV aleatório)

### WordPress Service
- [ ] Criar `wordpress.service.ts`
- [ ] Implementar `testConnection(userId, dto)` method
  - [ ] Buscar projeto do Supabase com service_role
  - [ ] Validar que `user_id` do projeto == `userId` do JWT
  - [ ] Descriptografar password
  - [ ] Normalizar e validar URL do WordPress
  - [ ] Criar Authorization header (Basic Auth)
  - [ ] Chamar `GET /wp-json/wp/v2/users/me`
  - [ ] Tratar erros específicos (401, 403, timeout, ENOTFOUND)
  - [ ] Buscar informações do site (`GET /wp-json/`)
  - [ ] Verificar plugin AlvoBot (`GET /wp-json/alvobot/v1/status`)
  - [ ] Atualizar status no banco (connection_status, wp_version, etc.)
  - [ ] Retornar response padronizado
- [ ] Implementar `getSiteInfo(userId, projectId)` method
  - [ ] Buscar projeto
  - [ ] Descriptografar credenciais
  - [ ] Buscar informações atualizadas do WordPress
  - [ ] Cachear resultado por 5 minutos
- [ ] Implementar retry logic com backoff exponencial (max 3 tentativas)
- [ ] Implementar timeout de 10 segundos para requests
- [ ] Adicionar logging de erros (sem expor credenciais)

### WordPress Controller
- [ ] Criar `wordpress.controller.ts`
- [ ] Aplicar `@UseGuards(JwtAuthGuard)` no controller
- [ ] Implementar `POST /wordpress/test-connection`
  - [ ] Validar DTO (projectId é número)
  - [ ] Extrair `userId` do token JWT
  - [ ] Chamar service
  - [ ] Retornar response
- [ ] Implementar `GET /wordpress/site-info/:projectId`
  - [ ] Validar projectId
  - [ ] Chamar service
- [ ] Criar DTOs:
  - [ ] `test-connection.dto.ts`
  - [ ] `test-connection-response.dto.ts`

### WordPress Module
- [ ] Criar `wordpress.module.ts`
- [ ] Importar `HttpModule` do `@nestjs/axios`
- [ ] Importar `SupabaseModule`
- [ ] Registrar service e controller
- [ ] Exportar service (se necessário)

### Testing Backend
- [ ] Criar `encryption.util.spec.ts`
  - [ ] Test: encrypt and decrypt same text
  - [ ] Test: different IVs for same input
  - [ ] Test: invalid format throws error
- [ ] Criar `wordpress.service.spec.ts`
  - [ ] Mock HttpService
  - [ ] Mock SupabaseService
  - [ ] Test: successful connection
  - [ ] Test: 401 error handling
  - [ ] Test: timeout handling
  - [ ] Test: invalid URL handling
- [ ] Criar `wordpress.controller.spec.ts`
  - [ ] Test: JWT guard is applied
  - [ ] Test: calls service with correct params

---

## Phase 2: Database Schema & Migration

### Migration Script
- [ ] Criar migration `004_wordpress_connection_fields.sql`
- [ ] Adicionar colunas:
  - [ ] `connection_status` (TEXT, default 'not_configured')
  - [ ] `last_connection_test` (TIMESTAMP)
  - [ ] `connection_error_message` (TEXT)
- [ ] Criar enum `connection_status_enum`
- [ ] Alterar coluna para usar enum
- [ ] Migrar dados existentes (`connection_status = 'not_configured'`)
- [ ] Criar índice `idx_projects_connection_status`
- [ ] Adicionar comentários nas colunas

### Connection Logs Table (Opcional)
- [ ] Criar tabela `wordpress_connection_logs`
- [ ] Adicionar colunas: id, project_id, user_id, test_type, success, error_message, response_time_ms, wp_version, tested_at
- [ ] Criar foreign keys para projects e auth.users
- [ ] Habilitar RLS
- [ ] Criar policies: SELECT e INSERT para own data
- [ ] Criar índices para performance

### TypeScript Types
- [ ] Atualizar `frontend/src/shared/types/entities.ts`
- [ ] Adicionar campos novos na interface `Project`
  - [ ] `connection_status: 'connected' | 'error' | 'not_configured' | 'testing'`
  - [ ] `last_connection_test?: string`
  - [ ] `connection_error_message?: string`
- [ ] Criar interface `WordPressConnectionLog` (se tabela criada)

### Testing Migration
- [ ] Executar migration em DB local
- [ ] Verificar que tabelas foram criadas corretamente
- [ ] Verificar que RLS policies funcionam
- [ ] Testar rollback da migration
- [ ] Inserir dados de teste e verificar constraints

---

## Phase 3: Frontend - Wizard de Criação

### API Layer
- [ ] Criar `features/projects/api/wordpress.ts`
- [ ] Implementar `useTestWordPressConnection()` mutation
  - [ ] POST `/wordpress/test-connection`
  - [ ] Invalidar queries de projetos no onSuccess
  - [ ] Tratar erros
- [ ] Implementar `useInstallWordPressPlugin()` mutation
  - [ ] POST `/wordpress/install-plugin`
  - [ ] Invalidar cache
- [ ] Adicionar tipos:
  - [ ] `TestConnectionRequest`
  - [ ] `TestConnectionResponse`
  - [ ] `WordPressSiteInfo`

### Wizard Components
- [ ] Atualizar `ProjectCreateWizard.tsx`
- [ ] Criar step 1: BasicInfoStep
  - [ ] Input: Nome do projeto
  - [ ] Input: URL do WordPress (validar formato)
  - [ ] Select: Nicho (opcional)
  - [ ] Validação com Zod schema
  - [ ] Botão "Próximo"
- [ ] Criar step 2: CredentialsStep
  - [ ] Input: Username WordPress
  - [ ] Input: Application Password
  - [ ] Link de ajuda: "Como gerar Application Password?"
  - [ ] Validação de campos obrigatórios
  - [ ] Botões "Voltar" e "Próximo"
- [ ] Criar step 3: ConnectionTestStep
  - [ ] Auto-trigger test ao montar componente
  - [ ] Loading state: spinner + "Testando conexão..."
  - [ ] Success state:
    - [ ] Ícone de sucesso
    - [ ] Card com informações do site
    - [ ] Lista: Nome, URL, WordPress version, Plugin status
    - [ ] Botão "Continuar"
  - [ ] Error state:
    - [ ] Ícone de erro
    - [ ] Mensagem de erro clara
    - [ ] Botão "Tentar novamente"
    - [ ] Botão "Voltar e corrigir"
- [ ] Adicionar progress indicator (1/3, 2/3, 3/3)
- [ ] Implementar navegação entre steps
- [ ] Salvar dados temporários no state local
- [ ] Ao finalizar: criar projeto no Supabase (frontend direto)

### Validation
- [ ] Criar schema Zod para validar URL
  - [ ] URL válida (http/https)
  - [ ] Formato de domínio correto
- [ ] Criar schema para Application Password
  - [ ] Não vazio
  - [ ] Formato esperado (caracteres alfanuméricos + espaços)
- [ ] Validar campos em tempo real (onChange)
- [ ] Exibir mensagens de erro abaixo dos inputs

### Styling
- [ ] Criar `ConnectionTestStep.module.css`
- [ ] Estilizar loading state
- [ ] Estilizar success state
- [ ] Estilizar error state
- [ ] Adicionar animações suaves (fade in/out)
- [ ] Adicionar animação de spin no loading icon
- [ ] Responsividade mobile

### Testing Frontend Wizard
- [ ] Testar fluxo completo: step 1 → 2 → 3 → salvar
- [ ] Testar validação de campos (URL inválida, campos vazios)
- [ ] Testar erro de conexão (credenciais erradas)
- [ ] Testar sucesso de conexão
- [ ] Testar botões "Voltar" e "Próximo"
- [ ] Testar responsividade em mobile

---

## Phase 4: Frontend - Gerenciamento de Projetos

### ProjectManageModal Component
- [ ] Criar `components/ProjectManageModal.tsx`
- [ ] Criar estrutura com abas (Informações, Conexão, Histórico)
- [ ] Implementar navegação entre abas
- [ ] Receber `project` como prop
- [ ] Receber callbacks: `onSave`, `onClose`, `onDelete`

### Aba: Informações
- [ ] Reutilizar `ProjectForm.tsx` (ou criar novo)
- [ ] Inputs editáveis: nome, URL, username, password
- [ ] Validação de campos
- [ ] Botão "Salvar alterações"
- [ ] Loading state durante update
- [ ] Mensagem de sucesso após salvar

### Aba: Conexão
- [ ] Exibir status atual (ConnectionStatusBadge)
- [ ] Exibir última data de teste
- [ ] Exibir mensagem de erro (se houver)
- [ ] Botão "Testar Conexão"
  - [ ] Trigger `useTestWordPressConnection`
  - [ ] Loading state durante teste
  - [ ] Exibir resultado (sucesso/erro)
- [ ] Botão "Reinstalar Plugin"
  - [ ] Trigger `useInstallWordPressPlugin`
  - [ ] Loading state
  - [ ] Confirmação de sucesso
- [ ] Card com informações do WordPress:
  - [ ] Versão do WP
  - [ ] URL do site
  - [ ] Status do plugin

### Aba: Histórico (opcional)
- [ ] Criar query `useConnectionLogs(projectId)`
- [ ] Exibir lista de logs de conexão
- [ ] Para cada log:
  - [ ] Data/hora
  - [ ] Tipo de teste (manual/auto)
  - [ ] Status (sucesso/erro)
  - [ ] Tempo de resposta
  - [ ] Mensagem de erro (se houver)
- [ ] Paginação ou scroll infinito
- [ ] Empty state: "Nenhum teste realizado"

### ConnectionStatusBadge Component
- [ ] Criar `components/ConnectionStatusBadge.tsx`
- [ ] Receber `status` e `errorMessage` como props
- [ ] Exibir ícone + label baseado no status:
  - [ ] `connected`: CheckCircle verde, "Conectado"
  - [ ] `error`: XCircle vermelho, "Erro de Conexão"
  - [ ] `not_configured`: AlertCircle cinza, "Não Configurado"
  - [ ] `testing`: Loader azul, "Testando..."
- [ ] Tooltip com mensagem de erro (se houver)
- [ ] Animação de spin para status `testing`

### ConnectionTestResult Component
- [ ] Criar `components/ConnectionTestResult.tsx`
- [ ] Receber `result` (TestConnectionResponse) como prop
- [ ] Exibir informações do site WordPress
- [ ] Exibir lista de plugins (se disponível)
- [ ] Highlight se plugin AlvoBot está ativo
- [ ] Alert se plugin não está ativo

### Styling
- [ ] Criar `ProjectManageModal.module.css`
- [ ] Estilizar abas (tab navigation)
- [ ] Estilizar conteúdo de cada aba
- [ ] Estilizar cards de informações
- [ ] Responsividade mobile (abas stack verticalmente)

### Testing Modal
- [ ] Testar abertura e fechamento do modal
- [ ] Testar navegação entre abas
- [ ] Testar edição de informações e save
- [ ] Testar teste de conexão (sucesso e erro)
- [ ] Testar reinstalação de plugin
- [ ] Testar visualização de histórico
- [ ] Testar responsividade

---

## Phase 5: Backend - Instalação de Plugin

### Install Plugin Service Method
- [ ] Adicionar método `installPlugin(userId, dto)` no WordPressService
- [ ] Buscar projeto e validar ownership
- [ ] Descriptografar credenciais
- [ ] Verificar se plugin AlvoBot existe
  - [ ] Tentar `GET /wp-json/alvobot/v1/status`
  - [ ] Se existe mas inativo, ativar
  - [ ] Se não existe, retornar instruções para instalação manual
- [ ] Atualizar status do projeto após instalação
- [ ] Retornar resultado: success, message

### Activate Plugin via API
- [ ] Implementar chamada `POST /wp-json/wp/v2/plugins/alvobot/activate`
- [ ] Tratar erros:
  - [ ] Plugin não encontrado
  - [ ] Sem permissões
  - [ ] Erro do WordPress
- [ ] Registrar log de tentativa de ativação

### Install Plugin DTO
- [ ] Criar `dto/install-plugin.dto.ts`
- [ ] Validar `projectId` é número

### Controller Endpoint
- [ ] Adicionar `POST /wordpress/install-plugin` no controller
- [ ] Aplicar JWT guard
- [ ] Validar DTO
- [ ] Chamar service
- [ ] Retornar response

### Fallback - Manual Installation
- [ ] Criar endpoint `GET /wordpress/plugin-download-url`
- [ ] Retornar URL para download do plugin ZIP
- [ ] Retornar instruções de instalação manual

### Testing Backend
- [ ] Criar teste para `installPlugin` method
- [ ] Mock WordPress API response
- [ ] Testar cenário: plugin não existe
- [ ] Testar cenário: plugin existe mas inativo
- [ ] Testar cenário: plugin ativo
- [ ] Testar endpoint do controller

---

## Phase 6: Frontend - Listagem e Filtros

### ProjectsPage Updates
- [ ] Atualizar `ProjectsPage.tsx` para exibir connection status
- [ ] Adicionar filtro de busca (já existe)
- [ ] Adicionar filtro por status de conexão
  - [ ] Dropdown: Todos, Conectado, Erro, Não configurado
  - [ ] Aplicar filtro na query
- [ ] Adicionar ordenação
  - [ ] Dropdown: Nome, Data criação, Status
  - [ ] Aplicar ordenação na query

### ProjectCard Updates
- [ ] Atualizar `ProjectCard.tsx`
- [ ] Adicionar `ConnectionStatusBadge`
- [ ] Exibir versão do WordPress (se disponível)
- [ ] Exibir data do último teste de conexão
- [ ] Adicionar botão "Testar Conexão" no menu
- [ ] Mostrar loading state no card durante teste

### Filters & Search
- [ ] Criar state para filtros (search, status, sort)
- [ ] Atualizar query key do TanStack Query com filtros
- [ ] Implementar debounce na busca (300ms)
- [ ] Persistir filtros no localStorage (opcional)

### Empty States
- [ ] Criar empty state para "Nenhum projeto"
- [ ] Criar empty state para "Nenhum resultado na busca"
- [ ] Botão "Limpar filtros" quando busca não retorna resultados

### Loading States
- [ ] Skeleton screen durante carregamento inicial
- [ ] Spinner individual durante teste de conexão
- [ ] Disable botões durante mutations

### Responsive Grid
- [ ] Configurar grid responsivo com CSS Grid
- [ ] Mobile (320px): 1 coluna
- [ ] Tablet (768px): 2 colunas
- [ ] Desktop (1024px+): 3-4 colunas
- [ ] Gap entre cards: 1.5rem

### Testing Listagem
- [ ] Testar carregamento de lista
- [ ] Testar busca por nome
- [ ] Testar filtro por status
- [ ] Testar ordenação
- [ ] Testar empty states
- [ ] Testar responsividade

---

## Phase 7: Logs e Histórico

### Backend - Connection Logs
- [ ] Adicionar método `saveConnectionLog()` no WordPressService
- [ ] Chamar após cada teste de conexão
- [ ] Salvar: project_id, user_id, test_type, success, error, response_time, wp_version
- [ ] Criar endpoint `GET /wordpress/connection-logs/:projectId`
- [ ] Implementar paginação (limit, offset)
- [ ] Ordenar por `tested_at DESC`

### Frontend - Connection Logs Query
- [ ] Criar `useConnectionLogs(projectId, options)` hook
- [ ] Query com paginação
- [ ] Cache time: 2 minutos
- [ ] Invalidar após novo teste de conexão

### History Tab Component
- [ ] Criar `components/ConnectionHistoryTab.tsx`
- [ ] Exibir lista de logs
- [ ] Para cada log:
  - [ ] Timeline visual
  - [ ] Data/hora formatada
  - [ ] Ícone de status (check/x)
  - [ ] Mensagem de resultado
  - [ ] Tempo de resposta
- [ ] Botão "Carregar mais" para paginação
- [ ] Empty state: "Nenhum teste realizado ainda"

### Log Item Component
- [ ] Criar `components/ConnectionLogItem.tsx`
- [ ] Exibir informações do log
- [ ] Formatação de data relativa ("2 horas atrás")
- [ ] Badge colorido para status
- [ ] Expansível para ver detalhes (opcional)

### Testing Logs
- [ ] Testar salvamento de log após teste
- [ ] Testar busca de logs
- [ ] Testar paginação
- [ ] Testar ordenação
- [ ] Testar visualização na aba Histórico

---

## Phase 8: Polish e Refinamento

### Error Messages
- [ ] Revisar todas as mensagens de erro
- [ ] Garantir clareza e acionabilidade
- [ ] Adicionar links de ajuda quando apropriado
- [ ] Traduzir mensagens técnicas para linguagem de usuário
- [ ] Exemplo: "ENOTFOUND" → "Site WordPress não encontrado. Verifique a URL."

### User Feedback
- [ ] Toast notifications para ações bem-sucedidas
  - [ ] "Projeto criado com sucesso"
  - [ ] "Conexão testada com sucesso"
  - [ ] "Projeto atualizado"
  - [ ] "Plugin instalado"
- [ ] Confirmações antes de ações destrutivas
  - [ ] Excluir projeto
  - [ ] Reinstalar plugin
- [ ] Loading spinners em todos os botões de ação

### Tooltips & Help
- [ ] Adicionar tooltip no badge de status
- [ ] Tooltip em "Application Password" com link de ajuda
- [ ] Tooltip em ícones de ação
- [ ] Modal de ajuda: "Como gerar Application Password?"
  - [ ] Passo a passo com screenshots
  - [ ] Link para documentação WordPress

### Animations
- [ ] Fade in/out para modais
- [ ] Slide transition entre steps do wizard
- [ ] Smooth collapse/expand para accordions
- [ ] Pulse animation em loading states
- [ ] Success checkmark animation
- [ ] Duração: 200-300ms (não muito lento)

### Micro-interactions
- [ ] Hover effects em cards
- [ ] Active states em botões
- [ ] Focus states visíveis (outline)
- [ ] Disabled states claros
- [ ] Ripple effect em botões (opcional)

### Accessibility Review
- [ ] Executar Lighthouse audit
- [ ] Score de acessibilidade >= 90
- [ ] Corrigir issues reportados
- [ ] Testar com screen reader (NVDA/JAWS)
- [ ] Testar navegação apenas por teclado
- [ ] Verificar contraste de cores (WCAG AA)

### Performance Optimization
- [ ] Executar Lighthouse performance audit
- [ ] Score >= 90
- [ ] Otimizar bundle size (code splitting)
- [ ] Lazy load modais e componentes pesados
- [ ] Otimizar queries do Supabase (índices)
- [ ] Cachear responses da API WordPress

### Documentation
- [ ] Atualizar README com instruções de setup
- [ ] Documentar variáveis de ambiente necessárias
- [ ] Adicionar comentários em código complexo
- [ ] Criar guide: "Como gerar Application Password"
- [ ] Documentar endpoints da API (Swagger/OpenAPI)

### Analytics & Monitoring
- [ ] Adicionar tracking de eventos:
  - [ ] Projeto criado
  - [ ] Teste de conexão executado
  - [ ] Plugin instalado
  - [ ] Erro de conexão
- [ ] Configurar error tracking (Sentry)
- [ ] Dashboard de métricas (opcional)

### Final Testing
- [ ] Executar todos os testes automatizados
- [ ] Teste manual completo do fluxo
- [ ] Teste em diferentes navegadores
- [ ] Teste em diferentes dispositivos
- [ ] Teste com usuários reais (beta testing)
- [ ] Corrigir bugs encontrados

---

## Pre-Production Checklist

### Environment Setup
- [ ] Variável `WORDPRESS_ENCRYPTION_KEY` configurada em produção
- [ ] Migrations do banco executadas em produção
- [ ] RLS policies ativas em produção
- [ ] Backup do banco antes do deploy
- [ ] Rollback plan preparado

### Security Review
- [ ] Code review focado em segurança
- [ ] Verificar que credenciais não são logadas
- [ ] Verificar que encryption está funcionando
- [ ] Testar RLS policies em produção
- [ ] Scan de vulnerabilidades (npm audit)

### Performance Testing
- [ ] Load testing em staging
- [ ] Verificar tempo de resposta < 10s para teste conexão
- [ ] Verificar listagem carrega < 2s
- [ ] Testar com 50+ projetos por usuário
- [ ] Verificar memory leaks

### Monitoring Setup
- [ ] Configurar alertas de erro
- [ ] Configurar alertas de performance
- [ ] Dashboard de métricas
- [ ] Log aggregation configurado

### Documentation Final
- [ ] Changelog atualizado
- [ ] Release notes escritas
- [ ] User guide atualizado
- [ ] Internal documentation atualizada

---

## Post-Launch Checklist

### Week 1
- [ ] Monitorar logs de erro
- [ ] Monitorar métricas de performance
- [ ] Coletar feedback de usuários
- [ ] Hotfix bugs críticos
- [ ] Comunicar status aos stakeholders

### Week 2-4
- [ ] Analisar usage analytics
- [ ] Identificar pontos de fricção no UX
- [ ] Priorizar melhorias
- [ ] Planejar próximas iterações
- [ ] Documentar learnings

### Maintenance
- [ ] Atualizar dependências regularmente
- [ ] Monitorar breaking changes do WordPress API
- [ ] Revisar e otimizar performance
- [ ] Atualizar documentação conforme mudanças

---

## Success Metrics (Post-Launch)

### Adoption
- [ ] 80%+ dos usuários criam pelo menos 1 projeto
- [ ] Taxa de conclusão do wizard > 80%
- [ ] Tempo médio de criação de projeto < 3 minutos

### Reliability
- [ ] Taxa de sucesso de teste de conexão > 95% (credenciais válidas)
- [ ] Uptime do backend > 99.5%
- [ ] Tempo de resposta médio < 5s

### User Satisfaction
- [ ] NPS score >= 8/10
- [ ] Taxa de erro reportado < 5%
- [ ] Feedback positivo sobre facilidade de uso

### Technical
- [ ] Zero credenciais expostas
- [ ] Zero incidentes de segurança
- [ ] Performance dentro dos SLAs definidos
