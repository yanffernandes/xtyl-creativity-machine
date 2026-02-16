# API Contracts: Sistema de Créditos Extras

**Feature**: 031-extra-credits
**Date**: 2026-01-22

## Overview

Este documento define os contratos de API para o sistema de créditos extras. As APIs são divididas em:
- **Admin APIs**: Gerenciamento de créditos (requer permissão admin)
- **User APIs**: Consulta de saldo e histórico (usuário autenticado)

---

## Admin APIs

### POST `/api/admin/credits/add`

Adiciona créditos extras para um usuário.

**Authorization**: Bearer token (admin com permissão `credits.create`)

**Request Body**:
```json
{
  "user_id": "uuid",
  "amount": 100,
  "description": "Cortesia suporte - ticket #1234",
  "expires_at": "2026-03-01T00:00:00Z"  // null para permanente
}
```

**Validation Rules**:
- `user_id`: UUID válido, usuário deve existir
- `amount`: Inteiro positivo (1-10000)
- `description`: String não vazia, max 500 caracteres
- `expires_at`: ISO 8601 datetime ou null, deve ser no futuro se informado

**Response 201 Created**:
```json
{
  "success": true,
  "data": {
    "transaction_id": 12345,
    "user_id": "uuid",
    "amount": 100,
    "description": "Cortesia suporte - ticket #1234",
    "expires_at": "2026-03-01T00:00:00Z",
    "balance_after": 250,
    "created_at": "2026-01-22T14:30:00Z"
  }
}
```

**Response 400 Bad Request**:
```json
{
  "success": false,
  "error": {
    "code": "INVALID_AMOUNT",
    "message": "Amount must be between 1 and 10000"
  }
}
```

**Response 404 Not Found**:
```json
{
  "success": false,
  "error": {
    "code": "USER_NOT_FOUND",
    "message": "User with given ID does not exist"
  }
}
```

---

### POST `/api/admin/credits/debit`

Remove créditos extras de um usuário (estorno).

**Authorization**: Bearer token (admin com permissão `credits.create`)

**Request Body**:
```json
{
  "user_id": "uuid",
  "amount": 50,
  "reason": "Estorno por erro de sistema"
}
```

**Validation Rules**:
- `amount`: Inteiro positivo, não pode exceder saldo de extras disponível
- `reason`: Obrigatório, max 500 caracteres

**Response 201 Created**:
```json
{
  "success": true,
  "data": {
    "transaction_id": 12346,
    "user_id": "uuid",
    "amount": -50,
    "reason": "Estorno por erro de sistema",
    "balance_after": 200,
    "packages_affected": [
      { "package_id": 123, "debited": 50 }
    ]
  }
}
```

**Response 400 Bad Request**:
```json
{
  "success": false,
  "error": {
    "code": "INSUFFICIENT_CREDITS",
    "message": "User only has 30 extra credits available"
  }
}
```

---

### GET `/api/admin/credits/dashboard`

Retorna métricas agregadas de créditos extras.

**Authorization**: Bearer token (admin)

**Query Parameters**:
- `period`: `7d` | `30d` | `90d` | `all` (default: `30d`)

**Response 200 OK**:
```json
{
  "success": true,
  "data": {
    "period": "30d",
    "metrics": {
      "total_distributed": 15000,
      "total_consumed": 8500,
      "total_available": 6500,
      "total_expired": 200,
      "users_with_credits": 45
    },
    "recent_transactions": [
      {
        "id": 12345,
        "user_email": "user@example.com",
        "amount": 100,
        "description": "Cortesia",
        "admin_name": "Admin User",
        "created_at": "2026-01-22T14:30:00Z"
      }
    ],
    "top_users": [
      {
        "user_id": "uuid",
        "email": "user@example.com",
        "extra_credits": 500
      }
    ]
  }
}
```

---

### GET `/api/admin/credits/user/:userId`

Retorna detalhes de créditos de um usuário específico.

**Authorization**: Bearer token (admin)

**Path Parameters**:
- `userId`: UUID do usuário

**Response 200 OK**:
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "full_name": "User Name"
    },
    "summary": {
      "monthly_credits": 200,
      "monthly_used": 50,
      "monthly_remaining": 150,
      "extra_available": 300,
      "extra_expiring_soon": 100,
      "total_available": 450
    },
    "packages": [
      {
        "id": 123,
        "original_amount": 100,
        "remaining_amount": 80,
        "description": "Cortesia",
        "expires_at": "2026-03-01T00:00:00Z",
        "status": "active",
        "days_until_expiry": 38,
        "added_by": "Admin User",
        "created_at": "2026-01-15T10:00:00Z"
      }
    ],
    "history": [
      {
        "id": 456,
        "type": "credit",
        "amount": 100,
        "description": "Cortesia adicionada",
        "created_at": "2026-01-15T10:00:00Z"
      },
      {
        "id": 457,
        "type": "debit",
        "amount": -20,
        "description": "Consumo - Artigo gerado",
        "created_at": "2026-01-20T15:30:00Z"
      }
    ]
  }
}
```

---

## User APIs

### GET `/api/credits/summary`

Retorna resumo de créditos do usuário autenticado.

**Authorization**: Bearer token (usuário autenticado)

**Response 200 OK**:
```json
{
  "success": true,
  "data": {
    "monthly": {
      "limit": 200,
      "used": 50,
      "remaining": 150,
      "cycle_start": "2026-01-15",
      "cycle_end": "2026-02-15",
      "renews_in_days": 24
    },
    "extra": {
      "available": 300,
      "expiring_soon": 100,
      "expired_this_month": 0
    },
    "total_available": 450,
    "has_active_plan": true
  }
}
```

---

### GET `/api/credits/packages`

Retorna lista de pacotes de créditos extras do usuário.

**Authorization**: Bearer token (usuário autenticado)

**Query Parameters**:
- `status`: `active` | `expiring_soon` | `expired` | `consumed` | `all` (default: `active`)
- `limit`: 1-100 (default: 50)
- `offset`: >= 0 (default: 0)

**Response 200 OK**:
```json
{
  "success": true,
  "data": {
    "packages": [
      {
        "id": 123,
        "original_amount": 100,
        "remaining_amount": 80,
        "description": "Cortesia suporte",
        "expires_at": null,
        "status": "active",
        "days_until_expiry": null,
        "created_at": "2026-01-15T10:00:00Z"
      },
      {
        "id": 124,
        "original_amount": 200,
        "remaining_amount": 200,
        "description": "Promoção Janeiro",
        "expires_at": "2026-02-28T23:59:59Z",
        "status": "expiring_soon",
        "days_until_expiry": 7,
        "created_at": "2026-01-10T10:00:00Z"
      }
    ],
    "pagination": {
      "total": 5,
      "limit": 50,
      "offset": 0,
      "has_more": false
    }
  }
}
```

---

### GET `/api/credits/history`

Retorna histórico de transações de créditos extras do usuário.

**Authorization**: Bearer token (usuário autenticado)

**Query Parameters**:
- `type`: `credit` | `debit` | `all` (default: `all`)
- `limit`: 1-100 (default: 50)
- `offset`: >= 0 (default: 0)

**Response 200 OK**:
```json
{
  "success": true,
  "data": {
    "transactions": [
      {
        "id": 456,
        "type": "credit",
        "amount": 100,
        "description": "Créditos extras adicionados",
        "balance_after": 300,
        "created_at": "2026-01-15T10:00:00Z"
      },
      {
        "id": 457,
        "type": "debit",
        "amount": 20,
        "description": "Consumo - Artigo: 'Título do Artigo'",
        "balance_after": 280,
        "operation_type": "article",
        "created_at": "2026-01-20T15:30:00Z"
      }
    ],
    "pagination": {
      "total": 12,
      "limit": 50,
      "offset": 0,
      "has_more": false
    }
  }
}
```

---

## Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `UNAUTHORIZED` | 401 | Token inválido ou expirado |
| `FORBIDDEN` | 403 | Sem permissão para a ação |
| `USER_NOT_FOUND` | 404 | Usuário não encontrado |
| `INVALID_AMOUNT` | 400 | Valor inválido |
| `INSUFFICIENT_CREDITS` | 400 | Saldo insuficiente para débito |
| `INVALID_EXPIRATION` | 400 | Data de expiração inválida |
| `VALIDATION_ERROR` | 400 | Erro genérico de validação |

---

## Supabase Direct Queries (Frontend)

Para operações simples, o frontend pode usar queries diretas ao Supabase:

### Consultar resumo de créditos
```typescript
const { data } = await supabase
  .from('user_credits_summary_v2')
  .select('*')
  .eq('user_id', userId)
  .single()
```

### Consultar pacotes de créditos extras
```typescript
const { data } = await supabase
  .from('user_extra_credits_packages')
  .select('*')
  .eq('user_id', userId)
  .eq('status', 'active')
  .order('expires_at', { ascending: true, nullsFirst: false })
```

### Admin: Adicionar créditos (via RPC)
```typescript
const { data, error } = await supabase
  .rpc('add_extra_credits', {
    p_user_id: userId,
    p_amount: 100,
    p_description: 'Cortesia',
    p_expires_at: null,
    p_admin_id: adminId
  })
```

---

## WebSocket Events (Future)

Para notificações em tempo real (não no escopo atual):

```typescript
// Evento quando créditos são adicionados
interface CreditsAddedEvent {
  type: 'credits.added'
  payload: {
    user_id: string
    amount: number
    new_balance: number
  }
}

// Evento quando créditos estão prestes a expirar
interface CreditsExpiringEvent {
  type: 'credits.expiring'
  payload: {
    user_id: string
    package_id: number
    amount: number
    expires_at: string
  }
}
```
