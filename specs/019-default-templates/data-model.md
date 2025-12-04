# Data Model: Default System Templates Migration

**Feature**: 019-default-templates
**Date**: 2025-12-04
**Purpose**: Document database schema and data structures for system templates.

## Overview

This feature seeds two existing database tables (`templates` and `workflow_templates`) with system-wide default templates. No schema changes are required - we're adding data to existing structures.

---

## Entities

### 1. Template (AI Assistant Templates)

**Table**: `templates`
**Purpose**: Prompt templates for AI assistant chat interface

#### Schema

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | String (UUID) | PRIMARY KEY | Deterministic UUID from name + category |
| `workspace_id` | String (UUID) | FK → workspaces.id, NULL | NULL for system templates |
| `user_id` | String (UUID) | FK → users.id, NULL | NULL for system templates |
| `name` | String | NOT NULL, INDEXED | Template name (e.g., "Anúncio Google Ads - AIDA") |
| `description` | Text | NULL | Use case and expected output explanation |
| `category` | String | NOT NULL, INDEXED | One of: ads, landing_page, email, social_media, seo, creative |
| `icon` | String | NULL | Emoji or icon name (e.g., "📧", "🎯") |
| `prompt` | Text | NOT NULL | Full prompt text with `{{variable}}` placeholders |
| `is_system` | Boolean | DEFAULT false, INDEXED | TRUE for system templates |
| `is_active` | Boolean | DEFAULT true | Template visibility flag |
| `tags` | JSONB | NULL | Array of searchable tags |
| `usage_count` | Integer | DEFAULT 0 | Increments on each use |
| `created_at` | DateTime(TZ) | DEFAULT now() | Creation timestamp |
| `updated_at` | DateTime(TZ) | ON UPDATE | Last update timestamp |

#### Indexes

```sql
CREATE INDEX idx_templates_is_system ON templates(is_system);
CREATE INDEX idx_templates_category ON templates(category);
CREATE INDEX idx_templates_name ON templates(name);
```

#### System Template Constraints

- `workspace_id` = NULL (global availability)
- `user_id` = NULL (no creator)
- `is_system` = TRUE
- `is_active` = TRUE (initially)

#### Unique Constraint for Idempotency

Idempotency enforced by checking existence before insert:
```sql
SELECT id FROM templates
WHERE name = ? AND category = ? AND is_system = true
```

#### Categories

| Category Value | Display Name (PT-BR) | Template Count |
|----------------|---------------------|----------------|
| `ads` | Anúncios Pagos | 15 templates |
| `landing_page` | Páginas de Destino | 7 templates |
| `email` | E-mail Marketing | 8 templates |
| `social_media` | Redes Sociais | 7 templates |
| `seo` | SEO e Blog | 7 templates |
| `creative` | Criativo/Geral | 7 templates |

**Total**: 51 AI assistant templates

---

### 2. WorkflowTemplate (Workflow Automation Templates)

**Table**: `workflow_templates`
**Purpose**: Reusable multi-step workflow definitions

#### Schema

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | String (UUID) | PRIMARY KEY | Deterministic UUID from name + category |
| `workspace_id` | String (UUID) | FK → workspaces.id, NULL, INDEXED | NULL for system templates |
| `project_id` | String (UUID) | FK → projects.id, NULL, INDEXED | NULL for system templates |
| `name` | String | NOT NULL | Workflow name (e.g., "Campanha Completa de Anúncios") |
| `description` | Text | NULL | Multi-step workflow explanation |
| `category` | String | NULL, INDEXED | One of: social_media, paid_ads, blog, email, seo, creative |
| `nodes_json` | JSONB | NOT NULL, DEFAULT [] | Array of workflow nodes (ReactFlow format) |
| `edges_json` | JSONB | NOT NULL, DEFAULT [] | Array of node connections |
| `default_params_json` | JSONB | NULL, DEFAULT {} | Default configuration values |
| `is_system` | Boolean | DEFAULT false, INDEXED | TRUE for system templates |
| `is_recommended` | Boolean | DEFAULT false, INDEXED | TRUE for featured templates |
| `usage_count` | Integer | DEFAULT 0 | Increments on each use |
| `version` | String | DEFAULT "1.0" | Workflow schema version |
| `created_by` | String (UUID) | FK → users.id, NULL | NULL for system templates |
| `created_at` | DateTime(TZ) | DEFAULT now() | Creation timestamp |
| `updated_at` | DateTime(TZ) | ON UPDATE | Last update timestamp |

#### Indexes

```sql
CREATE INDEX idx_workflow_templates_workspace_id ON workflow_templates(workspace_id);
CREATE INDEX idx_workflow_templates_project_id ON workflow_templates(project_id);
CREATE INDEX idx_workflow_templates_is_system ON workflow_templates(is_system);
CREATE INDEX idx_workflow_templates_is_recommended ON workflow_templates(is_recommended);
CREATE INDEX idx_workflow_templates_category ON workflow_templates(category);
```

#### System Template Constraints

- `workspace_id` = NULL (global availability)
- `project_id` = NULL (not associated with project)
- `is_system` = TRUE
- `is_recommended` = TRUE (initially, for featured templates)
- `created_by` = NULL (no creator)

#### Categories

| Category Value | Display Name (PT-BR) | Template Count |
|----------------|---------------------|----------------|
| `social_media` | Redes Sociais | 3-4 templates |
| `paid_ads` | Anúncios Pagos | 3-4 templates |
| `blog` | Blog Content | 2-3 templates |
| `email` | E-mail Marketing | 2-3 templates |
| `seo` | SEO | 2-3 templates |
| `creative` | Criativo | 2-3 templates |

**Total**: 15-20 workflow templates

---

## Node Types (for workflows)

Workflow templates use these node types (existing in platform):

| Node Type | Purpose | Outputs |
|-----------|---------|---------|
| `start` | Entry point | `input_variables` |
| `text_generation` | LLM text generation | `content`, `title` |
| `image_generation` | Image generation | `file_url`, `thumbnail_url`, `title`, `prompt` |
| `processing` | Text processing/transformation | `content`, `title` |
| `context_retrieval` | RAG/document search | `context`, `content`, `documents`, `count` |
| `conditional` | Branching logic | `result`, `branch` |
| `loop` | Iteration | `item`, `current_iteration`, `iterations` |
| `finish` | Workflow end | - |

---

## Variable Reference System

### Syntax

Variables use double curly braces: `{{variable_name}}`

### Resolution

Variables reference upstream node outputs:
- `{{nodeId.field}}` - e.g., `{{node_abc123.content}}`
- `{{input.variable}}` - e.g., `{{input.product_name}}`

### Standard Variables

See `research.md` Section 6 for complete variable taxonomy.

**Common Variables**:
- Product: `{{product_name}}`, `{{key_features}}`, `{{main_benefit}}`
- Audience: `{{target_audience}}`, `{{customer_pain_points}}`
- Brand: `{{brand_name}}`, `{{brand_voice}}`, `{{tone_of_voice}}`
- Campaign: `{{campaign_goal}}`, `{{call_to_action}}`, `{{offer_details}}`

---

## UUID Generation

### Deterministic UUID Algorithm

```python
import uuid
import hashlib

def generate_template_uuid(name: str, category: str) -> str:
    """
    Generate deterministic UUID v5 from template name + category.
    Same inputs always produce same UUID.
    """
    combined = f"{name}:{category}"
    namespace = uuid.UUID('6ba7b810-9dad-11d1-80b4-00c04fd430c8')  # DNS namespace UUID
    return str(uuid.uuid5(namespace, combined))

# Example:
# generate_template_uuid("Anúncio Google Ads - AIDA", "ads")
# -> "e8f3c2a1-4b5d-5e6f-7a8b-9c0d1e2f3a4b" (always same)
```

### Why Deterministic UUIDs?

1. **Idempotency**: Re-running migration doesn't create duplicates
2. **Consistency**: Same template generates same ID across environments
3. **Testability**: Predictable IDs simplify testing

---

## Idempotency Logic

### Duplicate Detection Query

**For AI Templates**:
```sql
SELECT id FROM templates
WHERE name = :name
  AND category = :category
  AND is_system = true
```

**For Workflow Templates**:
```sql
SELECT id FROM workflow_templates
WHERE name = :name
  AND category = :category
  AND is_system = true
```

### Migration Behavior

```python
def insert_template_if_not_exists(session, template_data):
    """Insert template only if it doesn't already exist."""
    exists = session.query(Template).filter(
        Template.name == template_data['name'],
        Template.category == template_data['category'],
        Template.is_system == True
    ).first()

    if not exists:
        template_data['id'] = generate_template_uuid(
            template_data['name'],
            template_data['category']
        )
        session.add(Template(**template_data))
        return True  # Inserted
    return False  # Already exists (idempotent)
```

---

## Data Validation Rules

### AI Template Validation

- `name`: 1-200 characters, required
- `description`: 1-500 characters, recommended
- `category`: Must be one of allowed values
- `prompt`: Minimum 50 characters (substantive prompt)
- `icon`: Single emoji or short string
- `tags`: Array of 1-10 tags, each 1-30 characters

### Workflow Template Validation

- `name`: 1-200 characters, required
- `description`: 1-500 characters, recommended
- `category`: Must be one of allowed values
- `nodes_json`: Minimum 2 nodes (start + at least one action)
- `edges_json`: Minimum 1 edge (connects nodes)
- Each node must have: `id`, `type`, `data`, `position`
- Each edge must have: `id`, `source`, `target`

---

## Relationships

### Template Relationships

```
templates
├─ workspace (nullable) → workspaces.id (NULL for system templates)
└─ user (nullable) → users.id (NULL for system templates)
```

### Workflow Template Relationships

```
workflow_templates
├─ workspace (nullable) → workspaces.id (NULL for system templates)
├─ project (nullable) → projects.id (NULL for system templates)
├─ creator (nullable) → users.id (NULL for system templates)
└─ executions → workflow_executions.template_id (1:many)
```

---

## Migration Impact

### Tables Modified

- ✅ `templates` - INSERT only (30-40 rows)
- ✅ `workflow_templates` - INSERT only (15-20 rows)

### Tables Not Modified

- ❌ No schema changes
- ❌ No alterations to existing templates
- ❌ No modifications to user data

### Rollback Strategy

Downgrade deletes all system templates:
```sql
DELETE FROM templates WHERE is_system = true;
DELETE FROM workflow_templates WHERE is_system = true;
```

**Safe because**: System templates have no dependencies and aren't user-created.

---

## Performance Considerations

### Migration Execution Time

- 51 template inserts + 15-20 workflow inserts
- Estimated time: **10-15 seconds** (with idempotency checks)
- No impact on running application (INSERT operations only)

### Query Performance

Existing indexes support efficient template retrieval:
- `idx_templates_is_system` - Filter system templates
- `idx_templates_category` - Category filtering in UI
- `idx_workflow_templates_is_system` - Filter system workflows
- `idx_workflow_templates_is_recommended` - Featured workflows

**No new indexes required**.

---

## Example Data Structures

See `contracts/` directory for complete JSON examples:
- `ai-template-examples.json` - Sample AI assistant templates
- `workflow-template-examples.json` - Sample workflow templates with nodes/edges
