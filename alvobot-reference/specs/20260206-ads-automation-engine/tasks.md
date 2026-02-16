# Implementation Tasks: Ads Automation Engine

**Branch**: `20260206-ads-automation-engine` | **Date**: 2026-02-06  
**Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) | **Data Model**: [data-model.md](./data-model.md)

**Convenções**:
- `[P]` = Pode ser paralelizado com outras tasks do mesmo grupo `[P]`
- `Depends on: None` = Pode iniciar imediatamente
- Cada task deve ser completável em **1-4 horas**
- Requirements referenciados são do `spec.md`

---

## Phase 1: Foundation — Database & Types

> Cria a base de dados e os tipos TypeScript compartilhados entre backend e frontend.

- [x] 1.1 Criar migration SQL para `automation_rules`, `automation_executions`, `automation_execution_logs`
  - Criar arquivo `supabase/migrations/20260206_automation_engine.sql`
  - 3 tabelas com columns, constraints, indexes conforme `plan.md` seção "Database Strategy"
  - RLS policies workspace-aware (SELECT para membros, INSERT/UPDATE/DELETE para owner)
  - Trigger `updated_at` automático
  - **Depends on**: None
  - **Requirement**: FR-001, FR-070

- [x] 1.2 [P] Criar tipos TypeScript do backend — DTOs e entities
  - Criar `backend/src/modules/automation/dto/` com todos os DTOs (condition, filter, task, schedule, rule, execution-log)
  - Criar `backend/src/modules/automation/entities/` com interfaces de entidade
  - class-validator decorators para validação
  - Discriminated unions para Condition (5 tipos) e ActionParams
  - **Depends on**: None
  - **Requirement**: FR-001, FR-020, FR-030

- [x] 1.3 [P] Criar tipos TypeScript do frontend
  - Criar `frontend/src/features/ads-unified/types/automation.ts`
  - Espelhar tipos do backend (AutomationRule, Filter, Condition, Task, Schedule, etc.)
  - Exportar constantes de tipo (EntityLevel, ActionType, FilterOperator, Period, etc.)
  - **Depends on**: None
  - **Requirement**: FR-001

- [x] 1.4 [P] Criar constantes de métricas, ações e filtros por plataforma
  - Criar `backend/src/modules/automation/constants/` (metrics.ts, actions.ts, filters.ts, enums.ts)
  - Criar `frontend/src/features/ads-unified/constants/` (espelhar backend)
  - ~50 métricas Meta, ~30 métricas Google (ref: `reference-spec-automacao-completa-v3.md` seções 4.6 e 4.7)
  - Ações por plataforma/nível (ref: seção 5.3)
  - Campos filtráveis por plataforma (ref: seções 3.3 e 3.4)
  - **Depends on**: None
  - **Requirement**: FR-023, FR-012, FR-030

---

## Phase 2: Backend Core — Module Scaffolding & CRUD

> Estrutura o módulo NestJS e implementa CRUD de regras.

- [x] 2.1 Criar `AutomationModule` com scaffolding NestJS
  - Criar `backend/src/modules/automation/automation.module.ts`
  - Registrar no `AppModule`
  - Importar dependências (GoogleModule, MetaModule, ConnectionsModule, EmailModule)
  - Configurar providers para todos os services e adapters
  - **Depends on**: 1.2
  - **Requirement**: None (infrastructure)

- [x] 2.2 Implementar `AutomationCrudService` — CRUD de regras
  - Create, Read (list + detail), Update, Delete
  - Toggle status (active ↔ paused)
  - Validação: Google = 1 conta + 1 campaign type; Meta = max 5 contas, mesma moeda
  - Validação: nível compatível com plataforma e campaign type
  - Cálculo de `next_run_at` ao ativar regra
  - Query via Supabase service_role (para cron) e via user_id (para API)
  - **Depends on**: 2.1, 1.1
  - **Requirement**: FR-001, FR-002, FR-003, FR-004, FR-005

- [x] 2.3 Implementar `AutomationController` — REST API
  - 14 endpoints conforme `plan.md` seção "API Endpoints"
  - JwtAuthGuard em todos
  - DTO validation com class-validator (ParseUUIDPipe, ValidationPipe)
  - Paginação + filtros para listagem (platform, status, search)
  - **Depends on**: 2.2
  - **Requirement**: FR-001, FR-002, FR-072

- [x] 2.4 [P] Implementar `PlatformAdapter` interface e `GoogleAutomationAdapter`
  - Criar `backend/src/modules/automation/adapters/platform-adapter.interface.ts`
  - Implementar `GoogleAutomationAdapter` delegando para `GoogleDashboardService` e `GoogleAdsApiService` existentes
  - Métodos: `fetchEntities()`, `executeAction()`, `checkConnection()`, `getMetricValue()`
  - Normalizar entidades Google para `PlatformEntity`
  - **Depends on**: 2.1
  - **Requirement**: FR-023 (Google)

- [x] 2.5 [P] Implementar `MetaAutomationAdapter`
  - Implementar `MetaAutomationAdapter` delegando para `MetaDashboardService` existente
  - Métodos: `fetchEntities()` (campaigns, adsets, ads), `executeAction()` (pause, enable, budget)
  - Normalizar entidades Meta para `PlatformEntity`
  - Suporte a ad accounts múltiplas (até 5)
  - **Depends on**: 2.1
  - **Requirement**: FR-023 (Meta)

---

## Phase 3: Backend Core — Engine de Execução

> Implementa o core do motor de automação: filtros, condições, ações e orquestração.

- [x] 3.1 Implementar `FilterEvaluatorService` — Avaliação de filtros
  - Lógica array-of-arrays: OR entre grupos, AND dentro do grupo
  - 14 operadores (EQUAL, CONTAIN, REGEX, IN, BETWEEN, etc.)
  - Cross-level field resolution (`campaign.name` quando rule level é `adset`)
  - REGEX safety: timeout wrapper para prevenir ReDoS
  - Validação de REGEX antes de salvar (frontend + backend)
  - **Depends on**: 1.2
  - **Requirement**: FR-010, FR-011, FR-012, FR-013, FR-014

- [x] 3.2 Implementar `ConditionEvaluatorService` — Avaliação de condições
  - Recursive AND/OR tree walker (extraído da lógica existente em `GoogleAutomationService`)
  - 5 tipos de condição com evaluators específicos:
    - `simple`: metric op value (existente)
    - `metric_comparison`: metric_period op compare_metric_period * multiplier
    - `ranking`: top/bottom N/N% por metric (requer `allEntities`)
    - `time`: horário atual vs range no timezone da regra
    - `lifecycle`: hours/days desde criação
  - Suporte a custom metrics (resolver fórmula antes de avaliar)
  - **Depends on**: 1.2, 1.4
  - **Requirement**: FR-020, FR-021, FR-022, FR-024, FR-025

- [x] 3.3 Implementar `ActionExecutorService` — Despacho de ações
  - 16 ações com params type-safe
  - Status: pause, start
  - Budget: increase, decrease, set, scale_by_target (com min/max guards)
  - Bid: increase, decrease, set, set_bid_strategy
  - Name: add_to_name, remove_from_name, replace_in_name
  - Duplicate: com preserve_social_proof e destino customizado
  - Notify: marcar para envio de email
  - Validação CBO/ABO para budget em ad sets Meta
  - Delegação para o `PlatformAdapter` correto
  - Registro de resultado (success/failed/skipped) com previous_value e new_value
  - **Depends on**: 2.4, 2.5
  - **Requirement**: FR-030, FR-032, FR-033, FR-034

- [x] 3.4 Implementar frequency cap checking
  - Consultar `automation_executions` para verificar cap por entidade+task
  - Converter FrequencyCap enum para minutos (`once_per_hour` = 60min, etc.)
  - `once_in_lifetime` = verificar se `execution_count > 0`
  - Upsert de registro após execução bem-sucedida
  - **Depends on**: 1.1, 1.2
  - **Requirement**: FR-031

- [x] 3.5 Implementar `AutomationEngineService` — Orquestração
  - Pipeline: fetch → filter → evaluate conditions → check frequency cap → execute → log
  - Logging completo em `automation_execution_logs` (summary + affected_entities + errors)
  - Rule snapshot salvo no log para auditoria
  - Tratamento de erros parciais (status `partial`)
  - Rate limit handling com retry + backoff exponencial
  - Métricas de contagem (evaluated, matched_filters, matched_conditions, affected, skipped_cap, errors)
  - **Depends on**: 3.1, 3.2, 3.3, 3.4
  - **Requirement**: FR-006, FR-070, FR-071

- [x] 3.6 Implementar `ScheduleEvaluatorService` — Cálculo de próxima execução
  - `calculateNextRun()`: frequency (15min a 72h) e custom slots (dayparting)
  - Timezone handling com IANA (ex: `America/Sao_Paulo`)
  - `date_range`: respeitar start/end
  - `run_once`: pausar regra após primeira execução
  - `isDue()`: verificar se regra está no horário de execução
  - **Depends on**: 1.2
  - **Requirement**: FR-040, FR-041, FR-042, FR-043

- [x] 3.7 Estender `AutomationRunnerJob` para regras unificadas
  - Novo método `runUnifiedAutomations()` que consulta `automation_rules` WHERE `status = 'active'` AND `next_run_at <= NOW()`
  - Resolve adapter (Google ou Meta) baseado em `platform`
  - Check connection health via circuit breaker
  - Delega execução para `AutomationEngineService`
  - Atualiza `next_run_at` via `ScheduleEvaluatorService`
  - Manter `runDueAutomations()` existente para backward compat
  - **Depends on**: 3.5, 3.6
  - **Requirement**: SC-002, SC-005

- [x] 3.8 Implementar endpoint de Preview/Dry-run
  - Reusar pipeline do engine até PHASE 2 (evaluate)
  - Retornar lista de entidades que seriam afetadas com métricas atuais
  - Aviso quando escopo > 2000 entidades
  - Timeout de 30 segundos
  - **Depends on**: 3.5
  - **Requirement**: FR-080, FR-081, SC-003

---

## Phase 4: Backend — Notificações & Logs

> Implementa notificações por email e APIs de consulta de logs.

- [x] 4.1 Implementar `AutomationNotificationService`
  - Estender `EmailService` existente (Resend API)
  - Template HTML para notificação de automação (subject, summary, entity details, metrics snapshot)
  - Placeholders dinâmicos: `{rule_name}`, `{entities_count}`, `{platform}`, `{timestamp}`, `{errors_count}`
  - 3 triggers: `notify_on_action`, `notify_on_error`, `notify_on_no_match`
  - Registro de envio em `execution_log.notifications_sent`
  - **Depends on**: 3.5
  - **Requirement**: FR-050, FR-051, FR-052, SC-007

- [x] 4.2 [P] Implementar API de logs de execução
  - `GET /automations/logs` com filtros: rule_id, date_range, status
  - `GET /automations/logs/:id` com detalhes completos (affected_entities, errors)
  - Paginação server-side
  - Formatação de response DTO
  - **Depends on**: 2.3, 1.1
  - **Requirement**: FR-072

---

## Phase 5: Frontend — Tipos, API e Constantes

> Conecta o frontend ao backend e prepara a base para os componentes.

- [x] 5.1 Implementar hooks React Query para automação
  - Criar `frontend/src/features/ads-unified/api/automationQueries.ts`
    - `useAutomationRules(filters)` — listar regras
    - `useAutomationRule(id)` — detalhe de regra
    - `useAutomationLogs(ruleId?)` — histórico
    - `useAutomationLogDetail(logId)` — detalhe de execução
    - `useAutomationMetrics(platform)` — métricas disponíveis
    - `usePreviewRule(ruleId)` — preview/dry-run
  - Criar `frontend/src/features/ads-unified/api/automationMutations.ts`
    - `useCreateRule()`, `useUpdateRule()`, `useDeleteRule()`
    - `useToggleRule()`, `useExecuteRule()`
  - Query keys no padrão existente
  - **Depends on**: 1.3, 2.3
  - **Requirement**: FR-001, FR-002

---

## Phase 6: Frontend — FilterBuilder Component

> Novo componente visual para filtros com AND/OR groups e cross-level filtering.

- [x] 6.1 Implementar `useFilterBuilder` hook
  - State management para array-of-arrays (FilterGroup[])
  - `addGroup()`, `removeGroup()`, `addFilter(groupIndex)`, `removeFilter(groupIndex, filterIndex)`
  - `updateFilter(groupIndex, filterIndex, updates)`
  - Validação: campo obrigatório, operador compatível com tipo de campo, REGEX válido
  - `toFilterGroups()`: converter para formato de persistência
  - `isValid()` e `getValidationErrors()`
  - **Depends on**: 1.3, 1.4
  - **Requirement**: FR-010, FR-013, FR-014

- [x] 6.2 Implementar `FilterBuilder`, `FilterGroup` e `FilterRow` components
  - `FilterBuilder`: container com grupos conectados por "OU" + botão "+ Adicionar grupo (OR)"
  - `FilterGroup`: card com filtros conectados por "E" + botão "+ Adicionar filtro (AND)"
  - `FilterRow`: `[Level ▼] [Field ▼] [Operator ▼] [Value input] [Remove]`
    - Level dropdown: dinâmico baseado na plataforma (campaign, adset/ad_group, ad, keyword)
    - Field dropdown: dinâmico baseado em platform + level selecionado
    - Operator dropdown: dinâmico baseado no tipo do campo (string→CONTAIN, number→GREATER_THAN, enum→IN)
    - Value input: polimórfico (text, number, select/multi-select) baseado no campo
  - Visual language: mesma do ConditionBuilder existente (badges "E"/"OU", cards com borda)
  - CSS Module seguindo design system
  - **Depends on**: 6.1
  - **Requirement**: FR-010, FR-011, FR-012

---

## Phase 7: Frontend — ConditionBuilder Evolução

> Estende o ConditionBuilder existente para suportar 5 tipos de condição.

- [x] 7.1 Estender `useConditionBuilder` hook para novos tipos de condição
  - Mudar `Condition` de interface para discriminated union (simple | metric_comparison | ranking | time | lifecycle)
  - Factory `createCondition(type)` que retorna defaults corretos por tipo
  - `updateCondition()` type-aware (não misturar fields entre tipos)
  - Validação por tipo de condição
  - Manter backward compat com o tipo `simple` existente
  - **Depends on**: 1.3, 1.4
  - **Requirement**: FR-020, FR-021

- [x] 7.2 Implementar condition row components (5 tipos)
  - `SimpleConditionRow`: [Metric ▼] [Period ▼] [Operator ▼] [Value input] — evolução do existente
  - `MetricComparisonRow`: [Metric ▼] [Period ▼] [Operator ▼] [Metric ▼] [Period ▼] [×Multiplier]
  - `RankingConditionRow`: [Top/Bottom ▼] [Value] [% / quantidade ▼] por [Metric ▼] [Period ▼] [☑ Include zeros]
  - `TimeConditionRow`: [Operator ▼] [Time input] [- Time end input (if BETWEEN)]
  - `LifecycleConditionRow`: [Metric ▼ (hours/days since)] [Operator ▼] [Value input]
  - **Depends on**: 7.1
  - **Requirement**: FR-020, FR-022, FR-024, FR-025

- [x] 7.3 Atualizar `ConditionBuilder` e `ConditionGroup` para novos tipos
  - `ConditionGroup`: adicionar type selector ao criar nova condição (dropdown: Métrica, Comparação, Ranking, Horário, Ciclo de Vida)
  - Dispatch para o componente de row correto baseado em `condition.type`
  - Métricas dropdown: platform-aware (Google vs Meta)
  - Períodos dropdown: todos os períodos do data-model
  - **Depends on**: 7.2
  - **Requirement**: FR-020, FR-023

---

## Phase 8: Frontend — ActionConfigurator Component

> Componente para configurar ações com parâmetros type-safe e frequency cap.

- [x] 8.1 Implementar `ActionConfigurator` component
  - Header: [Action type ▼] + [Frequency Cap ▼]
  - Body: formulário dinâmico baseado no tipo de ação selecionado
  - Action dropdown: filtrado por plataforma + nível (usar constantes)
  - Frequency cap dropdown: 12 opções (no_limit a once_in_lifetime)
  - **Depends on**: 1.3, 1.4
  - **Requirement**: FR-030, FR-031, FR-032

- [x] 8.2 Implementar sub-components de ação
  - `BudgetAction`: [Change type: % / fixed] [Value input] [Min budget] [Max budget]
  - `BidAction`: [Change type: % / fixed] [Value input] [Min bid] [Max bid]
  - `StatusAction`: Sem params (pause, start)
  - `NameAction`: [Text input] [Position: prefix/suffix] — para add_to_name; [Find] [Replace] — para replace_in_name
  - `DuplicateAction`: [Original: keep/pause] [Name suffix] [☑ Preserve social proof] [Destination campaign/adset (opcional)]
  - `NotifyAction`: [Message textarea] [☑ Include metrics] [☑ Include link]
  - Validação CBO/ABO: bloquear budget em ad set de campanha CBO com mensagem informativa
  - **Depends on**: 8.1
  - **Requirement**: FR-033, FR-034

---

## Phase 9: Frontend — AutomationWizard (Form Multi-Step)

> Formulário wizard de 5 steps para criação/edição de regras.

- [x] 9.1 Implementar `AutomationWizard` shell e step navigation
  - 5 steps: Platform, Filters, Tasks, Schedule, Notifications
  - Step indicator visual (barra de progresso)
  - Navegação: Anterior / Próximo / Salvar Rascunho / Ativar
  - State management com `useAutomationForm` hook (Zustand ou React state)
  - Modo criação e modo edição (carregar dados existentes)
  - **Depends on**: 1.3, 5.1
  - **Requirement**: FR-001, SC-001

- [x] 9.2 Implementar `PlatformStep` (Step 1)
  - Nome da regra (input obrigatório)
  - Descrição (textarea opcional)
  - Plataforma: [Meta] [Google] (toggle buttons)
  - Conta(s): dropdown de connections disponíveis (filtradas por plataforma)
    - Google: single select
    - Meta: multi-select (max 5), validação de mesma moeda
  - Campaign Type: dropdown (apenas para Google) com tipos disponíveis
  - Nível de atuação: toggle buttons (Campaign, Ad Set, Ad, etc.) — filtrados por plataforma + campaign type
  - Validação: Performance Max só aceita Campaign ou Ad Account
  - **Depends on**: 9.1
  - **Requirement**: FR-003, FR-004, FR-005

- [x] 9.3 Implementar `FiltersStep` (Step 2)
  - Integrar `FilterBuilder` (Phase 6)
  - Opção "Todas as entidades" vs "Filtrar por" (toggle)
  - Preview count: mostrar quantas entidades seriam afetadas (chamada preview rápida)
  - Aviso quando > 2000 entidades
  - **Depends on**: 9.1, 6.2
  - **Requirement**: FR-006, FR-010

- [x] 9.4 Implementar `TasksStep` (Step 3)
  - Lista de tasks com card para cada uma
  - Cada task: `ConditionBuilder` (condições) + `ActionConfigurator` (ação + freq cap)
  - Botão "+ Adicionar Task" para multi-task
  - Botão remover task (exceto a primeira)
  - **Depends on**: 9.1, 7.3, 8.1
  - **Requirement**: FR-035

- [x] 9.5 Implementar `ScheduleStep` (Step 4)
  - Tipo: [Frequência fixa] [Customizado] (toggle)
  - Frequência: dropdown (15min a 72h)
  - Custom: `DaypartingGrid` — grid 7 dias × 24 horas com toggle por célula
  - Timezone: dropdown com zonas IANA (default: America/Sao_Paulo)
  - Date range: PeriodSelector existente (start/end opcional)
  - Checkbox: "Executar apenas uma vez"
  - **Depends on**: 9.1
  - **Requirement**: FR-040, FR-041, FR-042, FR-043

- [x] 9.6 Implementar `NotifyStep` (Step 5)
  - Emails: tag input (adicionar múltiplos emails)
  - Checkboxes: notify on action, notify on error, notify on no match
  - Custom subject: input com suporte a placeholders (mostrar lista de placeholders disponíveis)
  - Options: include summary, include entity details, include metrics snapshot
  - Preview de email (opcional — template visual)
  - **Depends on**: 9.1
  - **Requirement**: FR-050, FR-051, FR-052

---

## Phase 10: Frontend — Páginas de Listagem e Histórico

> Integra o wizard na página existente e implementa a visualização de logs.

- [x] 10.1 Estender `AdsAutomationsPage` para novos endpoints
  - Remover gate "Em breve para Meta Ads"
  - Usar `useAutomationRules()` dos novos hooks (fallback para legacy se necessário)
  - Lista com: nome, plataforma (badge), nível, status (badge), última execução, ações
  - Filtros: plataforma, status, busca por nome
  - Botão "Nova Automação" abre o `AutomationWizard` (modal full-screen ou rota dedicada)
  - Toggle ativo/pausado inline na lista
  - Ações: editar, duplicar, preview, excluir
  - **Depends on**: 9.1, 5.1
  - **Requirement**: FR-001, FR-002

- [x] 10.2 Implementar `RulePreviewModal`
  - Modal com tabela de entidades que seriam afetadas
  - Colunas: nome, ID, métricas relevantes (spend, impressions, ROAS, etc.)
  - Status: ação que seria executada, previous/new value
  - Loading state com skeleton
  - Aviso se > 2000 entidades
  - Botão "Ativar regra" direto do preview
  - **Depends on**: 5.1
  - **Requirement**: FR-080, FR-081

- [x] 10.3 Estender `AdsHistoryPage` para novos logs
  - Usar `useAutomationLogs()` dos novos hooks
  - Lista com: regra (nome + plataforma badge), data/hora, status badge, counters (avaliadas / afetadas / erros)
  - Filtros: regra, período, status
  - Click na row → modal/drawer com detalhes da execução
  - `ExecutionLogDetail`: summary cards + tabela de entidades afetadas + erros
  - **Depends on**: 5.1, 4.2
  - **Requirement**: FR-070, FR-071, FR-072

---

## Phase 11: Backend — Custom Metrics (P3)

> Funcionalidade avançada de métricas customizadas.

- [ ] 11.1 Criar migration para tabela `custom_metrics`
  - Schema conforme `plan.md` seção "custom_metrics"
  - RLS workspace-aware
  - UNIQUE constraint `(workspace_id, slug)`
  - **Depends on**: 1.1
  - **Requirement**: FR-060

- [ ] 11.2 [P] Implementar `CustomMetricService` — CRUD
  - Create, Read (list), Delete
  - Validação de slug único por workspace
  - Detecção de dependências circulares (DFS no grafo de referências)
  - Validação de operandos (métricas nativas existem para a plataforma)
  - **Depends on**: 11.1, 2.1
  - **Requirement**: FR-060, FR-061, FR-062

- [ ] 11.3 [P] Implementar `CustomMetricEvaluatorService`
  - Resolver fórmula: buscar valores de métricas nativas + resolver custom metrics em cadeia
  - Operações: add, subtract, multiply, divide, percentage
  - Divisão por zero → retorna 0 + registra warning
  - Integrar com `ConditionEvaluatorService` para que condições possam referenciar custom metrics
  - **Depends on**: 3.2, 11.2
  - **Requirement**: FR-061, FR-063

- [ ] 11.4 [P] Implementar frontend `CustomMetricBuilder`
  - UI para criar/listar/deletar custom metrics
  - Formula builder: [Operand A] [Operation ▼] [Operand B]
  - Operand: dropdown de métricas nativas + input para valor fixo + dropdown de custom metrics existentes
  - Preview do cálculo com dados de exemplo
  - Integrar na página de automações (seção ou modal)
  - **Depends on**: 5.1, 1.3
  - **Requirement**: FR-060, FR-061

---

## Phase 12: Backend — Attribution (P3)

> Configuração de janela de atribuição por regra.

- [ ] 12.1 Implementar suporte a attribution nos adapters
  - `GoogleAutomationAdapter`: passar attribution window na query GAQL
  - `MetaAutomationAdapter`: passar `action_attribution_windows` na Meta Insights API
  - Aviso quando `use_entity_setting: false` em regra com entidades com attribution windows diferentes
  - **Depends on**: 2.4, 2.5
  - **Requirement**: FR-090, FR-091

- [ ] 12.2 [P] Implementar `AttributionStep` ou section no `PlatformStep`
  - Toggle: "Usar configuração de cada entidade" (default ON)
  - Dropdown de windows (platform-aware) quando toggle OFF
  - Aviso visual sobre possíveis problemas
  - **Depends on**: 9.2
  - **Requirement**: FR-090, FR-091

---

## Phase 13: Integration & Polish

> Testes de integração, edge cases e refinamentos.

- [x] 13.1 Implementar validações de edge cases
  - Condição com métrica zero (CPA < 30 quando CPA = 0) → aviso no builder
  - Budget action em ad set de campanha CBO → bloqueio com mensagem
  - Google: campaign types misturados → bloquear na validação
  - Meta: contas com moedas diferentes → bloquear na validação
  - Entidades > 2000 → aviso
  - Regex inválido → erro de validação
  - Timezone mismatch → aviso visual
  - Conflito entre regras → log detalhado
  - **Depends on**: 3.5, 9.2
  - **Requirement**: Edge cases do spec

- [x] 13.2 [P] Implementar execução manual de regra
  - Botão "Executar agora" na lista de regras
  - Usa `AutomationEngineService` diretamente (bypassa schedule)
  - Mostra resultado (modal com summary da execução)
  - **Depends on**: 3.5, 10.1
  - **Requirement**: FR-002

- [x] 13.3 [P] Implementar migration de regras existentes
  - Script SQL para migrar regras de `google_ads_automation_rules` → `automation_rules`
  - Converter schema antigo (single action, flat scope, simple conditions) para novo formato (multi-task, array-of-arrays filters)
  - Manter referências de execution history
  - Testar migration com subset de dados de produção antes de aplicar
  - Pode ser executado manualmente quando pronto
  - **Depends on**: 3.7
  - **Requirement**: None (migration)

- [ ] 13.4 Testes end-to-end do fluxo completo
  - Criar regra Meta (stop loss: gasto > 50, 0 purchases → pausar)
  - Criar regra Google (scale: ROAS > 3 → increase budget 20%)
  - Preview de ambas
  - Ativar e verificar que cron executa no intervalo correto
  - Verificar logs com snapshot de métricas
  - Verificar notificação por email
  - Verificar frequency cap respeitado
  - **Depends on**: All previous phases
  - **Requirement**: SC-001 through SC-010

---

## Notes

- `[P]` indica tasks que podem ser paralelizadas com outras marcadas `[P]` no mesmo phase
- A **referência técnica completa** para métricas, campos filtráveis, operadores e exemplos está em [`reference-spec-automacao-completa-v3.md`](./reference-spec-automacao-completa-v3.md)
- A **referência de UX** para o builder visual é [bir.ch (Revealbot)](https://bir.ch)
- Tasks de **Phase 11 e 12** (Custom Metrics e Attribution) são P3 e podem ser implementadas após o MVP
- O sistema existente (`google_ads_automation_rules` + `AutomationRunnerJob`) continuará funcionando durante e após a implementação — a migração é opcional e gradual
