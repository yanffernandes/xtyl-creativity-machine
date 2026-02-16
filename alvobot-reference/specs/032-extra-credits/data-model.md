# Data Model: Sistema de Créditos Extras

**Feature**: 031-extra-credits
**Date**: 2026-01-22

## 1. Alterações na Tabela `credit_transactions`

### Novos Campos

```sql
ALTER TABLE credit_transactions ADD COLUMN IF NOT EXISTS
  expires_at TIMESTAMPTZ DEFAULT NULL;

ALTER TABLE credit_transactions ADD COLUMN IF NOT EXISTS
  remaining_amount INT4 DEFAULT NULL;

ALTER TABLE credit_transactions ADD COLUMN IF NOT EXISTS
  source_type TEXT DEFAULT 'plan'
  CHECK (source_type IN ('plan', 'extra'));

ALTER TABLE credit_transactions ADD COLUMN IF NOT EXISTS
  added_by_admin_id UUID REFERENCES auth.users(id) DEFAULT NULL;
```

### Schema Atualizado

```sql
credit_transactions (
  -- Campos existentes
  id              BIGSERIAL PRIMARY KEY,
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  transaction_type TEXT NOT NULL,           -- 'credit', 'debit', 'adjustment'
  amount          INT4 NOT NULL,            -- Sempre positivo
  operation_type  TEXT NOT NULL,            -- 'bonus', 'refund', 'article', etc.
  operation_id    TEXT,                     -- Referência ao recurso
  activity_log_id BIGINT REFERENCES activity_logs(id),
  description     TEXT NOT NULL,
  billing_cycle_start DATE,
  billing_cycle_end DATE,
  balance_before  INT4,
  balance_after   INT4,
  metadata        JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ DEFAULT now(),

  -- NOVOS campos para créditos extras
  expires_at          TIMESTAMPTZ,          -- NULL = permanente
  remaining_amount    INT4,                 -- Saldo restante (para pacotes extras)
  source_type         TEXT DEFAULT 'plan',  -- 'plan' ou 'extra'
  added_by_admin_id   UUID REFERENCES auth.users(id)
)
```

### Novos Índices

```sql
-- Otimiza busca de créditos extras ativos
CREATE INDEX idx_credit_tx_extra_active ON credit_transactions
  (user_id, expires_at, remaining_amount)
  WHERE source_type = 'extra' AND remaining_amount > 0;

-- Otimiza ordenação FIFO
CREATE INDEX idx_credit_tx_fifo ON credit_transactions
  (user_id, expires_at NULLS LAST, created_at)
  WHERE source_type = 'extra' AND remaining_amount > 0;
```

---

## 2. Nova View: `user_credits_summary_v2`

```sql
CREATE OR REPLACE VIEW user_credits_summary_v2 AS
WITH user_billing AS (
  -- Ciclo de faturamento do plano ativo
  SELECT DISTINCT ON (t.user_id)
    t.user_id,
    p.monthly_credits AS plan_credits,
    CASE
      WHEN EXTRACT(day FROM t.timestamp_approved) <= EXTRACT(day FROM CURRENT_TIMESTAMP)
      THEN date_trunc('month', CURRENT_TIMESTAMP) + ((EXTRACT(day FROM t.timestamp_approved) - 1) || ' days')::interval
      ELSE date_trunc('month', CURRENT_TIMESTAMP - interval '1 month') + ((EXTRACT(day FROM t.timestamp_approved) - 1) || ' days')::interval
    END AS cycle_start,
    CASE
      WHEN EXTRACT(day FROM t.timestamp_approved) <= EXTRACT(day FROM CURRENT_TIMESTAMP)
      THEN date_trunc('month', CURRENT_TIMESTAMP + interval '1 month') + ((EXTRACT(day FROM t.timestamp_approved) - 1) || ' days')::interval
      ELSE date_trunc('month', CURRENT_TIMESTAMP) + ((EXTRACT(day FROM t.timestamp_approved) - 1) || ' days')::interval
    END AS cycle_end,
    (t.timestamp_approved + (t.duration || ' months')::interval) AS plan_expiration
  FROM transactions t
  JOIN plans p ON t.plan_id = p.id
  WHERE (t.status = 'completed' OR t.status = 'approved')
    AND t.timestamp_approved IS NOT NULL
    AND (t.timestamp_approved + (t.duration || ' months')::interval) >= CURRENT_TIMESTAMP
  ORDER BY t.user_id, t.timestamp_approved DESC
),

monthly_usage AS (
  -- Uso de créditos mensais no ciclo atual
  SELECT
    al.user_id,
    COALESCE(SUM(al.credits_consumed), 0)::INT AS total_used
  FROM activity_logs al
  JOIN user_billing ub ON al.user_id = ub.user_id
  WHERE al.created_at >= ub.cycle_start
    AND al.created_at < ub.cycle_end
    AND al.credits_consumed > 0
  GROUP BY al.user_id
),

extra_credits AS (
  -- Créditos extras disponíveis (não expirados, com saldo)
  SELECT
    ct.user_id,
    COALESCE(SUM(ct.remaining_amount), 0)::INT AS available,
    COUNT(*) FILTER (WHERE ct.expires_at IS NOT NULL AND ct.expires_at <= CURRENT_TIMESTAMP + interval '7 days') AS expiring_soon_count
  FROM credit_transactions ct
  WHERE ct.source_type = 'extra'
    AND ct.remaining_amount > 0
    AND (ct.expires_at IS NULL OR ct.expires_at > CURRENT_TIMESTAMP)
  GROUP BY ct.user_id
),

expired_credits AS (
  -- Créditos extras expirados (para histórico)
  SELECT
    ct.user_id,
    COALESCE(SUM(ct.remaining_amount), 0)::INT AS expired_amount
  FROM credit_transactions ct
  WHERE ct.source_type = 'extra'
    AND ct.remaining_amount > 0
    AND ct.expires_at IS NOT NULL
    AND ct.expires_at <= CURRENT_TIMESTAMP
  GROUP BY ct.user_id
)

SELECT
  u.id AS user_id,

  -- Créditos mensais
  COALESCE(ub.plan_credits, 0)::INT AS plan_monthly_credits,
  COALESCE(mu.total_used, 0)::INT AS monthly_credits_used,
  GREATEST(0, COALESCE(ub.plan_credits, 0) - COALESCE(mu.total_used, 0))::INT AS monthly_credits_remaining,

  -- Créditos extras
  COALESCE(ec.available, 0)::INT AS extra_credits_available,
  COALESCE(ec.expiring_soon_count, 0)::INT AS extra_credits_expiring_soon,
  COALESCE(exp.expired_amount, 0)::INT AS extra_credits_expired,

  -- Total combinado
  (GREATEST(0, COALESCE(ub.plan_credits, 0) - COALESCE(mu.total_used, 0)) + COALESCE(ec.available, 0))::INT AS total_credits_available,

  -- Ciclo e plano
  ub.cycle_start,
  ub.cycle_end,
  ub.plan_expiration,
  CASE WHEN ub.user_id IS NOT NULL THEN true ELSE false END AS has_active_plan

FROM auth.users u
LEFT JOIN user_billing ub ON u.id = ub.user_id
LEFT JOIN monthly_usage mu ON u.id = mu.user_id
LEFT JOIN extra_credits ec ON u.id = ec.user_id
LEFT JOIN expired_credits exp ON u.id = exp.user_id
WHERE u.deleted_at IS NULL;
```

---

## 3. Nova View: `user_extra_credits_packages`

```sql
CREATE OR REPLACE VIEW user_extra_credits_packages AS
SELECT
  ct.id AS package_id,
  ct.user_id,
  ct.amount AS original_amount,
  ct.remaining_amount,
  ct.description,
  ct.expires_at,
  ct.created_at,
  ct.added_by_admin_id,
  admin.raw_user_meta_data->>'full_name' AS added_by_admin_name,
  ct.metadata,

  -- Status calculado
  CASE
    WHEN ct.remaining_amount <= 0 THEN 'consumed'
    WHEN ct.expires_at IS NOT NULL AND ct.expires_at <= CURRENT_TIMESTAMP THEN 'expired'
    WHEN ct.expires_at IS NOT NULL AND ct.expires_at <= CURRENT_TIMESTAMP + interval '7 days' THEN 'expiring_soon'
    ELSE 'active'
  END AS status,

  -- Dias até expirar
  CASE
    WHEN ct.expires_at IS NULL THEN NULL
    ELSE EXTRACT(day FROM ct.expires_at - CURRENT_TIMESTAMP)::INT
  END AS days_until_expiry

FROM credit_transactions ct
LEFT JOIN auth.users admin ON ct.added_by_admin_id = admin.id
WHERE ct.source_type = 'extra'
  AND ct.transaction_type = 'credit'
ORDER BY ct.user_id, ct.expires_at NULLS LAST, ct.created_at;
```

---

## 4. Função: `add_extra_credits`

```sql
CREATE OR REPLACE FUNCTION add_extra_credits(
  p_user_id UUID,
  p_amount INT,
  p_description TEXT,
  p_expires_at TIMESTAMPTZ DEFAULT NULL,
  p_admin_id UUID DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
) RETURNS BIGINT AS $$
DECLARE
  v_transaction_id BIGINT;
  v_balance_before INT;
BEGIN
  -- Validações
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be positive';
  END IF;

  -- Obter saldo atual de extras
  SELECT COALESCE(SUM(remaining_amount), 0)
  INTO v_balance_before
  FROM credit_transactions
  WHERE user_id = p_user_id
    AND source_type = 'extra'
    AND remaining_amount > 0
    AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP);

  -- Inserir transação
  INSERT INTO credit_transactions (
    user_id,
    transaction_type,
    amount,
    operation_type,
    description,
    source_type,
    expires_at,
    remaining_amount,
    added_by_admin_id,
    balance_before,
    balance_after,
    metadata
  ) VALUES (
    p_user_id,
    'credit',
    p_amount,
    'bonus',
    p_description,
    'extra',
    p_expires_at,
    p_amount,  -- remaining = amount inicial
    p_admin_id,
    v_balance_before,
    v_balance_before + p_amount,
    p_metadata
  )
  RETURNING id INTO v_transaction_id;

  RETURN v_transaction_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## 5. Função: `consume_extra_credits_fifo`

```sql
CREATE OR REPLACE FUNCTION consume_extra_credits_fifo(
  p_user_id UUID,
  p_amount INT,
  p_operation_type TEXT,
  p_operation_id TEXT DEFAULT NULL
) RETURNS TABLE (
  package_id BIGINT,
  consumed_from_package INT
) AS $$
DECLARE
  v_remaining INT := p_amount;
  v_package RECORD;
  v_consume_amount INT;
BEGIN
  -- Iterar pacotes em ordem FIFO (por expiração, depois criação)
  FOR v_package IN
    SELECT id, remaining_amount, expires_at
    FROM credit_transactions
    WHERE user_id = p_user_id
      AND source_type = 'extra'
      AND remaining_amount > 0
      AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
    ORDER BY expires_at NULLS LAST, created_at
    FOR UPDATE  -- Lock para evitar race conditions
  LOOP
    EXIT WHEN v_remaining <= 0;

    v_consume_amount := LEAST(v_package.remaining_amount, v_remaining);

    -- Atualizar pacote
    UPDATE credit_transactions
    SET remaining_amount = remaining_amount - v_consume_amount
    WHERE id = v_package.id;

    -- Registrar consumo
    INSERT INTO credit_transactions (
      user_id,
      transaction_type,
      amount,
      operation_type,
      operation_id,
      description,
      source_type,
      metadata
    ) VALUES (
      p_user_id,
      'debit',
      v_consume_amount,
      p_operation_type,
      p_operation_id,
      'Consumo de créditos extras',
      'extra',
      jsonb_build_object('source_package_id', v_package.id)
    );

    v_remaining := v_remaining - v_consume_amount;

    -- Retornar info do consumo
    package_id := v_package.id;
    consumed_from_package := v_consume_amount;
    RETURN NEXT;
  END LOOP;

  IF v_remaining > 0 THEN
    RAISE EXCEPTION 'Insufficient extra credits';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## 6. RLS Policies

```sql
-- Usuários podem ver seus próprios créditos extras
CREATE POLICY extra_credits_select_own ON credit_transactions
  FOR SELECT
  USING (
    auth.uid() = user_id
    OR source_type = 'plan'  -- Transações de plano seguem regras existentes
  );

-- Apenas service_role pode inserir créditos extras
CREATE POLICY extra_credits_insert_admin ON credit_transactions
  FOR INSERT
  WITH CHECK (
    source_type = 'plan'
    OR (source_type = 'extra' AND current_setting('role') = 'service_role')
  );
```

---

## 7. Entidades TypeScript

### Frontend Types

```typescript
// features/subscription/types/index.ts

export interface ExtraCreditPackage {
  package_id: number
  user_id: string
  original_amount: number
  remaining_amount: number
  description: string
  expires_at: string | null
  created_at: string
  added_by_admin_name: string | null
  status: 'active' | 'expiring_soon' | 'expired' | 'consumed'
  days_until_expiry: number | null
}

export interface UserCreditsSummary {
  user_id: string

  // Mensais
  plan_monthly_credits: number
  monthly_credits_used: number
  monthly_credits_remaining: number

  // Extras
  extra_credits_available: number
  extra_credits_expiring_soon: number
  extra_credits_expired: number

  // Total
  total_credits_available: number

  // Ciclo
  cycle_start: string
  cycle_end: string
  has_active_plan: boolean
}
```

### Admin Types

```typescript
// features/admin/types/index.ts

export interface AddCreditsDto {
  user_id: string
  amount: number
  description: string
  expires_at?: string | null  // ISO date or null for permanent
}

export interface CreditsDashboardMetrics {
  total_extra_credits_distributed: number
  total_extra_credits_consumed: number
  total_extra_credits_available: number
  total_extra_credits_expired: number
  users_with_extra_credits: number
}
```

---

## 8. Diagrama de Relacionamentos

```
┌─────────────────┐     ┌──────────────────────┐
│   auth.users    │────<│  credit_transactions │
└─────────────────┘     └──────────────────────┘
        │                         │
        │                         │ source_type='extra'
        │                         ▼
        │               ┌──────────────────────────┐
        │               │ user_extra_credits_pkgs  │ (view)
        │               └──────────────────────────┘
        │
        ▼
┌─────────────────────────┐
│ user_credits_summary_v2 │ (view)
│   - monthly_remaining   │
│   - extra_available     │
│   - total_available     │
└─────────────────────────┘
```

---

## 9. Migração

```sql
-- 20260122_031_extra_credits.sql

-- 1. Adicionar novos campos
ALTER TABLE credit_transactions
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS remaining_amount INT4,
  ADD COLUMN IF NOT EXISTS source_type TEXT DEFAULT 'plan',
  ADD COLUMN IF NOT EXISTS added_by_admin_id UUID REFERENCES auth.users(id);

-- 2. Adicionar constraint
ALTER TABLE credit_transactions
  ADD CONSTRAINT credit_transactions_source_type_check
  CHECK (source_type IN ('plan', 'extra'));

-- 3. Criar índices
CREATE INDEX IF NOT EXISTS idx_credit_tx_extra_active ON credit_transactions
  (user_id, expires_at, remaining_amount)
  WHERE source_type = 'extra' AND remaining_amount > 0;

-- 4. Criar views (código acima)
-- 5. Criar funções (código acima)
-- 6. Atualizar RLS policies
```
