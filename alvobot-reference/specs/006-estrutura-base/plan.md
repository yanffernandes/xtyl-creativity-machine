# Implementation Plan: 006 - Estrutura de Base

## Overview

Este plano detalha a implementação do módulo "Estrutura de Base", um wizard de 5 etapas que permite ao usuário criar a estrutura de conteúdo completa de um blog WordPress. A principal mudança em relação ao spec original é que **toda a lógica de IA será implementada diretamente no backend NestJS**, ao invés de chamar webhooks externos do n8n.

## Arquitetura Revisada

```
┌─────────────────────────────────────────────────────────┐
│ Frontend (React)                                        │
│ - Wizard UI (5 steps)                                   │
│ - TanStack Query (data fetching)                        │
│ - Zustand (wizard state)                                │
└─────────────────┬───────────────────────────────────────┘
                  │
        ┌─────────┼─────────┐
        │                   │
        ▼                   ▼
┌───────────────────┐   ┌──────────────────┐
│ Backend (NestJS)  │   │ Supabase         │
│                   │   │ - RLS protected  │
│ BaseStructure     │   │ - Direct CRUD    │
│ Module:           │   │                  │
│ - AI Services     │   │ Tables:          │
│   (OpenAI/Gemini) │   │ - projects       │
│ - WordPress API   │   │ - articles       │
│ - Supabase Admin  │   │ - author_profile │
│                   │   │   _images        │
└───────────────────┘   └──────────────────┘
```

## Fluxo do Wizard

```
Step 1: Selecionar Projeto
         ↓
Step 2: Gerar/Selecionar Nicho (AI)
         ↓
Step 3: Gerar/Selecionar Categorias (AI)
         ↓
Step 4: Tipo de Instalação (Rápida/Customizada)
         ├── Rápida: Todas opções habilitadas
         └── Customizada: Usuário escolhe toggles
                ├── Criar Autor (toggle)
                ├── Criar Logo (toggle)
                └── Criar Título/Descrição (toggle)
         ↓
Step 5: Gerar Títulos de Artigos (AI) + Salvar Tudo
         ↓
[Fim] Artigos salvos no banco → Outro agente escreve conteúdo
```

---

## Phase 1: Backend - Base Structure Module

### 1.1 Module Structure

```
backend/src/modules/base-structure/
├── base-structure.module.ts
├── base-structure.controller.ts
├── base-structure.service.ts
├── services/
│   ├── ai.service.ts              # OpenAI/Gemini integration
│   ├── wordpress.service.ts       # WordPress API calls
│   └── prompts.service.ts         # AI prompt templates
├── dto/
│   ├── generate-niches.dto.ts
│   ├── generate-categories.dto.ts
│   ├── generate-titles.dto.ts
│   └── save-structure.dto.ts
└── types/
    └── index.ts
```

### 1.2 AI Service Implementation

O `AiService` será responsável por todas as chamadas de IA, usando OpenAI como principal e OpenRouter/Gemini como fallback.

```typescript
// backend/src/modules/base-structure/services/ai.service.ts

@Injectable()
export class AiService {
  private openai: OpenAI;

  constructor(private configService: ConfigService) {
    this.openai = new OpenAI({
      apiKey: this.configService.get('OPENAI_API_KEY'),
    });
  }

  async generateNiches(input: GenerateNichesInput): Promise<string[]> {
    // Uses GPT-4o-mini with structured output
  }

  async generateCategories(niche: string): Promise<Category[][]> {
    // Generates 3 main categories with 4 subcategories each
  }

  async generateTitles(niche: string, categories: string[]): Promise<ArticleTitle[]> {
    // Generates 10-15 titles per category using 4-layer technique
  }

  async generateAuthor(niche: string): Promise<AuthorData> {
    // Generates author persona (name, description, sex)
  }

  async generateLogoConfig(niche: string): Promise<LogoConfig> {
    // Selects icon (Lucide), font, and color
  }

  async generateBlogTitleDescription(niche: string, domain: string): Promise<BlogSettings> {
    // Generates blog title (≤12 chars) and description
  }
}
```

### 1.3 AI Prompts (Extraídos dos n8n Workflows)

#### Prompt: Generate Niches

```typescript
// Extraído de [NEWAR] APP - Create Niche.json
const GENERATE_NICHES_PROMPT = `
Você, como um especialista em identificação de nichos de mercado promissores, foi encarregado de sugerir **10 (dez)** ideias de nichos hiper focados, originais e viáveis para a criação de **diversos artigos e guias**.

#### 1) CONTEXTO
Língua: {{language}}
Quando necessário, leve em conta também o site: {{domain}}

#### 2) CRITÉRIOS OBRIGATÓRIOS

1. **Ultra Especificidade**
   - Cada nicho deve ser **extremamente específico**, indo além de categorias amplas ou genéricas.
   - Foque em subcategorias bem definidas, permitindo a inclusão de nomes técnicos, espécies, raças, modelos ou classificações científicas.

2. **Relevância e Pertinência**
   - Os nichos devem ter público-alvo suficiente para justificar a criação de um blog.

3. **Profundidade de Conteúdo**
   - Cada nicho deve permitir **pelo menos 30 artigos ou guias diferentes**.

4. **Originalidade e Inovação**
   - Evite nichos óbvios, saturados ou excessivamente explorados.

5. **Exclusão de Adjetivos Qualificativos**
   - Não utilize "para iniciantes", "melhores", "populares" etc.

#### 3) EXCLUSÕES RIGOROSAS

**Não inclua** nichos relacionados a:
- Dinheiro e Finanças, Criptomoedas
- Jogos de Azar, Substâncias Controladas
- Saúde e Bem-Estar, Receitas e Gastronomia
- Educação e Cursos Online, Marketing Digital
- Vendas de Produtos, Promessas Irreais
- Temas Sensíveis ou Polêmicos

#### 4) FORMATO DE SAÍDA (OBRIGATÓRIO)

{
  "niches": ["nicho 1", "nicho 2", ..., "nicho 10"]
}
`;
```

#### Prompt: Generate Categories

```typescript
// Extraído de [NEWAR] APP - Create Categories.json
const GENERATE_CATEGORIES_PROMPT = `
### **Dados de Entrada:**
- **Nicho Original**: {{niche}}

### **Instruções:**

1. **Análise do Nicho Original:**
   - Analise cuidadosamente o nicho para entender seu escopo e possíveis áreas de segmentação.

2. **Geração das Categorias:**
   - Crie **12 categorias**, divididas em **3 grupos** que sejam **bem diferentes** umas das outras.
   - Cada categoria deve representar um aspecto único e específico do nicho.
   - As categorias devem ser **mutuamente exclusivas**.

3. **Formato da Resposta:**
{
  "categories": [
    [{"title": "Categoria 1A"}, {"title": "Categoria 1B"}, {"title": "Categoria 1C"}, {"title": "Categoria 1D"}],
    [{"title": "Categoria 2A"}, {"title": "Categoria 2B"}, {"title": "Categoria 2C"}, {"title": "Categoria 2D"}],
    [{"title": "Categoria 3A"}, {"title": "Categoria 3B"}, {"title": "Categoria 3C"}, {"title": "Categoria 3D"}]
  ]
}

4. **Regras:**
   - Palavras-chave com 2-3 termos, letras minúsculas, sem pontuação
   - Não usar dois-pontos, números ou anos
   - Evitar adjetivos vagos ou subjetivos
`;
```

#### Prompt: Generate Titles (4-Layer Technique)

```typescript
// Extraído de [NEWAR] APP - Create Titles.json
const GENERATE_TITLES_PROMPT = `
## CONTEXTO E OBJETIVO
Você é um especialista em SEO e criação de títulos otimizados para mecanismos de busca. Gere títulos usando a técnica das 4 camadas de hipersegmentação.

## ENTRADA DE DADOS
- **Nicho do blog**: {{niche}}
- **Categorias para trabalhar**: {{categories}}
- **Total de categorias**: 3
- **Títulos por categoria**: 10
- **Total de títulos a gerar**: 30

## TÉCNICA DAS 4 CAMADAS

Cada título DEVE conter exatamente 4 camadas de especificidade conectadas de forma fluida:
1. **Objeto Principal**
2. **Características Extremamente Específicas** (espécie, modelo, material)
3. **Local ou Contexto de Aplicação HIPERDETALHADO**
4. **Uso ou Público-Alvo ULTRAEXATO**

**Exemplo:**
"Vestido de Noiva Para Casamento no Inverno"
- Camada 1: Vestido
- Camada 2: de Noiva
- Camada 3: Para Casamento
- Camada 4: no Inverno

## REGRAS ABSOLUTAS

### FORMATAÇÃO
- **Capitalização**: Title Case
- **Tamanho**: Máximo de 60 caracteres
- **Sem pontuação**: Apenas espaços (proibido: : . , ! ? - ;)
- **Sem números ou anos**

### PALAVRAS PROIBIDAS
- Saúde/Medicina, Corpo/Beleza, Cosméticos
- Finanças, Relacionamentos, Substâncias
- Religião, Psicologia Clínica, Violência

## FORMATO DE SAÍDA

{
  "titles": [
    {"title": "Título Com 4 Camadas Sem Pontuação", "category": "Nome_Exato_Da_Categoria"},
    ...
  ]
}
`;
```

#### Prompt: Generate Author

```typescript
// Extraído de [NEWAR] - Create Author WP.json
const GENERATE_AUTHOR_PROMPT = `
Estou criando um blog e preciso da persona de um autor.

Selecione um nome e uma descrição realistas que demonstrem autoridade no nicho: {{niche}}.

Evite exageros nas informações.

Na descrição dê uma pista do local de nascimento (Paulista, brasileiro, cearense, etc).

Escreva na primeira pessoa.

Retorne apenas o JSON contendo as chaves "name", "description" e "sex" (M ou F).
Não inclua nenhuma explicação.
`;
```

#### Prompt: Generate Logo Config

```typescript
// Extraído de [NEWAR] - Create Logo WP.json
const GENERATE_LOGO_PROMPT = `
Você é um especialista em design e UX. Dado o nicho {{niche}}, selecione a melhor combinação de ícones, fontes e cor.

#Ícone
Selecione um ícone da biblioteca Lucide. Retorne o nome com ".svg" no final.
Ex.: "car.svg"

#Fonte
Escolha a melhor fonte:
- montserrat, playfair, raleway, abril, roboto
- lora, oswald, pacifico, quicksand, cinzel

#Cor do texto
Valor hexadecimal com bom contraste (fundo branco).

Retorne JSON com: icon, font e color.
Sem explicação adicional.
`;
```

#### Prompt: Generate Blog Title/Description

```typescript
// Extraído de [NEWAR] - Create Title and Description WP.json
const GENERATE_BLOG_TITLE_PROMPT = `
Estou criando um blog e preciso de um título e descrição para o WordPress.

Selecione um nome e uma descrição realistas que demonstrem autoridade no nicho: {{niche}}.

Evite exageros nas informações.

Domínio do blog: {{wp_url}}

##Como construir o título
O título deve ter no máximo 12 caracteres, e se possível, deve ser construído utilizando o domínio como referência.

Retorne apenas o JSON contendo as chaves "title" e "description".
Não inclua nenhuma explicação.

O texto deve estar completo e pronto para ser adicionado no WordPress.
`;
```

### 1.4 API Endpoints

```typescript
// backend/src/modules/base-structure/base-structure.controller.ts

@Controller('base-structure')
@UseGuards(JwtAuthGuard)
export class BaseStructureController {

  @Post('generate-niches')
  async generateNiches(@Body() dto: GenerateNichesDto, @Req() req): Promise<{niches: string[]}> {
    // Input: { language: string, domain?: string }
    // Output: { niches: ["nicho1", "nicho2", ..., "nicho10"] }
  }

  @Post('generate-categories')
  async generateCategories(@Body() dto: GenerateCategoriesDto): Promise<{categories: Category[][]}> {
    // Input: { niche: string }
    // Output: { categories: [[{title}], [{title}], [{title}]] }
  }

  @Post('generate-titles')
  async generateTitles(@Body() dto: GenerateTitlesDto): Promise<{titles: ArticleTitle[]}> {
    // Input: { niche: string, categories: string[] }
    // Output: { titles: [{title, category, id}, ...] } (30-45 titles)
  }

  @Post('save')
  async saveStructure(@Body() dto: SaveStructureDto, @Req() req): Promise<SaveStructureResult> {
    // Input: {
    //   projectId: number,
    //   niche: string,
    //   categories: string[],
    //   articles: [{title, category, id}],
    //   installationType: 'fast' | 'custom',
    //   authorToggle: boolean,
    //   logoToggle: boolean,
    //   titleToggle: boolean
    // }
    // Conditionally:
    //   - Creates author on WordPress (if authorToggle)
    //   - Creates logo on WordPress (if logoToggle)
    //   - Updates title/description on WordPress (if titleToggle)
    //   - Creates categories on WordPress
    //   - Saves articles to Supabase
  }
}
```

### 1.5 WordPress Integration

```typescript
// backend/src/modules/base-structure/services/wordpress.service.ts

@Injectable()
export class WordPressService {

  async createCategories(wpUrl: string, token: string, categories: string[]): Promise<WPCategory[]> {
    // POST /wp-json/wp/v2/categories
  }

  async updateAuthor(wpUrl: string, token: string, author: AuthorData, imageBase64: string): Promise<void> {
    // PUT /wp-json/alvobot-pro/v1/authors/alvobot
  }

  async createLogo(wpUrl: string, token: string, config: LogoConfig, blogName: string): Promise<void> {
    // POST /wp-json/alvobot-pro/v1/logos
    // Parameters: token, blog_name, save_to_media: true, apply_to_site: true,
    //             generate_favicon: true, icon_choice, font_choice, font_color, background_color
  }

  async updateSettings(wpUrl: string, token: string, title: string, description: string): Promise<void> {
    // PUT /wp-json/wp/v2/settings
  }
}
```

### 1.6 DTOs

```typescript
// backend/src/modules/base-structure/dto/generate-niches.dto.ts
export class GenerateNichesDto {
  @IsString()
  language: string; // 'pt', 'en', etc.

  @IsOptional()
  @IsString()
  domain?: string;
}

// backend/src/modules/base-structure/dto/generate-categories.dto.ts
export class GenerateCategoriesDto {
  @IsString()
  niche: string;
}

// backend/src/modules/base-structure/dto/generate-titles.dto.ts
export class GenerateTitlesDto {
  @IsString()
  niche: string;

  @IsArray()
  @IsString({ each: true })
  categories: string[];
}

// backend/src/modules/base-structure/dto/save-structure.dto.ts
export class SaveStructureDto {
  @IsNumber()
  projectId: number;

  @IsString()
  niche: string;

  @IsArray()
  @IsString({ each: true })
  categories: string[];

  @IsArray()
  articles: { title: string; category: string; id: string }[];

  @IsIn(['fast', 'custom'])
  installationType: 'fast' | 'custom';

  @IsBoolean()
  authorToggle: boolean;

  @IsBoolean()
  logoToggle: boolean;

  @IsBoolean()
  titleToggle: boolean;
}
```

---

## Phase 2: Frontend - Wizard Implementation

### 2.1 Feature Structure

```
frontend/src/features/base-structure/
├── api/
│   ├── queries.ts           # useNiches, useCategories, etc.
│   └── mutations.ts         # useGenerateNiches, useSaveStructure, etc.
├── components/
│   ├── BaseStructureWizard.tsx
│   ├── Stepper.tsx
│   ├── StepSelectProject.tsx
│   ├── StepGenerateNiches.tsx
│   ├── StepSelectCategories.tsx
│   ├── StepInstallationType.tsx
│   └── StepGenerateTitles.tsx
├── store/
│   └── wizardStore.ts       # Zustand store
├── pages/
│   └── BaseStructurePage.tsx
└── types/
    └── index.ts
```

### 2.2 Wizard Store (Zustand)

```typescript
// frontend/src/features/base-structure/store/wizardStore.ts

interface WizardState {
  currentStep: number;
  selectedProjectId: number | null;
  selectedNiche: string | null;
  generatedNiches: string[];
  selectedCategories: string[];
  generatedCategories: Category[][];
  installationType: 'fast' | 'custom';
  installationConfig: {
    authorToggle: boolean;
    logoToggle: boolean;
    titleToggle: boolean;
  };
  generatedTitles: ArticleTitle[];
  selectedTitles: ArticleTitle[];

  // Actions
  setCurrentStep: (step: number) => void;
  setSelectedProject: (id: number | null) => void;
  setSelectedNiche: (niche: string | null) => void;
  setGeneratedNiches: (niches: string[]) => void;
  setSelectedCategories: (categories: string[]) => void;
  setGeneratedCategories: (categories: Category[][]) => void;
  setInstallationType: (type: 'fast' | 'custom') => void;
  setInstallationConfig: (config: Partial<InstallationConfig>) => void;
  setGeneratedTitles: (titles: ArticleTitle[]) => void;
  setSelectedTitles: (titles: ArticleTitle[]) => void;
  reset: () => void;
}
```

### 2.3 API Hooks

```typescript
// frontend/src/features/base-structure/api/mutations.ts

export function useGenerateNiches() {
  return useMutation({
    mutationFn: async (input: { language: string; domain?: string }) => {
      const response = await api.post('/base-structure/generate-niches', input);
      return response.data.niches;
    },
  });
}

export function useGenerateCategories() {
  return useMutation({
    mutationFn: async (niche: string) => {
      const response = await api.post('/base-structure/generate-categories', { niche });
      return response.data.categories;
    },
  });
}

export function useGenerateTitles() {
  return useMutation({
    mutationFn: async (input: { niche: string; categories: string[] }) => {
      const response = await api.post('/base-structure/generate-titles', input);
      return response.data.titles;
    },
  });
}

export function useSaveStructure() {
  return useMutation({
    mutationFn: async (input: SaveStructureInput) => {
      const response = await api.post('/base-structure/save', input);
      return response.data;
    },
  });
}
```

### 2.4 Wizard Steps Overview

#### Step 1: Select Project
- Dropdown com projetos do usuário
- Botão "Criar Novo Projeto" (abre modal)
- Validação: projeto obrigatório

#### Step 2: Generate/Select Niche
- Botão "Gerar Sugestões de Nicho" → chama API
- Loading state enquanto IA processa
- Lista de 10 nichos para selecionar (radio buttons)
- Input para nicho customizado
- Validação: nicho obrigatório

#### Step 3: Generate/Select Categories
- Mostra nicho selecionado
- Botão "Gerar Categorias" → chama API
- Exibe 3 grupos com 4 categorias cada
- Usuário seleciona 3 categorias (1 de cada grupo)
- Drag-and-drop para reordenar (opcional)
- Validação: mínimo 3 categorias

#### Step 4: Installation Type
- Radio: Instalação Rápida vs Customizada
- Se Rápida: todos toggles = true
- Se Customizada: mostra toggles:
  - [ ] Criar Autor
  - [ ] Criar Logo
  - [ ] Criar Título/Descrição

#### Step 5: Generate Titles + Save
- Mostra resumo das escolhas
- Botão "Gerar Títulos" → chama API
- Loading com progress bar
- Lista de 30-45 títulos gerados
- Usuário pode desmarcar títulos indesejados
- Botão "Finalizar" → chama save endpoint
- Feedback de sucesso/erro

---

## Phase 3: Save Flow Details

### 3.1 Save Structure Orchestration

Quando o usuário clica em "Finalizar" no Step 5, o backend executa:

```typescript
async saveStructure(dto: SaveStructureDto, userId: string): Promise<SaveResult> {
  // 1. Buscar projeto e credenciais WordPress
  const project = await this.supabase
    .from('projects')
    .select('*')
    .eq('id', dto.projectId)
    .eq('user_id', userId)
    .single();

  const wpUrl = project.url;
  const alvobotToken = project.token;

  // 2. Executar ações condicionais em paralelo (se habilitadas)
  const promises = [];

  if (dto.authorToggle) {
    promises.push(this.createAuthor(dto.niche, wpUrl, alvobotToken));
  }

  if (dto.logoToggle) {
    promises.push(this.createLogo(dto.niche, wpUrl, alvobotToken));
  }

  if (dto.titleToggle) {
    promises.push(this.createBlogTitle(dto.niche, wpUrl, alvobotToken));
  }

  // 3. Criar categorias no WordPress
  const wpCategories = await this.wordpressService.createCategories(
    wpUrl,
    alvobotToken,
    dto.categories
  );

  // 4. Salvar artigos no Supabase
  const articlesToInsert = dto.articles.map((article) => ({
    project_id: dto.projectId,
    title: article.title,
    category: article.category,
    status: 'pending', // Aguardando escrita pelo agente de IA
    created_at: new Date().toISOString(),
  }));

  await this.supabase.from('articles').insert(articlesToInsert);

  // 5. Aguardar ações paralelas
  await Promise.all(promises);

  return {
    success: true,
    articlesCreated: dto.articles.length,
    categoriesCreated: dto.categories.length,
  };
}
```

### 3.2 Author Creation Flow

```typescript
async createAuthor(niche: string, wpUrl: string, token: string): Promise<void> {
  // 1. Gerar persona via IA
  const authorData = await this.aiService.generateAuthor(niche);
  // Returns: { name: "João Silva", description: "Sou um...", sex: "M" }

  // 2. Buscar imagem de perfil do pool
  const image = await this.supabase
    .from('author_profile_images')
    .select('*')
    .eq('sex', authorData.sex)
    .gt('age', 20)
    .order('usage_count', { ascending: true })
    .limit(1)
    .single();

  // 3. Incrementar uso da imagem
  await this.supabase
    .from('author_profile_images')
    .update({ usage_count: image.usage_count + 1 })
    .eq('id', image.id);

  // 4. Baixar imagem e converter para base64
  const imageUrl = `https://qbmbokpbcyempnaravaw.supabase.co/storage/v1/object/public/${image.path}`;
  const imageResponse = await axios.get(imageUrl, { responseType: 'arraybuffer' });
  const imageBase64 = Buffer.from(imageResponse.data).toString('base64');

  // 5. Atualizar autor no WordPress
  await this.wordpressService.updateAuthor(wpUrl, token, authorData, imageBase64);
}
```

### 3.3 Logo Creation Flow

```typescript
async createLogo(niche: string, wpUrl: string, token: string): Promise<void> {
  // 1. Gerar config via IA
  const logoConfig = await this.aiService.generateLogoConfig(niche);
  // Returns: { icon: "car.svg", font: "montserrat", color: "#333333" }

  // 2. Buscar nome do blog (title)
  const settingsResponse = await axios.get(`${wpUrl}/wp-json/wp/v2/settings`, {
    headers: {
      Authorization: `Basic ${Buffer.from(`alvobot:${token}`).toString('base64')}`,
    },
  });
  const blogName = settingsResponse.data.title;

  // 3. Criar logo no WordPress
  await this.wordpressService.createLogo(wpUrl, token, {
    ...logoConfig,
    blogName,
    fontColor: '#ffffff',
    backgroundColor: '#000000',
  });
}
```

---

## Phase 4: Environment Variables

### Backend (.env)

```env
# OpenAI
OPENAI_API_KEY=sk-xxx

# OpenRouter (fallback)
OPENROUTER_API_KEY=sk-or-xxx

# Supabase
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=xxx
```

---

## Phase 5: Database Considerations

### Tables Used

1. **projects** - Já existe, contém `id`, `user_id`, `url`, `token`
2. **articles** - Já existe, será usado para salvar títulos gerados
3. **author_profile_images** - Já existe, pool de imagens de perfil

### New Fields (if needed)

Se necessário adicionar campo `niche` em `projects`:

```sql
ALTER TABLE projects ADD COLUMN niche TEXT;
```

---

## Implementation Order

### Sprint 1: Backend Core (3-4 days)
1. [ ] Criar módulo `base-structure`
2. [ ] Implementar `AiService` com prompts
3. [ ] Implementar endpoint `POST /generate-niches`
4. [ ] Implementar endpoint `POST /generate-categories`
5. [ ] Implementar endpoint `POST /generate-titles`

### Sprint 2: Backend Save Flow (2-3 days)
1. [ ] Implementar `WordPressService`
2. [ ] Implementar endpoint `POST /save`
3. [ ] Implementar fluxos de autor, logo, título
4. [ ] Testar integração com WordPress

### Sprint 3: Frontend Wizard (3-4 days)
1. [ ] Criar Zustand store
2. [ ] Implementar `BaseStructureWizard` e `Stepper`
3. [ ] Implementar Steps 1-3
4. [ ] Implementar Steps 4-5
5. [ ] Integrar com API hooks

### Sprint 4: Polish & Testing (2 days)
1. [ ] Loading states e error handling
2. [ ] Validações de formulário
3. [ ] Testes de integração
4. [ ] UI/UX polish

---

## Error Handling

### AI Service Errors
- Timeout após 30s → mostrar erro e permitir retry
- Parse error → tentar novamente com prompt mais restrito
- Rate limit → implementar exponential backoff

### WordPress API Errors
- Auth error → verificar token do projeto
- 404 → endpoint alvobot-pro não instalado
- 500 → retry com backoff

### Supabase Errors
- RLS violation → verificar ownership do projeto
- Duplicate → artigo já existe (ignorar ou atualizar)

---

## Success Metrics

- Wizard completion rate > 70%
- AI generation success rate > 95%
- Average time to complete wizard < 5 minutes
- Error rate < 5%

---

## Notes

1. **Não há geração de conteúdo dos artigos** - apenas títulos são criados. O conteúdo será escrito posteriormente por outro agente.

2. **Instalação Rápida** = todos toggles habilitados automaticamente.

3. **Instalação Customizada** = usuário controla quais elementos criar (autor, logo, título/descrição).

4. **4-Layer Technique** para títulos é crucial para SEO e deve ser seguida rigorosamente.

5. **Pool de imagens de autor** é compartilhado entre todos os projetos, com contador de uso para evitar repetição.
