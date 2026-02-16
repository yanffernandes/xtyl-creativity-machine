# Research: Sistema de Créditos Extras

**Feature**: 031-extra-credits
**Date**: 2026-01-22

## 1. Estrutura Existente de Créditos

### Tabela `credit_transactions`

**Decisão**: Reutilizar tabela existente, adicionando campos para suportar créditos extras.

**Estrutura Atual**:
```sql
credit_transactions (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users,
  transaction_type TEXT NOT NULL,        -- 'debit', 'credit', 'adjustment'
  amount INT4 NOT NULL,
  operation_type TEXT NOT NULL,          -- 'article', 'bonus', 'refund', etc.
  operation_id TEXT,
  activity_log_id BIGINT REFERENCES activity_logs,
  description TEXT NOT NULL,
  billing_cycle_start DATE,
  billing_cycle_end DATE,
  balance_before INT4,
  balance_after INT4,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
)
```

**Campos Necessários para Créditos Extras**:
```sql
-- Novos campos a adicionar:
expires_at TIMESTAMPTZ,           -- NULL = permanente
remaining_amount INT4,            -- Saldo restante deste pacote
source_type TEXT,                 -- 'plan' ou 'extra'
added_by_admin_id UUID,           -- Admin que adicionou (para extras)
```

**Rationale**: A tabela já tem a estrutura base. Adicionar campos específicos é mais simples que criar nova tabela e mantém histórico unificado.

**Alternativas Rejeitadas**:
- Nova tabela `extra_credits`: Fragmentaria o histórico e complicaria queries de saldo
- Campo JSON para extras: Dificultaria queries e validações

---

### View `user_credits_summary`

**Decisão**: Atualizar view para incluir cálculo de créditos extras.

**Cálculo Atual**:
```sql
credits_remaining = plan_monthly_credits - SUM(activity_logs.credits_consumed)
```

**Cálculo Novo**:
```sql
-- Créditos mensais (reset por ciclo)
monthly_remaining = plan_monthly_credits - SUM(credits_consumed WHERE cycle)

-- Créditos extras (persistem entre ciclos)
extra_credits = SUM(remaining_amount)
  FROM credit_transactions
  WHERE source_type = 'extra'
    AND (expires_at IS NULL OR expires_at > NOW())

-- Total disponível
total_available = monthly_remaining + extra_credits
```

**Rationale**: View centraliza lógica de cálculo, evitando duplicação em queries do frontend.

---

## 2. Lógica de Consumo FIFO

### Decisão: Implementar via função PostgreSQL

**Algoritmo**:
```
1. Verificar saldo mensal disponível
2. Se mensal >= quantidade_consumir:
   - Debitar do mensal (via activity_logs.credits_consumed)
3. Senão:
   - Debitar todo o mensal
   - Calcular restante = quantidade - mensal
   - Buscar pacotes extras ordenados por expires_at ASC (NULL por último)
   - Para cada pacote:
     - Debitar min(restante, remaining_amount)
     - Atualizar remaining_amount do pacote
     - Se restante == 0, parar
```

**Implementação**:
```sql
CREATE OR REPLACE FUNCTION consume_credits(
  p_user_id UUID,
  p_amount INT,
  p_operation_type TEXT,
  p_operation_id TEXT DEFAULT NULL,
  p_description TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_monthly_remaining INT;
  v_extra_remaining INT;
  v_from_monthly INT;
  v_from_extra INT;
  v_result JSONB;
BEGIN
  -- Get current balances
  SELECT
    GREATEST(0, plan_monthly_credits - credits_used) as monthly,
    extra_credits_available
  INTO v_monthly_remaining, v_extra_remaining
  FROM user_credits_summary_v2
  WHERE user_id = p_user_id;

  -- Check total
  IF (v_monthly_remaining + v_extra_remaining) < p_amount THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient credits');
  END IF;

  -- Calculate split
  v_from_monthly := LEAST(v_monthly_remaining, p_amount);
  v_from_extra := p_amount - v_from_monthly;

  -- Consume monthly via activity_log
  IF v_from_monthly > 0 THEN
    INSERT INTO activity_logs (user_id, action_type, resource_type, credits_consumed, ...)
    VALUES (p_user_id, 'consume', p_operation_type, v_from_monthly, ...);
  END IF;

  -- Consume extra via FIFO
  IF v_from_extra > 0 THEN
    PERFORM consume_extra_credits_fifo(p_user_id, v_from_extra, p_operation_type, p_operation_id);
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'from_monthly', v_from_monthly,
    'from_extra', v_from_extra
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Rationale**: Função no banco garante atomicidade e evita race conditions.

**Alternativas Rejeitadas**:
- Lógica no backend: Risco de race conditions sem transações explícitas
- Trigger automático: Menos flexível para diferentes tipos de consumo

---

## 3. Padrões do Admin

### Decisão: Seguir padrão existente de mutations

**Padrão Identificado**:
```typescript
// 1. Mutation com invalidação de queries
export function useAddCredits() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: AddCreditsDto) => {
      const { error } = await supabase.from('credit_transactions').insert({...})
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'credits'] })
    },
  })
}

// 2. Log de auditoria separado
await logAction.mutateAsync({
  action: 'credits_add',
  resource_type: 'credits',
  resource_id: userId,
  details: { amount, reason, expires_at }
})
```

**Rationale**: Consistência com código existente facilita manutenção.

---

## 4. Interface do Usuário

### Decisão: Integrar na SubscriptionPage existente

**Localização**: Tab "Visão Geral" da página de assinatura

**Layout Proposto**:
```
┌─────────────────────────────────────────────────────┐
│ Seus Créditos                                       │
├─────────────────────────────────────────────────────┤
│ Créditos do Plano                                   │
│ ████████████░░░░ 150/200 (renova em 15 dias)        │
│                                                     │
│ Créditos Extras                    ▼ Ver detalhes   │
│ ████████████████ 500 disponíveis                    │
│                                                     │
│ ┌─────────────────────────────────────────────────┐ │
│ │ Pacote        Quantidade   Expira em           │ │
│ │ Cortesia      100          Nunca               │ │
│ │ Promoção      200          15/03/2026          │ │
│ │ Bônus         200          20/02/2026          │ │
│ └─────────────────────────────────────────────────┘ │
│                                                     │
│ Total Disponível: 650 créditos                      │
└─────────────────────────────────────────────────────┘
```

**Rationale**: Usuário já acessa assinatura para ver créditos. Adicionar seção é natural.

**Alternativas Rejeitadas**:
- Nova página separada: Fragmenta informação de créditos
- Sidebar widget: Ocupa espaço visual permanente

---

## 5. Expiração Automática

### Decisão: Verificação em tempo real na view, sem job

**Implementação**:
```sql
-- View já filtra automaticamente
SELECT SUM(remaining_amount)
FROM credit_transactions
WHERE source_type = 'extra'
  AND remaining_amount > 0
  AND (expires_at IS NULL OR expires_at > NOW())  -- Filtro automático
```

**Rationale**:
- View sempre retorna saldo correto em tempo real
- Sem necessidade de job de limpeza
- Créditos expirados ficam no histórico para auditoria

**Cleanup Opcional** (baixa prioridade):
```sql
-- Job mensal para marcar como expirados (apenas cosmético)
UPDATE credit_transactions
SET status = 'expired', remaining_amount = 0
WHERE expires_at < NOW() AND remaining_amount > 0;
```

---

## 6. Resumo de Decisões

| Área | Decisão | Justificativa |
|------|---------|---------------|
| Armazenamento | Reutilizar credit_transactions | Histórico unificado |
| Cálculo de saldo | View SQL atualizada | Centraliza lógica |
| Consumo FIFO | Função PostgreSQL | Atomicidade garantida |
| Admin UI | Padrão de mutations existente | Consistência |
| User UI | Seção na SubscriptionPage | Localização natural |
| Expiração | Filtro na view | Tempo real, sem job |

## 7. Riscos e Mitigações

| Risco | Impacto | Mitigação |
|-------|---------|-----------|
| Race condition no consumo | Alto | Função SQL com SECURITY DEFINER |
| Performance da view | Médio | Índices otimizados já existentes |
| Migração de dados | Baixo | Campos novos são opcionais (NULL) |
