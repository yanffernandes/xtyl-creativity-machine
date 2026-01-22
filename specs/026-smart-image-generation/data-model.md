# Data Model: Smart Image Generation

**Feature**: 026-smart-image-generation
**Date**: 2025-12-12

## Entities

### 1. SystemConfig (existing table - new key)

**Purpose**: Armazena configuração global de geração de variações.

**New Configuration Key**:
```
key: "image_generation_default_variations"
```

**Value Schema** (JSONB):
```json
{
  "count": 2,
  "modifiers": [
    "versão minimalista e clean, com espaço em branco, tipografia elegante",
    "versão vibrante e impactante, cores saturadas, elementos dinâmicos",
    "versão sofisticada e premium, tons neutros, composição equilibrada"
  ],
  "enabled": true
}
```

**Fields**:
| Field | Type | Description |
|-------|------|-------------|
| count | integer | Número padrão de variações (1-3) |
| modifiers | array[string] | Lista de modificadores de estilo |
| enabled | boolean | Se o sistema de variações está ativo |

**Validation Rules**:
- count: min=1, max=3
- modifiers: min 3 itens (para suportar até 3 variações)
- enabled: boolean, default true

---

### 2. ImageVariationSet (new concept - not a table)

**Purpose**: Agrupamento lógico de variações geradas na mesma solicitação. Não é uma tabela física - é implementado via campo `variation_set_id` em Document.

**Implementation**: Adicionar campo em Document (existente):

```python
# Em models.py - Document model
variation_set_id: str | None  # UUID que agrupa variações da mesma solicitação
variation_index: int | None   # 0, 1, 2 - índice da variação no set
variation_modifier: str | None  # Modificador usado nesta variação
```

**Relationships**:
- Document 1:N ImageVariationSet (via variation_set_id)
- Documentos com mesmo variation_set_id pertencem ao mesmo conjunto

---

### 3. Document (existing table - extended)

**Purpose**: Já armazena imagens geradas. Estender para suportar variações.

**New Fields**:
| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| variation_set_id | UUID | Yes | Agrupa documentos da mesma solicitação |
| variation_index | Integer | Yes | Índice (0, 1, 2) dentro do set |
| variation_modifier | String | Yes | Modificador de estilo usado |

**Migration Required**: Yes - Alembic migration para adicionar campos

**Backward Compatibility**:
- Campos são nullable
- Imagens existentes terão null nesses campos
- Sistema continua funcionando para imagens sem variações

---

### 4. GenerationMetadata (embedded in Document.metadata)

**Purpose**: Metadados detalhados da geração, já existe em Document.metadata JSONB.

**Extended Schema**:
```json
{
  "original_prompt": "cria um anúncio pro meu produto",
  "enriched_prompt": "Create a professional advertisement...",
  "model_used": "google/gemini-3-pro-image-preview",
  "aspect_ratio": "1:1",
  "generation_config": {
    "variations_requested": 2,
    "variation_index": 0,
    "modifier_applied": "versão minimalista e clean",
    "skip_enrichment": false,
    "skip_visual_context": false
  },
  "visual_assets_used": [
    {"id": "uuid", "type": "logo", "title": "Logo Principal"}
  ],
  "timing": {
    "started_at": "2025-12-12T10:00:00Z",
    "completed_at": "2025-12-12T10:00:15Z",
    "duration_ms": 15000
  }
}
```

---

## State Transitions

### Image Generation Flow

```
[User Request]
     ↓
[Config Lookup] → Ler count e modifiers de system_config
     ↓
[Parallel Generation] → N tasks async, cada uma com modifier diferente
     ↓ (for each)
[SSE Event] → image_variation_complete enviado ao frontend
     ↓ (when all done)
[Complete Set] → Todos Documents criados com mesmo variation_set_id
```

### Configuration States

```
system_config["image_generation_default_variations"]

enabled: false → Sistema funciona como antes (1 imagem)
enabled: true, count: 1 → 1 variação (comportamento legacy)
enabled: true, count: 2 → 2 variações (padrão)
enabled: true, count: 3 → 3 variações (máximo)
```

---

## Database Migration

**Migration Name**: `add_image_variation_fields`

```sql
-- Add variation fields to document table
ALTER TABLE document
ADD COLUMN variation_set_id UUID,
ADD COLUMN variation_index INTEGER,
ADD COLUMN variation_modifier TEXT;

-- Index for efficient grouping queries
CREATE INDEX idx_document_variation_set_id ON document(variation_set_id);

-- Insert default system config
INSERT INTO system_config (key, value, description)
VALUES (
  'image_generation_default_variations',
  '{"count": 2, "modifiers": ["versão minimalista e clean, com espaço em branco, tipografia elegante", "versão vibrante e impactante, cores saturadas, elementos dinâmicos", "versão sofisticada e premium, tons neutros, composição equilibrada"], "enabled": true}',
  'Configuração padrão de variações para geração de imagens'
)
ON CONFLICT (key) DO NOTHING;
```

---

## Queries

### Get variation config
```python
async def get_variation_config(db: Session) -> dict:
    config = db.query(SystemConfig).filter(
        SystemConfig.key == "image_generation_default_variations"
    ).first()
    return config.value if config else {"count": 2, "enabled": True, "modifiers": [...]}
```

### Get all variations for a set
```python
async def get_variation_set(db: Session, variation_set_id: str) -> list[Document]:
    return db.query(Document).filter(
        Document.variation_set_id == variation_set_id
    ).order_by(Document.variation_index).all()
```

### Update variation config (admin)
```python
async def update_variation_config(db: Session, count: int) -> dict:
    config = db.query(SystemConfig).filter(
        SystemConfig.key == "image_generation_default_variations"
    ).first()
    config.value["count"] = count
    db.commit()
    return config.value
```

---

## Validation Rules

| Entity | Field | Rule |
|--------|-------|------|
| SystemConfig (variation) | count | 1 ≤ count ≤ 3 |
| SystemConfig (variation) | modifiers | len(modifiers) ≥ 3 |
| Document | variation_index | 0 ≤ index < variation_count |
| Document | variation_set_id | Valid UUID or null |
