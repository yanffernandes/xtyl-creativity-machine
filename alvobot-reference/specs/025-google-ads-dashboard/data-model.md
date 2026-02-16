# Data Model: Google Ads Performance Dashboard & Automation Engine

**Feature**: 025-google-ads-dashboard
**Date**: 2026-01-13

## Overview

Este modelo de dados segue a arquitetura stateless definida na especificação:
- **Métricas de campanhas**: Buscadas em tempo real da API do Google Ads (NÃO persistidas)
- **Automações e histórico**: Persistidos no Supabase com RLS por user_id

---

## Entities

### 1. google_ads_automation_rules (Supabase)

Regras de automação criadas pelos usuários.

```sql
CREATE TABLE google_ads_automation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  connection_id UUID NOT NULL REFERENCES google_connections(id) ON DELETE CASCADE,

  -- Identificação
  name VARCHAR(255) NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,

  -- Escopo (quais campanhas a automação afeta)
  scope_type VARCHAR(20) NOT NULL DEFAULT 'all', -- 'all' | 'filter'
  scope_filters JSONB, -- { nameContains: 'promo', status: 'ENABLED', minBudget: 50 }

  -- Condições (quando a automação dispara)
  conditions JSONB NOT NULL, -- ConditionGroup tree structure

  -- Ação (o que fazer quando condições são atendidas)
  action_type VARCHAR(50) NOT NULL, -- 'pause' | 'enable' | 'increase_budget' | 'decrease_budget' | 'increase_bid' | 'decrease_bid'
  action_value DECIMAL(10, 2), -- valor absoluto ou percentual
  action_value_type VARCHAR(20), -- 'absolute' | 'percentage'
  action_limit DECIMAL(10, 2), -- limite máximo (ex: não aumentar além de R$100)

  -- Controle de execução
  check_frequency_minutes INTEGER NOT NULL DEFAULT 60, -- frequência de verificação
  cooldown_minutes INTEGER NOT NULL DEFAULT 360, -- tempo mínimo entre execuções na mesma campanha
  max_executions INTEGER, -- null = ilimitado
  current_executions INTEGER NOT NULL DEFAULT 0,

  -- Metadata
  last_run_at TIMESTAMP WITH TIME ZONE,
  last_execution_at TIMESTAMP WITH TIME ZONE, -- última vez que executou uma ação
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_automation_rules_user_id ON google_ads_automation_rules(user_id);
CREATE INDEX idx_automation_rules_connection_id ON google_ads_automation_rules(connection_id);
CREATE INDEX idx_automation_rules_active ON google_ads_automation_rules(is_active) WHERE is_active = true;

-- RLS
ALTER TABLE google_ads_automation_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own automations"
  ON google_ads_automation_rules FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own automations"
  ON google_ads_automation_rules FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own automations"
  ON google_ads_automation_rules FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own automations"
  ON google_ads_automation_rules FOR DELETE
  USING (auth.uid() = user_id);
```

### 2. google_ads_action_logs (Supabase)

Histórico de todas as ações executadas (manuais e automáticas).

```sql
CREATE TABLE google_ads_action_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  connection_id UUID NOT NULL REFERENCES google_connections(id) ON DELETE CASCADE,

  -- Origem da ação
  source VARCHAR(20) NOT NULL, -- 'manual' | 'automation'
  automation_rule_id UUID REFERENCES google_ads_automation_rules(id) ON DELETE SET NULL,

  -- Alvo da ação
  google_campaign_id VARCHAR(50) NOT NULL, -- ID da campanha no Google Ads
  google_campaign_name VARCHAR(255), -- nome no momento da ação (snapshot)

  -- Detalhes da ação
  action_type VARCHAR(50) NOT NULL, -- 'pause' | 'enable' | 'update_budget' | 'duplicate' | 'increase_bid' | 'decrease_bid'
  action_details JSONB, -- { previousValue: 50, newValue: 75, ... }

  -- Resultado
  status VARCHAR(20) NOT NULL, -- 'success' | 'failed' | 'skipped'
  error_message TEXT,

  -- Contexto (snapshot das métricas no momento da ação)
  metrics_snapshot JSONB, -- { impressions: 1000, clicks: 50, ctr: 0.05, cost: 100, ... }

  -- Metadata
  executed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_action_logs_user_id ON google_ads_action_logs(user_id);
CREATE INDEX idx_action_logs_connection_id ON google_ads_action_logs(connection_id);
CREATE INDEX idx_action_logs_campaign_id ON google_ads_action_logs(google_campaign_id);
CREATE INDEX idx_action_logs_automation_rule_id ON google_ads_action_logs(automation_rule_id);
CREATE INDEX idx_action_logs_executed_at ON google_ads_action_logs(executed_at DESC);
CREATE INDEX idx_action_logs_source ON google_ads_action_logs(source);

-- RLS
ALTER TABLE google_ads_action_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own action logs"
  ON google_ads_action_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own action logs"
  ON google_ads_action_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Não permitir UPDATE ou DELETE (histórico é imutável)
```

### 3. google_ads_automation_executions (Supabase)

Rastreia execuções por campanha para controle de cooldown e limites.

```sql
CREATE TABLE google_ads_automation_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  automation_rule_id UUID NOT NULL REFERENCES google_ads_automation_rules(id) ON DELETE CASCADE,
  google_campaign_id VARCHAR(50) NOT NULL,

  -- Contador de execuções
  execution_count INTEGER NOT NULL DEFAULT 1,
  last_execution_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

  -- Constraint única para upsert
  UNIQUE(automation_rule_id, google_campaign_id)
);

-- Índice para lookup rápido
CREATE INDEX idx_automation_executions_lookup
  ON google_ads_automation_executions(automation_rule_id, google_campaign_id);

-- RLS (herda do automation_rule via join)
ALTER TABLE google_ads_automation_executions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage executions for own automations"
  ON google_ads_automation_executions FOR ALL
  USING (
    automation_rule_id IN (
      SELECT id FROM google_ads_automation_rules WHERE user_id = auth.uid()
    )
  );
```

---

## TypeScript Interfaces

### Condition Types

```typescript
// Estrutura de condições para automações
export type ConditionOperator = '>' | '<' | '>=' | '<=' | '==' | '!=';
export type LogicalOperator = 'AND' | 'OR';

export type MetricType =
  | 'impressions'
  | 'clicks'
  | 'ctr'
  | 'cost'
  | 'conversions'
  | 'cpa'
  | 'roas'
  | 'runtime_hours'
  | 'budget_spent_percent';

export type PeriodType = 'today' | 'last_24h' | 'last_7d' | 'last_30d';

export interface Condition {
  type: 'condition';
  metric: MetricType;
  operator: ConditionOperator;
  value: number;
  period?: PeriodType;
}

export interface ConditionGroup {
  type: 'group';
  operator: LogicalOperator;
  children: (ConditionGroup | Condition)[];
}

export type ConditionTree = ConditionGroup | Condition;
```

### Scope Filters

```typescript
export interface ScopeFilters {
  nameContains?: string;
  nameNotContains?: string;
  status?: 'ENABLED' | 'PAUSED';
  minBudget?: number;
  maxBudget?: number;
  campaignIds?: string[]; // lista específica de IDs
}
```

### Action Types

```typescript
export type ActionType =
  | 'pause'
  | 'enable'
  | 'increase_budget'
  | 'decrease_budget'
  | 'increase_bid'
  | 'decrease_bid';

export type ActionValueType = 'absolute' | 'percentage';

export interface ActionDetails {
  previousValue?: number;
  newValue?: number;
  changeAmount?: number;
  changePercent?: number;
}
```

### Full Entity Types

```typescript
export interface AutomationRule {
  id: string;
  user_id: string;
  connection_id: string;
  name: string;
  description?: string;
  is_active: boolean;
  scope_type: 'all' | 'filter';
  scope_filters?: ScopeFilters;
  conditions: ConditionTree;
  action_type: ActionType;
  action_value?: number;
  action_value_type?: ActionValueType;
  action_limit?: number;
  check_frequency_minutes: number;
  cooldown_minutes: number;
  max_executions?: number;
  current_executions: number;
  last_run_at?: string;
  last_execution_at?: string;
  created_at: string;
  updated_at: string;
}

export interface ActionLog {
  id: string;
  user_id: string;
  connection_id: string;
  source: 'manual' | 'automation';
  automation_rule_id?: string;
  google_campaign_id: string;
  google_campaign_name?: string;
  action_type: ActionType | 'duplicate';
  action_details?: ActionDetails;
  status: 'success' | 'failed' | 'skipped';
  error_message?: string;
  metrics_snapshot?: CampaignMetrics;
  executed_at: string;
  created_at: string;
}

export interface AutomationExecution {
  id: string;
  automation_rule_id: string;
  google_campaign_id: string;
  execution_count: number;
  last_execution_at: string;
}
```

### Campaign Metrics (from Google Ads API - not persisted)

```typescript
export interface CampaignMetrics {
  id: string;
  name: string;
  status: 'ENABLED' | 'PAUSED' | 'REMOVED';
  channelType: string;
  budget: number; // em reais
  budgetId: string;

  // Métricas
  impressions: number;
  clicks: number;
  ctr: number; // 0-1
  cost: number; // em reais
  conversions: number;
  conversionsValue: number;
  cpa: number; // custo por conversão
  roas: number; // return on ad spend

  // Calculados
  budgetSpentPercent: number; // % do orçamento gasto hoje
  runtimeHours?: number; // horas desde criação/ativação
}
```

---

## Entity Relationships

```
┌─────────────────────────────────────────────────────────────────┐
│                        auth.users                                │
│                           (Supabase Auth)                        │
└─────────────────────────────────────────────────────────────────┘
                                 │
                                 │ user_id
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                     google_connections                           │
│                        (EXISTING)                                │
└─────────────────────────────────────────────────────────────────┘
                                 │
                                 │ connection_id
                    ┌────────────┴────────────┐
                    ▼                         ▼
┌──────────────────────────────┐  ┌──────────────────────────────┐
│  google_ads_automation_rules │  │   google_ads_action_logs     │
│           (NEW)              │  │          (NEW)               │
└──────────────────────────────┘  └──────────────────────────────┘
                    │                         ▲
                    │ automation_rule_id      │ automation_rule_id (optional)
                    ▼                         │
┌──────────────────────────────┐              │
│google_ads_automation_executions│─────────────┘
│           (NEW)              │
└──────────────────────────────┘

                    ┌─────────────────────────────────────────────┐
                    │           Google Ads API                     │
                    │      (External - não persistido)            │
                    │                                             │
                    │  - Campaigns (id, name, status, budget)     │
                    │  - Metrics (impressions, clicks, cost...)   │
                    │  - AdGroups, Ads, Keywords (para duplicar)  │
                    └─────────────────────────────────────────────┘
```

---

## Validation Rules

### AutomationRule

| Field | Validation |
|-------|------------|
| name | Required, 1-255 chars |
| conditions | Required, valid ConditionTree JSON |
| action_type | Required, enum value |
| action_value | Required for increase/decrease actions |
| action_value_type | Required when action_value present |
| check_frequency_minutes | Min: 15, Default: 60 |
| cooldown_minutes | Min: 0, Default: 360 |
| max_executions | Optional, positive integer |

### Condition

| Field | Validation |
|-------|------------|
| metric | Required, valid MetricType enum |
| operator | Required, valid ConditionOperator enum |
| value | Required, number >= 0 |
| period | Optional, valid PeriodType enum |

### ActionLog

| Field | Validation |
|-------|------------|
| source | Required, 'manual' or 'automation' |
| google_campaign_id | Required, non-empty string |
| action_type | Required, valid enum |
| status | Required, 'success', 'failed', or 'skipped' |

---

## Migration Script

```sql
-- Migration: 20260113_google_ads_automations.sql

-- 1. Create automation_rules table
CREATE TABLE IF NOT EXISTS google_ads_automation_rules (
  -- ... (schema above)
);

-- 2. Create action_logs table
CREATE TABLE IF NOT EXISTS google_ads_action_logs (
  -- ... (schema above)
);

-- 3. Create automation_executions table
CREATE TABLE IF NOT EXISTS google_ads_automation_executions (
  -- ... (schema above)
);

-- 4. Create indexes
-- ... (indexes above)

-- 5. Enable RLS and create policies
-- ... (policies above)

-- 6. Create updated_at trigger for automation_rules
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_google_ads_automation_rules_updated_at
  BEFORE UPDATE ON google_ads_automation_rules
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```
