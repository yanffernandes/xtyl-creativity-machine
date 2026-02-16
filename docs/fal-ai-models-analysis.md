# Análise de Modelos fal.ai

**Data:** 2026-01-25
**Feature:** 029 - fal.ai Migration
**Objetivo:** Documentar como identificar e usar os diferentes modelos do fal.ai

---

## 1. Como Buscar Modelos do fal.ai

### 1.1 API de Descoberta de Modelos fal.ai

✅ **EXISTE** uma API oficial para descoberta de modelos:

```
GET https://api.fal.ai/v1/models
```

**Parâmetros disponíveis:**
- `endpoint_id`: Filtrar por IDs específicos de modelos
- `category`: Filtrar por categoria (text-to-image, image-to-image, image-to-video, etc.)
- `q`: Busca por texto livre (ex: "inpaint", "edit")
- `status`: Filtrar por status (active, deprecated)
- `expand=openapi-3.0`: Retorna schema OpenAPI completo de cada modelo (IMPORTANTE!)

**Exemplo de uso:**
```bash
# Buscar modelos de inpainting
curl https://api.fal.ai/v1/models?q=inpaint

# Buscar modelos de image-to-image com schemas
curl https://api.fal.ai/v1/models?category=image-to-image&expand=openapi-3.0

# Buscar modelo específico com schema
curl https://api.fal.ai/v1/models?endpoint_id=fal-ai/flux-pro/v1/fill&expand=openapi-3.0
```

### 1.2 Metadados Retornados pela API

Cada modelo retorna:

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `endpoint_id` | string | ID único do modelo (ex: "fal-ai/flux-pro/v1/fill") |
| `display_name` | string | Nome amigável (ex: "FLUX Fill Pro") |
| `category` | string | Categoria (image-to-image, text-to-image, etc.) |
| `description` | string | Descrição das capacidades |
| `status` | string | "active" ou "deprecated" |
| `tags` | array | Tags descritivas (ex: ["inpainting", "editing"]) |
| `license_type` | string | Tipo de licença (commercial, etc.) |
| `kind` | string | "inference" ou "training" |
| `duration_estimate` | number | Tempo estimado de processamento (segundos) |

### 1.3 OpenAPI Schema (expand=openapi-3.0)

Quando `expand=openapi-3.0` é usado, cada modelo retorna o schema completo:

```json
{
  "endpoint_id": "fal-ai/flux-pro/v1/fill",
  "display_name": "FLUX Fill Pro",
  "openapi_schema": {
    "paths": {
      "/": {
        "post": {
          "requestBody": {
            "content": {
              "application/json": {
                "schema": {
                  "properties": {
                    "prompt": {"type": "string"},
                    "image_url": {"type": "string"},
                    "mask_url": {"type": "string"},
                    "guidance_scale": {"type": "number", "minimum": 0, "maximum": 20}
                  }
                }
              }
            }
          }
        }
      }
    }
  }
}
```

**IMPORTANTE:** O schema OpenAPI mostra exatamente quais parâmetros cada modelo aceita!

### 1.4 Nossa Implementação Atual

**Endpoint no backend:**
```
GET /image-generation/models?capability=inpainting
```

**Localização:** `backend/routers/image_generation.py` (linhas 101-359)

**Implementação ATUAL:** Lista **hardcoded** de modelos que conhecemos e testamos manualmente.

**Por que não usamos a API de descoberta ainda?**
1. Precisamos classificar modelos como `inpainting` vs `editing` manualmente
2. A categoria `image-to-image` do fal.ai inclui modelos incompatíveis (upscaling, face swap, etc.)
3. Precisamos testar cada modelo para confirmar compatibilidade com nossa API
4. Alguns modelos têm APIs incompatíveis (ex: `image_urls[]` vs `image_url`)

**Próximo passo:** Migrar para busca dinâmica usando `expand=openapi-3.0` para detectar parâmetros automaticamente.

```python
fal_models = [
    {
        "id": "fal-ai/flux-pro/v1/fill",
        "name": "FLUX Fill Pro",
        "description": "Precise inpainting with mask-based editing",
        "capabilities": ["inpainting"],
        "recommended_for": ["inpainting", "mask editing", "precise control"],
        "pricing": "premium",
        "provider": "Black Forest Labs"
    },
    # ... mais 24 modelos
]
```

---

## 2. Categorias de Modelos

### 2.1 Por Funcionalidade (nossa classificação)

| Categoria | Capabilities | Descrição |
|-----------|-------------|-----------|
| **Generation** | `["generation"]` | Criar imagens do zero a partir de texto |
| **Inpainting** | `["inpainting"]` | Editar áreas específicas com máscara |
| **Editing** | `["editing"]` | Editar imagem com linguagem natural (sem máscara) |
| **Background Removal** | `["background_removal"]` | Remover fundo de imagens |
| **Upscaling** | `["upscaling"]` | Aumentar resolução |
| **Enhancement** | `["enhancement"]` | Melhorar qualidade |

### 2.2 Por Provider (nossa classificação)

- **Black Forest Labs** (FLUX models)
- **Google** (Gemini models)
- **OpenAI** (GPT-Image models)
- **Qwen**
- **ImagineArt**
- **Stable Diffusion**
- **BRIA**
- **fal.ai** (próprios)

---

## 3. Como Identificar Tipo de Modelo

### 3.1 Por Estrutura de API (CRÍTICO)

Cada modelo tem uma API **diferente** e não há metadados na resposta da fal.ai indicando isso.

#### **Inpainting Models (mask-based)**

**Parâmetros aceitos:**
- `image_url` (string) - URL da imagem original
- `mask_url` (string) - URL da máscara (branco = editar, preto = preservar)
- `prompt` (string) - O que fazer na área mascarada
- `guidance_scale` (float) - Controle de aderência ao prompt
- `num_inference_steps` (int) - Passos de inferência

**Modelos confirmados:**
```
fal-ai/flux-pro/v1/fill
fal-ai/qwen-image-edit/inpaint
fal-ai/inpaint (SDXL)
```

**Exemplo de request:**
```python
{
    "image_url": "https://...",
    "mask_url": "https://...",
    "prompt": "add a blue sky",
    "guidance_scale": 7.5,
    "num_inference_steps": 28
}
```

#### **Editing Models (instruction-based)**

**Parâmetros aceitos:**
- `image_url` (string) - URL da imagem original
- `prompt` (string) - Instrução de edição
- `guidance_scale` (float) - Opcional
- **SEM** `mask_url`

**Modelos confirmados:**
```
fal-ai/flux-pro/kontext
fal-ai/flux/dev
fal-ai/gemini-25-flash-image/edit
fal-ai/gemini-flash-edit
fal-ai/gemini-3-pro-image-preview/edit
```

**Exemplo de request:**
```python
{
    "image_url": "https://...",
    "prompt": "make the sky blue",
    "guidance_scale": 7.5
}
```

#### **GPT-Image Models (formato especial)**

**Parâmetros aceitos:**
- `image_urls` (array) - **Plural!** Array de URLs
- `prompt` (string)
- `quality` (string) - "low", "medium", "high"
- `input_fidelity` (float) - Controle de fidelidade
- **SEM** `mask_url` **SEM** `image_url` (singular)

**Modelos confirmados:**
```
fal-ai/gpt-image-1.5/edit
fal-ai/gpt-image-1-mini/edit
```

**Exemplo de request:**
```python
{
    "image_urls": ["https://..."],  # Array!
    "prompt": "edit the image",
    "quality": "high",
    "input_fidelity": 0.8
}
```

**ERRO ATUAL:** Tentamos usar `gpt-image-1.5/edit` com `image_url` + `mask_url` e recebemos:
```json
{"detail":[{"loc":["body","image_urls"],"msg":"field required","type":"value_error.missing"}]}
```

---

## 4. Modelos Disponíveis Atualmente

### 4.1 Generation (12 modelos)

| ID | Nome | Provider | Pricing |
|----|------|----------|---------|
| `fal-ai/flux-pro/v1.1` | FLUX Pro 1.1 | Black Forest Labs | Premium |
| `fal-ai/flux-pro/v1.1-ultra` | FLUX Pro 1.1 Ultra | Black Forest Labs | Premium |
| `fal-ai/flux/dev` | FLUX Dev | Black Forest Labs | Standard |
| `fal-ai/flux/schnell` | FLUX Schnell | Black Forest Labs | Budget |
| `fal-ai/flux-realism` | FLUX Realism | Black Forest Labs | Standard |
| `fal-ai/gemini-25-flash-image` | Gemini 2.5 Flash Image | Google | Standard |
| `fal-ai/gemini-3-pro-image-preview` | Gemini 3 Pro Image | Google | Premium |
| `fal-ai/gpt-image-1.5` | GPT-Image 1.5 | OpenAI | Premium |
| `fal-ai/gpt-image-1-mini` | GPT-Image 1 Mini | OpenAI | Budget |
| `fal-ai/imagine-art-1.5` | ImagineArt 1.5 | ImagineArt | Standard |
| `fal-ai/qwen-image-2512` | Qwen Image 2512 | Qwen | Standard |

### 4.2 Inpainting (3 modelos)

| ID | Nome | Provider | Pricing | Suporta Mask |
|----|------|----------|---------|--------------|
| `fal-ai/flux-pro/v1/fill` | FLUX Fill Pro | Black Forest Labs | Premium | ✅ image_url + mask_url |
| `fal-ai/qwen-image-edit/inpaint` | Qwen Image Edit Inpaint | Qwen | Standard | ✅ image_url + mask_url |
| `fal-ai/inpaint` | SDXL Inpaint | Stable Diffusion | Budget | ✅ image_url + mask_url |

### 4.3 Editing (6 modelos)

| ID | Nome | Provider | Pricing | API Format |
|----|------|----------|---------|------------|
| `fal-ai/flux-pro/kontext` | FLUX Kontext | Black Forest Labs | Premium | image_url + prompt |
| `fal-ai/gpt-image-1.5/edit` | GPT-Image 1.5 Edit | OpenAI | Premium | ⚠️ image_urls[] + prompt |
| `fal-ai/gemini-25-flash-image/edit` | Gemini 2.5 Flash Edit | Google | Standard | image_url + prompt |
| `fal-ai/gemini-flash-edit` | Gemini Flash Edit Multi | Google | Standard | image_url + prompt |
| `fal-ai/gemini-3-pro-image-preview/edit` | Gemini 3 Pro Edit | Google | Premium | image_url + prompt |

### 4.4 Utilities (3 modelos)

| ID | Nome | Capability |
|----|------|------------|
| `fal-ai/bria-rmbg-2.0` | BRIA RMBG 2.0 | background_removal |
| `fal-ai/clarity-upscaler` | Clarity Upscaler | upscaling |
| `fal-ai/aura-sr` | Aura SR | enhancement |

**Total:** 25 modelos

---

## 5. Problemas Identificados

### 5.1 Metadata Disponível mas Não Classificada

✅ **Existe endpoint** `GET https://api.fal.ai/v1/models` que retorna:
- ✅ Lista de modelos disponíveis
- ✅ Parâmetros aceitos por cada modelo (via `expand=openapi-3.0`)
- ✅ Tags e descrições
- ✅ Limites de parâmetros (via OpenAPI schema)

❌ **Mas NÃO retorna:**
- Classificação "inpainting" vs "editing" (apenas categoria genérica "image-to-image")
- Informação sobre compatibilidade com `mask_url`
- Diferenciação entre modelos que usam `image_url` vs `image_urls[]`

**Solução:** Precisamos parsear o OpenAPI schema para detectar se modelo aceita `mask_url`, `image_url`, ou `image_urls[]`.

### 5.2 APIs Inconsistentes

Cada modelo tem formato diferente:

```python
# FLUX Fill Pro
{"image_url": "...", "mask_url": "...", "prompt": "..."}

# FLUX Kontext
{"image_url": "...", "prompt": "..."}  # SEM mask_url

# GPT-Image 1.5 Edit
{"image_urls": ["..."], "prompt": "..."}  # PLURAL! Array!
```

### 5.3 Descoberta Manual

Só descobrimos que GPT-Image usa `image_urls` porque:
1. Tentamos `image_url` + `mask_url`
2. Recebemos erro 422
3. Lemos error body: `"image_urls" field required`

**Não há documentação clara** sobre isso.

### 5.4 Validação de Parâmetros

Cada modelo tem limites diferentes:

```python
# FLUX Fill Pro
guidance_scale: 1.0 - 20.0  # max 20.0

# FLUX Kontext
guidance_scale: ???  # Não documentado

# GPT-Image
quality: "low" | "medium" | "high"  # Enum
```

Descobrimos o limite de 20.0 **ao receber erro 422**.

---

## 6. Nossa Solução Atual

### 6.1 Lista Hardcoded

Mantemos lista manual de modelos que **testamos e validamos**:

```python
# backend/routers/image_generation.py
fal_models = [
    # 25 modelos com metadados manuais
]
```

### 6.2 Filtro por Capability

```python
if capability:
    fal_models = [m for m in fal_models if capability in m.get("capabilities", [])]
```

Frontend filtra automaticamente:
- **Modo Pincel** → `capability=inpainting` → 3 modelos
- **Modo Instrução** → `capability=editing` → 6 modelos

### 6.3 Comentários Explicativos

```python
# Note: Inpainting vs Editing
# - "inpainting" models support mask-based editing (image_url + mask_url API)
# - "editing" models use natural language instructions only (no mask support)
# Available for brush mode (inpainting): FLUX Fill Pro, Qwen Image Edit Inpaint, SDXL Inpaint
# Available for instruction mode (editing): FLUX Kontext, Gemini models, GPT-Image 1.5 Edit
```

---

## 7. Recomendações

### 7.1 Migrar para Descoberta Dinâmica (NOVO)

✅ **Usar API de descoberta** `https://api.fal.ai/v1/models`:

**Vantagens:**
- Sempre atualizado com novos modelos do fal.ai
- OpenAPI schemas fornecem parâmetros exatos
- Reduz manutenção manual

**Como implementar:**
1. Buscar modelos: `GET /models?category=image-to-image&expand=openapi-3.0`
2. Parsear OpenAPI schema para detectar:
   - Se aceita `mask_url` → capability: "inpainting"
   - Se aceita apenas `image_url` → capability: "editing"
   - Se aceita `image_urls[]` → formato especial (GPT-Image)
3. Filtrar modelos irrelevantes (upscaling, face swap, etc.) por tags/description
4. Cachear resultados no backend (TTL 1 hora)

**Classificação automática por schema:**
```python
def classify_model_capability(openapi_schema):
    properties = openapi_schema['paths']['/']['post']['requestBody']['content']['application/json']['schema']['properties']

    if 'mask_url' in properties:
        return ['inpainting']
    elif 'image_urls' in properties:  # Plural - array format
        return ['editing']  # GPT-Image style
    elif 'image_url' in properties:
        return ['editing']
    else:
        return []  # Generation or utility
```

### 7.2 Manter Lista Hardcoded (Curto Prazo)

✅ **Temporariamente**, enquanto não implementamos descoberta dinâmica:
- Precisamos classificar manualmente (inpainting vs editing)
- Precisamos validar parâmetros de cada modelo
- Precisamos testar cada modelo antes de expor

### 7.3 Documentar Cada Modelo

Para cada novo modelo:
1. Testar endpoint manualmente
2. Identificar parâmetros aceitos
3. Validar limites (guidance_scale, etc.)
4. Classificar capability (inpainting/editing/generation)
5. Adicionar à lista com metadados completos

### 7.4 Implementar Adapters

Criar adapters por tipo de modelo:

```python
class FluxInpaintAdapter:
    def build_payload(self, image_url, mask_url, prompt, **kwargs):
        return {
            "image_url": image_url,
            "mask_url": mask_url,
            "prompt": prompt,
            "guidance_scale": min(kwargs.get("guidance_scale", 7.5), 20.0),
            "num_inference_steps": kwargs.get("num_inference_steps", 28)
        }

class GPTImageEditAdapter:
    def build_payload(self, image_url, prompt, **kwargs):
        return {
            "image_urls": [image_url],  # Array!
            "prompt": prompt,
            "quality": kwargs.get("quality", "high")
        }
```

### 7.5 Validação antes de enviar

```python
def validate_model_params(model_id, params):
    if model_id == "fal-ai/flux-pro/v1/fill":
        assert "image_url" in params
        assert "mask_url" in params
        assert params["guidance_scale"] <= 20.0
    elif model_id == "fal-ai/gpt-image-1.5/edit":
        assert "image_urls" in params  # Plural!
        assert isinstance(params["image_urls"], list)
```

---

## 8. Próximos Passos

### 8.1 Curto Prazo (Manter funcionando)

- [x] ~~Implementar adapter pattern para diferentes tipos de modelos~~ (parcialmente: diferenciamos inpainting/editing)
- [ ] Adicionar validação de parâmetros antes de enviar para fal.ai
- [ ] Testar todos os 25 modelos listados manualmente
- [ ] Remover modelos que não funcionam da lista hardcoded

### 8.2 Médio Prazo (Descoberta Dinâmica - NOVO)

- [ ] **Implementar serviço de descoberta** usando `https://api.fal.ai/v1/models`
  - Buscar modelos com `expand=openapi-3.0`
  - Parsear OpenAPI schemas para detectar parâmetros (`mask_url`, `image_url`, `image_urls[]`)
  - Classificar automaticamente: inpainting vs editing vs generation
  - Filtrar modelos irrelevantes (upscaling, face swap)
  - Implementar cache (Redis, TTL 1 hora)

- [ ] **Migrar endpoint** `/image-generation/models` para usar descoberta dinâmica
  - Substituir lista hardcoded por busca na API fal.ai
  - Manter capability filtering (`?capability=inpainting`)
  - Adicionar fallback para lista hardcoded se API falhar

- [ ] Implementar fallback quando modelo específico falha
- [ ] Adicionar retry com modelo alternativo da mesma categoria

### 8.3 Longo Prazo (Automação Completa)

- [ ] Monitorar novos modelos via webhook (se fal.ai disponibilizar)
- [ ] Sistema de testes automáticos de modelos descobertos
- [ ] Criar dashboard de status de modelos (online/offline/latency)
- [ ] Implementar adapter pattern dinâmico baseado em OpenAPI schema
- [ ] Rate limiting inteligente por modelo (baseado em `duration_estimate`)

---

## 9. Exemplos de Uso da API de Descoberta

### 9.1 Buscar Modelos de Inpainting

```bash
curl -H "Authorization: Key $FAL_API_KEY" \
  "https://api.fal.ai/v1/models?q=inpaint&expand=openapi-3.0"
```

**Retorna 9 modelos:**
- Z-Image Turbo (com/sem LoRA)
- Qwen Image Edit
- Flux Kontext LoRA
- Stable Diffusion with LoRAs
- Fooocus Inpainting
- Outros...

### 9.2 Buscar Modelos Image-to-Image

```bash
curl -H "Authorization: Key $FAL_API_KEY" \
  "https://api.fal.ai/v1/models?category=image-to-image&expand=openapi-3.0"
```

**Retorna 12 modelos:**
- Flux 2 LoRA Edit
- Flux 2 Edit
- Flux 2 Pro Edit
- FLUX.1 dev image-to-image
- AuraSR (upscaling)
- Clarity Upscaler
- Fibo Edit suite (Bria)
- AI Face Swap
- Outros...

### 9.3 Buscar Modelo Específico com Schema

```bash
curl -H "Authorization: Key $FAL_API_KEY" \
  "https://api.fal.ai/v1/models?endpoint_id=fal-ai/flux-pro/v1/fill&expand=openapi-3.0"
```

**Response (simplificado):**
```json
{
  "models": [{
    "endpoint_id": "fal-ai/flux-pro/v1/fill",
    "display_name": "FLUX.1 [pro] Fill",
    "category": "image-to-image",
    "description": "Precise inpainting with mask-based editing",
    "status": "active",
    "tags": ["inpainting", "editing"],
    "openapi_schema": {
      "paths": {
        "/": {
          "post": {
            "requestBody": {
              "content": {
                "application/json": {
                  "schema": {
                    "required": ["prompt", "image_url", "mask_url"],
                    "properties": {
                      "prompt": {"type": "string"},
                      "image_url": {"type": "string", "format": "uri"},
                      "mask_url": {"type": "string", "format": "uri"},
                      "num_images": {"type": "integer", "minimum": 1, "maximum": 4, "default": 1},
                      "guidance_scale": {"type": "number", "minimum": 0, "maximum": 20},
                      "seed": {"type": "integer"},
                      "output_format": {"type": "string", "enum": ["jpeg", "png"], "default": "jpeg"},
                      "safety_tolerance": {"type": "string", "enum": ["1", "2", "3", "4", "5", "6"], "default": "2"}
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }]
}
```

**Como parsear automaticamente:**
```python
schema = model['openapi_schema']['paths']['/']['post']['requestBody']['content']['application/json']['schema']
required_params = schema.get('required', [])
properties = schema.get('properties', {})

# Detectar tipo de modelo
if 'mask_url' in required_params:
    capability = 'inpainting'
    print(f"✅ {model['endpoint_id']} → inpainting (aceita mask_url)")
elif 'image_urls' in properties:  # Plural - array
    capability = 'editing'
    print(f"⚠️  {model['endpoint_id']} → editing (formato GPT-Image com image_urls[])")
elif 'image_url' in properties:
    capability = 'editing'
    print(f"✅ {model['endpoint_id']} → editing (apenas image_url)")
else:
    capability = 'generation'
    print(f"ℹ️  {model['endpoint_id']} → generation (text-to-image)")
```

### 9.4 Implementação Sugerida (Backend)

```python
# backend/services/fal_model_discovery.py
import httpx
from typing import List, Dict
import logging

logger = logging.getLogger(__name__)

FAL_MODELS_API = "https://api.fal.ai/v1/models"

async def discover_fal_models(category: str = None) -> List[Dict]:
    """
    Descobrir modelos do fal.ai dinamicamente via API.

    Args:
        category: Filtrar por categoria (image-to-image, text-to-image, etc.)

    Returns:
        Lista de modelos com capabilities classificadas
    """
    params = {"expand": "openapi-3.0"}
    if category:
        params["category"] = category

    headers = {"Authorization": f"Key {os.getenv('FAL_API_KEY')}"}

    async with httpx.AsyncClient() as client:
        response = await client.get(FAL_MODELS_API, params=params, headers=headers)
        response.raise_for_status()
        data = response.json()

    models = []
    for model in data.get("models", []):
        # Parsear OpenAPI schema para detectar capabilities
        capability = _classify_model_capability(model)

        if capability:  # Apenas modelos que conseguimos classificar
            models.append({
                "id": model["endpoint_id"],
                "name": model["display_name"],
                "description": model.get("description"),
                "capabilities": [capability],
                "provider": _extract_provider(model["endpoint_id"]),
                "status": model.get("status"),
                "duration_estimate": model.get("duration_estimate")
            })

    return models

def _classify_model_capability(model: Dict) -> str:
    """Classificar modelo baseado no OpenAPI schema."""
    try:
        schema = model['openapi_schema']['paths']['/']['post']['requestBody']['content']['application/json']['schema']
        properties = schema.get('properties', {})
        required = schema.get('required', [])

        if 'mask_url' in properties or 'mask_url' in required:
            return 'inpainting'
        elif 'image_urls' in properties:  # Plural - GPT-Image style
            return 'editing'
        elif 'image_url' in properties:
            return 'editing'
        elif 'prompt' in required and 'image_url' not in properties:
            return 'generation'
    except (KeyError, TypeError):
        logger.warning(f"Could not parse schema for {model.get('endpoint_id')}")

    return None

def _extract_provider(endpoint_id: str) -> str:
    """Extrair provider do endpoint_id."""
    # fal-ai/flux-pro/v1/fill → Black Forest Labs
    # fal-ai/gemini-25-flash-image → Google
    # etc.
    if 'flux' in endpoint_id.lower():
        return 'Black Forest Labs'
    elif 'gemini' in endpoint_id.lower():
        return 'Google'
    elif 'gpt-image' in endpoint_id.lower():
        return 'OpenAI'
    elif 'qwen' in endpoint_id.lower():
        return 'Qwen'
    else:
        return 'Other'
```

---

## 10. Referências

- **fal.ai Models API:** https://api.fal.ai/v1/models
- **fal.ai Models Website:** https://fal.ai/models
- **fal.ai Docs (LLMs.txt):** https://docs.fal.ai/llms.txt
- **Nossa Implementação Backend:** [backend/routers/image_generation.py:101-359](../backend/routers/image_generation.py#L101-L359)
- **Frontend (EditMode):** [frontend/src/components/image-studio/EditMode.tsx](../frontend/src/components/image-studio/EditMode.tsx)
- **Frontend (ModelSelector):** [frontend/src/components/image-studio/ModelSelector.tsx](../frontend/src/components/image-studio/ModelSelector.tsx)

---

## Conclusão

**EXISTE API de descoberta de modelos na fal.ai:** `GET https://api.fal.ai/v1/models`

A API fornece:
- ✅ Lista completa de modelos disponíveis
- ✅ OpenAPI schemas com parâmetros exatos (via `expand=openapi-3.0`)
- ✅ Metadados (categoria, tags, status, descrição)
- ❌ Classificação automática "inpainting" vs "editing" (precisa parsear schema)

**Recomendação:**
1. **Curto prazo:** Manter lista hardcoded atual (funciona bem, 25 modelos testados)
2. **Médio prazo:** Implementar descoberta dinâmica parseando OpenAPI schemas
3. **Longo prazo:** Cachear modelos descobertos + classificação automática por schema

**Cada modelo ainda tem API diferente**, mas o OpenAPI schema permite detectar automaticamente:
- Modelos com `mask_url` → inpainting
- Modelos com `image_url` apenas → editing
- Modelos com `image_urls[]` → formato especial (GPT-Image)

**Próximos passos:**
1. Criar serviço backend que busca modelos da API fal.ai
2. Parsear OpenAPI schemas para classificar capabilities
3. Implementar cache (TTL 1 hora) para reduzir chamadas à API
4. Testar modelos descobertos antes de expor ao frontend
