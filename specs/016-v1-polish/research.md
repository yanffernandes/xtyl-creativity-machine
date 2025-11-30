# Research: V1 Polish

**Feature**: 016-v1-polish | **Date**: 2025-11-30

## 1. Ações de Imagens Anexadas

### Contexto Atual

O componente `DocumentAttachments.tsx` (257 linhas) já exibe imagens anexadas com:
- Grid display com thumbnails
- Badge "Primary" para imagem principal
- Hover actions existentes: view, set primary, remove (desanexar)

**Problema identificado**: A ação "remove" atual apenas desanexa (remove vínculo), mas o usuário espera 3 ações distintas:
1. **Visualizar**: Abrir em modal fullscreen com zoom ✅ (já existe parcialmente via `viewingImage`)
2. **Excluir**: Remover permanentemente do storage E do documento ❌ (não existe)
3. **Desanexar**: Remover apenas o vínculo, manter no storage ✅ (é o que "remove" faz hoje)

### Decisão: Separar ações de exclusão e desanexação

**Rationale**: Usuários precisam distinguir entre:
- Desanexar: "Não quero esta imagem NESTE documento, mas posso usá-la em outro"
- Excluir: "Esta imagem é inútil, remover completamente"

**Alternativas consideradas**:
1. ❌ Manter apenas "remover" - Confuso, usuário não sabe se a imagem foi deletada
2. ❌ Soft delete - Complexidade desnecessária, imagens não precisam de histórico
3. ✅ Hard delete com confirmação - Simples, claro, com safeguard

### Implementação

**Backend** (`routers/documents.py`):
- Endpoint existente `DELETE /documents/{id}/attachments/{attachment_id}` → Desanexar (manter)
- Novo endpoint `DELETE /documents/{id}/attachments/{attachment_id}/permanent` → Excluir permanentemente
  - Remove do R2 storage via `delete_file_from_r2()`
  - Remove registro do banco (Document + DocumentAttachment)

**Frontend** (`DocumentAttachments.tsx`):
- Ícone Eye (👁) → Visualizar (já existe)
- Ícone Unlink (🔗) → Desanexar
- Ícone Trash (🗑) → Excluir (com confirmação via AlertDialog)

---

## 2. Nova Criação Instantânea

### Contexto Atual

O fluxo de "Nova Criação" atual:
1. Usuário clica no botão
2. Frontend aguarda resposta do backend (síncrono)
3. Backend cria documento no banco
4. Frontend recebe ID e navega

**Problema**: Etapas 2-4 podem levar 2-5 segundos dependendo da latência, causando sensação de travamento.

### Decisão: Navegação otimista com criação em background

**Rationale**: O usuário não precisa esperar a criação do documento para começar a ver a interface. Podemos navegar imediatamente e criar o documento em paralelo.

**Alternativas consideradas**:
1. ❌ Apenas adicionar loading spinner - Não resolve o problema de latência
2. ❌ Criar documento offline-first - Complexidade de sync muito alta
3. ✅ Navegação imediata + criação em background - Simples e eficaz

### Implementação

**Frontend** (componente de criação):
```typescript
// 1. Feedback visual imediato (<200ms)
setIsCreating(true)
router.push(`/workspace/${workspaceId}/project/${projectId}/document/new`)

// 2. Criar documento em background
const response = await api.post('/documents', { project_id, title: 'Untitled' })

// 3. Substituir URL com ID real (sem reload)
router.replace(`/workspace/${workspaceId}/project/${projectId}/document/${response.data.id}`)
```

**Página de documento**:
- Detectar se está em `/new` (modo de criação)
- Mostrar skeleton/loading enquanto aguarda ID real
- Quando ID disponível, carregar documento normalmente

**Debounce**:
- Desabilitar botão após clique por 1 segundo
- Prevenir múltiplas criações acidentais

---

## 3. Qualidade do Refining de Imagens

### Contexto Atual

O endpoint `POST /image-generation/refine` em `routers/image_generation.py`:
- Recebe `document_id` da imagem a refinar
- Busca a imagem pelo ID
- Envia para o modelo de geração com o prompt de refinamento

**Problema identificado**: Cada refinamento usa a imagem da iteração anterior como base. Com compressão/processamento a cada iteração, qualidade degrada.

### Decisão: Sempre usar imagem original como base

**Rationale**: A imagem original tem máxima qualidade. Refinamentos são instruções acumulativas aplicadas sobre a original, não modificações em cadeia.

**Alternativas consideradas**:
1. ❌ Aumentar qualidade de compressão - Apenas mitiga, não resolve
2. ❌ Armazenar todas as versões - Custo de storage desnecessário
3. ✅ Rastrear imagem original + instruções acumulativas - Solução limpa

### Implementação

**Modelo de dados** - Adicionar campo `original_image_id` em `Document`:
```python
# models.py
original_image_id = Column(UUID, ForeignKey('documents.id'), nullable=True)
```

**Fluxo de refinamento**:
1. Ao receber request de refine:
   - Se imagem tem `original_image_id` → usar original
   - Se não tem → esta é a original, usar ela mesma
2. Ao criar nova imagem refinada:
   - Definir `original_image_id` = ID da original (não da anterior)
3. Passar todas as instruções de refinamento acumuladas no prompt

**Acumulação de instruções**:
- Novo campo `refinement_history` (JSONB) armazena lista de prompts anteriores
- Cada refinamento adiciona à lista
- Prompt final: "[Original prompt] + [Refinement 1] + [Refinement 2] + ..."

---

## 4. Gerador de Prompts Intermediário

### Contexto Atual

Em `tools.py`, a função `generate_image_tool`:
1. Recebe prompt do usuário via chat
2. Busca visual context do projeto (assets de referência)
3. Envia diretamente para modelo de geração

**Problema**: Prompts do usuário são frequentemente vagos ("crie uma imagem bonita"). O modelo de geração precisa de prompts detalhados para resultados de qualidade.

### Decisão: Serviço de enriquecimento com modelo configurável

**Rationale**: Um modelo de IA intermediário pode transformar prompts vagos em prompts profissionais, incorporando contexto de marca.

**Alternativas consideradas**:
1. ❌ Templates estáticos - Não se adapta ao contexto
2. ❌ Regras hardcoded - Frágil, não escala
3. ✅ Modelo de IA para enriquecimento - Flexível, inteligente, configurável

### Implementação

**Novo serviço** (`services/prompt_enrichment_service.py`):
```python
class PromptEnrichmentService:
    async def enrich_prompt(
        self,
        user_prompt: str,
        brand_context: Optional[BrandContext] = None
    ) -> str:
        """
        Enriquece prompt do usuário com:
        - Detalhes técnicos (lighting, composition, style)
        - Contexto de marca (cores, tipografia, tom visual)
        - Boas práticas de prompt engineering
        """
        model = await model_config_service.get_model("prompt_enrichment")

        system_prompt = """You are an expert image prompt engineer..."""

        enriched = await llm_service.generate(
            model=model,
            system=system_prompt,
            user=f"Original: {user_prompt}\nBrand: {brand_context}"
        )
        return enriched
```

**Configuração no Admin**:
- Novo tipo de modelo: `prompt_enrichment`
- Default: `anthropic/claude-3-haiku` (rápido e econômico)
- Configurável via painel admin existente

**Integração em `tools.py`**:
```python
async def generate_image_tool(...):
    # Enriquecer prompt antes de gerar
    enriched_prompt = await prompt_enrichment_service.enrich_prompt(
        user_prompt=prompt,
        brand_context=project.brand_context
    )

    # Gerar imagem com prompt enriquecido
    result = await generate_and_store_image(enriched_prompt, ...)
```

**Brand Context a incluir**:
- `color_palette`: Lista de cores HEX da marca
- `typography`: Família tipográfica preferida
- `visual_style`: Descrição do estilo visual (minimalista, vibrante, etc.)
- `reference_assets`: URLs de imagens de referência selecionadas

---

## Decisões Consolidadas

| Área | Decisão | Rationale |
|------|---------|-----------|
| Imagens anexadas | 3 ações separadas (view/detach/delete) | Clareza para usuário |
| Nova Criação | Navegação otimista + background | UX instantânea |
| Refining | Sempre usar original + histórico | Preserva qualidade |
| Prompt | Modelo intermediário configurável | Flexibilidade + qualidade |

---

## Riscos e Mitigações

| Risco | Probabilidade | Impacto | Mitigação |
|-------|--------------|---------|-----------|
| Latência do enriquecimento de prompt | Média | Médio | Usar modelo rápido (Haiku), timeout de 5s |
| Usuário exclui imagem por engano | Baixa | Alto | Confirmação explícita com nome do arquivo |
| Histórico de refinamento muito longo | Baixa | Baixo | Limitar a últimas 5 instruções |
| Race condition na criação otimista | Baixa | Médio | Mutex no backend, retry no frontend |
