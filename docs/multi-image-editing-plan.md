# Plano de Melhorias: Edição com Múltiplas Imagens

**Data:** 2026-01-25
**Feature:** 029 - fal.ai Migration
**Objetivo:** Implementar suporte a múltiplas imagens de referência e melhorar UX de seleção de modelos

---

## 1. Análise: Modelos que Suportam Múltiplas Imagens

### 1.1 Modelos Identificados

Baseado na pesquisa da API fal.ai (`expand=openapi-3.0`), estes modelos suportam **múltiplas imagens de referência**:

| Modelo | Parâmetro | Limite | Categoria |
|--------|-----------|--------|-----------|
| **FLUX 2 Edit** | `image_urls[]` | Até 4 imagens | Editing |
| **FLUX 2 LoRA Edit** | `image_urls[]` | Até 3 imagens | Editing |
| **FLUX 2 Pro Edit** | `image_urls[]` | Required (array) | Editing |
| **GPT-Image 1.5 Edit** | `image_urls[]` | Array (não documentado max) | Editing |
| **GPT-Image 1 Mini Edit** | `image_urls[]` | Array (não documentado max) | Editing |
| **Gemini Flash Edit Multi** | `image_url` | Até 2 imagens de referência | Editing |

### 1.2 Modelos Single-Image

Estes modelos aceitam **apenas 1 imagem**:

| Modelo | Parâmetro | Categoria |
|--------|-----------|-----------|
| **FLUX Fill Pro** | `image_url` + `mask_url` | Inpainting |
| **FLUX Kontext** | `image_url` | Editing |
| **Qwen Image Edit Inpaint** | `image_url` + `mask_url` | Inpainting |
| **SDXL Inpaint** | `image_url` + `mask_url` | Inpainting |
| **Gemini 2.5 Flash Edit** | `image_url` | Editing |
| **Gemini 3 Pro Edit** | `image_url` | Editing |

---

## 2. Ranking de Qualidade (OpenRouter)

Você mostrou um ranking com os seguintes modelos **top-rated**:

1. **GPT Image 1.5 (high)** - OpenAI
2. **Nano Banana Pro (Gemini 3 Pro Image)** - Google
3. **FLUX.2 [max]** - Black Forest Labs
4. **FLUX.2 [pro]** - Black Forest Labs
5. **Seedream 4.0** - ByteDance Seed
6. **FLUX.2 [flex]** - Black Forest Labs
7. **Seedream 4.5** - ByteDance Seed
8. **Imagen 4 Ultra** - Google
9. **Nano Banana (Gemini 2.5 Flash Image)** - Google
10. **ImagineArt 1.5 Preview** - ImagineArt
11. **FLUX.2 [dev] Turbo** - Fal

### 2.1 Modelos Faltando na Nossa Lista

Precisamos adicionar:
- ✅ **FLUX.2 [max]** - `fal-ai/flux-2/max` (novo)
- ✅ **FLUX.2 [pro]** - `fal-ai/flux-2-pro` (já temos como editing)
- ✅ **FLUX.2 [flex]** - `fal-ai/flux-2/flex` (novo)
- ❌ **Seedream 4.0/4.5** - ByteDance (verificar se existe no fal.ai)
- ❌ **Imagen 4 Ultra** - Google (verificar se existe no fal.ai)
- ✅ **FLUX.2 [dev] Turbo** - `fal-ai/flux-2/dev/turbo` (novo)

---

## 3. Seletor de Contexto - Como Funciona?

### 3.1 O Que É?

O **seletor de contexto** que você mencionou provavelmente se refere ao **AssetPickerModal** que permite:
- Selecionar imagens do projeto para usar como referência
- Aplicar diferentes **modos de uso** (style, compose, base)

**Localização atual:**
- `frontend/src/components/image-studio/AssetPickerModal.tsx`
- Usado na aba "Criar" (GenerateMode)

### 3.2 Como Deveria Funcionar no EditMode?

**Proposta:**

1. **Modo Pincel (Inpainting)**:
   - Imagem principal: aquela que está sendo editada
   - Máscara: desenhada pelo usuário
   - ❌ Não permite múltiplas imagens de referência (limitação da API mask-based)

2. **Modo Instrução (Editing)**:
   - Imagem principal: aquela que está sendo editada
   - ✅ Imagens adicionais: até N imagens de referência (depende do modelo)
   - Exemplo: "Quero refinar essa imagem A, mas adicionar o estilo da imagem B"

### 3.3 Compatibilidade com Modelos

| Modelo | Modo Pincel | Modo Instrução | Múltiplas Imagens |
|--------|-------------|----------------|-------------------|
| FLUX Fill Pro | ✅ (mask) | ❌ | ❌ |
| FLUX Kontext | ❌ | ✅ | ❌ (1 imagem) |
| FLUX 2 Edit | ❌ | ✅ | ✅ (até 4) |
| GPT-Image 1.5 Edit | ❌ | ✅ | ✅ (array) |
| Gemini Flash Edit Multi | ❌ | ✅ | ✅ (até 2) |
| Qwen Inpaint | ✅ (mask) | ❌ | ❌ |
| SDXL Inpaint | ✅ (mask) | ❌ | ❌ |

**Conclusão:**
- **Modo Pincel**: Nunca suporta múltiplas imagens (só 1 imagem + máscara)
- **Modo Instrução**: Alguns modelos suportam múltiplas imagens de referência

---

## 4. Melhorias Propostas

### 4.1 Fluxo de Edição (EditMode)

**Novo fluxo proposto:**

```
1. Usuário clica "Refinar" em uma imagem
   ↓
2. EditMode abre com imagem selecionada
   ↓
3. [NOVO] Usuário escolhe MODO primeiro:
   - 🖌️ Pincel (mask-based inpainting)
   - 💬 Instrução (natural language editing)
   ↓
4. ModelSelector filtra modelos compatíveis:
   - Pincel → apenas modelos com capability "inpainting"
   - Instrução → apenas modelos com capability "editing"
   ↓
5. [NOVO] Se modo Instrução + modelo suporta múltiplas imagens:
   - Mostrar botão "➕ Adicionar Imagem de Referência"
   - Abrir AssetPickerModal
   - Permitir selecionar até N imagens (limite do modelo)
   ↓
6. Usuário edita (desenha máscara OU digita instrução)
   ↓
7. Backend envia request correto:
   - Pincel: image_url + mask_url
   - Instrução (single): image_url
   - Instrução (multi): image_urls[] array
```

### 4.2 ModelSelector Melhorado

**Adições necessárias:**

1. **Descrição detalhada**:
   ```tsx
   <SelectItem value={model.id}>
     <div className="flex flex-col gap-1">
       <div className="flex items-center gap-2">
         <span className="font-medium">{model.name}</span>
         <Badge variant="outline">{model.provider}</Badge>
       </div>

       <p className="text-xs text-gray-500 dark:text-gray-400">
         {model.description}
       </p>

       {/* NEW: Capabilities badges */}
       <div className="flex gap-1 mt-1">
         {model.supports_mask && (
           <Badge variant="secondary" className="text-[10px]">
             🖌️ Máscara
           </Badge>
         )}
         {model.supports_multi_image && (
           <Badge variant="secondary" className="text-[10px]">
             🖼️ Múltiplas imagens (até {model.max_images})
           </Badge>
         )}
         {model.pricing === 'premium' && (
           <Badge variant="default" className="text-[10px]">
             ⭐ Premium
           </Badge>
         )}
       </div>
     </div>
   </SelectItem>
   ```

2. **Filtro de texto**:
   ```tsx
   const [searchQuery, setSearchQuery] = useState('');

   const filteredModels = useMemo(() => {
     if (!searchQuery) return models;

     const query = searchQuery.toLowerCase();
     return models.filter(m =>
       m.name.toLowerCase().includes(query) ||
       m.description?.toLowerCase().includes(query) ||
       m.provider?.toLowerCase().includes(query)
     );
   }, [models, searchQuery]);
   ```

### 4.3 Backend: Metadados Expandidos

**Adicionar campos ao endpoint `/image-generation/models`:**

```python
{
    "id": "fal-ai/flux-2/edit",
    "name": "FLUX 2 Edit",
    "description": "Image-to-image editing with FLUX.2 [dev]",
    "capabilities": ["editing"],
    "provider": "Black Forest Labs",

    # NOVOS CAMPOS:
    "supports_mask": False,  # Aceita mask_url?
    "supports_multi_image": True,  # Aceita image_urls[]?
    "max_images": 4,  # Limite de imagens (se suporta múltiplas)
    "api_format": "image_urls_array",  # ou "image_url_single" ou "image_url_with_mask"
    "quality_rank": 3,  # Ranking de qualidade (baseado no OpenRouter)
    "pricing": "standard",
    "recommended_for": ["fast editing", "multiple references"],
}
```

---

## 5. Tarefas de Implementação

### Phase 1: Backend (Metadados)
- [ ] Atualizar endpoint `/image-generation/models` com novos campos
- [ ] Adicionar modelos FLUX.2 faltantes (max, flex, dev turbo)
- [ ] Classificar modelos por `supports_mask`, `supports_multi_image`, `max_images`
- [ ] Adicionar campo `quality_rank` baseado no ranking OpenRouter

### Phase 2: Frontend - EditMode
- [ ] Adicionar seleção de modo (Pincel/Instrução) ANTES do modelo
- [ ] Filtrar modelos dinamicamente baseado no modo
- [ ] Adicionar botão "➕ Adicionar Referência" (apenas modo Instrução + multi-image)
- [ ] Integrar AssetPickerModal para selecionar imagens adicionais
- [ ] Limitar número de imagens ao `max_images` do modelo
- [ ] Atualizar payload de edição para enviar `image_urls[]` quando aplicável

### Phase 3: Frontend - ModelSelector
- [ ] Adicionar descrição completa do modelo no dropdown
- [ ] Adicionar badges de capacidades (mask, multi-image, premium)
- [ ] Implementar filtro de texto no dropdown
- [ ] Adicionar ícones visuais (🖌️ mask, 🖼️ multi-image)
- [ ] Mostrar `max_images` para modelos multi-image

### Phase 4: Frontend - GenerateMode (aba Criar)
- [ ] Aplicar melhorias do ModelSelector também na aba Criar
- [ ] Manter funcionalidade de múltiplas referências existente
- [ ] Garantir consistência visual entre abas

### Phase 5: Backend - Adapters
- [ ] Criar adapter para modelos `image_urls[]` (FLUX 2, GPT-Image)
- [ ] Validar que modelos multi-image recebem array, não string
- [ ] Atualizar serviço fal_ai_service.py para suportar múltiplas imagens

### Phase 6: Testes
- [ ] Testar modo Pincel com todos os modelos inpainting
- [ ] Testar modo Instrução com modelos single-image
- [ ] Testar modo Instrução com modelos multi-image (1, 2, 3, 4 imagens)
- [ ] Validar que filtros funcionam corretamente
- [ ] Validar que payload correto é enviado para cada tipo de modelo

---

## 6. Perguntas Técnicas para Resolver

### 6.1 Ranking OpenRouter

**Pergunta:** Os modelos do ranking (Seedream, Imagen 4) existem no fal.ai?

**Ação:** Buscar na API fal.ai:
```bash
curl -H "Authorization: Key $FAL_API_KEY" \
  "https://api.fal.ai/v1/models?q=seedream"

curl -H "Authorization: Key $FAL_API_KEY" \
  "https://api.fal.ai/v1/models?q=imagen"
```

### 6.2 Gemini Flash Edit Multi

**Pergunta:** Como funciona exatamente o parâmetro de múltiplas imagens?

**Ação:** Buscar schema OpenAPI:
```bash
curl -H "Authorization: Key $FAL_API_KEY" \
  "https://api.fal.ai/v1/models?endpoint_id=fal-ai/gemini-flash-edit&expand=openapi-3.0"
```

### 6.3 FLUX 2 Models

**Pergunta:** Qual a diferença entre FLUX 2 Edit, FLUX 2 Pro Edit, FLUX 2 LoRA Edit?

**Ação:** Documentar diferenças e quando usar cada um.

---

## 7. Próximos Passos Imediatos

1. ✅ **Criar este plano** (concluído)
2. ⏳ **Buscar modelos faltantes na API fal.ai** (Seedream, Imagen, FLUX.2 variants)
3. ⏳ **Atualizar backend com metadados expandidos**
4. ⏳ **Implementar seleção de modo no EditMode**
5. ⏳ **Implementar suporte a múltiplas imagens no EditMode**
6. ⏳ **Melhorar ModelSelector com descrições e filtro**

---

## Anexos

### A1. Modelos Multi-Image - Referência Rápida

```typescript
// Modelos que aceitam múltiplas imagens
const MULTI_IMAGE_MODELS = {
  'fal-ai/flux-2/edit': { max: 4, param: 'image_urls' },
  'fal-ai/flux-2/lora/edit': { max: 3, param: 'image_urls' },
  'fal-ai/flux-2-pro/edit': { max: null, param: 'image_urls' },
  'fal-ai/gpt-image-1.5/edit': { max: null, param: 'image_urls' },
  'fal-ai/gpt-image-1-mini/edit': { max: null, param: 'image_urls' },
  'fal-ai/gemini-flash-edit': { max: 2, param: 'image_url' },  // ⚠️ Diferente!
};

// Função helper
function buildEditPayload(modelId: string, images: string[], prompt: string) {
  const config = MULTI_IMAGE_MODELS[modelId];

  if (!config) {
    // Single-image model
    return { image_url: images[0], prompt };
  }

  if (config.param === 'image_urls') {
    // Array format (FLUX, GPT-Image)
    return { image_urls: images.slice(0, config.max || images.length), prompt };
  } else {
    // Gemini format (still uses image_url but supports multiple)
    return { image_url: images[0], prompt };
  }
}
```
