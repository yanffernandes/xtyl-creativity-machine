# Analise de Integracao Real - Alvo Bot → XCM

## Estado Atual do XCM (O Que Ja Temos)

Antes de importar qualquer coisa, e critico entender que o XCM ja possui um sistema sofisticado:

### Ja Temos (NAO precisa reimplementar)

| Funcionalidade | Implementacao XCM | Observacao |
|---------------|-------------------|------------|
| **Geracao de Imagens** | `fal_ai_service.py` com 8 modelos | GPT-Image 1.5, Gemini 3 Pro, Gemini 2.5 Flash, SeeDream |
| **Edicao com Mask/Brush** | `BrushCanvas.tsx` + inpaint endpoint | Superior ao Alvo Bot (que nao tem edicao) |
| **Style Presets** | Tabela `style_presets` com `prompt_modifier` | Estilos textuais que sao injetados no prompt |
| **Visual Assets Library** | `Document.is_reference_asset` + classificacao por IA | Logos, Pessoas, Backgrounds, Produtos, Referencias |
| **Auto-inject de Assets** | `visual_asset_service.get_intelligent_visual_context()` | IA seleciona assets relevantes para o prompt |
| **Brand Context** | `prompt_enrichment_service.py` extrai cores/tipografia do projeto | Injeta paleta de cores e tipografia no prompt |
| **Batch Generation** | `/generate-batch` com SSE streaming | Variacoes com style modifiers paralelas |
| **Background Removal** | `fal-ai/bria/background/remove` | Endpoint dedicado |
| **Upscale/Enhance** | `fal-ai/clarity-upscaler` | 2x/4x com enhancement types |
| **Campaign Packages** | Tabela `campaign_packages` + Documents | Agrupamento de criativos por campanha |
| **Copy Library** | Tabela `copy_library_items` | Textos reutilizaveis por workspace |
| **Refinement Chain** | `original_image_id` + `refinement_history` | Rastreamento de versoes |
| **Variation Sets** | `variation_set_id` + `variation_index` | Agrupamento de variacoes batch |

### NAO Temos (Oportunidade de Importar)

| Funcionalidade | O Que o Alvo Bot Faz | Impacto |
|---------------|---------------------|---------|
| **Conceitos Criativos** | Templates de prompt reutilizaveis com variaveis | ALTO - melhora qualidade e consistencia |
| **Creative Library (gerados)** | Biblioteca de imagens *geradas* aprovadas para reutilizacao | ALTO - evita regerar imagens |
| **Diversidade Automatica** | Score de diversidade + janelas de repeticao | MEDIO - importante para batch |
| **Ad Copy Generation** | Geracao de textos de anuncio (headline, primary, CTA) | MEDIO - util para campanhas |
| **Deteccao de Contexto** | Classifica projeto/prompt por nicho | BAIXO - temos brand context |
| **Prompt Multi-Camada** | 7 camadas de composicao | MEDIO - evolucao do enrichment |
| **Regras de Tipografia** | 48pt headlines, 28pt body para mobile | BAIXO - regra de prompt |

---

## Analise Detalhada: O Que Faz Sentido Importar

### 1. CONCEITOS CRIATIVOS - Sim, importar

**Por que**: Hoje o usuario tem dois caminhos para definir estilo: (a) escolher um `style_preset` ou (b) anexar uma imagem de referencia. Ambos sao limitados - presets sao genericos demais e referencia exige que o usuario ja tenha uma imagem.

**Conceitos criativos** sao um meio-termo poderoso: templates de prompt detalhados que descrevem uma *abordagem narrativa* para o criativo, nao apenas um estilo visual.

**Exemplo pratico**:
- `style_preset` = "Photographic" → adiciona "professional photography, sharp focus" ao prompt
- `creative_concept` = "Interface de App" → adiciona "A mobile phone screen showing a loan simulator app with dark mode UI, green accent buttons, input fields for amount and term, realistic device mockup"

**Integracao com o que ja existe**:

A tabela `style_presets` ja tem a estrutura certa (`slug`, `prompt_modifier`, `category`). Podemos **estender** ela em vez de criar uma tabela nova:

```sql
-- Opcao A: Estender style_presets (RECOMENDADO)
ALTER TABLE style_presets
  ADD COLUMN preset_type TEXT DEFAULT 'style'
    CHECK (preset_type IN ('style', 'marketing', 'concept')),
  ADD COLUMN prompt_template TEXT,       -- Template com {{variaveis}}
  ADD COLUMN variables JSONB DEFAULT '[]',  -- Descricao das variaveis
  ADD COLUMN compatible_contexts TEXT[] DEFAULT '{"generic"}';

-- Opcao B: Criar tabela separada (so se quiser separacao total)
-- Ver proposta no doc 07-guia-migracao.md
```

**Ja existe `preset_type`** com valores `'style'` e `'marketing'`. Basta adicionar `'concept'` e os campos extras.

**Diferenca pratica**:
```
preset_type='style'   → prompt_modifier simples ("photographic, sharp focus")
preset_type='concept' → prompt_template com variaveis ("A {{subject}} showing...")
```

### 2. CREATIVE LIBRARY (Imagens Geradas Aprovadas) - Sim, importar

**Por que**: Hoje quando o usuario gera uma imagem boa, ela fica como um `Document` no projeto. Nao tem como "favoritar" para reutilizar em outro contexto ou campanha. Cada geracao e descartavel.

**Integracao com o que ja existe**:

A tabela `Document` ja armazena tudo que precisamos. Em vez de criar tabela nova, podemos usar **campos existentes**:

```sql
-- Opcao A: Usar campo existente no Document (RECOMENDADO)
ALTER TABLE documents
  ADD COLUMN is_library_item BOOLEAN DEFAULT false,
  ADD COLUMN library_status TEXT CHECK (library_status IN ('approved', 'archived')),
  ADD COLUMN concept_slug TEXT,              -- Conceito criativo usado
  ADD COLUMN diversity_metadata JSONB;       -- Metadata de diversidade da sessao

CREATE INDEX idx_documents_library ON documents(is_library_item)
  WHERE is_library_item = true AND deleted_at IS NULL;
```

**Por que NAO criar tabela separada**: O `Document` ja tem `file_url`, `generation_metadata`, `project_id`, `media_type`, `asset_tags`, `ai_description`. Duplicar tudo isso em `creative_library` seria redundante. O `Document` e a entidade central.

**Fluxo proposto**:
```
Imagem gerada → Document (media_type='image')
                    │
                    │ Usuario clica "Salvar na Biblioteca"
                    ▼
                Document.is_library_item = true
                Document.library_status = 'approved'
                    │
                    │ Em nova geracao, usuario pode:
                    ▼
                "Usar da Biblioteca" → Lista Documents
                    WHERE is_library_item = true
                    AND project_id = current_project
```

### 3. DIVERSIDADE AUTOMATICA - Sim, importar (parcialmente)

**Por que**: No batch generation, todas as variacoes usam o mesmo modelo (fal.ai) e o mesmo style_modifier. O Andromeda garante que cada imagem use combinacao diferente de conceito + background + modelo.

**O que ja temos**: `variation_modifier` e `variation_index` no Document. O batch ja gera variacoes, mas sem rotacao de conceitos/backgrounds.

**O que importar**: Apenas o algoritmo de selecao, nao a infraestrutura toda.

```python
# backend/services/diversity_service.py (NOVO - mas simples)

class DiversityService:
    """Selecao diversa para batch generation"""

    @staticmethod
    def select_diverse_concepts(
        available_concepts: list,
        count: int,
        recently_used: list = None
    ) -> list:
        """Seleciona N conceitos evitando repeticao dos ultimos 3"""
        window = (recently_used or [])[-3:]
        pool = [c for c in available_concepts if c['slug'] not in window]
        if len(pool) < count:
            pool = available_concepts  # Reset
        return random.sample(pool, min(count, len(pool)))

    @staticmethod
    def select_diverse_models(count: int, available_models: list) -> list:
        """Round-robin entre modelos disponiveis"""
        result = []
        for i in range(count):
            result.append(available_models[i % len(available_models)])
        return result

    @staticmethod
    def calculate_diversity_score(
        unique_concepts: int,
        unique_models: int,
        total: int
    ) -> float:
        if total == 0:
            return 0
        return (unique_concepts / total) * 60 + (unique_models / total) * 40
```

### 4. AD COPY GENERATION - Avaliar necessidade

**O que e**: Geracao automatica de textos de anuncio (headline, primary text, description, CTA) para cada imagem.

**Ja temos similar**: O `copy_library_items` armazena textos reutilizaveis. O chat com templates ja gera copies. Workflows com `text_generation` nodes tambem.

**Quando faria sentido**: Se implementarmos publicacao direta para Meta/Google Ads. Hoje nao temos essa integracao.

**Recomendacao**: NAO importar agora. Focar em conceitos criativos e biblioteca primeiro. Ad copy pode vir depois como feature independente quando houver integracao com plataformas de anuncio.

### 5. DETECCAO DE CONTEXTO/NICHO - NAO importar

**Por que nao**: Ja temos `Project.settings` com brand identity e o `prompt_enrichment_service` que injeta contexto de marca. O sistema de nicho do Alvo Bot e especifico para artigos de blog → anuncios, que nao e nosso caso.

**Alternativa melhor**: Usar tags do projeto (`Document.tags`) e brand context que ja existem para personalizar a geracao.

### 6. PROMPT MULTI-CAMADA - Importar como evolucao do enrichment

**O que temos**: `prompt_enrichment_service.py` que injeta brand context (cores, tipografia) no prompt.

**O que o Alvo Bot faz**: 7 camadas de composicao (conceito + visual group + background + niche + text overlay + localizacao + direcoes).

**Proposta**: Evoluir o `prompt_enrichment_service.py` para aceitar conceito criativo como camada adicional:

```python
# Evolucao do prompt_enrichment_service.py

async def enrich_prompt(
    self, prompt: str, project_id: str, db: Session,
    concept_slug: str = None,  # NOVO
    background_desc: str = None,  # NOVO
) -> str:
    """
    Prompt enrichment com camadas:
    1. Prompt original do usuario
    2. Conceito criativo (se selecionado) ← NOVO
    3. Background (se selecionado) ← NOVO
    4. Brand context (cores, tipografia) ← JA EXISTE
    5. Visual assets context ← JA EXISTE
    6. Regras globais (tipografia mobile, no text) ← NOVO
    """
```

---

## Proposta Final de Banco de Dados

### Alteracoes Minimas em Tabelas Existentes

```sql
-- =========================================
-- 1. ESTENDER style_presets para suportar conceitos
-- =========================================
ALTER TABLE style_presets
  ADD COLUMN IF NOT EXISTS prompt_template TEXT,
  ADD COLUMN IF NOT EXISTS template_variables JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS compatible_contexts TEXT[] DEFAULT '{"generic"}';

-- Atualizar CHECK constraint do preset_type (ja existe 'style', 'marketing')
-- Adicionar 'concept' como tipo valido
-- Nota: Depende de como o constraint foi criado originalmente

-- =========================================
-- 2. ESTENDER documents para Creative Library
-- =========================================
ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS is_library_item BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS library_status TEXT
    CHECK (library_status IN ('approved', 'archived', NULL)),
  ADD COLUMN IF NOT EXISTS concept_slug TEXT,
  ADD COLUMN IF NOT EXISTS diversity_metadata JSONB;

CREATE INDEX IF NOT EXISTS idx_documents_library
  ON documents(project_id, created_at DESC)
  WHERE is_library_item = true AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_documents_concept
  ON documents(concept_slug)
  WHERE concept_slug IS NOT NULL;
```

### Tabela Nova (Unica)

```sql
-- =========================================
-- 3. BACKGROUNDS criativos (descricao textual)
-- =========================================
-- Nota: Poderiamos colocar em style_presets com preset_type='background',
-- mas sao semanticamente diferentes (fundo vs estilo global).
-- Decidir se faz sentido como tabela separada ou mais uma row em style_presets.

-- Opcao A: Rows em style_presets (mais simples)
INSERT INTO style_presets (name, name_pt, slug, prompt_modifier, category, preset_type, sort_order)
VALUES
  ('Blue Gradient', 'Gradiente Azul', 'bg-gradient-blue',
   'Background: smooth gradient from deep navy to bright royal blue', 'background', 'background', 1),
  ('Warm Gradient', 'Gradiente Quente', 'bg-gradient-warm',
   'Background: warm gradient from amber to coral orange', 'background', 'background', 2),
  ('Clean White', 'Branco Limpo', 'bg-solid-white',
   'Background: clean white with subtle shadow', 'background', 'background', 3),
  ('Dark Elegant', 'Escuro Elegante', 'bg-solid-dark',
   'Background: deep charcoal with subtle texture', 'background', 'background', 4),
  ('Geometric Pattern', 'Padrao Geometrico', 'bg-pattern-geometric',
   'Background: subtle geometric pattern in muted tones', 'background', 'background', 5),
  ('Nature Blur', 'Natureza Desfocada', 'bg-nature',
   'Background: blurred natural green foliage with soft bokeh', 'background', 'background', 6),
  ('Urban Modern', 'Urbano Moderno', 'bg-urban',
   'Background: modern city architecture, blurred, glass and steel', 'background', 'background', 7),
  ('Purple Gradient', 'Gradiente Roxo', 'bg-gradient-purple',
   'Background: rich gradient from deep purple to vibrant violet', 'background', 'background', 8);
```

### Seeds de Conceitos Criativos

```sql
-- =========================================
-- 4. CONCEITOS CRIATIVOS como style_presets tipo 'concept'
-- =========================================
INSERT INTO style_presets (name, name_pt, slug, prompt_modifier, prompt_template, category, preset_type, template_variables, sort_order)
VALUES
  -- Conceito: Vitrine de Produto
  ('Product Showcase', 'Vitrine de Produto', 'concept-product-showcase',
   'professional product photography, studio lighting, clean surface',
   'Professional product photography of {{subject}} on a clean minimalist surface. Studio lighting with soft shadows. Focus on details and quality. High-end advertising style. {{background}}',
   'concept', 'concept',
   '[{"key": "subject", "label": "Assunto/Produto", "required": true}, {"key": "background", "label": "Fundo", "required": false}]',
   1),

  -- Conceito: Lifestyle Aspiracional
  ('Aspirational Lifestyle', 'Lifestyle Aspiracional', 'concept-lifestyle',
   'lifestyle photography, natural lighting, authentic moments',
   'Lifestyle photograph showing a person enjoying the benefits of {{subject}}. Natural lighting, warm tones, authentic moment. Modern aspirational setting. {{background}}',
   'concept', 'concept',
   '[{"key": "subject", "label": "Beneficio/Produto", "required": true}, {"key": "background", "label": "Fundo", "required": false}]',
   2),

  -- Conceito: Antes e Depois
  ('Before & After', 'Antes e Depois', 'concept-before-after',
   'split screen comparison, clear contrast, transformation',
   'Split-screen comparison showing transformation related to {{subject}}. Left side shows the problem/before state, right side shows the solution/after state. Clean design with visible contrast. {{background}}',
   'concept', 'concept',
   '[{"key": "subject", "label": "Transformacao", "required": true}, {"key": "background", "label": "Fundo", "required": false}]',
   3),

  -- Conceito: Prova Social
  ('Social Proof', 'Prova Social', 'concept-social-proof',
   'testimonial card, user satisfaction, trust elements',
   'Social media style testimonial card showing user satisfaction with {{subject}}. Modern card UI design with avatar, star rating, quote text. Trust-building visual elements. {{background}}',
   'concept', 'concept',
   '[{"key": "subject", "label": "Produto/Servico", "required": true}, {"key": "background", "label": "Fundo", "required": false}]',
   4),

  -- Conceito: Interface de App/Dashboard
  ('App Interface', 'Interface de App', 'concept-app-interface',
   'mobile app mockup, modern UI, clean interface',
   'Realistic mobile phone mockup showing a modern app interface for {{subject}}. Clean UI design with data visualization, progress bars, action buttons. Dark or light mode. Professional and trustworthy. {{background}}',
   'concept', 'concept',
   '[{"key": "subject", "label": "Funcionalidade", "required": true}, {"key": "background", "label": "Fundo", "required": false}]',
   5),

  -- Conceito: CTA Minimalista
  ('Minimalist CTA', 'CTA Minimalista', 'concept-minimalist-cta',
   'minimalist design, bold typography, call to action',
   'Clean minimalist advertisement for {{subject}}. Bold typography with large headline area. Prominent call-to-action button. Professional color scheme. Generous negative space for readability. Mobile-optimized: headline minimum 48pt. {{background}}',
   'concept', 'concept',
   '[{"key": "subject", "label": "Oferta/Produto", "required": true}, {"key": "background", "label": "Fundo", "required": false}]',
   6),

  -- Conceito: Hero Shot
  ('Hero Shot', 'Imagem Hero', 'concept-hero-shot',
   'hero image, dramatic composition, eye-catching',
   'Dramatic hero shot for {{subject}}. Eye-catching composition with dynamic angles. Professional lighting creating depth and dimension. High impact visual suitable for landing pages and advertisements. {{background}}',
   'concept', 'concept',
   '[{"key": "subject", "label": "Assunto Principal", "required": true}, {"key": "background", "label": "Fundo", "required": false}]',
   7),

  -- Conceito: Flat Lay
  ('Flat Lay', 'Flat Lay', 'concept-flat-lay',
   'flat lay photography, top-down view, organized arrangement',
   'Flat lay top-down photograph with {{subject}} as centerpiece. Carefully arranged supporting elements around the main subject. Consistent color palette. Clean surface. Professional styling with intentional negative space. {{background}}',
   'concept', 'concept',
   '[{"key": "subject", "label": "Objeto Central", "required": true}, {"key": "background", "label": "Fundo", "required": false}]',
   8),

  -- Conceito: Infografico Visual
  ('Visual Infographic', 'Infografico Visual', 'concept-infographic',
   'infographic style, data visualization, informative design',
   'Modern visual infographic about {{subject}}. Clean data visualization with icons, numbers, and minimal text placeholders. Professional color-coded sections. Easy to understand at a glance. Mobile-friendly layout. {{background}}',
   'concept', 'concept',
   '[{"key": "subject", "label": "Tema/Dados", "required": true}, {"key": "background", "label": "Fundo", "required": false}]',
   9),

  -- Conceito: Emocional/Storytelling
  ('Emotional Story', 'Historia Emocional', 'concept-emotional',
   'emotional photography, storytelling, human connection',
   'Emotionally compelling photograph telling a story about {{subject}}. Captures a genuine human moment. Warm, inviting color palette. Soft focus on background. Evokes empathy and connection. {{background}}',
   'concept', 'concept',
   '[{"key": "subject", "label": "Narrativa/Emocao", "required": true}, {"key": "background", "label": "Fundo", "required": false}]',
   10);
```

---

## Mapa de Integracao nos Servicos Existentes

### Backend - Fluxo Atual vs Proposto

```
=== ATUAL ===

User Prompt
  → prompt_enrichment_service.enrich_prompt()
      → Injeta brand context (cores, tipografia)
  → visual_asset_service.get_intelligent_visual_context()
      → Seleciona assets relevantes do projeto
  → fal_ai_service.generate_image()
  → Document criado com generation_metadata

=== PROPOSTO ===

User Prompt + [Conceito Criativo] + [Background]
  │
  ├── Se conceito selecionado:
  │   → Busca prompt_template do conceito (style_presets WHERE slug=X)
  │   → Substitui {{variaveis}} no template
  │   → Resultado: prompt enriquecido com abordagem narrativa
  │
  ├── Se background selecionado:
  │   → Busca prompt_modifier do background (style_presets WHERE slug=X)
  │   → Adiciona descricao textual de fundo
  │
  ├── prompt_enrichment_service.enrich_prompt()  ← JA EXISTE
  │   → Injeta brand context (cores, tipografia)
  │
  ├── visual_asset_service.get_intelligent_visual_context()  ← JA EXISTE
  │   → Seleciona assets relevantes
  │   → NOTA: Se conceito foi usado, pode pular auto-inject (redundante)
  │
  ├── [NOVO] diversity_service.select_diverse_models() (se batch)
  │   → Rotaciona entre modelos fal.ai disponiveis
  │
  └── fal_ai_service.generate_image()  ← JA EXISTE
      → Document criado com:
          generation_metadata + concept_slug + diversity_metadata
          │
          └── Se usuario aprova: is_library_item = true
```

### Novos Endpoints Necessarios

```python
# Em routers/image_generation.py - ADICIONAR

@router.get("/concepts")
async def list_concepts(category: Optional[str] = None):
    """Lista conceitos criativos disponiveis"""
    # Busca style_presets WHERE preset_type = 'concept'

@router.get("/backgrounds")
async def list_backgrounds():
    """Lista backgrounds disponiveis"""
    # Busca style_presets WHERE preset_type = 'background'

@router.post("/library/save")
async def save_to_library(document_id: str):
    """Salva imagem na Creative Library"""
    # Seta document.is_library_item = true, library_status = 'approved'

@router.get("/library")
async def list_library(project_id: str, concept: Optional[str] = None):
    """Lista imagens da Creative Library"""
    # Busca Documents WHERE is_library_item = true

@router.delete("/library/{document_id}")
async def remove_from_library(document_id: str):
    """Remove imagem da Creative Library (nao deleta, so desmarca)"""
    # Seta document.is_library_item = false
```

### Novo Servico Necessario

```python
# backend/services/creative_concept_service.py (NOVO - ~100 linhas)

class CreativeConceptService:
    """Gerencia conceitos criativos e composicao de prompts"""

    def get_concepts(self, db, category=None) -> list:
        """Lista conceitos ativos"""

    def get_backgrounds(self, db) -> list:
        """Lista backgrounds ativos"""

    def compose_concept_prompt(
        self,
        base_prompt: str,
        concept_slug: str,
        variables: dict,
        background_slug: str = None,
        db: Session = None
    ) -> str:
        """Compoe prompt com conceito + background"""

    def resolve_template(self, template: str, variables: dict) -> str:
        """Substitui {{variaveis}} no template"""
```

### Frontend - Componentes Novos

```
components/
  creative-concepts/
    ConceptSelector.tsx      # Grid de conceitos para selecao
    BackgroundSelector.tsx   # Lista de backgrounds
    CreativeLibrary.tsx      # Pagina da biblioteca
    LibraryCard.tsx          # Card de imagem na biblioteca
```

**Integracao no ImageGenerationPanel.tsx**:
```typescript
// Adicionar tabs: "Prompt Livre" | "Conceito Criativo" | "Da Biblioteca"
// Tab "Conceito Criativo" mostra ConceptSelector + BackgroundSelector
// Tab "Da Biblioteca" mostra CreativeLibrary com busca
```

---

## Resumo: O Que Fazer e O Que NAO Fazer

### FAZER

| Acao | Complexidade | Impacto |
|------|-------------|---------|
| Estender `style_presets` com `preset_type='concept'` | Baixa | Alto |
| Adicionar `is_library_item` ao `Document` | Baixa | Alto |
| Criar seeds de 10 conceitos + 8 backgrounds | Baixa | Alto |
| Criar `creative_concept_service.py` (~100 linhas) | Baixa | Alto |
| Criar `ConceptSelector.tsx` | Media | Alto |
| Evoluir `prompt_enrichment_service.py` | Media | Alto |
| Adicionar 5 endpoints na API | Media | Alto |
| Criar `CreativeLibrary.tsx` | Media | Medio |
| Implementar diversidade em batch | Media | Medio |

### NAO FAZER (agora)

| Acao | Motivo |
|------|--------|
| Criar tabela `creative_library` separada | Redundante - Document ja tem tudo |
| Criar tabela `campaign_creatives` | Redundante - ja temos campaign_packages |
| Implementar Ad Copy generation | Nao temos integracao com Meta/Google Ads |
| Implementar niche detection | Temos brand context que atende |
| Criar sistema SSE com slots | Ja temos SSE batch funcionando |
| Implementar pending generation | fal.ai ja gerencia filas internamente |
| Copiar o CreativeSessionService | In-memory sessions sao para NestJS, FastAPI usa diferente |
| Importar sistema de creditos | Nao temos billing |

---

## Ordem de Implementacao

```
Sprint 1 (2-3 dias):
├── Migration: ALTER style_presets + ALTER documents
├── Seeds: 10 conceitos + 8 backgrounds
└── Backend: creative_concept_service.py + 2 endpoints (GET /concepts, /backgrounds)

Sprint 2 (3-4 dias):
├── Frontend: ConceptSelector.tsx + BackgroundSelector.tsx
├── Integrar no ImageGenerationPanel.tsx (nova tab "Conceito Criativo")
└── Backend: Evoluir prompt_enrichment para aceitar conceito

Sprint 3 (2-3 dias):
├── Backend: Endpoints de library (save, list, remove)
├── Frontend: CreativeLibrary.tsx + LibraryCard.tsx
└── Integrar no ImageGenerationPanel.tsx (nova tab "Da Biblioteca")

Sprint 4 (2-3 dias):
├── Backend: diversity_service.py
├── Integrar diversidade no batch generation
└── Exibir diversity_metadata nos resultados
```
