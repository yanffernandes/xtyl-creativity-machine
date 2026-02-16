# Data Model: Comment Node & Flow Name Display

**Branch**: `20260205-flow-comment-node` | **Date**: 2026-02-05

## Overview

Esta feature não requer mudanças no schema do banco de dados. Os nodes são armazenados como JSONB na tabela `message_flows`, permitindo novos tipos de node sem migração.

## Entities

### CommentNodeData (NEW)

Representa os dados de um nó de comentário no editor de fluxos.

```typescript
interface CommentNodeData extends BaseNodeData {
  type: 'comment'
  text: string
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `type` | `'comment'` | Yes | Discriminator para identificar o tipo de nó |
| `text` | `string` | Yes | Texto do comentário (plain text, multiline) |

**Default values**:
```typescript
{
  type: 'comment',
  text: 'Comentário'
}
```

**Validation rules**:
- `text`: No max length (truncado visualmente no card)
- `text`: Plain text only (HTML/markdown stripped on paste)

### CallFlowNodeData (EXTENDED)

Extensão do tipo existente para incluir nome do fluxo resolvido.

```typescript
interface CallFlowNodeData extends BaseNodeData {
  type: 'call-flow'
  selectedFlowId: string | null
  flowName?: string  // Computed at render time, not persisted
}
```

| Field | Type | Required | Persisted | Description |
|-------|------|----------|-----------|-------------|
| `type` | `'call-flow'` | Yes | Yes | Discriminator |
| `selectedFlowId` | `string \| null` | Yes | Yes | UUID do fluxo a ser chamado |
| `flowName` | `string` | No | **No** | Nome do fluxo (resolvido em runtime) |

**Note**: `flowName` é computado no frontend a partir de `selectedFlowId` usando a lista de fluxos disponíveis. Não é persistido no banco para evitar dados desatualizados.

### MessengerNodeType (EXTENDED)

Tipo union para todos os tipos de nó suportados.

```typescript
type MessengerNodeType =
  | 'start'
  | 'text'
  | 'card'
  | 'wait'
  | 'traffic'
  | 'call-flow'
  | 'comment'  // NEW
  | 'error'
```

### MessengerNodeData (EXTENDED)

Tipo union para dados de todos os tipos de nó.

```typescript
type MessengerNodeData =
  | StartNodeData
  | TextNodeData
  | CardNodeData
  | WaitNodeData
  | TrafficNodeData
  | CallFlowNodeData
  | CommentNodeData  // NEW
  | ErrorNodeData
```

### AVAILABLE_NODE_TYPES (EXTENDED)

Configuração do dock para exibir tipos de nó disponíveis.

```typescript
// Add to AVAILABLE_NODE_TYPES array in types/index.ts
{
  type: 'comment' as MessengerNodeType,
  title: 'Comentário',
  description: 'Adiciona uma nota ou comentário ao fluxo',
  icon: 'StickyNote',
  color: '#71717A',  // Zinc 500
}
```

## Storage

### Table: message_flows

Não há mudanças no schema. O campo `nodes` é JSONB e já suporta novos tipos de nó.

```sql
-- Existing schema (no changes needed)
CREATE TABLE message_flows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  nodes JSONB DEFAULT '[]',      -- Stores all node types including comment
  edges JSONB DEFAULT '[]',
  project_id INTEGER REFERENCES projects(id),
  user_id UUID REFERENCES auth.users(id),
  is_active BOOLEAN DEFAULT false,
  utm_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Example: Flow with Comment Node

```json
{
  "nodes": [
    {
      "id": "start-1",
      "type": "start",
      "position": { "x": 100, "y": 100 },
      "data": { "type": "start" }
    },
    {
      "id": "comment-1707148800000",
      "type": "comment",
      "position": { "x": 300, "y": 50 },
      "data": {
        "type": "comment",
        "text": "Este fluxo envia mensagem de boas-vindas"
      }
    },
    {
      "id": "text-1",
      "type": "text",
      "position": { "x": 300, "y": 200 },
      "data": {
        "type": "text",
        "text": "Olá! Bem-vindo ao nosso bot.",
        "messageType": "ACCOUNT_UPDATE",
        "buttons": []
      }
    }
  ],
  "edges": [
    {
      "id": "edge-start-text",
      "source": "start-1",
      "target": "text-1",
      "sourceHandle": "source",
      "targetHandle": "target"
    }
  ]
}
```

## Relationships

```
message_flows
    └── nodes (JSONB)
            ├── start nodes
            ├── text nodes
            ├── card nodes
            ├── wait nodes
            ├── traffic nodes
            ├── call-flow nodes → references other message_flows.id
            ├── comment nodes ← NEW (no references)
            └── error nodes
```

## Backwards Compatibility

- Fluxos existentes continuam funcionando sem modificação
- O tipo `comment` é simplesmente ignorado pelo executor de fluxos
- Nenhuma migração de dados necessária
