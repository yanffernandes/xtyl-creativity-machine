# Quickstart: Sistema de Créditos Extras

**Feature**: 031-extra-credits
**Date**: 2026-01-22

## Overview

Este documento fornece um guia rápido para implementar o sistema de créditos extras no AlvoBot.

## Pré-requisitos

- Node.js 18+
- Acesso ao Supabase (local ou remoto)
- Branch `031-extra-credits` checked out

## 1. Migração do Banco de Dados

### Criar arquivo de migração

```bash
# Criar nova migração
touch supabase/migrations/20260122_031_extra_credits.sql
```

### Conteúdo da migração

```sql
-- Ver data-model.md para SQL completo
-- Resumo das alterações:

-- 1. Novos campos em credit_transactions
ALTER TABLE credit_transactions
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS remaining_amount INT4,
  ADD COLUMN IF NOT EXISTS source_type TEXT DEFAULT 'plan',
  ADD COLUMN IF NOT EXISTS added_by_admin_id UUID;

-- 2. Nova view user_credits_summary_v2
-- 3. Nova view user_extra_credits_packages
-- 4. Função add_extra_credits
-- 5. Função consume_extra_credits_fifo
```

### Aplicar migração

```bash
# Local
supabase db reset

# Produção (via Supabase Dashboard ou CLI)
supabase db push
```

## 2. Backend (NestJS)

### Criar módulo de créditos

```bash
cd backend
mkdir -p src/modules/credits/dto
```

### Estrutura de arquivos

```
src/modules/credits/
├── credits.module.ts
├── credits.controller.ts
├── credits.service.ts
└── dto/
    ├── add-credits.dto.ts
    └── credit-summary.dto.ts
```

### Exemplo: credits.service.ts

```typescript
import { Injectable } from '@nestjs/common'
import { SupabaseService } from '@/common/supabase/supabase.service'

@Injectable()
export class CreditsService {
  constructor(private readonly supabase: SupabaseService) {}

  async addCredits(dto: AddCreditsDto, adminId: string) {
    const { data, error } = await this.supabase.client
      .rpc('add_extra_credits', {
        p_user_id: dto.user_id,
        p_amount: dto.amount,
        p_description: dto.description,
        p_expires_at: dto.expires_at,
        p_admin_id: adminId,
      })

    if (error) throw new Error(error.message)
    return data
  }

  async getUserCredits(userId: string) {
    const { data, error } = await this.supabase.client
      .from('user_credits_summary_v2')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (error) throw new Error(error.message)
    return data
  }
}
```

### Registrar módulo

```typescript
// src/app.module.ts
import { CreditsModule } from './modules/credits/credits.module'

@Module({
  imports: [
    // ... outros módulos
    CreditsModule,
  ],
})
export class AppModule {}
```

## 3. Frontend (React)

### Adicionar tipos

```typescript
// frontend/src/features/subscription/types/index.ts

export interface ExtraCreditPackage {
  package_id: number
  original_amount: number
  remaining_amount: number
  description: string
  expires_at: string | null
  status: 'active' | 'expiring_soon' | 'expired' | 'consumed'
  days_until_expiry: number | null
}

export interface CreditsSummaryV2 {
  plan_monthly_credits: number
  monthly_credits_used: number
  monthly_credits_remaining: number
  extra_credits_available: number
  total_credits_available: number
  cycle_start: string
  cycle_end: string
}
```

### Adicionar queries

```typescript
// frontend/src/features/subscription/api/useSubscription.ts

export function useExtraCredits() {
  return useQuery({
    queryKey: ['credits', 'extra'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data, error } = await supabase
        .from('user_extra_credits_packages')
        .select('*')
        .eq('user_id', user.id)
        .in('status', ['active', 'expiring_soon'])
        .order('expires_at', { ascending: true, nullsFirst: false })

      if (error) throw error
      return data as ExtraCreditPackage[]
    },
  })
}

export function useCreditsSummaryV2() {
  return useQuery({
    queryKey: ['credits', 'summary', 'v2'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data, error } = await supabase
        .from('user_credits_summary_v2')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (error) throw error
      return data as CreditsSummaryV2
    },
  })
}
```

### Adicionar mutation (Admin)

```typescript
// frontend/src/features/admin/api/mutations.ts

export function useAddCredits() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: {
      user_id: string
      amount: number
      description: string
      expires_at?: string | null
    }) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data: result, error } = await supabase
        .rpc('add_extra_credits', {
          p_user_id: data.user_id,
          p_amount: data.amount,
          p_description: data.description,
          p_expires_at: data.expires_at || null,
          p_admin_id: user.id,
        })

      if (error) throw error
      return result
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'credits'] })
    },
  })
}
```

## 4. Componentes UI

### Modal de adicionar créditos (Admin)

```typescript
// frontend/src/features/admin/components/AddCreditsModal/index.tsx

export function AddCreditsModal({ user, isOpen, onClose }: Props) {
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [expiresAt, setExpiresAt] = useState<string | null>(null)

  const addCredits = useAddCredits()
  const logAction = useLogAdminAction()

  const handleSubmit = async () => {
    await addCredits.mutateAsync({
      user_id: user.id,
      amount: parseInt(amount),
      description,
      expires_at: expiresAt,
    })

    await logAction.mutateAsync({
      action: 'credits_add',
      resource_type: 'credits',
      resource_id: user.id,
      details: { amount, description, expires_at: expiresAt },
    })

    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Adicionar Créditos">
      {/* Form fields */}
    </Modal>
  )
}
```

### Seção de créditos extras (User)

```typescript
// frontend/src/features/subscription/components/ExtraCreditsSection/index.tsx

export function ExtraCreditsSection() {
  const { data: packages, isLoading } = useExtraCredits()
  const { data: summary } = useCreditsSummaryV2()

  if (isLoading) return <Spinner />

  return (
    <Card>
      <Card.Header>
        <h3>Créditos Extras</h3>
        <Badge>{summary?.extra_credits_available || 0} disponíveis</Badge>
      </Card.Header>
      <Card.Body>
        {packages?.length === 0 ? (
          <EmptyState message="Você não possui créditos extras" />
        ) : (
          <Table>
            {packages?.map(pkg => (
              <TableRow key={pkg.package_id}>
                <TableCell>{pkg.description}</TableCell>
                <TableCell>{pkg.remaining_amount}</TableCell>
                <TableCell>
                  {pkg.expires_at
                    ? `Expira em ${pkg.days_until_expiry} dias`
                    : 'Nunca expira'}
                </TableCell>
              </TableRow>
            ))}
          </Table>
        )}
      </Card.Body>
    </Card>
  )
}
```

## 5. Testes

### Teste de integração (consumo FIFO)

```typescript
describe('Extra Credits FIFO Consumption', () => {
  it('should consume expiring credits before permanent', async () => {
    // Setup: criar pacotes
    await addCredits({ amount: 100, expires_at: '2026-02-01' }) // Expira primeiro
    await addCredits({ amount: 100, expires_at: null })          // Permanente

    // Act: consumir 50 créditos
    await consumeCredits(50, 'test')

    // Assert: pacote com expiração deve ter sido consumido
    const packages = await getPackages()
    expect(packages[0].remaining_amount).toBe(50)  // Expiração: 100 - 50
    expect(packages[1].remaining_amount).toBe(100) // Permanente: intacto
  })
})
```

## 6. Checklist de Implementação

- [ ] Migração de banco aplicada
- [ ] View `user_credits_summary_v2` funcionando
- [ ] View `user_extra_credits_packages` funcionando
- [ ] Função `add_extra_credits` funcionando
- [ ] Função `consume_extra_credits_fifo` funcionando
- [ ] Backend: módulo credits criado
- [ ] Frontend: queries de créditos extras
- [ ] Frontend: mutation de adicionar créditos (admin)
- [ ] UI: Modal de adicionar créditos
- [ ] UI: Seção de créditos extras na página de assinatura
- [ ] UI: Botão na AdminUsersPage
- [ ] Testes de integração passando

## 7. Comandos Úteis

```bash
# Rodar frontend em dev
cd frontend && npm run dev

# Rodar backend em dev
cd backend && npm run start:dev

# Resetar banco local
supabase db reset

# Ver logs do Supabase
supabase logs

# Testar RPC no Supabase
supabase functions test
```
