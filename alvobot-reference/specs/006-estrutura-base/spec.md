# Feature Specification: Estrutura de Base

**Feature Branch**: `006-estrutura-base`
**Created**: 2025-12-11
**Status**: ✅ Implementado
**Priority**: P2 - Core Feature

## Overview

Wizard completo para criar e gerenciar a estrutura de conteúdo de um blog WordPress através do AlvoBot. O wizard guia o usuário através de 5 etapas: seleção de projeto, geração de nicho via IA (n8n), criação de categorias, configuração de tipo de instalação e geração de artigos de base.

### Problem Statement

Usuários precisam estabelecer rapidamente a estrutura fundamental de um blog (nicho, categorias, subcategorias, tags e autores) antes de começar a produzir conteúdo. Atualmente, esse processo é manual e tedioso, exigindo múltiplas operações separadas.

### Goals

1. **Wizard Intuitivo**: Fluxo guiado de 5 etapas para configuração completa
2. **Geração de Nicho via IA**: Integração com n8n para gerar sugestões de nicho baseadas em análise de mercado
3. **Categorização Inteligente**: Sistema de 3 camadas (categorias, subcategorias, tags) com drag-and-drop
4. **Configuração Flexível**: Instalação rápida ou customizada com autores e artigos de base
5. **Performance**: Operações assíncronas com progress tracking para lotes grandes

### Non-Goals

- Edição de artigos de base (isso é feature 007)
- Publicação direta no WordPress (apenas salva no Supabase)
- Geração de imagens para artigos
- Integração com Meta/Google Ads

## Technical Architecture

### Architecture Decision

**Frontend → n8n (via Backend) + Supabase Direct**

```
┌─────────────────────────────────────────────────────┐
│ Frontend (React)                                    │
│ - Wizard UI (5 steps)                              │
│ - TanStack Query (data fetching)                   │
│ - Zustand (wizard state)                           │
└─────────────────┬───────────────────────────────────┘
                  │
        ┌─────────┼─────────┐
        │                   │
        ▼                   ▼
┌───────────────┐   ┌──────────────────┐
│ Backend       │   │ Supabase         │
│ (NestJS)      │   │ - RLS protected  │
│               │   │ - Direct CRUD    │
│ /n8n/generate-│   │   tables:        │
│   niche       │   │   - base_        │
│               │   │     structure_   │
│ /n8n/generate-│   │     categories   │
│   categories  │   │   - base_        │
│               │   │     structure_   │
│ /n8n/generate-│   │     authors      │
│   base-       │   │   - base_        │
│   articles    │   │     articles     │
└───────┬───────┘   │   - projects     │
        │           └──────────────────┘
        ▼
┌───────────────┐
│ n8n Workflows │
│ - Niche gen   │
│ - Category gen│
│ - Article gen │
└───────────────┘
```

**Why This Architecture:**

1. **n8n via Backend**: Webhook URLs e lógica de IA devem ficar no backend por segurança
2. **Supabase Direct**: CRUD simples de estrutura (categorias, autores) pode ser feito diretamente com RLS
3. **Async Operations**: Geração de artigos pode levar minutos - usar polling ou webhooks para status
4. **No Temporal**: Removido para simplificar - usar promises/polling simples

### Database Schema

```sql
-- Categorias (3 camadas: categorias, subcategorias, tags)
CREATE TABLE base_structure_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT,
  description TEXT,
  parent_id UUID REFERENCES base_structure_categories(id) ON DELETE CASCADE,
  layer INTEGER NOT NULL CHECK (layer IN (1, 2, 3)), -- 1=Category, 2=Subcategory, 3=Tag
  "order" INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

-- Autores (camada 4)
CREATE TABLE base_structure_authors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  bio TEXT,
  avatar_url TEXT,
  role TEXT, -- 'Writer', 'Editor', 'Reviewer'
  social_links JSONB, -- {twitter, linkedin, website}
  "order" INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

-- Artigos de base (gerados após estrutura aprovada)
CREATE TABLE base_articles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  content TEXT NOT NULL,
  category_id UUID REFERENCES base_structure_categories(id),
  subcategory_id UUID REFERENCES base_structure_categories(id),
  tag_ids UUID[], -- Array of tag IDs
  author_id UUID REFERENCES base_structure_authors(id),
  status TEXT NOT NULL DEFAULT 'draft', -- draft, ready, published
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ,

  UNIQUE(project_id, slug)
);

-- Pool de imagens de perfil de autores (compartilhado)
CREATE TABLE author_profile_images (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  path TEXT NOT NULL UNIQUE,
  age TEXT, -- 'young', 'middle', 'senior'
  sex TEXT, -- 'male', 'female', 'neutral'
  usage_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_categories_project ON base_structure_categories(project_id, layer);
CREATE INDEX idx_categories_parent ON base_structure_categories(parent_id);
CREATE INDEX idx_authors_project ON base_structure_authors(project_id);
CREATE INDEX idx_base_articles_project ON base_articles(project_id, status);
CREATE INDEX idx_base_articles_category ON base_articles(category_id);
```

### Row Level Security (RLS)

```sql
-- Categorias: usuários podem ver/editar suas próprias estruturas
ALTER TABLE base_structure_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own categories"
  ON base_structure_categories FOR SELECT
  USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own categories"
  ON base_structure_categories FOR INSERT
  WITH CHECK (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own categories"
  ON base_structure_categories FOR UPDATE
  USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own categories"
  ON base_structure_categories FOR DELETE
  USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

-- Mesmas políticas para base_structure_authors e base_articles

-- Pool de imagens: todos podem ler, apenas admins inserem
ALTER TABLE author_profile_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view profile images"
  ON author_profile_images FOR SELECT
  USING (true);
```

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Wizard Navigation (Priority: P1)

Como usuário, eu quero navegar através do wizard de estrutura de base de forma linear e intuitiva, podendo voltar para ajustar escolhas anteriores.

**Why this priority**: O wizard é a interface principal da feature. Sem navegação clara, usuários ficarão perdidos.

**Independent Test**: Testar navegação entre steps, validação de cada etapa, e impossibilidade de pular steps sem completar o anterior.

**Acceptance Scenarios**:

1. **Given** usuário está no Step 1 sem projeto selecionado, **When** clica em "Próximo", **Then** botão está desabilitado ou mostra mensagem de validação
2. **Given** usuário completou Step 2 (nicho), **When** clica em "Voltar", **Then** retorna para Step 1 com projeto ainda selecionado
3. **Given** usuário está no Step 3, **When** clica no indicador do Step 1, **Then** navega diretamente para Step 1
4. **Given** usuário está no Step 5, **When** seleciona menos de 30 artigos, **Then** botão "Finalizar" está desabilitado

---

### User Story 2 - Seleção de Projeto (Priority: P1)

Como usuário, eu quero selecionar um projeto existente ou criar um novo projeto diretamente do wizard.

**Why this priority**: Projeto é o contexto fundamental - sem ele, nada mais funciona.

**Independent Test**: Listar projetos, selecionar um, criar novo projeto inline.

**Acceptance Scenarios**:

1. **Given** usuário tem 3 projetos, **When** abre wizard, **Then** vê dropdown com os 3 projetos
2. **Given** usuário seleciona um projeto, **When** avança para próximo step, **Then** projeto fica selecionado
3. **Given** usuário clica em "Novo Projeto", **When** preenche form e salva, **Then** novo projeto aparece selecionado no dropdown

---

### User Story 3 - Geração de Nicho via IA (Priority: P1)

Como usuário, eu quero gerar sugestões de nicho baseadas em análise de mercado via IA (n8n workflow), selecionar um nicho ou inserir um personalizado.

**Why this priority**: Nicho define toda a estrutura subsequente - é a base da base.

**Independent Test**: Acionar geração, aguardar sugestões, selecionar ou customizar nicho.

**Acceptance Scenarios**:

1. **Given** usuário clica "Gerar Nicho", **When** n8n processa, **Then** vê loading state por até 30 segundos
2. **Given** n8n retorna 5 sugestões, **When** visualiza lista, **Then** cada sugestão mostra nome e descrição breve
3. **Given** usuário seleciona sugestão, **When** avança, **Then** nicho fica salvo no projeto
4. **Given** usuário digita nicho customizado, **When** avança, **Then** nicho customizado é aceito
5. **Given** n8n falha, **When** timeout ou erro, **Then** mostra erro e permite input manual

---

### User Story 4 - Geração e Seleção de Categorias (Priority: P1)

Como usuário, eu quero gerar categorias baseadas no nicho escolhido, reordená-las por drag-and-drop, e selecionar quais usar.

**Why this priority**: Categorias estruturam o conteúdo - essencial para organização do blog.

**Independent Test**: Gerar categorias, drag-drop para reordenar, selecionar mínimo 3.

**Acceptance Scenarios**:

1. **Given** nicho está definido, **When** clica "Gerar Categorias", **Then** n8n retorna 10-15 sugestões
2. **Given** categorias são exibidas, **When** arrasta categoria para cima, **Then** ordem muda visualmente e no estado
3. **Given** usuário seleciona 5 categorias, **When** tenta avançar, **Then** pode prosseguir (mínimo é 3)
4. **Given** usuário adiciona categoria manual, **When** digita nome e clica "+", **Then** categoria aparece na lista
5. **Given** categorias estão selecionadas, **When** avança para instalação, **Then** categorias são salvas no Supabase

---

### User Story 5 - Tipo de Instalação (Priority: P2)

Como usuário, eu quero escolher entre instalação rápida (padrões) ou customizada (subcategorias, tags, autores).

**Why this priority**: Flexibilidade importante, mas não bloqueia fluxo básico.

**Independent Test**: Selecionar "Rápida" vs "Customizada" e verificar opções.

**Acceptance Scenarios**:

1. **Given** instalação rápida selecionada, **When** avança, **Then** pula configuração de subcategorias/tags/autores
2. **Given** instalação customizada selecionada, **When** vê opções, **Then** pode habilitar/desabilitar subcategorias, tags, autores
3. **Given** "Criar Subcategorias" habilitado, **When** avança, **Then** próximo step permite configurar subcategorias
4. **Given** "Criar Autores" habilitado, **When** avança, **Then** pode adicionar autores com nome, bio, foto

---

### User Story 6 - Geração de Artigos de Base (Priority: P2)

Como usuário, eu quero gerar artigos de base em lote (30-50) baseados nas categorias, com progress tracking.

**Why this priority**: Operação longa e crítica, mas depende de steps anteriores.

**Independent Test**: Acionar geração, monitorar progresso, cancelar se necessário.

**Acceptance Scenarios**:

1. **Given** estrutura está completa, **When** clica "Gerar Artigos", **Then** backend inicia job assíncrono via n8n
2. **Given** job está rodando, **When** frontend faz polling, **Then** vê progress bar atualizada (ex: 15/50 concluídos)
3. **Given** job está 50% completo, **When** usuário clica "Cancelar", **Then** job para e artigos parciais são salvos
4. **Given** job completa, **When** vê resultado, **Then** mostra "50 artigos criados com sucesso"
5. **Given** job falha parcialmente, **When** vê resultado, **Then** mostra "35/50 criados, 15 falharam" com detalhes

---

### User Story 7 - Aprovação de Estrutura (Priority: P3)

Como usuário, eu quero revisar a estrutura completa e submeter para aprovação antes de publicar artigos.

**Why this priority**: Nice-to-have - validação adicional opcional.

**Independent Test**: Ver checklist de validação, submeter, aguardar aprovação.

**Acceptance Scenarios**:

1. **Given** estrutura completa, **When** vê checklist, **Then** mostra validações (mínimo 3 categorias, etc)
2. **Given** todas validações passam, **When** clica "Submeter", **Then** status muda para "Pendente"
3. **Given** falta validação obrigatória, **When** tenta submeter, **Then** mostra erro específico

---

## API Contracts *(mandatory)*

### Frontend → Backend (n8n Integration)

#### POST `/api/n8n/generate-niche`

**Request:**
```typescript
{
  projectId: number
  context?: string // Optional user input for more targeted niche
}
```

**Response:**
```typescript
{
  suggestions: Array<{
    id: string
    name: string
    description: string
    confidence: number // 0-100
  }>
  processingTime: number // milliseconds
}
```

**Error Cases:**
- 400: Invalid projectId
- 408: n8n timeout (>30s)
- 500: n8n workflow failed
- 503: n8n unavailable

---

#### POST `/api/n8n/generate-categories`

**Request:**
```typescript
{
  projectId: number
  niche: string
  count?: number // Default: 12
}
```

**Response:**
```typescript
{
  categories: Array<{
    id: string
    name: string
    description: string
    suggestedSlug: string
  }>
}
```

**Error Cases:**
- 400: Invalid input
- 408: Timeout
- 500: Generation failed

---

#### POST `/api/n8n/generate-base-articles`

**Request:**
```typescript
{
  projectId: number
  categoryIds: string[]
  installationConfig: {
    articleCount: number // 30-100
    withSubcategories: boolean
    withTags: boolean
    authorId?: string
  }
}
```

**Response (Async Job):**
```typescript
{
  jobId: string
  status: 'queued' | 'running' | 'completed' | 'failed'
  estimatedTime: number // seconds
}
```

**Polling Endpoint:** GET `/api/n8n/jobs/:jobId`

```typescript
{
  jobId: string
  status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled'
  progress: {
    current: number
    total: number
    percentage: number
  }
  result?: {
    articlesCreated: number
    articlesFailed: number
    errors: string[]
  }
}
```

---

### Frontend → Supabase (Direct CRUD)

#### Categories

**Query:**
```typescript
// features/base-structure/api/useCategories.ts
const { data: categories } = useQuery({
  queryKey: ['baseStructure', 'categories', projectId],
  queryFn: async () => {
    const { data, error } = await supabase
      .from('base_structure_categories')
      .select('*')
      .eq('project_id', projectId)
      .order('layer', { ascending: true })
      .order('order', { ascending: true })
    if (error) throw error
    return data
  }
})
```

**Mutation (Create):**
```typescript
const createCategory = useMutation({
  mutationFn: async (input: CreateCategoryInput) => {
    const { data, error } = await supabase
      .from('base_structure_categories')
      .insert(input)
      .select()
      .single()
    if (error) throw error
    return data
  }
})
```

**Mutation (Reorder):**
```typescript
const reorderCategories = useMutation({
  mutationFn: async ({ projectId, orderedIds }: { projectId: number, orderedIds: string[] }) => {
    const updates = orderedIds.map((id, index) => ({
      id,
      order: index + 1,
      updated_at: new Date().toISOString()
    }))

    // Batch update
    for (const update of updates) {
      await supabase
        .from('base_structure_categories')
        .update({ order: update.order })
        .eq('id', update.id)
    }
  }
})
```

---

#### Authors

**Query:**
```typescript
const { data: authors } = useQuery({
  queryKey: ['baseStructure', 'authors', projectId],
  queryFn: async () => {
    const { data, error } = await supabase
      .from('base_structure_authors')
      .select('*')
      .eq('project_id', projectId)
      .order('order', { ascending: true })
    if (error) throw error
    return data
  }
})
```

**Mutation (Create):**
```typescript
const createAuthor = useMutation({
  mutationFn: async (input: CreateAuthorInput) => {
    const { data, error } = await supabase
      .from('base_structure_authors')
      .insert(input)
      .select()
      .single()
    if (error) throw error
    return data
  }
})
```

---

#### Base Articles

**Query (List):**
```typescript
const { data: articles } = useQuery({
  queryKey: ['baseArticles', projectId],
  queryFn: async () => {
    const { data, error } = await supabase
      .from('base_articles')
      .select(`
        *,
        category:base_structure_categories!category_id(name),
        author:base_structure_authors(name, display_name)
      `)
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
    if (error) throw error
    return data
  }
})
```

---

## Data Model

### Type Definitions

```typescript
// features/base-structure/types/index.ts

export interface BaseStructureCategory {
  id: string
  project_id: number
  name: string
  slug: string
  description?: string
  parent_id?: string | null
  layer: 1 | 2 | 3 // 1=Category, 2=Subcategory, 3=Tag
  order: number
  created_at: string
  updated_at?: string
}

export interface BaseStructureAuthor {
  id: string
  project_id: number
  name: string
  display_name: string
  bio?: string
  avatar_url?: string
  role?: string
  social_links?: {
    twitter?: string
    linkedin?: string
    website?: string
  }
  order: number
  created_at: string
  updated_at?: string
}

export interface BaseArticle {
  id: string
  project_id: number
  title: string
  slug: string
  content: string
  category_id?: string
  subcategory_id?: string
  tag_ids?: string[]
  author_id?: string
  status: 'draft' | 'ready' | 'published'
  published_at?: string
  created_at: string
  updated_at?: string
}

export interface BaseStructure {
  project_id: number
  categories: BaseStructureCategory[] // Layer 1
  subcategories: BaseStructureCategory[] // Layer 2
  tags: BaseStructureCategory[] // Layer 3
  authors: BaseStructureAuthor[] // Layer 4
  approval_status: 'draft' | 'pending' | 'approved' | 'rejected'
  submitted_at?: string
  approved_at?: string
  rejection_reason?: string
}

export interface NicheSuggestion {
  id: string
  name: string
  description: string
  confidence: number
}

export interface GenerateBaseArticlesJob {
  jobId: string
  status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled'
  progress: {
    current: number
    total: number
    percentage: number
  }
  result?: {
    articlesCreated: number
    articlesFailed: number
    errors: string[]
  }
}
```

---

### State Management (Zustand)

```typescript
// features/base-structure/store/wizardStore.ts

interface WizardState {
  currentStep: number
  selectedProjectId: number | null
  selectedNiche: string | null
  selectedCategories: string[]
  installationType: 'quick' | 'custom'
  installationConfig: {
    createSubcategories: boolean
    createTags: boolean
    createAuthors: boolean
    autoGenerateContent: boolean
  }
  selectedArticles: string[]

  // Actions
  setCurrentStep: (step: number) => void
  setSelectedProject: (id: number | null) => void
  setSelectedNiche: (niche: string | null) => void
  setSelectedCategories: (categories: string[]) => void
  setInstallationType: (type: 'quick' | 'custom') => void
  setInstallationConfig: (config: Partial<InstallationConfig>) => void
  setSelectedArticles: (articles: string[]) => void
  reset: () => void
}

export const useWizardStore = create<WizardState>((set) => ({
  currentStep: 1,
  selectedProjectId: null,
  selectedNiche: null,
  selectedCategories: [],
  installationType: 'quick',
  installationConfig: {
    createSubcategories: true,
    createTags: true,
    createAuthors: true,
    autoGenerateContent: true,
  },
  selectedArticles: [],

  setCurrentStep: (step) => set({ currentStep: step }),
  setSelectedProject: (id) => set({ selectedProjectId: id }),
  setSelectedNiche: (niche) => set({ selectedNiche: niche }),
  setSelectedCategories: (categories) => set({ selectedCategories: categories }),
  setInstallationType: (type) => set({ installationType: type }),
  setInstallationConfig: (config) => set((state) => ({
    installationConfig: { ...state.installationConfig, ...config }
  })),
  setSelectedArticles: (articles) => set({ selectedArticles: articles }),
  reset: () => set({
    currentStep: 1,
    selectedProjectId: null,
    selectedNiche: null,
    selectedCategories: [],
    installationType: 'quick',
    installationConfig: {
      createSubcategories: true,
      createTags: true,
      createAuthors: true,
      autoGenerateContent: true,
    },
    selectedArticles: [],
  }),
}))
```

---

## UI/UX Design

### Wizard Flow

```
┌─────────────────────────────────────────────────────────┐
│ Estrutura de Base                         [X] Fechar   │
├─────────────────────────────────────────────────────────┤
│ ● ──── ○ ──── ○ ──── ○ ──── ○                          │
│ Projeto Nicho Categorias Instalação Artigos            │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  [CONTEÚDO DO STEP ATUAL]                              │
│                                                         │
│                                                         │
│                                                         │
│                                                         │
│                                                         │
├─────────────────────────────────────────────────────────┤
│ [< Voltar]                       [Próximo >] [Concluir]│
└─────────────────────────────────────────────────────────┘
```

---

### Step 1: Seleção de Projeto

```
┌─────────────────────────────────────────────────────────┐
│ Selecione um Projeto                                    │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Projeto *                                              │
│  ┌───────────────────────────────────────────────────┐ │
│  │ Selecione um projeto                          ▼   │ │
│  └───────────────────────────────────────────────────┘ │
│                                                         │
│  ou                                                     │
│                                                         │
│  [+ Criar Novo Projeto]                                │
│                                                         │
│  ℹ️ A estrutura de base será criada para este projeto. │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

### Step 2: Geração de Nicho

```
┌─────────────────────────────────────────────────────────┐
│ Gerar Nicho via IA                                      │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  [🤖 Gerar Sugestões de Nicho]                         │
│                                                         │
│  ou                                                     │
│                                                         │
│  Nicho Personalizado                                    │
│  ┌───────────────────────────────────────────────────┐ │
│  │ Digite o nicho do seu blog                        │ │
│  └───────────────────────────────────────────────────┘ │
│                                                         │
│  ── Sugestões Geradas ──                               │
│                                                         │
│  ○ Tecnologia e Inovação                               │
│    Explore as últimas tendências em tech, IA...        │
│                                                         │
│  ○ Saúde e Bem-estar                                   │
│    Dicas de nutrição, fitness, mindfulness...          │
│                                                         │
│  ● Marketing Digital                                    │
│    Estratégias de SEO, redes sociais, conteúdo...      │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

### Step 3: Seleção de Categorias

```
┌─────────────────────────────────────────────────────────┐
│ Gerar e Selecionar Categorias                           │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Nicho: Marketing Digital                               │
│                                                         │
│  [🤖 Gerar Categorias]  [+ Adicionar Manual]           │
│                                                         │
│  ── Categorias Sugeridas (selecione min. 3) ──         │
│                                                         │
│  ☑ SEO e Otimização                [≡] Arrastar        │
│  ☑ Redes Sociais                   [≡]                 │
│  ☑ Content Marketing               [≡]                 │
│  ☐ Email Marketing                 [≡]                 │
│  ☐ Google Ads                      [≡]                 │
│  ☐ Análise de Dados                [≡]                 │
│                                                         │
│  ✓ 3 categorias selecionadas                           │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

### Step 4: Tipo de Instalação

```
┌─────────────────────────────────────────────────────────┐
│ Tipo de Instalação                                      │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ○ Instalação Rápida (Recomendado)                     │
│     Configuração padrão com categorias + 3 autores     │
│                                                         │
│  ● Instalação Customizada                              │
│     Personalize subcategorias, tags e autores          │
│                                                         │
│  ── Opções de Customização ──                          │
│                                                         │
│  ☑ Criar Subcategorias (2 por categoria)               │
│  ☑ Criar Tags (15 tags)                                │
│  ☑ Configurar Autores (1-5 autores)                    │
│  ☑ Gerar Artigos de Base Automaticamente               │
│                                                         │
│  ℹ️ Artigos de base: 30-50 artigos gerados com IA      │
│     baseados nas categorias selecionadas.              │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

### Step 5: Geração de Artigos

```
┌─────────────────────────────────────────────────────────┐
│ Gerar Artigos de Base                                   │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Quantidade de Artigos                                  │
│  ┌─────┐                                                │
│  │ 40  │ artigos                                        │
│  └─────┘                                                │
│  (mínimo: 30, máximo: 100)                             │
│                                                         │
│  [🤖 Iniciar Geração]                                  │
│                                                         │
│  ── Progresso ──                                        │
│                                                         │
│  ████████████░░░░░░░░ 60% (24/40)                      │
│                                                         │
│  ⏱️ Tempo estimado: 5 minutos                          │
│  ✓ 24 artigos criados                                  │
│  ⚠️ 2 artigos falharam                                 │
│                                                         │
│  [⏸️ Pausar] [❌ Cancelar]                             │
│                                                         │
│  ℹ️ Artigos serão salvos como rascunho. Você poderá    │
│     editá-los e publicá-los depois.                    │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## Implementation Plan

### Phase 1: Database & Backend Setup (2-3 days)

1. **Database Migration**
   - Create tables: `base_structure_categories`, `base_structure_authors`, `base_articles`, `author_profile_images`
   - Set up RLS policies
   - Seed initial author profile images

2. **Backend n8n Endpoints**
   - `POST /api/n8n/generate-niche` → webhook to n8n
   - `POST /api/n8n/generate-categories` → webhook to n8n
   - `POST /api/n8n/generate-base-articles` → async job via n8n
   - `GET /api/n8n/jobs/:jobId` → polling for job status

3. **n8n Workflows** (simplified - no Temporal)
   - Niche generation workflow (OpenAI/Claude)
   - Category generation workflow
   - Base articles batch generation workflow

---

### Phase 2: Frontend Core Wizard (3-4 days)

1. **Zustand Store**
   - `wizardStore.ts` for wizard state

2. **Wizard Shell**
   - `BaseStructureWizard.tsx` - main wizard container
   - `Stepper.tsx` - step indicator component
   - Navigation logic (next, back, validation)

3. **Step Components**
   - `StepSelectProject.tsx` - dropdown + create new
   - `StepGenerateNiches.tsx` - n8n call + selection
   - `StepSelectCategories.tsx` - drag-drop list
   - `StepInstallationType.tsx` - quick vs custom
   - `StepSelectArticles.tsx` - quantity + progress

---

### Phase 3: TanStack Query Hooks (2 days)

1. **API Queries**
   - `useCategories(projectId)`
   - `useAuthors(projectId)`
   - `useBaseArticles(projectId)`
   - `useGenerateNiche()`
   - `useGenerateCategories()`
   - `useGenerateBaseArticles()`
   - `useJobStatus(jobId)` - polling

2. **Mutations**
   - `useCreateCategory()`
   - `useUpdateCategory()`
   - `useDeleteCategory()`
   - `useReorderCategories()`
   - `useCreateAuthor()`
   - `useUpdateAuthor()`
   - `useDeleteAuthor()`

---

### Phase 4: Advanced Features (2-3 days)

1. **Drag-and-Drop**
   - Use `@dnd-kit/core` for category reordering
   - Visual feedback during drag

2. **Progress Tracking**
   - Polling job status every 2s
   - Progress bar with percentage
   - Cancel/pause functionality

3. **Validation**
   - Min 3 categories
   - Min 30 articles
   - Required fields per step

4. **Error Handling**
   - n8n timeout (30s)
   - Partial success (some articles failed)
   - Retry logic

---

### Phase 5: Testing & Polish (2 days)

1. **Unit Tests**
   - Wizard store logic
   - Validation functions
   - API query hooks

2. **Integration Tests**
   - Full wizard flow
   - n8n mock responses
   - Supabase CRUD operations

3. **UI Polish**
   - Loading states
   - Empty states
   - Error messages
   - Success confirmations

---

**Total Estimate: 11-14 days**

---

## Security Considerations

### What Goes in Backend (NestJS)

✅ **MUST BE IN BACKEND:**
- n8n webhook URLs (secret)
- OpenAI/Claude API keys (if used for generation)
- Job queue management
- Service role operations (bypassing RLS if needed)

### What Can Be in Frontend

✅ **CAN BE IN FRONTEND:**
- Supabase CRUD (protected by RLS)
- Wizard state management
- UI logic and validation
- Polling for job status

### RLS Enforcement

- All tables have RLS enabled
- Users can only CRUD their own project's data
- Author profile images pool is read-only for users
- No service_role key in frontend

---

## Performance Requirements

- **Niche Generation**: < 30s (n8n workflow timeout)
- **Category Generation**: < 20s
- **Article Generation**: 1-2 min/article → 40 articles = 40-80 min
  - Use async job with polling
  - Allow cancellation
  - Show progress in real-time
- **Wizard Navigation**: Instant (< 100ms)
- **Drag-and-Drop**: Smooth 60fps

---

## Error Handling

### n8n Failures

- **Timeout**: Show error, allow manual input
- **Partial Success**: Show what succeeded, allow retry for failures
- **Complete Failure**: Show error, suggest contacting support

### Supabase Failures

- **Network Error**: Retry with exponential backoff
- **RLS Violation**: Show "Permission denied" error
- **Duplicate**: Show "Already exists" error

---

## Future Enhancements (Out of Scope)

- Duplicate detection for categories
- AI-powered subcategory suggestions
- Bulk edit categories
- Export/import structure as JSON
- Template marketplace (predefined structures by niche)
- Multi-language support for articles
- Image generation for base articles
- SEO analysis for generated content

---

## Dependencies

### Frontend
- `@dnd-kit/core` - drag-and-drop
- `@tanstack/react-query` - data fetching
- `zustand` - wizard state
- `react-hook-form` + `zod` - forms validation

### Backend
- `@nestjs/axios` - HTTP client for n8n
- `class-validator` - DTO validation

### External Services
- n8n (self-hosted or cloud)
- OpenAI/Claude API (via n8n)
- Supabase

---

## Success Metrics

- **Adoption**: 80% of new projects use wizard within first week
- **Completion Rate**: 70% of users complete all 5 steps
- **Article Quality**: 85% of generated articles rated "good" or better
- **Performance**: 95% of workflows complete within SLA
- **Errors**: < 5% failure rate on n8n workflows

---

## Open Questions

1. ❓ Should we allow editing structure after approval?
2. ❓ How many retries for failed articles in batch?
3. ❓ Should users be able to save wizard progress and continue later?
4. ❓ Do we need versioning for structures (track changes over time)?

---

## Related Features

- **005-minhas-tarefas**: Tasks podem referenciar artigos de base
- **007-artigos-base**: Página separada para editar/visualizar artigos gerados
- **004-meus-blogs**: Projetos precisam ter estrutura antes de publicar

---

## Glossary

- **Base Structure**: Conjunto completo de categorias, subcategorias, tags e autores de um projeto
- **Nicho**: Tema/tópico principal do blog (ex: "Marketing Digital", "Saúde")
- **Layer**: Nível hierárquico (1=Categoria, 2=Subcategoria, 3=Tag, 4=Autor)
- **Installation Type**: Rápida (padrões) vs Customizada (usuário escolhe tudo)
- **Base Articles**: Artigos iniciais gerados automaticamente para popular o blog

---

**End of Specification**
