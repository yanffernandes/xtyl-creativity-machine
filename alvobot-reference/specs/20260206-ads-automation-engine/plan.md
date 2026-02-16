# Implementation Plan: Ads Automation Engine

**Branch**: `20260206-ads-automation-engine` | **Date**: 2026-02-06 | **Spec**: [spec.md](./spec.md)

## Summary

Motor de automação unificado para Meta Ads e Google Ads. Estende a implementação existente de automação Google Ads (CRUD, condition evaluation, action execution, cooldowns, cron scheduler) para suportar Meta Ads, novos tipos de condição/ação, schedule avançado, notificações por email (Resend) e métricas customizadas. A UI segue padrões do [bir.ch (Revealbot)](https://bir.ch).

## Technical Context

**Language/Version**: TypeScript 5.x (NestJS 10.x backend, React 18 frontend)  
**Primary Dependencies**: NestJS, React, TanStack Query v5, Zustand, Zod, React Hook Form, Resend  
**Storage**: Supabase PostgreSQL + Row Level Security  
**Target Platform**: Web application (SPA)  
**Performance Goals**: 50+ regras ativas simultâneas, preview < 30s, notificação < 5min  
**Constraints**: Respeitar rate limits das APIs (Meta: 200/h per account, Google: 1500/day per MCC)  
**Scale/Scope**: Multi-workspace, ~100 regras por workspace, ~5 contas por regra

---

## Architecture Decision: Extend, Not Rewrite

### O que já existe (preservar):

| Camada | Componente | Status | Reuso |
|--------|-----------|--------|-------|
| DB | `google_ads_automation_rules` | Completo | Manter como-está (backward compat) |
| DB | `google_ads_action_logs` | Completo | Manter |
| DB | `google_ads_automation_executions` | Completo | Manter |
| DB | `meta_action_logs` | Completo | Manter |
| Backend | `GoogleAutomationService` (~1470 linhas) | Completo | Extrair lógica reutilizável |
| Backend | `GoogleAutomationController` | Completo | Manter (Google-specific endpoints) |
| Backend | `AutomationRunnerJob` | Completo | Estender para multi-platform |
| Backend | `EmailService` (Resend) | Completo | Estender com templates de automação |
| Backend | `MetaDashboardService` | Completo | Reusar para ações Meta |
| Backend | `CircuitBreakerService` | Completo | Reusar |
| Frontend | `ConditionBuilder` + `useConditionBuilder` | Completo | Estender com novos tipos |
| Frontend | `ads-unified` adapters | Parcial | Completar MetaAdsAdapter |
| Frontend | `AdsAutomationsPage` / `AdsHistoryPage` | Completo | Estender |

### O que precisa ser construído:

| Camada | Componente | Tipo | Prioridade |
|--------|-----------|------|------------|
| DB | `automation_rules` (tabela unificada) | Novo | P1 |
| DB | `automation_executions` (unificada) | Novo | P1 |
| DB | `automation_execution_logs` (unificada) | Novo | P1 |
| DB | `custom_metrics` | Novo | P3 |
| Backend | `AutomationModule` (novo módulo) | Novo | P1 |
| Backend | `AutomationEngineService` | Novo | P1 |
| Backend | `AutomationCrudService` | Novo | P1 |
| Backend | `AutomationController` | Novo | P1 |
| Backend | `PlatformAdapter` interface + impls | Novo | P1 |
| Backend | `ConditionEvaluator` | Novo | P1 |
| Backend | `FilterEvaluator` | Novo | P1 |
| Backend | `ActionExecutor` | Novo | P1 |
| Backend | `ScheduleEvaluator` | Novo | P2 |
| Backend | `NotificationService` (extensão) | Novo | P2 |
| Backend | `CustomMetricEvaluator` | Novo | P3 |
| Frontend | `FilterBuilder` component | Novo | P1 |
| Frontend | `AutomationWizard` (form multi-step) | Novo | P1 |
| Frontend | Extensão `ConditionBuilder` | Extensão | P1 |
| Frontend | `ActionConfigurator` component | Novo | P1 |
| Frontend | `ScheduleConfigurator` component | Novo | P2 |
| Frontend | `NotificationConfigurator` component | Novo | P2 |
| Frontend | `CustomMetricBuilder` component | Novo | P3 |

---

## Database Strategy

### Nova tabela unificada: `automation_rules`

**Justificativa**: A tabela existente `google_ads_automation_rules` tem schema limitado (single action, flat scope filters, simple schedule). O spec exige um schema fundamentalmente diferente (multi-task com conditions por task, array-of-arrays filters, schedule com custom slots). Criar tabela nova e migrar gradualmente.

```sql
CREATE TABLE automation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES workspaces(id),
  
  -- Identity
  name VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'draft'
    CHECK (status IN ('active', 'paused', 'draft')),
  
  -- Platform config
  platform VARCHAR(10) NOT NULL CHECK (platform IN ('meta', 'google')),
  connection_ids UUID[] NOT NULL, -- Array de connection IDs
  ad_account_ids TEXT[], -- Meta: act_xxx, Google: 123-456-7890
  google_campaign_type VARCHAR(30), -- Obrigatório quando platform='google'
  
  -- Rule config
  level VARCHAR(20) NOT NULL
    CHECK (level IN ('campaign', 'adset', 'ad_group', 'ad', 'keyword', 'ad_account')),
  
  -- Filters: Array-of-arrays (OR of ANDs)
  filters JSONB NOT NULL DEFAULT '[]',
  -- Schema: [[{field, operator, value, period?}, ...AND...], ...OR...]
  
  -- Tasks: Array de ações com condições individuais
  tasks JSONB NOT NULL DEFAULT '[]',
  -- Schema: [{action, params, frequency_cap, conditions: {operator, conditions: [...]}}]
  
  -- Schedule
  schedule JSONB NOT NULL DEFAULT '{"type": "frequency", "check_interval": "1_hour"}',
  -- Schema: {type, check_interval?, custom_slots?, date_range?, run_once?}
  timezone VARCHAR(50) NOT NULL DEFAULT 'America/Sao_Paulo',
  
  -- Attribution
  attribution JSONB DEFAULT '{"use_entity_setting": true}',
  
  -- Notifications
  notifications JSONB DEFAULT '{}',
  -- Schema: {emails[], notify_on_action, notify_on_error, ...}
  
  -- Execution tracking
  last_run_at TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_automation_rules_user ON automation_rules(user_id);
CREATE INDEX idx_automation_rules_workspace ON automation_rules(workspace_id);
CREATE INDEX idx_automation_rules_platform ON automation_rules(platform);
CREATE INDEX idx_automation_rules_active ON automation_rules(status) WHERE status = 'active';
CREATE INDEX idx_automation_rules_next_run ON automation_rules(next_run_at) WHERE status = 'active';
```

### `automation_executions` — Frequency cap tracking

```sql
CREATE TABLE automation_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id UUID NOT NULL REFERENCES automation_rules(id) ON DELETE CASCADE,
  task_index INTEGER NOT NULL, -- Qual task dentro da regra
  entity_id TEXT NOT NULL, -- Campaign/AdSet/Ad/Keyword ID
  entity_platform VARCHAR(10) NOT NULL,
  execution_count INTEGER NOT NULL DEFAULT 1,
  first_execution_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_execution_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(rule_id, task_index, entity_id)
);
```

### `automation_execution_logs` — Histórico imutável

```sql
CREATE TABLE automation_execution_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id UUID NOT NULL REFERENCES automation_rules(id) ON DELETE SET NULL,
  user_id UUID NOT NULL,
  workspace_id UUID,
  
  -- Execution summary
  status VARCHAR(20) NOT NULL
    CHECK (status IN ('completed', 'partial', 'failed', 'skipped', 'rate_limited')),
  executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  duration_ms INTEGER,
  
  -- Counters
  entities_evaluated INTEGER NOT NULL DEFAULT 0,
  entities_matched_filters INTEGER NOT NULL DEFAULT 0,
  entities_matched_conditions INTEGER NOT NULL DEFAULT 0,
  entities_affected INTEGER NOT NULL DEFAULT 0,
  entities_skipped_cap INTEGER NOT NULL DEFAULT 0,
  errors_count INTEGER NOT NULL DEFAULT 0,
  
  -- Detalhes (JSONB para flexibilidade)
  affected_entities JSONB DEFAULT '[]',
  -- Schema: [{entity_id, entity_name, entity_type, task_index, action, params, 
  --           previous_value, new_value, metrics_snapshot, status, error?}]
  
  errors JSONB DEFAULT '[]',
  
  -- Notification tracking
  notifications_sent JSONB DEFAULT '{}',
  
  -- Rule snapshot (para auditoria mesmo se regra for editada)
  rule_snapshot JSONB
);

-- Indexes
CREATE INDEX idx_exec_logs_rule ON automation_execution_logs(rule_id);
CREATE INDEX idx_exec_logs_user ON automation_execution_logs(user_id);
CREATE INDEX idx_exec_logs_date ON automation_execution_logs(executed_at DESC);
CREATE INDEX idx_exec_logs_status ON automation_execution_logs(status);
```

### `custom_metrics` — Métricas customizadas (P3)

```sql
CREATE TABLE custom_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES workspaces(id),
  
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(50) NOT NULL,
  platform VARCHAR(10) NOT NULL CHECK (platform IN ('meta', 'google', 'both')),
  
  formula JSONB NOT NULL,
  -- Schema: {operation: 'add'|'subtract'|'multiply'|'divide'|'percentage',
  --          operands: [{type: 'metric'|'number'|'custom_metric', value: string|number}]}
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(workspace_id, slug)
);
```

### RLS Policies

Todas as tabelas seguem o padrão workspace-aware:

```sql
-- automation_rules: workspace members podem ver, apenas criador pode editar
CREATE POLICY "workspace_view" ON automation_rules FOR SELECT USING (
  user_id = auth.uid() OR workspace_id IN (
    SELECT workspace_id FROM workspace_members
    WHERE user_id = auth.uid() AND status = 'active'
  )
);
CREATE POLICY "owner_insert" ON automation_rules FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "owner_update" ON automation_rules FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "owner_delete" ON automation_rules FOR DELETE USING (user_id = auth.uid());
```

---

## Backend Architecture

### Novo módulo: `backend/src/modules/automation/`

```text
backend/src/modules/automation/
├── automation.module.ts
├── automation.controller.ts        -- REST API unificada
├── services/
│   ├── automation-crud.service.ts  -- CRUD de regras
│   ├── automation-engine.service.ts -- Orquestração de execução
│   ├── condition-evaluator.service.ts -- Avaliação de condições (5 tipos)
│   ├── filter-evaluator.service.ts -- Avaliação de filtros (array-of-arrays)
│   ├── action-executor.service.ts  -- Despacho de ações (17 tipos)
│   ├── schedule-evaluator.service.ts -- Cálculo de next_run_at
│   ├── notification.service.ts     -- Envio de emails via Resend
│   └── custom-metric.service.ts    -- Cálculo de métricas customizadas
├── adapters/
│   ├── platform-adapter.interface.ts -- Interface genérica
│   ├── google-automation.adapter.ts  -- Implementação Google
│   └── meta-automation.adapter.ts    -- Implementação Meta
├── dto/
│   ├── automation-rule.dto.ts      -- DTOs com class-validator
│   ├── condition.dto.ts            -- ConditionTree types
│   ├── filter.dto.ts               -- Filter types
│   ├── task.dto.ts                 -- Task/Action types
│   ├── schedule.dto.ts             -- Schedule types
│   └── execution-log.dto.ts        -- Log response types
├── entities/
│   ├── automation-rule.entity.ts
│   └── execution-log.entity.ts
└── constants/
    ├── metrics.ts                  -- Métricas por plataforma
    ├── actions.ts                  -- Ações por plataforma/nível
    ├── filters.ts                  -- Campos filtráveis por plataforma
    └── enums.ts                    -- Status, operators, periods
```

### Platform Adapter Interface

```typescript
interface PlatformAutomationAdapter {
  platform: 'google' | 'meta';
  
  // Buscar entidades do nível especificado
  fetchEntities(
    connectionId: string,
    level: EntityLevel,
    filters: FilterGroup[],
    period: string,
    attribution?: AttributionConfig,
  ): Promise<PlatformEntity[]>;
  
  // Executar ação numa entidade
  executeAction(
    connectionId: string,
    entity: PlatformEntity,
    action: ActionConfig,
    userId: string,
  ): Promise<ActionResult>;
  
  // Verificar se conexão está saudável
  checkConnection(connectionId: string): Promise<ConnectionHealth>;
  
  // Extrair valor de métrica de uma entidade
  getMetricValue(entity: PlatformEntity, metric: string, period: string): number;
}
```

**Google Adapter**: Delega para `GoogleDashboardService` e `GoogleAdsApiService` existentes.
**Meta Adapter**: Delega para `MetaDashboardService` existente (que já tem pause/enable/updateBudget + getCampaigns com filtros).

### Automation Engine Flow

```
AutomationRunnerJob (cron every minute)
  │
  ├─ Query active rules WHERE next_run_at <= NOW()
  │
  └─ For each rule:
      │
      ├─ Resolve PlatformAdapter (google/meta)
      ├─ Check connection health (circuit breaker)
      │
      ├─ PHASE 1: FETCH — adapter.fetchEntities(level, filters, period)
      │   └─ Returns PlatformEntity[] (max 2000)
      │
      ├─ PHASE 2: EVALUATE — For each entity, for each task:
      │   ├─ conditionEvaluator.evaluate(task.conditions, entity)
      │   ├─ Check frequency cap (automation_executions)
      │   └─ If match → add to execution queue
      │
      ├─ PHASE 3: EXECUTE — For each queued entity+task:
      │   ├─ adapter.executeAction(entity, task.action, task.params)
      │   ├─ Record in automation_executions (frequency cap tracking)
      │   └─ Collect results for log
      │
      ├─ PHASE 4: LOG — automation_execution_logs INSERT
      │
      ├─ PHASE 5: NOTIFY — If configured, send email via Resend
      │
      └─ Update rule.next_run_at via scheduleEvaluator
```

### Condition Evaluator — 5 Tipos

```typescript
class ConditionEvaluatorService {
  evaluate(conditionGroup: ConditionGroup, entity: PlatformEntity, allEntities?: PlatformEntity[]): boolean {
    // Recursive AND/OR tree walker (reusar lógica existente)
  }
  
  private evaluateLeaf(condition: Condition, entity: PlatformEntity, allEntities?: PlatformEntity[]): boolean {
    switch (condition.type) {
      case 'simple':
        // metric op value (existente)
        return this.evaluateSimple(condition, entity);
      case 'metric_comparison':
        // metric_period op compare_metric_period * multiplier
        return this.evaluateMetricComparison(condition, entity);
      case 'ranking':
        // top/bottom N/N% por metric
        return this.evaluateRanking(condition, entity, allEntities);
      case 'time':
        // Horário atual vs range
        return this.evaluateTime(condition, entity);
      case 'lifecycle':
        // hours/days since creation
        return this.evaluateLifecycle(condition, entity);
    }
  }
}
```

**Nota sobre `ranking`**: Requer acesso a `allEntities` para calcular posição relativa. O engine passa o array completo de entidades ao evaluator quando há condições de ranking.

### Filter Evaluator — Array-of-Arrays

```typescript
class FilterEvaluatorService {
  // Filters: [[AND group 1], [AND group 2]] → OR between groups
  matchesFilters(entity: PlatformEntity, filters: FilterGroup[]): boolean {
    if (filters.length === 0) return true;
    // OR: any group matches
    return filters.some(group => 
      // AND: all filters in group match
      group.every(filter => this.matchesSingleFilter(entity, filter))
    );
  }
  
  private matchesSingleFilter(entity: PlatformEntity, filter: Filter): boolean {
    const fieldValue = this.getFieldValue(entity, filter.field);
    switch (filter.operator) {
      case 'EQUAL': return fieldValue === filter.value;
      case 'CONTAIN': return String(fieldValue).includes(String(filter.value));
      case 'REGEX': return new RegExp(String(filter.value)).test(String(fieldValue));
      case 'IN': return Array.isArray(filter.value) && filter.value.includes(fieldValue);
      case 'BETWEEN': return fieldValue >= filter.value[0] && fieldValue <= filter.value[1];
      // ... all 14 operators
    }
  }
  
  // Cross-level: "campaign.name" quando rule level é "adset"
  private getFieldValue(entity: PlatformEntity, field: string): unknown {
    const [level, prop] = field.split('.');
    if (level === 'metrics') return entity.metrics[prop];
    if (level === entity.level) return entity[prop];
    // Cross-level: buscar do parent
    return entity.parentData?.[level]?.[prop];
  }
}
```

### Action Executor — 16 Tipos

```typescript
class ActionExecutorService {
  async execute(
    adapter: PlatformAutomationAdapter,
    entity: PlatformEntity,
    task: Task,
    connectionId: string,
    userId: string,
  ): Promise<ActionResult> {
    const { action, params } = task;
    
    switch (action) {
      // Status
      case 'pause': return adapter.executeAction(connectionId, entity, { action: 'pause' }, userId);
      case 'start': return adapter.executeAction(connectionId, entity, { action: 'enable' }, userId);
      
      // Budget (com cálculo de min/max)
      case 'increase_budget':
      case 'decrease_budget':
      case 'set_budget':
        return this.executeBudgetAction(adapter, entity, action, params, connectionId, userId);
      
      case 'scale_budget_by_target':
        return this.executeScaleBudget(adapter, entity, params, connectionId, userId);
      
      // Bid
      case 'increase_bid':
      case 'decrease_bid':
      case 'set_bid':
        return this.executeBidAction(adapter, entity, action, params, connectionId, userId);
      
      case 'set_bid_strategy':
        return this.executeBidStrategy(adapter, entity, params, connectionId, userId);
      
      // Name
      case 'add_to_name':
      case 'remove_from_name':
      case 'replace_in_name':
        return this.executeNameAction(adapter, entity, action, params, connectionId, userId);
      
      // Creation
      case 'duplicate':
        return this.executeDuplicate(adapter, entity, params, connectionId, userId);
      
      // Meta
      case 'extend_end_date':
        return this.executeExtendDate(adapter, entity, params, connectionId, userId);
      
      // Notification (não executa na plataforma, apenas envia email)
      case 'notify':
        return { success: true, action: 'notify', requiresNotification: true };
    }
  }
}
```

### Schedule Evaluator

```typescript
class ScheduleEvaluatorService {
  calculateNextRun(schedule: Schedule, timezone: string, now?: Date): Date | null {
    if (schedule.run_once && lastRunAt) return null; // já executou
    
    if (schedule.date_range?.end && now > schedule.date_range.end) return null; // expirou
    
    if (schedule.type === 'frequency') {
      return addInterval(now, schedule.check_interval);
    }
    
    if (schedule.type === 'custom') {
      return findNextCustomSlot(schedule.custom_slots, timezone, now);
    }
  }
  
  isDue(rule: AutomationRule, now?: Date): boolean {
    return rule.next_run_at && rule.next_run_at <= (now || new Date());
  }
}
```

### Notification Service (Extensão do EmailService)

```typescript
class AutomationNotificationService {
  constructor(private emailService: EmailService) {}
  
  async sendExecutionNotification(
    rule: AutomationRule,
    log: ExecutionLog,
    config: NotificationConfig,
  ): Promise<void> {
    if (!config.emails?.length) return;
    
    const shouldNotify = 
      (config.notify_on_action && log.entities_affected > 0) ||
      (config.notify_on_error && log.errors_count > 0) ||
      (config.notify_on_no_match && log.entities_affected === 0);
    
    if (!shouldNotify) return;
    
    const subject = this.replacePlaceholders(config.custom_subject || defaultSubject, rule, log);
    const html = this.renderTemplate(rule, log, config);
    
    for (const email of config.emails) {
      await this.emailService.sendEmail({ to: email, subject, html });
    }
  }
}
```

### API Endpoints (Novo Controller)

| Method | Path | Purpose | Auth |
|--------|------|---------|------|
| `GET` | `/automations/rules` | Listar regras (filter by platform, status) | JWT |
| `GET` | `/automations/rules/:id` | Detalhe de regra | JWT |
| `POST` | `/automations/rules` | Criar regra | JWT |
| `PATCH` | `/automations/rules/:id` | Atualizar regra | JWT |
| `DELETE` | `/automations/rules/:id` | Excluir regra | JWT |
| `POST` | `/automations/rules/:id/toggle` | Toggle active/paused | JWT |
| `POST` | `/automations/rules/:id/preview` | Preview (dry-run) | JWT |
| `POST` | `/automations/rules/:id/execute` | Execução manual | JWT |
| `GET` | `/automations/logs` | Histórico de execuções | JWT |
| `GET` | `/automations/logs/:id` | Detalhe de execução | JWT |
| `GET` | `/automations/metrics` | Métricas disponíveis por plataforma | JWT |
| `POST` | `/automations/custom-metrics` | Criar métrica customizada | JWT |
| `GET` | `/automations/custom-metrics` | Listar métricas customizadas | JWT |
| `DELETE` | `/automations/custom-metrics/:id` | Excluir métrica customizada | JWT |

---

## Frontend Architecture

### Localização dos componentes

```text
frontend/src/features/ads-unified/
├── pages/
│   ├── AdsAutomationsPage.tsx     -- ESTENDER (remover "em breve", integrar wizard)
│   └── AdsHistoryPage.tsx         -- ESTENDER (conectar com novos logs)
├── components/
│   ├── AutomationWizard/          -- NOVO: Form multi-step
│   │   ├── AutomationWizard.tsx
│   │   ├── AutomationWizard.module.css
│   │   ├── steps/
│   │   │   ├── PlatformStep.tsx   -- Plataforma + conta + nível
│   │   │   ├── FiltersStep.tsx    -- FilterBuilder
│   │   │   ├── TasksStep.tsx      -- Condições + Ações (multi-task)
│   │   │   ├── ScheduleStep.tsx   -- Agendamento + timezone
│   │   │   └── NotifyStep.tsx     -- Notificações
│   │   └── index.ts
│   ├── FilterBuilder/             -- NOVO: Filtros array-of-arrays
│   │   ├── FilterBuilder.tsx
│   │   ├── FilterGroup.tsx
│   │   ├── FilterRow.tsx
│   │   ├── FilterBuilder.module.css
│   │   └── index.ts
│   ├── ConditionBuilder/          -- NOVO (evolução do existente)
│   │   ├── ConditionBuilder.tsx
│   │   ├── ConditionGroup.tsx
│   │   ├── conditions/
│   │   │   ├── SimpleConditionRow.tsx
│   │   │   ├── MetricComparisonRow.tsx
│   │   │   ├── RankingConditionRow.tsx
│   │   │   ├── TimeConditionRow.tsx
│   │   │   └── LifecycleConditionRow.tsx
│   │   ├── ConditionBuilder.module.css
│   │   └── index.ts
│   ├── ActionConfigurator/        -- NOVO: Config de ação com params
│   │   ├── ActionConfigurator.tsx
│   │   ├── actions/
│   │   │   ├── BudgetAction.tsx
│   │   │   ├── BidAction.tsx
│   │   │   ├── StatusAction.tsx
│   │   │   ├── NameAction.tsx
│   │   │   ├── DuplicateAction.tsx
│   │   │   └── NotifyAction.tsx
│   │   └── index.ts
│   ├── ScheduleConfigurator/      -- NOVO: Schedule visual
│   │   ├── ScheduleConfigurator.tsx
│   │   ├── DaypartingGrid.tsx
│   │   └── index.ts
│   ├── RulePreviewModal/          -- NOVO: Preview/dry-run
│   └── ExecutionLogDetail/        -- NOVO: Detalhe de execução
├── hooks/
│   ├── useConditionBuilder.ts     -- NOVO (evolução do existente)
│   ├── useFilterBuilder.ts        -- NOVO
│   └── useAutomationForm.ts       -- NOVO (form state management)
├── api/
│   ├── automationQueries.ts       -- NOVO: React Query hooks
│   └── automationMutations.ts     -- NOVO: Mutations
├── types/
│   └── automation.ts              -- NOVO: Tipos da spec completa
└── constants/
    ├── metrics.ts                 -- Métricas por plataforma
    ├── actions.ts                 -- Ações por plataforma/nível
    ├── filters.ts                 -- Campos filtráveis
    ├── periods.ts                 -- Períodos disponíveis
    └── enums.ts                   -- Status, operators
```

### AutomationWizard — Multi-Step Form

5 steps seguindo o modelo bir.ch:

```
Step 1: PLATAFORMA & ESCOPO
┌─────────────────────────────────────┐
│  Plataforma: [Meta] [Google]        │
│  Conta(s):   [Select connections]   │
│  Campaign Type: [Search] (Google)   │
│  Nível:      [Campaign] [Ad Set]... │
└─────────────────────────────────────┘

Step 2: FILTROS
┌─────────────────────────────────────┐
│  Grupo 1 (AND):                     │
│    campaign.name NOT_CONTAIN [CBO]  │
│    campaign.status IN [ACTIVE]      │
│    + Adicionar filtro               │
│  ──── OU ────                       │
│  Grupo 2 (AND):                     │
│    campaign.name CONTAIN [Scale]    │
│    + Adicionar filtro               │
│  + Adicionar grupo (OR)             │
└─────────────────────────────────────┘

Step 3: TASKS (Condições + Ações)
┌─────────────────────────────────────┐
│  Task 1:                            │
│    SE: spend 3d > 50 E purchases = 0│
│    ENTÃO: Pausar                    │
│    Freq Cap: Uma vez na vida        │
│  ─────────────────────              │
│  Task 2:                            │
│    SE: spend 3d > 50 E purchases = 0│
│    ENTÃO: Adicionar "[STOP LOSS]"   │
│    Freq Cap: Uma vez na vida        │
│  + Adicionar Task                   │
└─────────────────────────────────────┘

Step 4: AGENDAMENTO
┌─────────────────────────────────────┐
│  Tipo: [Frequência] [Customizado]   │
│  Intervalo: [A cada 1 hora ▼]       │
│  Timezone: [America/Sao_Paulo ▼]    │
│  Período: [Sem limite] / [De-Até]   │
│  □ Executar apenas uma vez          │
└─────────────────────────────────────┘

Step 5: NOTIFICAÇÕES
┌─────────────────────────────────────┐
│  Emails: [gestor@empresa.com]       │
│  ☑ Notificar quando ação executada  │
│  ☑ Notificar quando ocorrer erro    │
│  □ Notificar quando nenhum match    │
│  Assunto: [Automação: {rule_name}]  │
└─────────────────────────────────────┘
```

### FilterBuilder — Visual Language

Seguindo a mesma linguagem visual do `ConditionBuilder` existente:

- **Grupos**: Cards com borda colorida (azul claro para AND)
- **OR connector**: Pill badge "OU" entre grupos
- **AND connector**: Pill badge "E" entre filtros do mesmo grupo
- **FilterRow**: `[Level ▼] [Field ▼] [Operator ▼] [Value input]`
- **Field dropdown**: Dinâmico baseado em platform + level selecionado
- **Operator dropdown**: Dinâmico baseado no tipo do field (string/number/enum)
- **Value input**: Polimórfico (text, number, select, multi-select) baseado no field

### Constants — Metadata-Driven UI

Toda a UI é data-driven por constantes que definem quais campos, operadores, métricas e ações estão disponíveis para cada combinação de plataforma/nível:

```typescript
// constants/metrics.ts
export const METRICS_BY_PLATFORM = {
  meta: [
    { slug: 'spend', label: 'Gasto', category: 'Financeiro', type: 'number' },
    { slug: 'impressions', label: 'Impressões', category: 'Entrega', type: 'number' },
    { slug: 'reach', label: 'Alcance', category: 'Entrega', type: 'number' },
    { slug: 'frequency', label: 'Frequência', category: 'Entrega', type: 'number' },
    // ... ~50 métricas (ver reference-spec-automacao-completa-v3.md seção 4.6)
  ],
  google: [
    { slug: 'cost', label: 'Custo', category: 'Financeiro', type: 'number' },
    { slug: 'impressions', label: 'Impressões', category: 'Entrega', type: 'number' },
    { slug: 'clicks', label: 'Cliques', category: 'Tráfego', type: 'number' },
    // ... ~30 métricas (ver reference-spec-automacao-completa-v3.md seção 4.7)
  ],
};

// constants/actions.ts
export const ACTIONS_BY_PLATFORM_LEVEL = {
  meta: {
    campaign: ['pause', 'start', 'increase_budget', 'decrease_budget',
               'set_budget', 'scale_budget_by_target', 'set_bid_strategy',
               'duplicate', 'add_to_name', 'remove_from_name', 'replace_in_name', 'notify'],
    adset: ['pause', 'start', 'increase_budget', 'decrease_budget',
            'set_budget', 'scale_budget_by_target', 'increase_bid', 'decrease_bid',
            'set_bid', 'duplicate', 'add_to_name', 'remove_from_name', 'replace_in_name', 'notify'],
    ad: ['pause', 'start', 'duplicate', 'add_to_name', 'remove_from_name',
         'replace_in_name', 'notify'],
  },
  google: {
    campaign: ['pause', 'start', 'increase_budget', 'decrease_budget', 'set_budget',
               'scale_budget_by_target', 'set_bid_strategy', 'extend_end_date',
               'add_to_name', 'remove_from_name', 'replace_in_name', 'notify'],
    // ... (ver reference-spec-automacao-completa-v3.md seção 5.3)
  },
};

// constants/filters.ts
export const FILTERABLE_FIELDS = {
  meta: {
    campaign: [
      { field: 'campaign.id', type: 'string', operators: ['EQUAL', 'NOT_EQUAL', 'IN', 'NOT_IN'] },
      { field: 'campaign.name', type: 'string', operators: ['EQUAL', 'CONTAIN', 'NOT_CONTAIN', 'START_WITH', 'END_WITH', 'REGEX'] },
      { field: 'campaign.status', type: 'enum', operators: ['EQUAL', 'NOT_EQUAL', 'IN', 'NOT_IN'], values: ['ACTIVE', 'PAUSED', 'DELETED', 'ARCHIVED'] },
      // ... (ver reference-spec-automacao-completa-v3.md seção 3.3)
    ],
    adset: [/* ... */],
    ad: [/* ... */],
  },
  google: {
    campaign: [/* ... seção 3.4 */],
    ad_group: [/* ... */],
    ad: [/* ... */],
    keyword: [/* ... */],
  },
};
```

---

## Migration Strategy

### Convivência com sistema existente

1. **Phase 1**: Nova tabela `automation_rules` + endpoints `/automations/*` criados
2. **Phase 2**: Frontend `AdsAutomationsPage` começa a usar novos endpoints
3. **Phase 3**: Migrar regras existentes de `google_ads_automation_rules` para `automation_rules` (script one-time)
4. **Phase 4**: Deprecar endpoints `/google/automations/*` antigos
5. **Phase 5**: Manter tabelas antigas como read-only para histórico

### Backward Compatibility

- O `AutomationRunnerJob` antigo continua rodando para regras na tabela antiga
- Um novo `UnifiedAutomationRunnerJob` roda para regras na nova tabela
- Ambos podem coexistir até a migração completa

---

## Error Handling & Resilience

### Rate Limiting

| Plataforma | Limite | Mitigação |
|-----------|--------|-----------|
| Meta Ads | 200 calls/hour per ad account | Batching de requests, jitter entre regras |
| Google Ads | 1500 requests/day per MCC | Priorizar regras por urgência |

### Circuit Breaker (existente)

Reusar `CircuitBreakerService`:
- **CLOSED** → Normal operation
- **OPEN** → 5 failures in 5 min → Skip automation for this connection
- **HALF_OPEN** → 15 min cooldown → Retry one request

### Retry Strategy

```typescript
const RETRY_CONFIG = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
  jitterMs: 500,
};
```

---

## Security Considerations

- **RLS**: Todas as tabelas com policies workspace-aware
- **JWT**: Todos os endpoints protegidos por `JwtAuthGuard`
- **Connection validation**: Verificar que o user tem acesso à connection antes de executar
- **Action audit**: Todas as ações logadas com snapshot de métricas para auditoria
- **Input validation**: class-validator com decoradores estritos no DTO
- **REGEX safety**: Timeout na avaliação de regex (ReDoS protection) via `safe-regex` ou timeout wrapper

---

## Project Structure (Source Code)

```text
backend/src/modules/automation/          -- NOVO módulo
├── automation.module.ts
├── automation.controller.ts
├── services/
│   ├── automation-crud.service.ts
│   ├── automation-engine.service.ts
│   ├── condition-evaluator.service.ts
│   ├── filter-evaluator.service.ts
│   ├── action-executor.service.ts
│   ├── schedule-evaluator.service.ts
│   ├── notification.service.ts
│   └── custom-metric.service.ts
├── adapters/
│   ├── platform-adapter.interface.ts
│   ├── google-automation.adapter.ts
│   └── meta-automation.adapter.ts
├── dto/
├── entities/
└── constants/

frontend/src/features/ads-unified/       -- ESTENDER feature existente
├── components/
│   ├── AutomationWizard/               -- NOVO
│   ├── FilterBuilder/                  -- NOVO
│   ├── ConditionBuilder/               -- NOVO (evolução)
│   ├── ActionConfigurator/             -- NOVO
│   ├── ScheduleConfigurator/           -- NOVO
│   ├── RulePreviewModal/               -- NOVO
│   └── ExecutionLogDetail/             -- NOVO
├── hooks/
├── api/
├── types/
└── constants/

supabase/migrations/
└── 20260206_automation_engine.sql       -- NOVA migration
```

**Structure Decision**: Web application com backend NestJS e frontend React SPA, estendendo a estrutura existente do projeto AlvoBot. Novo módulo `automation` no backend, componentes novos dentro da feature `ads-unified` no frontend.

---

## Complexity Tracking

| Decisão | Justificativa | Alternativa Rejeitada |
|---------|---------------|----------------------|
| Tabela unificada nova (`automation_rules`) em vez de estender a existente | Schema existente é fundamentalmente diferente (single action vs. multi-task, flat filters vs. array-of-arrays) | Alterar `google_ads_automation_rules` — quebraria backward compat e migração seria arriscada |
| Platform Adapter pattern | Permite adicionar plataformas futuras sem alterar engine | Monolítico com switch/case por plataforma — violaria OCP |
| Condition types como discriminated union | Cada tipo tem parâmetros diferentes que precisam de validação específica | Tipo único genérico com campos opcionais — validação ambígua |
| Multi-task por regra (em vez de single action) | Spec exige (ex: pausar + renomear na mesma regra com mesmas condições) | Uma ação por regra — limitante para casos como stop loss + rename |
| FilterBuilder novo (não estender ScopeFilters) | ScopeFilters é flat/fechado, spec exige array-of-arrays aberto com cross-level | Adapter sobre ScopeFilters — complexidade para mapear aberto→fechado seria maior que criar novo |
