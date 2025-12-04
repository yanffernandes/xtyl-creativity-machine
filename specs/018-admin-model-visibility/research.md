# Research: Admin Model Visibility Configuration

**Feature**: 018-admin-model-visibility
**Date**: 2025-12-03

## Executive Summary

A infraestrutura para `visible_models` **já existe** no sistema, mas **não está sendo utilizada** pelos seletores de modelo. A implementação requer principalmente conectar os componentes existentes e separar as listas de modelos de texto e imagem.

## Key Findings

### 1. Infraestrutura Existente (Pronta para Uso)

| Componente | Status | Localização |
|------------|--------|-------------|
| SystemConfig table | ✅ Existe | migration 016 |
| ModelConfigService | ✅ Existe | `backend/services/model_config_service.py` |
| Admin endpoints | ✅ Existe | `backend/routers/admin.py` |
| useAdminModels hook | ✅ Existe | `frontend/src/hooks/use-admin.ts` |
| Admin UI (Visible Models tab) | ✅ Existe | `frontend/src/app/admin/models/page.tsx` |

### 2. Componentes Não Conectados (Precisam Modificação)

| Componente | Problema Atual | Modificação Necessária |
|------------|---------------|------------------------|
| `/chat/models` endpoint | Retorna TODOS os modelos do OpenRouter | Filtrar por `visible_text_models` |
| `/image-generation/models` endpoint | Retorna TODOS os modelos do OpenRouter | Filtrar por `visible_image_models` |
| ModelSelector.tsx | Busca direto do OpenRouter | Usar endpoint filtrado |
| ChatSidebar.tsx | Não respeita visible_models | Usar endpoint filtrado |
| ImageGenerationPanel.tsx | Não respeita visible_models | Usar endpoint filtrado |
| Workspace settings | Tem seção "Modelos Recomendados" separada | Remover seção |

### 3. Estrutura de Dados Atual

**system_config table:**
```json
{
  "key": "visible_models",
  "value": ["model-id-1", "model-id-2", ...]  // Lista única, não separada
}
```

**Necessário:** Separar em duas listas:
```json
{
  "key": "visible_text_models",
  "value": ["anthropic/claude-...", "openai/gpt-4o", ...]
}
{
  "key": "visible_image_models",
  "value": ["openai/dall-e-3", "google/imagen-...", ...]
}
```

## Decisions Made

### Decision 1: Separação de Listas de Modelos

**Escolha:** Criar duas chaves separadas no system_config (`visible_text_models` e `visible_image_models`)

**Rationale:**
- Permite controle granular por tipo de modelo
- Evita lógica complexa de filtragem no runtime
- Simplifica a UI do admin com abas separadas

**Alternativas Rejeitadas:**
- Lista única com filtragem por output_modalities: Mais complexo, requer JOIN com dados do OpenRouter

### Decision 2: Armazenamento de Metadados

**Escolha:** Armazenar apenas IDs dos modelos, buscar metadados (nome) sob demanda do cache

**Rationale:**
- Preços mudam frequentemente - não devem ser persistidos
- Nome e ID são suficientes para exibição no seletor
- Menor tamanho de storage
- Admin vê preços em tempo real do OpenRouter

**Alternativas Rejeitadas:**
- Armazenar metadados completos: Dados ficam desatualizados, storage maior

### Decision 3: Fluxo de Sincronização

**Escolha:** Admin acessa página → Busca OpenRouter → Seleciona modelos → Salva IDs no banco

**Rationale:**
- Simples de implementar
- Preços sempre atualizados quando admin configura
- Sem necessidade de jobs em background

### Decision 4: Remoção de Workspace available_models

**Escolha:** Remover completamente a seção "Modelos Recomendados" do workspace settings

**Rationale:**
- Centraliza controle no admin
- Simplifica UX
- Evita conflito entre configurações

## Technical Analysis

### Backend Changes

1. **ModelConfigService** - Adicionar métodos:
   - `get_visible_text_models()` → List[str]
   - `get_visible_image_models()` → List[str]
   - `update_visible_text_models(model_ids)`
   - `update_visible_image_models(model_ids)`

2. **Admin Router** - Modificar endpoints:
   - GET/PUT `/admin/models/config` → Incluir `visible_text_models` e `visible_image_models`

3. **Chat Router** - Modificar:
   - GET `/chat/models` → Filtrar por visible_text_models
   - Retornar modelos do cache/banco, não do OpenRouter

4. **Image Generation Router** - Modificar:
   - GET `/image-generation/models` → Filtrar por visible_image_models
   - Retornar modelos do cache/banco, não do OpenRouter

### Frontend Changes

1. **Admin Models Page** - Modificar:
   - Separar em 3 abas: "Defaults", "Text Models", "Image Models"
   - Exibir preços na lista de seleção
   - Filtro automático por output_modalities

2. **ModelSelector, ChatSidebar, ImageGenerationPanel**:
   - Nenhuma mudança necessária (endpoints já retornarão lista filtrada)

3. **Workspace Settings Page**:
   - Remover seção "Modelos Recomendados" (linhas ~399-450)

### Database Changes

**Nenhuma migração necessária** - usa estrutura existente do system_config com novas chaves.

## Risk Analysis

| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|---------|-----------|
| Modelos visíveis vazios | Baixa | Alto | Validação no backend (mínimo 1 modelo) + fallbacks |
| Modelo removido do OpenRouter | Média | Médio | Filtrar modelos inválidos silenciosamente |
| Cache desatualizado | Baixa | Baixo | TTL de 60s já implementado |

## Performance Considerations

- **Antes:** Cada seletor → Request ao OpenRouter (~500ms)
- **Depois:** Cada seletor → Leitura do banco com cache (~5ms)
- **Melhoria esperada:** ~99% redução no tempo de carregamento do seletor

## Files to Modify

### Backend (6 arquivos)
- `backend/services/model_config_service.py` - Novos métodos
- `backend/routers/admin.py` - Endpoints modificados
- `backend/routers/chat.py` - Filtrar por visible
- `backend/routers/image_generation.py` - Filtrar por visible
- `backend/schemas.py` - Novos schemas
- `backend/migrations/018_separate_model_visibility.sql` - Seed data

### Frontend (3 arquivos)
- `frontend/src/app/admin/models/page.tsx` - UI separada
- `frontend/src/hooks/use-admin.ts` - Novos hooks
- `frontend/src/app/workspace/[id]/settings/page.tsx` - Remover seção
