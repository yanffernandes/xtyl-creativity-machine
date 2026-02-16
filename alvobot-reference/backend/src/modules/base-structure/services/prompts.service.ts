import { Injectable, Logger } from "@nestjs/common";
import { SupabaseService } from "../../../common/supabase/supabase.service";

export type AIProvider = "openai" | "openrouter" | "google";
const DEFAULT_GEMINI_MODEL = "google/gemini-3-flash-preview";

interface SystemPrompt {
  key: string;
  name: string;
  description: string | null;
  category: string;
  system_prompt: string;
  user_prompt_template: string;
  provider: AIProvider | null;
  provider_model: string | null;
  model: string;
  temperature: number;
  max_tokens: number;
  is_active: boolean;
}

export interface PromptConfig {
  systemPrompt: string;
  userPrompt: string;
  provider: AIProvider;
  model: string;
  temperature: number;
  maxTokens: number;
}

@Injectable()
export class PromptsService {
  private readonly logger = new Logger(PromptsService.name);
  private promptCache: Map<string, SystemPrompt> = new Map();
  private cacheExpiry: Map<string, number> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor(private readonly supabaseService: SupabaseService) {}

  /**
   * Fetch prompt from database by key with caching
   */
  private async getPromptFromDb(key: string): Promise<SystemPrompt | null> {
    // Check cache first
    const cached = this.promptCache.get(key);
    const expiry = this.cacheExpiry.get(key);
    if (cached && expiry && Date.now() < expiry) {
      return cached;
    }

    try {
      const { data, error } = await this.supabaseService
        .getClient()
        .from("system_prompts")
        .select("*")
        .eq("key", key)
        .eq("is_active", true)
        .single();

      if (error || !data) {
        this.logger.warn(`Prompt not found in database: ${key}`);
        return null;
      }

      // Update cache
      this.promptCache.set(key, data);
      this.cacheExpiry.set(key, Date.now() + this.CACHE_TTL);

      return data;
    } catch (error) {
      this.logger.error(`Error fetching prompt ${key}:`, error);
      return null;
    }
  }

  /**
   * Replace template variables with actual values
   */
  private replaceVariables(
    template: string,
    variables: Record<string, string>,
  ): string {
    let result = template;
    for (const [key, value] of Object.entries(variables)) {
      result = result.replace(new RegExp(`{{${key}}}`, "g"), value);
    }
    return result;
  }

  /**
   * Get prompt config with all settings from database
   */
  async getPromptConfig(
    key: string,
    variables: Record<string, string>,
  ): Promise<PromptConfig | null> {
    const prompt = await this.getPromptFromDb(key);
    if (!prompt) return null;

    // Determine the model to use based on provider
    let provider: AIProvider = prompt.provider || "openrouter";
    let model = prompt.model || DEFAULT_GEMINI_MODEL;

    // For OpenRouter, use provider_model if available
    if (provider === "openrouter" && prompt.provider_model) {
      model = prompt.provider_model;
    }

    model = this.forceGeminiModel(model);
    if (model.includes("gemini") || model.includes("gpt-4o-mini")) {
      provider = "openrouter";
    }

    return {
      systemPrompt: prompt.system_prompt,
      userPrompt: this.replaceVariables(prompt.user_prompt_template, variables),
      provider,
      model,
      temperature: prompt.temperature ?? 0.7,
      maxTokens: prompt.max_tokens ?? 2000,
    };
  }

  private forceGeminiModel(model: string): string {
    if (!model) {
      return DEFAULT_GEMINI_MODEL;
    }

    if (!model.includes("gemini") || /gemini-(1|1\\.5|2)/.test(model)) {
      return DEFAULT_GEMINI_MODEL;
    }

    return model;
  }
  /**
   * Prompt for generating ultra-specific niche suggestions
   * Now fetches from database with fallback to hardcoded
   */
  async getGenerateNichesPromptConfig(
    language: string,
    domain?: string,
  ): Promise<PromptConfig> {
    const domainContext = domain
      ? `Quando necessário, leve em conta também o site: ${domain}`
      : "";

    const dbConfig = await this.getPromptConfig(
      "base-structure.generate-niches",
      {
        language,
        domain_context: domainContext,
      },
    );

    if (dbConfig) {
      return dbConfig;
    }

    // Fallback to hardcoded prompt
    this.logger.warn("Using fallback hardcoded prompt for generate-niches");
    return {
      systemPrompt: "",
      userPrompt: this.getGenerateNichesPromptFallback(language, domain),
      provider: "openrouter",
      model: DEFAULT_GEMINI_MODEL,
      temperature: 1.0,
      maxTokens: 2000,
    };
  }

  /**
   * Fallback hardcoded prompt for generating niches
   */
  private getGenerateNichesPromptFallback(
    language: string,
    domain?: string,
  ): string {
    return `Você, como um especialista em identificação de nichos de mercado promissores, foi encarregado de sugerir **10 (dez)** ideias de nichos hiper focados, originais e viáveis para a criação de **diversos artigos e guias**.

#### 1) CONTEXTO
Língua: ${language}
${domain ? `Quando necessário, leve em conta também o site: ${domain}` : ""}

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

Retorne APENAS um JSON válido, sem explicações:

{
  "niches": ["nicho 1", "nicho 2", "nicho 3", "nicho 4", "nicho 5", "nicho 6", "nicho 7", "nicho 8", "nicho 9", "nicho 10"]
}`;
  }

  /**
   * Prompt for generating categories based on a niche
   * Now fetches from database with fallback to hardcoded
   */
  async getGenerateCategoriesPromptConfig(
    niche: string,
  ): Promise<PromptConfig> {
    const dbConfig = await this.getPromptConfig(
      "base-structure.generate-categories",
      {
        niche,
      },
    );

    if (dbConfig) {
      return dbConfig;
    }

    // Fallback to hardcoded prompt
    this.logger.warn("Using fallback hardcoded prompt for generate-categories");
    return {
      systemPrompt: "",
      userPrompt: this.getGenerateCategoriesPromptFallback(niche),
      provider: "openrouter",
      model: DEFAULT_GEMINI_MODEL,
      temperature: 0.8,
      maxTokens: 2000,
    };
  }

  /**
   * Fallback hardcoded prompt for generating categories
   */
  private getGenerateCategoriesPromptFallback(niche: string): string {
    return `### **Dados de Entrada:**
- **Nicho Original**: ${niche}

### **Instruções:**

1. **Análise do Nicho Original:**
   - Analise cuidadosamente o nicho para entender seu escopo e possíveis áreas de segmentação.

2. **Geração das Categorias:**
   - Crie **12 categorias**, divididas em **3 grupos** que sejam **bem diferentes** umas das outras.
   - Cada categoria deve representar um aspecto único e específico do nicho.
   - As categorias devem ser **mutuamente exclusivas**.

3. **Formato da Resposta:**
Retorne APENAS um JSON válido, sem explicações:

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
   - Evitar adjetivos vagos ou subjetivos`;
  }

  /**
   * Prompt for generating article titles using 4-layer technique
   * Now fetches from database with fallback to hardcoded
   */
  async getGenerateTitlesPromptConfig(
    niche: string,
    categories: string[],
  ): Promise<PromptConfig> {
    const categoriesStr = categories.join(", ");
    const categoriesCount = categories.length.toString();
    const totalTitles = (categories.length * 10).toString();
    const firstCategory = categories[0] || "";

    const dbConfig = await this.getPromptConfig(
      "base-structure.generate-titles",
      {
        niche,
        categories: categoriesStr,
        categories_count: categoriesCount,
        total_titles: totalTitles,
        first_category: firstCategory,
      },
    );

    if (dbConfig) {
      return dbConfig;
    }

    // Fallback to hardcoded prompt
    this.logger.warn("Using fallback hardcoded prompt for generate-titles");
    return {
      systemPrompt: "",
      userPrompt: this.getGenerateTitlesPromptFallback(niche, categories),
      provider: "openrouter",
      model: DEFAULT_GEMINI_MODEL,
      temperature: 1.0,
      maxTokens: 4096,
    };
  }

  /**
   * Fallback hardcoded prompt for generating titles
   */
  private getGenerateTitlesPromptFallback(
    niche: string,
    categories: string[],
  ): string {
    return `## CONTEXTO E OBJETIVO
Você é um especialista em SEO e criação de títulos otimizados para mecanismos de busca. Gere títulos usando a técnica das 4 camadas de hipersegmentação.

## ENTRADA DE DADOS
- **Nicho do blog**: ${niche}
- **Categorias para trabalhar**: ${categories.join(", ")}
- **Total de categorias**: ${categories.length}
- **Títulos por categoria**: 10
- **Total de títulos a gerar**: ${categories.length * 10}

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
- **Tamanho**: Entre 60 e 70 caracteres (OBRIGATÓRIO)
- **Sem pontuação**: Apenas espaços (proibido: : . , ! ? - ;)
- **Sem números ou anos**

### PALAVRAS PROIBIDAS
- Saúde/Medicina, Corpo/Beleza, Cosméticos
- Finanças, Relacionamentos, Substâncias
- Religião, Psicologia Clínica, Violência

## FORMATO DE SAÍDA

Retorne APENAS um JSON válido, sem explicações:

{
  "titles": [
    {"title": "Título Com 4 Camadas Sem Pontuação", "category": "${categories[0]}"},
    {"title": "Outro Título Seguindo as Regras", "category": "${categories[0]}"}
  ]
}

Gere exatamente ${categories.length * 10} títulos, distribuídos igualmente entre as categorias.`;
  }

  /**
   * Prompt for generating author persona
   * Now fetches from database with fallback to hardcoded
   */
  async getGenerateAuthorPromptConfig(niche: string): Promise<PromptConfig> {
    const dbConfig = await this.getPromptConfig(
      "base-structure.generate-author",
      {
        niche,
      },
    );

    if (dbConfig) {
      return dbConfig;
    }

    // Fallback to hardcoded prompt
    this.logger.warn("Using fallback hardcoded prompt for generate-author");
    return {
      systemPrompt: "",
      userPrompt: this.getGenerateAuthorPromptFallback(niche),
      provider: "openrouter",
      model: DEFAULT_GEMINI_MODEL,
      temperature: 1.0,
      maxTokens: 1000,
    };
  }

  /**
   * Fallback hardcoded prompt for generating author
   */
  private getGenerateAuthorPromptFallback(niche: string): string {
    return `Estou criando um blog e preciso da persona de um autor.

Selecione um nome e uma descrição realistas que demonstrem autoridade no nicho: ${niche}.

Evite exageros nas informações.

Na descrição dê uma pista do local de nascimento (Paulista, brasileiro, cearense, etc).

Escreva na primeira pessoa.

Retorne APENAS um JSON válido contendo as chaves "name", "description" e "sex" (M ou F).
Não inclua nenhuma explicação.

Exemplo:
{
  "name": "João Silva",
  "description": "Sou um entusiasta de ...",
  "sex": "M"
}`;
  }

  /**
   * Prompt for generating logo configuration
   * Now fetches from database with fallback to hardcoded
   */
  async getGenerateLogoPromptConfig(niche: string): Promise<PromptConfig> {
    const dbConfig = await this.getPromptConfig(
      "base-structure.generate-logo",
      {
        niche,
      },
    );

    if (dbConfig) {
      return dbConfig;
    }

    // Fallback to hardcoded prompt
    this.logger.warn("Using fallback hardcoded prompt for generate-logo");
    return {
      systemPrompt: "",
      userPrompt: this.getGenerateLogoPromptFallback(niche),
      provider: "openrouter",
      model: DEFAULT_GEMINI_MODEL,
      temperature: 0.7,
      maxTokens: 500,
    };
  }

  /**
   * Fallback hardcoded prompt for generating logo
   */
  private getGenerateLogoPromptFallback(niche: string): string {
    return `Você é um especialista em design e UX. Dado o nicho "${niche}", selecione a melhor combinação de ícones, fontes e cor.

#Ícone
Selecione um ícone da biblioteca Lucide. Retorne o nome com ".svg" no final.
Ex.: "car.svg"

#Fonte
Escolha a melhor fonte:
- montserrat
- playfair
- raleway
- abril
- roboto
- lora
- oswald
- pacifico
- quicksand
- cinzel

#Cor do texto
Valor hexadecimal com bom contraste (fundo branco).

Retorne APENAS um JSON válido com: icon, font e color.
Sem explicação adicional.

{
  "icon": "nome-do-icone.svg",
  "font": "nome-da-fonte",
  "color": "#333333"
}`;
  }

  /**
   * Prompt for generating blog title and description
   * Now fetches from database with fallback to hardcoded
   */
  async getGenerateBlogTitlePromptConfig(
    niche: string,
    wpUrl: string,
  ): Promise<PromptConfig> {
    const dbConfig = await this.getPromptConfig(
      "base-structure.generate-blog-title",
      {
        niche,
        wp_url: wpUrl,
      },
    );

    if (dbConfig) {
      return dbConfig;
    }

    // Fallback to hardcoded prompt
    this.logger.warn("Using fallback hardcoded prompt for generate-blog-title");
    return {
      systemPrompt: "",
      userPrompt: this.getGenerateBlogTitlePromptFallback(niche, wpUrl),
      provider: "openrouter",
      model: DEFAULT_GEMINI_MODEL,
      temperature: 1.0,
      maxTokens: 500,
    };
  }

  /**
   * Fallback hardcoded prompt for generating blog title
   */
  private getGenerateBlogTitlePromptFallback(
    niche: string,
    wpUrl: string,
  ): string {
    return `Estou criando um blog e preciso de um título e descrição para o WordPress.

Selecione um nome e uma descrição realistas que demonstrem autoridade no nicho: ${niche}.

Evite exageros nas informações.

Domínio do blog: ${wpUrl}

##Como construir o título
O título deve ter no máximo 12 caracteres, e se possível, deve ser construído utilizando o domínio como referência.

Retorne APENAS um JSON válido contendo as chaves "title" e "description".
Não inclua nenhuma explicação.

O texto deve estar completo e pronto para ser adicionado no WordPress.

{
  "title": "Nome",
  "description": "Descrição do blog..."
}`;
  }

  /**
   * Prompt for generating arrow article content from keyword
   * Fetches from database with fallback to hardcoded
   */
  async getGenerateArrowArticlePromptConfig(
    keyword: string,
    title?: string,
    excerpt?: string,
    language?: string,
    country?: string,
  ): Promise<PromptConfig> {
    const dbConfig = await this.getPromptConfig(
      "arrow-articles.generate-content",
      {
        keyword,
        title: title || "",
        excerpt: excerpt || "",
        language: language || "pt",
        country: country || "BR",
      },
    );

    if (dbConfig) {
      return dbConfig;
    }

    // Fallback to hardcoded prompt
    this.logger.warn(
      "Using fallback hardcoded prompt for arrow-articles.generate-content",
    );
    return {
      systemPrompt: this.getSystemPromptForLanguage(language),
      userPrompt: this.getGenerateArrowArticlePromptFallback(
        keyword,
        title,
        excerpt,
        language,
        country,
      ),
      provider: "openrouter",
      model: DEFAULT_GEMINI_MODEL,
      temperature: 0.7,
      maxTokens: 4096,
    };
  }

  /**
   * Get language name from ISO code
   */
  private getLanguageName(code?: string): string {
    const languageNames: Record<string, string> = {
      pt: "Portuguese",
      en: "English",
      es: "Spanish",
      fr: "French",
      de: "German",
      it: "Italian",
      nl: "Dutch",
      ru: "Russian",
      zh: "Chinese",
      ja: "Japanese",
      ko: "Korean",
      ar: "Arabic",
    };
    return languageNames[code?.toLowerCase() || "pt"] || code || "Portuguese";
  }

  /**
   * Get country name from ISO code
   */
  private getCountryName(code?: string): string {
    const countryNames: Record<string, string> = {
      BR: "Brazil",
      US: "United States",
      PT: "Portugal",
      ES: "Spain",
      MX: "Mexico",
      AR: "Argentina",
      CO: "Colombia",
      FR: "France",
      DE: "Germany",
      IT: "Italy",
      GB: "United Kingdom",
      CA: "Canada",
      AU: "Australia",
    };
    return countryNames[code?.toUpperCase() || "BR"] || code || "Brazil";
  }

  /**
   * Get system prompt based on language
   */
  private getSystemPromptForLanguage(language?: string): string {
    const langName = this.getLanguageName(language);
    return `You are an expert SEO content writer. You write fluent, native-level content in ${langName}. All your output must be in ${langName}. Never mix languages.`;
  }

  /**
   * Fallback hardcoded prompt for generating arrow article content
   */
  private getGenerateArrowArticlePromptFallback(
    keyword: string,
    title?: string,
    excerpt?: string,
    language?: string,
    country?: string,
  ): string {
    const langName = this.getLanguageName(language);
    const countryName = this.getCountryName(country);

    return `## CONTEXT AND OBJECTIVE
Create a complete SEO-optimized article based on the provided keyword.

**CRITICAL: Write the ENTIRE article in ${langName} (${language || "pt"}), targeting audience from ${countryName}. Do NOT write in any other language.**

## INPUT DATA
- **Main keyword**: ${keyword}
- **Suggested title** (optional): ${title || ""}
- **Description/Summary** (optional): ${excerpt || ""}
- **Target language**: ${langName}
- **Target country/region**: ${countryName}

## INSTRUCTIONS

### If title was NOT provided:
1. Create an attractive SEO-optimized title IN ${langName}
2. The title must contain the main keyword
3. Ideal length: 50-60 characters
4. Use Title Case

### For the article content (ALL IN ${langName}):
1. **Introduction** (1-2 paragraphs):
   - Present the topic engagingly
   - Include the keyword naturally
   - Explain what the reader will learn

2. **Development** (3-5 sections with H2 subtitles):
   - Each section should have 2-4 paragraphs
   - Use clear, descriptive subtitles
   - Include the keyword and variations naturally
   - Add lists when appropriate

3. **Conclusion** (1-2 paragraphs):
   - Summarize the main points
   - Include a call to action

### Formatting rules:
- Use HTML for formatting (h2, h3, p, ul, li, strong, em)
- Do NOT use h1 (title will be h1)
- Paragraphs should have 3-5 sentences
- Total length: 800-1500 words

### SEO rules:
- Keyword density: 1-2%
- Use variations and synonyms of the keyword
- Subtitles should be descriptive and contain related terms

## OUTPUT FORMAT

Return ONLY valid JSON, no explanations. All text values must be in ${langName}:

{
  "title": "Article Title Optimized for SEO in ${langName}",
  "excerpt": "Article summary in 1-2 sentences in ${langName} (max 160 characters)",
  "content": "<p>HTML article content in ${langName}...</p>"
}`;
  }

  /**
   * Prompt for generating base article content from title
   * Fetches from database with fallback to hardcoded
   */
  async getGenerateBaseArticlePromptConfig(
    title: string,
    excerpt?: string,
  ): Promise<PromptConfig> {
    const dbConfig = await this.getPromptConfig(
      "base-articles.generate-content",
      {
        title,
        excerpt: excerpt || "",
      },
    );

    if (dbConfig) {
      return dbConfig;
    }

    // Fallback to hardcoded prompt
    this.logger.warn(
      "Using fallback hardcoded prompt for base-articles.generate-content",
    );
    return {
      systemPrompt:
        "Voce e um redator especialista em SEO e criacao de conteudo otimizado para blogs. Seu objetivo e criar artigos de base completos, bem estruturados e otimizados para mecanismos de busca.",
      userPrompt: this.getGenerateBaseArticlePromptFallback(title, excerpt),
      provider: "openrouter",
      model: DEFAULT_GEMINI_MODEL,
      temperature: 0.7,
      maxTokens: 8192,
    };
  }

  /**
   * Fallback hardcoded prompt for generating base article content
   */
  private getGenerateBaseArticlePromptFallback(
    title: string,
    excerpt?: string,
  ): string {
    return `## CONTEXTO E OBJETIVO
Crie um artigo de base completo e otimizado para SEO. Artigos de base sao conteudos evergreen que servem como pilares do blog.

## DADOS DE ENTRADA
- **Titulo do artigo**: ${title}
- **Descricao/Resumo** (opcional): ${excerpt || ""}

## INSTRUCOES

### Para o conteudo do artigo:
1. **Introducao** (2-3 paragrafos):
   - Apresente o tema de forma envolvente e profissional
   - Explique a importancia do assunto
   - Inclua o que o leitor vai aprender
   - Crie um gancho que prenda a atencao

2. **Desenvolvimento** (5-8 secoes com subtitulos H2):
   - Cada secao deve ter 3-5 paragrafos
   - Use subtitulos claros, descritivos e otimizados para SEO
   - Aprofunde cada topico com informacoes relevantes
   - Inclua exemplos praticos quando apropriado
   - Adicione listas (ul/ol) para facilitar a leitura
   - Use negritos (strong) para destacar termos importantes

3. **Conclusao** (2-3 paragrafos):
   - Resuma os pontos principais abordados
   - Reforce o valor do conteudo para o leitor
   - Inclua uma chamada para acao

### Regras de formatacao:
- Use HTML para formatacao (h2, h3, p, ul, ol, li, strong, em)
- NAO use h1 (o titulo ja sera o h1)
- Paragrafos devem ter 4-6 frases
- Tamanho total: 1500-2500 palavras (artigos de base sao mais completos)
- Use transicoes suaves entre secoes

### Regras de SEO:
- Inclua palavras-chave relacionadas ao titulo naturalmente
- Subtitulos devem ser descritivos e conter termos de busca
- Use variacoes e sinonimos dos termos principais
- Estruture o conteudo para featured snippets quando possivel

### Qualidade do conteudo:
- Seja informativo e educacional
- Evite fluff (enchimento de texto sem valor)
- Foque em entregar valor real ao leitor
- Mantenha um tom profissional mas acessivel

## FORMATO DE SAIDA

Retorne APENAS um JSON valido, sem explicacoes:

{
  "content": "<p>Conteudo HTML completo do artigo...</p>",
  "excerpt": "Resumo otimizado para SEO em 1-2 frases (max 160 caracteres)"
}`;
  }
}
