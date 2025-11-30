# Data Model: V1 Polish

**Feature**: 016-v1-polish | **Date**: 2025-11-30

## Entidades Modificadas

### Document (Existente - Modificar)

Adicionar campos para rastreamento de refinamento de imagens:

```python
# backend/models.py

class Document(Base):
    # ... campos existentes ...

    # NOVOS CAMPOS para refining
    original_image_id = Column(UUID, ForeignKey('documents.id'), nullable=True)
    refinement_history = Column(JSONB, nullable=True, default=list)

    # Relacionamento para a imagem original
    original_image = relationship(
        "Document",
        remote_side=[id],
        foreign_keys=[original_image_id]
    )
```

**Campos novos**:

| Campo | Tipo | Nullable | Descrição |
|-------|------|----------|-----------|
| `original_image_id` | UUID (FK) | Sim | Referência à imagem original (para refinamentos) |
| `refinement_history` | JSONB | Sim | Lista de instruções de refinamento aplicadas |

**Estrutura do `refinement_history`**:
```json
[
  {
    "prompt": "Make the background more vibrant",
    "applied_at": "2025-11-30T10:30:00Z"
  },
  {
    "prompt": "Add more contrast to the shadows",
    "applied_at": "2025-11-30T10:35:00Z"
  }
]
```

---

### SystemConfig (Existente - Modificar)

Adicionar configuração para modelo de enriquecimento de prompts:

**Chave**: `ai_models`
**Novo campo em `defaults`**: `prompt_enrichment`

```json
{
  "defaults": {
    "chat": "anthropic/claude-sonnet-4",
    "vision": "anthropic/claude-sonnet-4",
    "embedding": "openai/text-embedding-3-small",
    "document": "anthropic/claude-sonnet-4",
    "image_generation": "openai/dall-e-3",
    "image_naming": "anthropic/claude-3-haiku",
    "prompt_enrichment": "anthropic/claude-3-haiku"  // NOVO
  },
  "fallbacks": {
    "chat": "openai/gpt-4o",
    "vision": "openai/gpt-4o",
    "prompt_enrichment": "openai/gpt-4o-mini"  // NOVO
  }
}
```

---

## Entidades Não Modificadas (Referência)

### DocumentAttachment (Existente)

Sem modificações necessárias. Estrutura atual:

```python
class DocumentAttachment(Base):
    id = Column(UUID, primary_key=True)
    document_id = Column(UUID, ForeignKey('documents.id'))
    image_id = Column(UUID, ForeignKey('documents.id'))
    is_primary = Column(Boolean, default=False)
    attachment_order = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
```

### Project (Existente)

Sem modificações. Brand context já disponível via:
- `ProjectSettings` (client_name, brand_voice, etc.)
- `BrandIdentity` (color_palette, typography)
- `AssistantVisualSettings` (visual assets selecionados)

---

## Migração SQL

```sql
-- Migration: 017_v1_polish_refining.sql

-- 1. Adicionar campos de refinamento à tabela documents
ALTER TABLE documents
ADD COLUMN IF NOT EXISTS original_image_id UUID REFERENCES documents(id);

ALTER TABLE documents
ADD COLUMN IF NOT EXISTS refinement_history JSONB DEFAULT '[]'::jsonb;

-- 2. Criar índice para consultas de refinamento
CREATE INDEX IF NOT EXISTS idx_documents_original_image_id
ON documents(original_image_id)
WHERE original_image_id IS NOT NULL;

-- 3. Adicionar modelo de prompt_enrichment à configuração (se não existir)
UPDATE system_config
SET value = jsonb_set(
    jsonb_set(
        value,
        '{defaults,prompt_enrichment}',
        '"anthropic/claude-3-haiku"'
    ),
    '{fallbacks,prompt_enrichment}',
    '"openai/gpt-4o-mini"'
)
WHERE key = 'ai_models'
AND NOT (value->'defaults' ? 'prompt_enrichment');

-- Comentário explicativo
COMMENT ON COLUMN documents.original_image_id IS
    'Para imagens refinadas, referência à imagem original para preservar qualidade';
COMMENT ON COLUMN documents.refinement_history IS
    'Lista de prompts de refinamento aplicados (JSONB array)';
```

---

## Validações

### Document

| Campo | Regra de Validação |
|-------|-------------------|
| `original_image_id` | Se presente, deve referenciar documento com `media_type='image'` |
| `refinement_history` | Array de objetos com `prompt` (string) e `applied_at` (datetime) |

### Exclusão Permanente

Ao excluir uma imagem permanentemente:
1. Verificar se não é `original_image_id` de outra imagem
2. Se for, rejeitar exclusão ou atualizar referências
3. Remover arquivo do R2 storage
4. Remover todos os `DocumentAttachment` relacionados
5. Remover registro do banco

---

## Diagrama de Relacionamentos

```
┌──────────────────┐
│     Project      │
├──────────────────┤
│ brand_identity   │───── Contexto de marca para prompts
│ visual_settings  │
└────────┬─────────┘
         │
         │ 1:N
         ▼
┌──────────────────┐
│     Document     │
├──────────────────┤
│ id               │◄───────────────┐
│ media_type       │                │
│ original_image_id│────────────────┘ Self-reference (refinements)
│ refinement_history│
└────────┬─────────┘
         │
         │ 1:N
         ▼
┌──────────────────────┐
│  DocumentAttachment  │
├──────────────────────┤
│ document_id (text)   │
│ image_id (image)     │
│ is_primary           │
└──────────────────────┘
```

---

## Considerações de Performance

1. **Índice em `original_image_id`**: Necessário para queries de refinamento
2. **JSONB para `refinement_history`**: Permite queries e índices GIN se necessário
3. **Lazy loading**: Relacionamento `original_image` não carregado por padrão
4. **Limite de histórico**: Manter máximo de 10 refinamentos para evitar prompts muito longos
