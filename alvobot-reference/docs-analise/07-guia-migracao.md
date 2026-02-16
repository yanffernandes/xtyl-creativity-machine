# Guia de Migracao - Alvo Bot → Creativity Machine

## Objetivo

Importar os melhores conceitos do sistema de criativos do Alvo Bot para o Creativity Machine, focando em:

1. **Substituir imagens de referencia de estilo por descricao textual**
2. **Adotar sistema de conceitos criativos** (templates de prompt)
3. **Implementar diversidade automatica** (Andromeda)
4. **Melhorar composicao de prompts** (multi-camada)
5. **Adicionar creative library** com reutilizacao

---

## Comparacao dos Sistemas Atuais

| Aspecto | Creativity Machine (Atual) | Alvo Bot (Referencia) |
|---------|---------------------------|----------------------|
| **Stack Backend** | Python/FastAPI | TypeScript/NestJS |
| **Geracao de Imagens** | fal.ai (primario), OpenRouter (legado) | OpenRouter, Replicate, OpenAI, Google AI |
| **Modelos** | GPT Image 1.5, Gemini 3 Pro, Gemini 2.5 Flash, SeeDream | Gemini 3 Pro, Nano Banana Pro, GPT Image 1.5, DALL-E 3, Imagen 3 |
| **Estilo Visual** | Imagens de referencia (style/compose/base) | Descricao textual (conceitos + backgrounds) |
| **Prompt Building** | Prompt + reference_assets + brand context | 7 camadas (conceito + visual group + background + niche + text overlay + localizacao + direcoes) |
| **Diversidade** | Manual (usuario escolhe) | Automatica (Andromeda: conceitos + backgrounds + modelos) |
| **Biblioteca** | Visual Assets (classificacao por IA) | Creative Library (imagens geradas aprovadas) |
| **Batch** | Sim (variacoes com style modifiers) | Sim (SSE streaming por slot) |
| **Edicao** | Inpaint com brush/mask (Canvas API) | Nao tem edicao de imagem |
| **Nicho/Contexto** | Nao tem | Deteccao automatica (5 nichos) |
| **Streaming** | SSE para batch | SSE com sessoes e slots pre-alocados |

---

## O Que Importar (Priorizado)

### P1 - Alta Prioridade

#### 1. Descricao Textual para Estilos (Substituir Image References)

**Problema atual**: O sistema usa `reference_assets` com `usage_mode: "style"` para definir estilo visual. Isso depende de o usuario ter imagens de referencia disponiveis.

**Solucao do Alvo Bot**: Sistema de **conceitos criativos** com templates de prompt textuais.

**O que fazer**:

```python
# backend/services/creative_concept_service.py (NOVO)

class CreativeConcept:
    id: str
    slug: str                    # 'testimonial-social'
    name: str                    # 'Prova Social com Depoimento'
    category: str                # 'narrativa', 'prova_social', 'produto', etc.
    prompt_template: str         # Template com {{variaveis}}
    compatible_niches: list      # ['financial', 'generic']
    is_active: bool

# Exemplo de conceito:
{
    "slug": "lifestyle-aspiration",
    "name": "Estilo de Vida Aspiracional",
    "category": "lifestyle",
    "prompt_template": "A professional lifestyle photograph showing {{subject}} in a modern, aspirational setting. The scene conveys success and comfort related to {{keyword}}. Style: photorealistic, warm lighting, shallow depth of field.",
}
```

**Migracao no banco** (Supabase):
```sql
CREATE TABLE creative_concepts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    prompt_template TEXT NOT NULL,
    compatible_niches TEXT[] DEFAULT '{"generic"}',
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE creative_backgrounds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('solid', 'gradient', 'pattern', 'photo')),
    prompt_description TEXT NOT NULL,  -- Descricao textual para o prompt
    css_preview TEXT,                   -- CSS para preview no frontend
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);
```

#### 2. Composicao de Prompt Multi-Camada

**Problema atual**: Prompt e basicamente `user_prompt + reference_instructions + brand_context`. Simples mas limitado.

**Solucao do Alvo Bot**: Prompt composto em 7 camadas com refinamento por IA.

**O que fazer**:

```python
# backend/services/prompt_composer_service.py (NOVO)

class PromptComposerService:
    async def compose_prompt(
        self,
        base_prompt: str,
        concept: Optional[CreativeConcept],
        background: Optional[CreativeBackground],
        project_context: Optional[dict],
        user_directions: Optional[str],
        format: str = "1:1"
    ) -> ComposedPrompt:
        """
        Compoe prompt em camadas:
        1. Conceito criativo (template com variaveis)
        2. Background (descricao textual)
        3. Contexto do projeto (brand, nicho)
        4. Regras globais (tipografia, compliance)
        5. Direcoes do usuario
        6. Formato (aspect ratio)
        """

        layers = []

        # Camada 1: Conceito
        if concept:
            concept_prompt = concept.prompt_template.replace(
                "{{keyword}}", project_context.get("keyword", "")
            ).replace(
                "{{subject}}", extract_subject(base_prompt)
            )
            layers.append(concept_prompt)
        else:
            layers.append(base_prompt)

        # Camada 2: Background
        if background:
            layers.append(f"Background: {background.prompt_description}")

        # Camada 3: Regras globais
        layers.append(
            "Rules: PNG format. No text in image unless explicitly requested. "
            "If text overlay is present, headlines minimum 48pt, body minimum 28pt. "
            "Mobile-optimized for ~350px display width."
        )

        # Camada 4: Direcoes do usuario
        if user_directions:
            layers.append(f"Additional requirements: {user_directions}")

        composed = " ".join(layers)

        # Camada 5: Refinamento por IA (opcional)
        if self.should_refine(composed):
            composed = await self.refine_with_ai(composed)

        return ComposedPrompt(
            prompt_text=composed,
            concept_used=concept.slug if concept else None,
            background_used=background.slug if background else None,
        )
```

#### 3. Creative Library (Biblioteca de Criativos Gerados)

**Problema atual**: Temos `Visual Assets` (imagens uploadadas e classificadas), mas **nao temos** uma biblioteca de criativos *gerados* reutilizaveis.

**Solucao do Alvo Bot**: Tabela `creative_library` que salva toda imagem aprovada.

**O que fazer**:

```sql
-- Adicionar a tabela ao nosso schema existente
CREATE TABLE creative_library (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    document_id UUID REFERENCES documents(id) ON DELETE SET NULL,  -- Link ao Document existente
    image_url TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    model_used TEXT NOT NULL,
    concept_slug TEXT,                    -- Conceito usado
    background_slug TEXT,                 -- Background usado
    prompt_used TEXT NOT NULL,
    format TEXT NOT NULL DEFAULT '1:1',
    status TEXT NOT NULL DEFAULT 'approved' CHECK (status IN ('approved', 'archived', 'deleted')),
    generation_metadata JSONB,            -- Metadata completa da geracao
    diversity_metadata JSONB,             -- Metricas de diversidade
    tags TEXT[],                          -- Tags para busca
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE creative_library ENABLE ROW LEVEL SECURITY;
```

**Integracao**: Quando o usuario "aprova" uma imagem gerada, ela e adicionada a `creative_library`. Ao gerar novas imagens, o usuario pode escolher "Usar da Biblioteca" sem gastar creditos/tempo.

---

### P2 - Media Prioridade

#### 4. Sistema de Diversidade

**O que fazer**:

```python
# backend/services/diversity_service.py (NOVO)

class DiversityService:
    CONCEPT_WINDOW = 3   # Evita repetir ultimos 3 conceitos
    BACKGROUND_WINDOW = 4  # Evita repetir ultimos 4 backgrounds

    def select_next_concept(
        self, available: list, recently_used: list
    ) -> CreativeConcept:
        """Seleciona conceito evitando repeticao recente"""
        window = recently_used[-self.CONCEPT_WINDOW:]
        candidates = [c for c in available if c.slug not in window]
        if not candidates:
            candidates = available  # Reset se todos ja foram usados
        return random.choice(candidates)

    def get_next_model(self, used_models: list) -> str:
        """Round-robin entre modelos disponiveis"""
        model_usage = Counter(used_models)
        min_usage = min(model_usage.values()) if model_usage else 0
        candidates = [m for m in AVAILABLE_MODELS if model_usage.get(m, 0) == min_usage]
        return candidates[0] if candidates else AVAILABLE_MODELS[0]

    def calculate_diversity_score(
        self,
        unique_concepts: int,
        unique_backgrounds: int,
        unique_models: int,
        total: int
    ) -> float:
        """Score: 50% conceitos + 30% backgrounds + 20% modelos"""
        if total == 0:
            return 0
        return (
            (unique_concepts / total) * 50 +
            (unique_backgrounds / total) * 30 +
            (unique_models / total) * 20
        )
```

#### 5. Deteccao de Contexto/Nicho

Adaptado para workflows em vez de artigos:

```python
# backend/services/context_detector_service.py (NOVO)

class ContextDetectorService:
    """Detecta contexto do projeto/workflow para adaptar geracao"""

    CONTEXT_KEYWORDS = {
        'financial': ['emprestimo', 'credito', 'banco', 'financa', 'investimento'],
        'health': ['saude', 'medico', 'tratamento', 'bem-estar', 'fitness'],
        'ecommerce': ['loja', 'produto', 'comprar', 'oferta', 'desconto'],
        'tech': ['software', 'app', 'digital', 'tecnologia', 'plataforma'],
        'education': ['curso', 'aula', 'aprender', 'formacao', 'treinamento'],
    }

    def detect_context(self, project_name: str, prompt: str) -> str:
        """Detecta contexto baseado no projeto e prompt"""
        text = f"{project_name} {prompt}".lower()
        scores = {}
        for context, keywords in self.CONTEXT_KEYWORDS.items():
            score = sum(1 for kw in keywords if kw in text)
            if score > 0:
                scores[context] = score
        if scores:
            return max(scores, key=scores.get)
        return 'generic'
```

#### 6. Ad Copy Generation

O sistema do Alvo Bot de geracao de textos pode ser adaptado para nossos workflows:

```python
# backend/services/ad_copy_service.py (NOVO)

class AdCopyService:
    """Gera textos de anuncio otimizados"""

    VALID_CTAS = [
        'LEARN_MORE', 'SHOP_NOW', 'SIGN_UP', 'CONTACT_US',
        'GET_OFFER', 'DOWNLOAD', 'BOOK_NOW', 'SUBSCRIBE',
        'APPLY_NOW', 'MESSAGE_PAGE', 'WHATSAPP_MESSAGE',
        'BUY_NOW', 'ORDER_NOW', 'GET_QUOTE', 'CALL_NOW',
        'GET_STARTED', 'NO_BUTTON'
    ]

    async def generate_ad_copy(
        self, context: dict, language: str = 'pt-BR'
    ) -> dict:
        """Gera conjunto completo de ad copy"""
        prompt = f"""Generate ad copy in {language}:
        Context: {context.get('title', '')}
        Keyword: {context.get('keyword', '')}

        Return JSON:
        {{
            "primary_text": "max 125 chars",
            "headline": "max 27 chars",
            "description": "max 27 chars",
            "suggested_cta": "LEARN_MORE"
        }}

        CTA must be one of: {', '.join(self.VALID_CTAS)}
        """
        # ... chamada ao LLM
```

---

### P3 - Baixa Prioridade (Futuro)

#### 7. Streaming SSE com Slots

Nosso sistema ja tem SSE para batch. A melhoria seria adotar o modelo de **slots pre-alocados**:

```python
# Adaptacao no endpoint de batch generation
@router.post("/generate-batch-streaming")
async def generate_batch_streaming(request: BatchRequest):
    session_id = str(uuid4())
    slots = [{"id": str(uuid4()), "index": i, "status": "queued"}
             for i in range(request.count)]

    # Retorna sessao + slots imediatamente
    # Frontend mostra grid com placeholders
    # SSE atualiza cada slot conforme geracao completa
```

#### 8. Prompts Configuraveis no Banco

Migrar prompts de sistema para `system_prompts` ou similar:

```sql
INSERT INTO system_config (key, value) VALUES
('image-prompt-generator', '{
  "system_prompt": "You are a creative director...",
  "user_prompt_template": "Create an image for: {{title}}...",
  "model": "google/gemini-3-flash-preview",
  "temperature": 0.35
}');
```

---

## Mudancas Especificas no Codigo Existente

### 1. `image_generation_service.py` - Integrar PromptComposer

```python
# ANTES (atual):
async def generate_image(prompt, model, aspect_ratio, reference_assets):
    enhanced_prompt = prompt
    if reference_assets:
        enhanced_prompt += build_reference_instructions(reference_assets)
    result = await fal_service.generate_image(enhanced_prompt, model)

# DEPOIS (proposto):
async def generate_image(prompt, model, aspect_ratio, concept=None, background=None, user_directions=None):
    composed = await prompt_composer.compose_prompt(
        base_prompt=prompt,
        concept=concept,
        background=background,
        user_directions=user_directions,
        format=aspect_ratio
    )
    result = await fal_service.generate_image(composed.prompt_text, model)
    # Salvar metadata de conceito/background usados
    result['concept_used'] = composed.concept_used
    result['background_used'] = composed.background_used
```

### 2. `ImageGenerationPanel.tsx` - Adicionar ConceptSelector

```typescript
// ANTES: Selecao de reference_assets
<ReferenceAssetSelector
    assets={visualAssets}
    onSelect={(assets) => setReferenceAssets(assets)}
/>

// DEPOIS: Opcao entre conceito textual OU referencia de imagem
<Tabs defaultValue="concept">
    <TabsTrigger value="concept">Conceito Criativo</TabsTrigger>
    <TabsTrigger value="reference">Imagem de Referencia</TabsTrigger>

    <TabsContent value="concept">
        <ConceptSelector
            concepts={concepts}
            onSelect={(concept) => setSelectedConcept(concept)}
        />
        <BackgroundSelector
            backgrounds={backgrounds}
            onSelect={(bg) => setSelectedBackground(bg)}
        />
    </TabsContent>

    <TabsContent value="reference">
        <ReferenceAssetSelector ... />  {/* Manter para quem ja tem assets */}
    </TabsContent>
</Tabs>
```

### 3. Novo Endpoint: `GET /image-generation/concepts`

```python
@router.get("/concepts")
async def list_concepts(
    niche: Optional[str] = None,
    category: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Lista conceitos criativos disponiveis"""
    query = db.query(CreativeConcept).filter(CreativeConcept.is_active == True)
    if niche:
        query = query.filter(CreativeConcept.compatible_niches.contains([niche]))
    if category:
        query = query.filter(CreativeConcept.category == category)
    return query.order_by(CreativeConcept.sort_order).all()
```

### 4. Novo Endpoint: `GET /image-generation/backgrounds`

```python
@router.get("/backgrounds")
async def list_backgrounds(db: Session = Depends(get_db)):
    """Lista backgrounds disponiveis"""
    return db.query(CreativeBackground)\
        .filter(CreativeBackground.is_active == True)\
        .order_by(CreativeBackground.sort_order).all()
```

---

## Resumo das Mudancas

| Tipo | Arquivo/Tabela | Acao |
|------|---------------|------|
| **DB** | `creative_concepts` | CRIAR tabela |
| **DB** | `creative_backgrounds` | CRIAR tabela |
| **DB** | `creative_library` | CRIAR tabela |
| **Backend** | `services/prompt_composer_service.py` | CRIAR servico |
| **Backend** | `services/diversity_service.py` | CRIAR servico |
| **Backend** | `services/creative_concept_service.py` | CRIAR servico |
| **Backend** | `services/context_detector_service.py` | CRIAR servico (opcional) |
| **Backend** | `services/ad_copy_service.py` | CRIAR servico (opcional) |
| **Backend** | `routers/image_generation.py` | ADICIONAR endpoints de conceitos/backgrounds |
| **Backend** | `image_generation_service.py` | MODIFICAR para usar PromptComposer |
| **Frontend** | `ConceptSelector.tsx` | CRIAR componente |
| **Frontend** | `BackgroundSelector.tsx` | CRIAR componente |
| **Frontend** | `ImageGenerationPanel.tsx` | MODIFICAR para incluir conceitos |
| **Frontend** | `CreativeLibrary.tsx` | CRIAR pagina |
| **Seed** | Conceitos iniciais | CRIAR seed com 15-20 conceitos |
| **Seed** | Backgrounds iniciais | CRIAR seed com 10-15 backgrounds |

---

## Dados de Seed Sugeridos

### Conceitos Criativos (Exemplos)

```json
[
  {
    "slug": "product-showcase",
    "name": "Vitrine de Produto",
    "category": "produto",
    "prompt_template": "A professional product photography of {{keyword}} on a clean, minimalist surface. Studio lighting with soft shadows. Focus on details and quality. High-end advertising style."
  },
  {
    "slug": "lifestyle-aspiration",
    "name": "Lifestyle Aspiracional",
    "category": "lifestyle",
    "prompt_template": "A lifestyle photograph showing a person enjoying the benefits of {{keyword}}. Natural lighting, warm tones, authentic moment captured. Modern and aspirational setting."
  },
  {
    "slug": "before-after",
    "name": "Antes e Depois",
    "category": "comparacao",
    "prompt_template": "A split-screen comparison showing the transformation related to {{keyword}}. Left side shows the problem, right side shows the solution. Clean design with visible contrast."
  },
  {
    "slug": "social-proof",
    "name": "Prova Social",
    "category": "prova_social",
    "prompt_template": "A social media style image showing testimonial or user satisfaction related to {{keyword}}. Includes visual elements suggesting community and trust. Modern UI card design."
  },
  {
    "slug": "minimalist-cta",
    "name": "CTA Minimalista",
    "category": "narrativa",
    "prompt_template": "A clean, minimalist advertisement design for {{keyword}}. Bold typography area for headline. Large clear call-to-action button. Professional color scheme. Negative space for readability."
  },
  {
    "slug": "tech-interface",
    "name": "Interface Tecnologica",
    "category": "ui_simulacao",
    "prompt_template": "A mockup of a modern mobile app or dashboard interface related to {{keyword}}. Dark or light mode, clean UI design, data visualization elements. Professional and trustworthy appearance."
  }
]
```

### Backgrounds (Exemplos)

```json
[
  { "slug": "gradient-blue", "name": "Gradiente Azul", "type": "gradient", "prompt_description": "Smooth gradient from deep navy to bright royal blue" },
  { "slug": "gradient-warm", "name": "Gradiente Quente", "type": "gradient", "prompt_description": "Warm gradient from amber to coral orange" },
  { "slug": "solid-white", "name": "Branco Limpo", "type": "solid", "prompt_description": "Clean white background with subtle shadow" },
  { "slug": "solid-dark", "name": "Escuro Elegante", "type": "solid", "prompt_description": "Deep charcoal background with subtle texture" },
  { "slug": "pattern-geometric", "name": "Geometrico", "type": "pattern", "prompt_description": "Subtle geometric pattern in muted tones" },
  { "slug": "photo-nature", "name": "Natureza", "type": "photo", "prompt_description": "Blurred natural background with green foliage and soft bokeh" },
  { "slug": "photo-urban", "name": "Urbano", "type": "photo", "prompt_description": "Modern city architecture blurred in background" },
  { "slug": "gradient-purple", "name": "Gradiente Roxo", "type": "gradient", "prompt_description": "Rich gradient from deep purple to vibrant violet" }
]
```

---

## Ordem de Implementacao Recomendada

1. **Sprint 1**: Criar tabelas + seeds de conceitos e backgrounds
2. **Sprint 2**: Implementar `PromptComposerService` + endpoints
3. **Sprint 3**: Criar `ConceptSelector` e `BackgroundSelector` no frontend
4. **Sprint 4**: Integrar com `ImageGenerationPanel` (manter referencia como alternativa)
5. **Sprint 5**: Implementar `CreativeLibrary` (tabela + pagina)
6. **Sprint 6**: Adicionar diversidade automatica (batch generation)
7. **Sprint 7**: Context detector + prompts configuraveis no banco
