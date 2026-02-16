# Data Model: Ads Automation Engine

**Branch**: `20260206-ads-automation-engine` | **Date**: 2026-02-06

---

## Entity Relationship

```
┌──────────────────┐      ┌──────────────────────────┐
│  automation_rules │──1:N─│ automation_executions     │
│                  │      │ (frequency cap tracking)  │
│  - platform      │      │ - rule_id                 │
│  - level         │      │ - task_index              │
│  - filters[][]   │      │ - entity_id               │
│  - tasks[]       │      │ - execution_count         │
│  - schedule      │      │ - last_execution_at       │
│  - attribution   │      └──────────────────────────┘
│  - notifications │
│                  │      ┌──────────────────────────┐
│                  │──1:N─│ automation_execution_logs │
│                  │      │ (immutable audit trail)   │
│                  │      │ - status                  │
│                  │      │ - entities_affected       │
│                  │      │ - affected_entities[]     │
│                  │      │ - errors[]                │
│                  │      └──────────────────────────┘
└──────────────────┘
        │
        │ N:1
        ▼
┌──────────────────┐
│   connections    │  (tabela existente)
│   - provider     │
│   - access_token │
└──────────────────┘

┌──────────────────┐
│  custom_metrics  │  (standalone, referenciada por slug nas conditions)
│  - slug          │
│  - platform      │
│  - formula       │
└──────────────────┘
```

---

## TypeScript Types — Backend DTOs

### AutomationRule

```typescript
interface AutomationRule {
  id: string;
  userId: string;
  workspaceId?: string;
  
  name: string;
  description?: string;
  status: 'active' | 'paused' | 'draft';
  
  platform: 'meta' | 'google';
  connectionIds: string[];
  adAccountIds?: string[];
  googleCampaignType?: GoogleCampaignType;
  
  level: EntityLevel;
  filters: FilterGroup[];  // Array-of-arrays
  tasks: Task[];
  schedule: Schedule;
  timezone: string;
  attribution?: AttributionConfig;
  notifications?: NotificationConfig;
  
  lastRunAt?: string;
  nextRunAt?: string;
  createdAt: string;
  updatedAt: string;
}
```

### EntityLevel

```typescript
type EntityLevel = 
  | 'campaign' 
  | 'adset'      // Meta only
  | 'ad_group'   // Google only
  | 'ad' 
  | 'keyword'    // Google only
  | 'ad_account'; // Notify only
```

### GoogleCampaignType

```typescript
type GoogleCampaignType = 
  | 'search' 
  | 'display' 
  | 'shopping' 
  | 'app' 
  | 'performance_max' 
  | 'demand_gen';
```

---

## Filters

### FilterGroup (Array-of-Arrays)

```typescript
// OR between groups, AND within group
type FilterGroup = Filter[];

interface Filter {
  field: string;       // e.g. "campaign.name", "adset.status", "metrics.spend"
  operator: FilterOperator;
  value: string | number | string[] | number[];
  period?: Period;     // For metric filters
}

type FilterOperator =
  | 'EQUAL' | 'NOT_EQUAL'
  | 'CONTAIN' | 'NOT_CONTAIN'
  | 'START_WITH' | 'END_WITH'
  | 'REGEX'
  | 'IN' | 'NOT_IN'
  | 'GREATER_THAN' | 'GREATER_THAN_OR_EQUAL'
  | 'LESS_THAN' | 'LESS_THAN_OR_EQUAL'
  | 'BETWEEN';
```

### Filterable Fields

Campos organizados por `level.property`:

| Nível | Platform | Campo | Tipo | Exemplo |
|-------|----------|-------|------|---------|
| campaign | Meta | `campaign.id` | string | `"23851234567890"` |
| campaign | Meta | `campaign.name` | string | `"Scale"` |
| campaign | Meta | `campaign.effective_status` | enum | `"ACTIVE"` |
| campaign | Meta | `campaign.objective` | enum | `"OUTCOME_SALES"` |
| campaign | Meta | `campaign.bid_strategy` | enum | `"LOWEST_COST_WITHOUT_CAP"` |
| campaign | Meta | `campaign.daily_budget` | number | `100` |
| campaign | Google | `campaign.id` | string | `"123456789"` |
| campaign | Google | `campaign.name` | string | `"Brand"` |
| campaign | Google | `campaign.status` | enum | `"ENABLED"` |
| campaign | Google | `campaign.bidding_strategy_type` | enum | `"TARGET_CPA"` |
| campaign | Google | `campaign.budget_amount` | number | `50` |

> **Referência completa**: Seções 3.3 e 3.4 do [`reference-spec-automacao-completa-v3.md`](./reference-spec-automacao-completa-v3.md)

---

## Conditions (Gatilhos)

### ConditionGroup (Recursive Tree)

```typescript
interface ConditionGroup {
  operator: 'AND' | 'OR';
  conditions: Array<ConditionGroup | Condition>;
}

// Discriminated union on `type`
type Condition =
  | SimpleCondition
  | MetricComparisonCondition
  | RankingCondition
  | TimeCondition
  | LifecycleCondition;
```

### SimpleCondition — Métrica vs Valor Fixo

```typescript
interface SimpleCondition {
  type: 'simple';
  metric: string;      // slug da métrica (e.g. "spend", "purchase_roas")
  period: Period;
  operator: ConditionOperator;
  value: number;
}
```

### MetricComparisonCondition — Métrica vs Métrica

```typescript
interface MetricComparisonCondition {
  type: 'metric_comparison';
  metric: string;
  period: Period;
  operator: ConditionOperator;
  compareMetric: string;
  comparePeriod: Period;
  compareMultiplier: number;  // e.g. 0.7 = 70% do valor
}
```

### RankingCondition — Top/Bottom N ou %

```typescript
interface RankingCondition {
  type: 'ranking';
  metric: string;
  period: Period;
  position: 'top' | 'bottom';
  rankingType: 'quantity' | 'percentage';
  rankingValue: number;
  includeZeros: boolean;
}
```

### TimeCondition — Horário do Dia

```typescript
interface TimeCondition {
  type: 'time';
  operator: ConditionOperator;
  value: string;      // "08:00"
  valueEnd?: string;   // "22:00" (for BETWEEN)
}
```

### LifecycleCondition — Idade da Entidade

```typescript
interface LifecycleCondition {
  type: 'lifecycle';
  metric: 'hours_since_creation' | 'days_since_creation';
  operator: ConditionOperator;
  value: number;
}
```

### ConditionOperator

```typescript
type ConditionOperator =
  | 'GREATER_THAN'
  | 'GREATER_THAN_OR_EQUAL'
  | 'LESS_THAN'
  | 'LESS_THAN_OR_EQUAL'
  | 'EQUAL'
  | 'NOT_EQUAL'
  | 'BETWEEN';
```

### Period

```typescript
type Period =
  | 'current_hour' | 'previous_hour'
  | 'last_2_hours' | 'last_3_hours' | 'last_6_hours' | 'last_12_hours' | 'last_24_hours'
  | 'today' | 'yesterday'
  | 'last_2d' | 'last_3d' | 'last_3d_with_today'
  | 'last_7d' | 'last_7d_with_today'
  | 'last_14d' | 'last_14d_with_today'
  | 'last_30d' | 'last_30d_with_today'
  | 'this_week_mon' | 'this_week_sun' | 'last_week'
  | 'this_month' | 'last_month'
  | 'lifetime';
```

---

## Tasks (Ações)

### Task

```typescript
interface Task {
  action: ActionType;
  params: ActionParams;
  frequencyCap: FrequencyCap;
  conditions: ConditionGroup;  // Condições específicas desta task
}
```

### ActionType

```typescript
type ActionType =
  // Status
  | 'pause' | 'start' | 'extend_end_date'
  // Budget
  | 'increase_budget' | 'decrease_budget' | 'set_budget' | 'scale_budget_by_target'
  // Bid
  | 'increase_bid' | 'decrease_bid' | 'set_bid' | 'set_bid_strategy'
  // Creation
  | 'duplicate'
  // Naming
  | 'add_to_name' | 'remove_from_name' | 'replace_in_name'
  // Notification
  | 'notify';
```

### ActionParams (Union por ActionType)

```typescript
// Cada ação tem params específicos
interface BudgetChangeParams {
  changeType: 'percentage' | 'fixed';
  changeValue: number;
  minBudget?: number;
  maxBudget?: number;
}

interface SetBudgetParams {
  budgetValue: number;
  budgetType: 'daily' | 'lifetime';
}

interface ScaleBudgetParams {
  targetMetric: string;
  targetValue: number;
  targetPeriod: Period;
  scaleDirection: 'proportional' | 'aggressive' | 'conservative';
  minBudget?: number;
  maxBudget?: number;
}

interface DuplicateParams {
  originalAction: 'keep' | 'pause';
  nameSuffix?: string;
  appendNumber?: boolean;
  preserveSocialProof?: boolean;
  destinationCampaignId?: string;
  destinationAdsetId?: string;
}

interface NameActionParams {
  text: string;
  position?: 'prefix' | 'suffix';
  find?: string;
  replace?: string;
}

interface NotifyParams {
  message: string;
  includeMetrics?: string[];
  includeLink?: boolean;
}

// Params genérico como union
type ActionParams = 
  | Record<string, never>  // pause, start
  | BudgetChangeParams
  | SetBudgetParams
  | ScaleBudgetParams
  | DuplicateParams
  | NameActionParams
  | NotifyParams
  | { [key: string]: unknown }; // fallback para extensibilidade
```

### FrequencyCap

```typescript
type FrequencyCap =
  | 'no_limit'
  | 'once_per_hour' | 'once_per_2_hours' | 'once_per_4_hours'
  | 'once_per_6_hours' | 'once_per_8_hours' | 'once_per_12_hours'
  | 'once_per_day' | 'once_per_2_days' | 'once_per_3_days'
  | 'once_per_week'
  | 'once_in_lifetime';
```

---

## Schedule

```typescript
interface Schedule {
  type: 'frequency' | 'custom';
  checkInterval?: CheckInterval;   // When type='frequency'
  customSlots?: CustomSlot[];      // When type='custom'
  dateRange?: {
    start?: string;  // ISO 8601
    end?: string;
  };
  runOnce?: boolean;
}

type CheckInterval =
  | '15_minutes' | '30_minutes'
  | '1_hour' | '2_hours' | '3_hours' | '4_hours'
  | '6_hours' | '8_hours' | '12_hours'
  | '24_hours' | '48_hours' | '72_hours';

interface CustomSlot {
  day: 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';
  hours: number[];  // 0-23
}
```

---

## Attribution

```typescript
interface AttributionConfig {
  useEntitySetting: boolean;
  window?: MetaAttributionWindow | GoogleAttributionWindow;
}

type MetaAttributionWindow =
  | '1d_click' | '7d_click'
  | '1d_click_1d_view' | '7d_click_1d_view' | '28d_click_1d_view';

type GoogleAttributionWindow =
  | '30_days' | '60_days' | '90_days' | 'data_driven';
```

---

## Notifications

```typescript
interface NotificationConfig {
  emails: string[];
  notifyOnAction: boolean;
  notifyOnError: boolean;
  notifyOnNoMatch: boolean;
  includeSummary: boolean;
  includeEntityDetails: boolean;
  includeMetricsSnapshot: boolean;
  customSubject?: string;
}
```

---

## Execution Log

```typescript
interface ExecutionLog {
  id: string;
  ruleId: string;
  userId: string;
  workspaceId?: string;
  
  status: 'completed' | 'partial' | 'failed' | 'skipped' | 'rate_limited';
  executedAt: string;
  durationMs: number;
  
  summary: {
    entitiesEvaluated: number;
    entitiesMatchedFilters: number;
    entitiesMatchedConditions: number;
    entitiesAffected: number;
    entitiesSkippedCap: number;
    errorsCount: number;
  };
  
  affectedEntities: AffectedEntity[];
  errors: ExecutionError[];
  notificationsSent?: {
    emails: string[];
    sentAt: string;
  };
}

interface AffectedEntity {
  entityId: string;
  entityName: string;
  entityType: EntityLevel;
  taskIndex: number;
  actionExecuted: ActionType;
  actionParams: ActionParams;
  previousValue?: unknown;
  newValue?: unknown;
  metricsSnapshot: Record<string, number>;
  status: 'success' | 'failed' | 'skipped';
  error?: string;
}
```

---

## Custom Metric

```typescript
interface CustomMetric {
  id: string;
  userId: string;
  workspaceId?: string;
  name: string;
  slug: string;
  platform: 'meta' | 'google' | 'both';
  formula: Formula;
  createdAt: string;
  updatedAt: string;
}

interface Formula {
  operation: 'add' | 'subtract' | 'multiply' | 'divide' | 'percentage';
  operands: Operand[];
}

type Operand =
  | { type: 'metric'; value: string }       // slug de métrica nativa
  | { type: 'number'; value: number }        // valor fixo
  | { type: 'custom_metric'; value: string }; // slug de outra custom metric
```

---

## Platform Entity (Internal — Adapter Output)

```typescript
interface PlatformEntity {
  id: string;
  name: string;
  platform: 'meta' | 'google';
  level: EntityLevel;
  status: string;
  
  // Métricas por período
  metrics: Record<string, number>;
  
  // Dados do nível atual
  budget?: number;
  bid?: number;
  bidStrategy?: string;
  createdTime?: string;
  
  // Cross-level data (para filtros cross-level)
  parentData?: {
    campaign?: Record<string, unknown>;
    adset?: Record<string, unknown>;
    ad_group?: Record<string, unknown>;
  };
  
  // Raw platform data (para ações que precisam de dados específicos)
  rawData: unknown;
}
```
