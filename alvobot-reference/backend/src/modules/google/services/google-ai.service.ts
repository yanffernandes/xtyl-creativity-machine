import { Injectable, Logger, Inject, Optional } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { GenerateKeywordsDto, GenerateGoogleAdCopyDto } from "../dto";
import { OpenRouterService } from "../../openrouter/openrouter.service";

type AIProvider = "openai" | "openrouter" | "google";
const DEFAULT_GEMINI_MODEL = "google/gemini-3-flash-preview";

interface PromptConfig {
  systemPrompt: string;
  userPrompt: string;
  provider: AIProvider;
  model: string;
  temperature: number;
  maxTokens: number;
}

/**
 * Truncates text to maxLength while preserving complete words.
 * If the text is already within limit, returns it unchanged.
 * If truncation is needed, cuts at the last complete word that fits.
 */
function truncateToWordBoundary(text: string, maxLength: number): string {
  if (!text || text.length <= maxLength) {
    return text;
  }

  // If the character at maxLength is a space, we can include up to that point
  if (text[maxLength] === " ") {
    return text.slice(0, maxLength).trim();
  }

  // Find the last space before maxLength
  const lastSpace = text.lastIndexOf(" ", maxLength);

  // If no space found, we have to cut the word (better than nothing)
  if (lastSpace === -1) {
    return text.slice(0, maxLength);
  }

  return text.slice(0, lastSpace).trim();
}

/**
 * Robustly cleans and parses JSON from AI response.
 * Handles common issues like trailing commas, unescaped characters, etc.
 */
function safeJsonParse<T>(content: string, logger?: Logger): T | null {
  if (!content) return null;

  let cleaned = content
    // Remove markdown code blocks
    .replace(/```json\n?/g, "")
    .replace(/```\n?/g, "")
    .trim();

  // Try direct parse first
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    // Continue with cleanup
  }

  // More aggressive cleanup
  cleaned = cleaned
    // Remove trailing commas before ] or }
    .replace(/,\s*]/g, "]")
    .replace(/,\s*}/g, "}")
    // Fix unescaped newlines in strings (common AI mistake)
    .replace(/([^\\])\\n/g, "$1 ")
    // Remove control characters
    .replace(/[\x00-\x1F\x7F]/g, " ")
    // Fix double quotes issues
    .replace(/"""/g, '"')
    .replace(/""/g, '"');

  try {
    return JSON.parse(cleaned) as T;
  } catch {
    // Try to extract just the array/object
    const arrayMatch = cleaned.match(/\[[\s\S]*\]/);
    const objectMatch = cleaned.match(/\{[\s\S]*\}/);

    if (arrayMatch) {
      try {
        return JSON.parse(arrayMatch[0]) as T;
      } catch {
        // Last resort: try to parse partial valid JSON
        if (logger) {
          logger.warn("JSON parse failed, attempting partial recovery");
        }
      }
    }

    if (objectMatch) {
      try {
        return JSON.parse(objectMatch[0]) as T;
      } catch {
        // Give up
      }
    }
  }

  return null;
}

export interface GeneratedKeyword {
  text: string;
  matchType: string;
  relevance: number;
}

interface GeneratedAdCopy {
  headlines: string[];
  descriptions: string[];
}

export interface GeneratedSitelink {
  text: string;
  description1: string;
  description2: string;
  finalUrl: string;
}

export interface GeneratedStructuredSnippet {
  header: string;
  values: string[];
}

export interface GeneratedExtensions {
  sitelinks: GeneratedSitelink[];
  callouts: string[];
  structuredSnippets: GeneratedStructuredSnippet[];
}

export interface GeneratedFromArticle {
  headlines: string[];
  descriptions: string[];
  suggestedCampaignName: string;
  extensions?: GeneratedExtensions;
}

interface ArticleContent {
  title: string;
  excerpt?: string;
  content?: string;
  keywordUsed?: string;
  language?: string;
  articleUrl?: string;
}

@Injectable()
export class GoogleAiService {
  private readonly logger = new Logger(GoogleAiService.name);
  private supabase: SupabaseClient;
  private promptCache: Map<string, { data: any; expiry: number }> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  // Language code to name mapping
  private static readonly LANGUAGE_NAMES: Record<string, string> = {
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
    portugues: "Portuguese", // Legacy fallback
  };

  constructor(
    private configService: ConfigService,
    @Optional()
    @Inject(OpenRouterService)
    private readonly openRouterService?: OpenRouterService,
  ) {
    // Initialize Supabase client for prompts
    const supabaseUrl = this.configService.get<string>("SUPABASE_URL");
    const supabaseServiceKey = this.configService.get<string>(
      "SUPABASE_SERVICE_KEY",
    );
    if (supabaseUrl && supabaseServiceKey) {
      this.supabase = createClient(supabaseUrl, supabaseServiceKey);
    }
  }

  /**
   * Convert language code to full language name
   * @throws Error if language code is not provided or not supported
   */
  private getLanguageName(code: string): string {
    if (!code) {
      throw new Error(
        "Language code is required. No default language is allowed.",
      );
    }
    const lowerCode = code.toLowerCase();
    const languageName = GoogleAiService.LANGUAGE_NAMES[lowerCode];
    if (!languageName) {
      throw new Error(
        `Unsupported language code: "${code}". Supported languages: ${Object.keys(GoogleAiService.LANGUAGE_NAMES).join(", ")}`,
      );
    }
    this.logger.log(`Language conversion: "${code}" -> "${languageName}"`);
    return languageName;
  }

  /**
   * Fetch prompt from database by key with caching
   */
  private async getPromptFromDb(key: string): Promise<any | null> {
    // Check cache first
    const cached = this.promptCache.get(key);
    if (cached && Date.now() < cached.expiry) {
      return cached.data;
    }

    try {
      const { data, error } = await this.supabase
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
      this.promptCache.set(key, { data, expiry: Date.now() + this.CACHE_TTL });

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
  private async getPromptConfig(
    key: string,
    variables: Record<string, string>,
  ): Promise<PromptConfig | null> {
    const prompt = await this.getPromptFromDb(key);
    if (!prompt) return null;

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

  /**
   * Execute chat completion with provider routing
   */
  private async executeChatCompletion(config: PromptConfig): Promise<string> {
    const messages: Array<{
      role: "system" | "user" | "assistant";
      content: string;
    }> = [];

    if (config.systemPrompt) {
      messages.push({ role: "system", content: config.systemPrompt });
    }
    messages.push({ role: "user", content: config.userPrompt });

    this.logger.debug(
      `Executing chat completion with provider: ${config.provider}, model: ${config.model}`,
    );

    const model = this.forceGeminiModel(config.model);

    if (!this.openRouterService) {
      throw new Error("OpenRouter service not available");
    }

    const result = await this.openRouterService.chatCompletion(
      model,
      messages,
      {
        temperature: config.temperature,
        max_tokens: config.maxTokens,
      },
    );

    if (!result.content) {
      throw new Error("Empty response from OpenRouter");
    }

    return result.content;
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
   * Generate keyword suggestions based on seed keywords
   */
  async generateKeywords(
    dto: GenerateKeywordsDto,
  ): Promise<GeneratedKeyword[]> {
    if (!this.openRouterService?.isConfigured()) {
      this.logger.warn("OpenRouter not configured, returning mock keywords");
      return this.getMockKeywords(dto.seedKeywords);
    }

    const count = dto.count || 20;
    const languageName = this.getLanguageName(dto.language);

    try {
      // Try to load prompt from database
      const promptConfig = await this.getPromptConfig(
        "google-ads.generate-keyword-suggestions",
        {
          seed_keywords: dto.seedKeywords.join(", "),
          product_name: dto.productName || "",
          product_description: dto.productDescription || "",
          count: String(count),
          language: languageName,
        },
      );

      if (!promptConfig) {
        throw new Error(
          'Prompt "google-ads.generate-keyword-suggestions" not found in database. Run the seed SQL to create system prompts.',
        );
      }

      this.logger.log(
        `Using prompt from database for generate-keyword-suggestions (provider: ${promptConfig.provider})`,
      );
      const content = await this.executeChatCompletion(promptConfig);
      const cleanedContent = content
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();

      const keywords = JSON.parse(cleanedContent) as GeneratedKeyword[];
      return keywords.slice(0, count);
    } catch (error) {
      this.logger.error(`Failed to generate keywords: ${error}`);
      return this.getMockKeywords(dto.seedKeywords);
    }
  }

  /**
   * Generate headlines and descriptions for responsive search ads
   */
  async generateAdCopy(dto: GenerateGoogleAdCopyDto): Promise<GeneratedAdCopy> {
    if (!this.openRouterService?.isConfigured()) {
      this.logger.warn("OpenRouter not configured, returning mock ad copy");
      return this.getMockAdCopy();
    }

    const headlineCount = dto.headlineCount || 10;
    const descriptionCount = dto.descriptionCount || 4;
    const languageName = this.getLanguageName(dto.language);

    try {
      // Try to load prompt from database
      const promptConfig = await this.getPromptConfig(
        "google-ads.generate-ad-copy",
        {
          product_name: dto.productName,
          product_description: dto.productDescription || "",
          keywords: dto.keywords?.join(", ") || "",
          tone: dto.tone || "professional and persuasive",
          headline_count: String(headlineCount),
          description_count: String(descriptionCount),
          language: languageName,
        },
      );

      if (!promptConfig) {
        throw new Error(
          'Prompt "google-ads.generate-ad-copy" not found in database. Run the seed SQL to create system prompts.',
        );
      }

      this.logger.log(
        `Using prompt from database for generate-ad-copy (provider: ${promptConfig.provider})`,
      );
      const content = await this.executeChatCompletion(promptConfig);
      const cleanedContent = content
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();

      const result = JSON.parse(cleanedContent) as GeneratedAdCopy;

      // Enforce character limits - use word boundary truncation to avoid cut words
      result.headlines = result.headlines
        .map((h) => truncateToWordBoundary(h.trim(), 30))
        .filter((h) => h.length >= 3) // Remove headlines that are too short
        .slice(0, headlineCount);
      result.descriptions = result.descriptions
        .map((d) => truncateToWordBoundary(d.trim(), 90))
        .filter((d) => d.length >= 10) // Remove descriptions that are too short
        .slice(0, descriptionCount);

      return result;
    } catch (error) {
      this.logger.error(`Failed to generate ad copy: ${error}`);
      return this.getMockAdCopy();
    }
  }

  /**
   * Generate headlines, descriptions and extensions from an article
   * Uses the keywords provided (from RapidAPI mining) to create coherent content
   * Prompt is loaded from database with fallback to hardcoded
   */
  async generateFromArticle(
    article: ArticleContent,
    options: {
      keywords?: string[]; // Keywords from RapidAPI mining
      headlineCount?: number;
      descriptionCount?: number;
      tone?: string;
      generateExtensions?: boolean;
    } = {},
  ): Promise<GeneratedFromArticle> {
    const keywords = options.keywords || [];
    const headlineCount = options.headlineCount || 15;
    const descriptionCount = options.descriptionCount || 4;
    const tone = options.tone || "profissional e persuasivo";
    const generateExtensions = options.generateExtensions !== false; // Default true

    this.logger.log(
      `Generating content from article with ${keywords.length} keywords`,
    );

    if (!this.openRouterService?.isConfigured()) {
      this.logger.warn(
        "OpenRouter not configured, returning mock data from article",
      );
      return this.getMockFromArticle(article, keywords);
    }

    // Use top keywords for the prompt (limit to avoid token overflow)
    const topKeywords = keywords.slice(0, 20);
    const keywordsText =
      topKeywords.length > 0
        ? topKeywords.join(", ")
        : article.keywordUsed || article.title;

    try {
      // Convert language code to full name for better AI understanding
      const languageName = this.getLanguageName(article.language);

      // Try to load prompt from database first
      const promptConfig = await this.getPromptConfig(
        "google-ads.generate-from-article",
        {
          article_title: article.title,
          article_keyword: article.keywordUsed || "N/A",
          article_excerpt: article.excerpt || "",
          keywords: keywordsText,
          headline_count: String(headlineCount),
          description_count: String(descriptionCount),
          tone: tone,
          language: languageName,
        },
      );

      if (!promptConfig) {
        throw new Error(
          'Prompt "google-ads.generate-from-article" not found in database. Run the seed SQL to create system prompts.',
        );
      }

      this.logger.log(
        `Using prompt from database for generate-from-article (provider: ${promptConfig.provider})`,
      );
      const content = await this.executeChatCompletion(promptConfig);
      const result = safeJsonParse<GeneratedFromArticle>(content, this.logger);

      if (!result || !result.headlines || !result.descriptions) {
        this.logger.warn(
          "Failed to parse generate-from-article JSON, using mock data",
        );
        return this.getMockFromArticle(article, keywords);
      }

      // Enforce character limits - use word boundary truncation to avoid cut words
      result.headlines = result.headlines
        .map((h) => truncateToWordBoundary(h.trim(), 30))
        .filter((h) => h.length >= 3) // Remove headlines that are too short
        .slice(0, headlineCount);
      result.descriptions = result.descriptions
        .map((d) => truncateToWordBoundary(d.trim(), 90))
        .filter((d) => d.length >= 10) // Remove descriptions that are too short
        .slice(0, descriptionCount);

      // Generate extensions using the keywords
      if (generateExtensions) {
        this.logger.log("Generating extensions for article...");
        result.extensions = await this.generateExtensionsFromArticle(
          article,
          topKeywords,
        );
      }

      return result;
    } catch (error) {
      this.logger.error(`Failed to generate from article: ${error}`);
      return this.getMockFromArticle(article, keywords);
    }
  }

  /**
   * Generate all extensions (sitelinks, callouts, structured snippets) for an article
   */
  async generateExtensionsFromArticle(
    article: ArticleContent,
    keywords: string[] = [],
  ): Promise<GeneratedExtensions> {
    // Run all extension generations in parallel
    const [sitelinks, callouts, structuredSnippets] = await Promise.all([
      this.generateSitelinksFromArticle(article, keywords),
      this.generateCalloutsFromArticle(article, keywords),
      this.generateStructuredSnippetsFromArticle(article, keywords),
    ]);

    return {
      sitelinks,
      callouts,
      structuredSnippets,
    };
  }

  /**
   * Generate sitelinks from article content - now generates 20 for better ad quality
   */
  private async generateSitelinksFromArticle(
    article: ArticleContent,
    keywords: string[] = [],
  ): Promise<GeneratedSitelink[]> {
    const articleUrl = article.articleUrl || "#";

    if (!this.openRouterService?.isConfigured()) {
      return this.getMockSitelinks(articleUrl);
    }

    const topKeywords = keywords.slice(0, 15).join(", ");

    try {
      // Try to load prompt from database
      const languageName = this.getLanguageName(article.language);
      const promptConfig = await this.getPromptConfig(
        "google-ads.generate-sitelinks",
        {
          article_title: article.title,
          keyword: article.keywordUsed || "N/A",
          excerpt: article.excerpt || "N/A",
          article_url: articleUrl,
          keywords: topKeywords,
          sitelink_count: "20",
          language: languageName,
        },
      );

      if (!promptConfig) {
        throw new Error(
          'Prompt "google-ads.generate-sitelinks" not found in database. Run the seed SQL to create system prompts.',
        );
      }

      this.logger.log(
        `Using prompt from database for generate-sitelinks (provider: ${promptConfig.provider})`,
      );
      const content = await this.executeChatCompletion(promptConfig);
      const sitelinks = safeJsonParse<GeneratedSitelink[]>(
        content,
        this.logger,
      );

      if (!sitelinks || !Array.isArray(sitelinks) || sitelinks.length === 0) {
        this.logger.warn("Failed to parse sitelinks JSON, using mock data");
        return this.getMockSitelinks(articleUrl);
      }

      // Enforce character limits - now allow up to 20 sitelinks
      return sitelinks
        .filter((s) => s && typeof s.text === "string")
        .slice(0, 20)
        .map((s) => ({
          text: (s.text || "").slice(0, 25),
          description1: (s.description1 || "").slice(0, 35),
          description2: (s.description2 || "").slice(0, 35),
          finalUrl: articleUrl,
        }));
    } catch (error) {
      this.logger.error(`Failed to generate sitelinks from article: ${error}`);
      return this.getMockSitelinks(articleUrl);
    }
  }

  /**
   * Generate callouts from article content
   */
  private async generateCalloutsFromArticle(
    article: ArticleContent,
    keywords: string[] = [],
  ): Promise<string[]> {
    if (!this.openRouterService?.isConfigured()) {
      return this.getMockCallouts();
    }

    const topKeywords = keywords.slice(0, 10).join(", ");

    try {
      // Try to load prompt from database
      const languageName = this.getLanguageName(article.language);
      const promptConfig = await this.getPromptConfig(
        "google-ads.generate-callouts",
        {
          article_title: article.title,
          keyword: article.keywordUsed || "N/A",
          excerpt: article.excerpt || "N/A",
          keywords: topKeywords,
          language: languageName,
        },
      );

      if (!promptConfig) {
        throw new Error(
          'Prompt "google-ads.generate-callouts" not found in database. Run the seed SQL to create system prompts.',
        );
      }

      this.logger.log(
        `Using prompt from database for generate-callouts (provider: ${promptConfig.provider})`,
      );
      const content = await this.executeChatCompletion(promptConfig);
      const callouts = safeJsonParse<string[]>(content, this.logger);

      if (!callouts || !Array.isArray(callouts) || callouts.length === 0) {
        this.logger.warn("Failed to parse callouts JSON, using mock data");
        return this.getMockCallouts();
      }

      return callouts
        .filter((c) => typeof c === "string")
        .slice(0, 6)
        .map((c) => c.slice(0, 25));
    } catch (error) {
      this.logger.error(`Failed to generate callouts from article: ${error}`);
      return this.getMockCallouts();
    }
  }

  /**
   * Generate structured snippets from article content - now generates up to 10 for better ad quality
   */
  private async generateStructuredSnippetsFromArticle(
    article: ArticleContent,
    keywords: string[] = [],
  ): Promise<GeneratedStructuredSnippet[]> {
    if (!this.openRouterService?.isConfigured()) {
      return this.getMockStructuredSnippets();
    }

    const topKeywords = keywords.slice(0, 15).join(", ");

    try {
      // Try to load prompt from database
      const languageName = this.getLanguageName(article.language);
      const promptConfig = await this.getPromptConfig(
        "google-ads.generate-structured-snippets",
        {
          article_title: article.title,
          keyword: article.keywordUsed || "N/A",
          excerpt: article.excerpt || "N/A",
          keywords: topKeywords,
          snippet_count: "10",
          language: languageName,
        },
      );

      if (!promptConfig) {
        throw new Error(
          'Prompt "google-ads.generate-structured-snippets" not found in database. Run the seed SQL to create system prompts.',
        );
      }

      this.logger.log(
        `Using prompt from database for generate-structured-snippets (provider: ${promptConfig.provider})`,
      );
      const content = await this.executeChatCompletion(promptConfig);
      const snippets = safeJsonParse<GeneratedStructuredSnippet[]>(
        content,
        this.logger,
      );

      if (!snippets || !Array.isArray(snippets) || snippets.length === 0) {
        this.logger.warn(
          "Failed to parse structured snippets JSON, using mock data",
        );
        return this.getMockStructuredSnippets();
      }

      // Enforce limits and validate structure - allow up to 10 snippets
      return snippets
        .filter(
          (s) => s && typeof s.header === "string" && Array.isArray(s.values),
        )
        .slice(0, 10)
        .map((s) => ({
          header: s.header,
          values: s.values
            .filter((v) => typeof v === "string")
            .slice(0, 10)
            .map((v) => v.slice(0, 25)),
        }));
    } catch (error) {
      this.logger.error(
        `Failed to generate structured snippets from article: ${error}`,
      );
      return this.getMockStructuredSnippets();
    }
  }

  // Mock data for extensions
  private getMockSitelinks(articleUrl: string): GeneratedSitelink[] {
    return [
      {
        text: "Saiba Mais",
        description1: "Conheca todos os detalhes",
        description2: "Leia o artigo completo",
        finalUrl: articleUrl,
      },
      {
        text: "Guia Completo",
        description1: "Informacoes detalhadas",
        description2: "Acesse agora",
        finalUrl: articleUrl,
      },
      {
        text: "Dicas Exclusivas",
        description1: "Conteudo especial",
        description2: "Nao perca",
        finalUrl: articleUrl,
      },
      {
        text: "Veja Mais",
        description1: "Descubra tudo",
        description2: "Clique aqui",
        finalUrl: articleUrl,
      },
    ];
  }

  private getMockCallouts(): string[] {
    return [
      "Conteudo Exclusivo",
      "Atualizado 2024",
      "Guia Completo",
      "Leitura Rapida",
      "100% Gratuito",
      "Dicas Praticas",
    ];
  }

  private getMockStructuredSnippets(): GeneratedStructuredSnippet[] {
    return [
      { header: "Tipos", values: ["Guia", "Tutorial", "Dicas", "Analise"] },
      { header: "Servicos", values: ["Consultoria", "Suporte", "Assessoria"] },
    ];
  }

  // ============================================
  // Mock data for when OpenRouter is not configured
  // ============================================

  private getMockFromArticle(
    article: ArticleContent,
    keywords: string[] = [],
  ): GeneratedFromArticle {
    const keyword =
      article.keywordUsed || article.title.split(" ").slice(0, 2).join(" ");
    const articleUrl = article.articleUrl || "#";

    // Use provided keywords in headlines if available - truncate at word boundary
    const keywordHeadlines = keywords
      .slice(0, 3)
      .map((kw) => truncateToWordBoundary(kw, 30));

    return {
      headlines: [
        truncateToWordBoundary(article.title, 30),
        ...keywordHeadlines,
        "Solucao Profissional",
        "Resultados Garantidos",
        "Equipe Especializada",
        "Comece Hoje Mesmo",
        "Confira Agora",
        "Saiba Mais",
        "Guia Completo",
        "Dicas Exclusivas",
        "Aprenda Hoje",
        "Descubra Como",
        "Veja Detalhes",
      ].slice(0, 15),
      descriptions: [
        truncateToWordBoundary(
          article.excerpt ||
            "Descubra como podemos ajudar. Resultados comprovados e suporte dedicado.",
          90,
        ),
        "Mais de 500 clientes satisfeitos. Solicite uma consultoria gratuita.",
        "Equipe especializada pronta para atender suas necessidades.",
        truncateToWordBoundary(
          `Tudo sobre ${keyword}. Acesse agora e confira.`,
          90,
        ),
      ].slice(0, 4),
      suggestedCampaignName: `Campanha - ${truncateToWordBoundary(article.title, 40)}`,
      extensions: {
        sitelinks: this.getMockSitelinks(articleUrl),
        callouts: this.getMockCallouts(),
        structuredSnippets: this.getMockStructuredSnippets(),
      },
    };
  }

  private getMockKeywords(seedKeywords: string[]): GeneratedKeyword[] {
    const baseTerm = seedKeywords[0] || "servico";
    return [
      { text: baseTerm, matchType: "BROAD", relevance: 10 },
      { text: `${baseTerm} profissional`, matchType: "PHRASE", relevance: 9 },
      { text: `melhor ${baseTerm}`, matchType: "BROAD", relevance: 8 },
      { text: `${baseTerm} online`, matchType: "PHRASE", relevance: 8 },
      { text: `contratar ${baseTerm}`, matchType: "EXACT", relevance: 9 },
      { text: `${baseTerm} perto de mim`, matchType: "BROAD", relevance: 7 },
      { text: `${baseTerm} barato`, matchType: "PHRASE", relevance: 6 },
      { text: `${baseTerm} de qualidade`, matchType: "PHRASE", relevance: 8 },
      { text: `empresa de ${baseTerm}`, matchType: "BROAD", relevance: 7 },
      { text: `${baseTerm} rapido`, matchType: "PHRASE", relevance: 7 },
    ];
  }

  private getMockAdCopy(): GeneratedAdCopy {
    return {
      headlines: [
        "Solucao Profissional",
        "Resultados Garantidos",
        "Equipe Especializada",
        "Melhor Custo-Beneficio",
        "Atendimento Premium",
        "Comece Hoje Mesmo",
        "Orcamento Gratis",
        "Qualidade Comprovada",
      ],
      descriptions: [
        "Transforme seu negocio com nossa solucao completa. Resultados comprovados e suporte dedicado.",
        "Mais de 500 clientes satisfeitos. Solicite uma consultoria gratuita e veja a diferenca.",
        "Equipe especializada pronta para atender suas necessidades. Fale conosco agora.",
        "Qualidade premium com o melhor preco do mercado. Aproveite condicoes especiais.",
      ],
    };
  }

  /**
   * Generate alternative keywords when the original keyword is too specific
   * and returns few results from Google Keyword Planner.
   * Uses LLM to expand the keyword into broader, related terms.
   */
  async expandKeyword(
    originalKeyword: string,
    currentCount: number,
    article: { title?: string; excerpt?: string; language: string }, // language is required
  ): Promise<{ alternativeKeywords: string[]; reasoning: string }> {
    if (!this.openRouterService?.isConfigured()) {
      this.logger.warn("OpenRouter not configured, returning mock expansion");
      return this.getMockKeywordExpansion(originalKeyword);
    }

    const languageName = this.getLanguageName(article.language);

    try {
      // Try to load prompt from database
      const promptConfig = await this.getPromptConfig(
        "google-ads.keyword-expansion",
        {
          original_keyword: originalKeyword,
          current_count: String(currentCount),
          article_title: article?.title || "N/A",
          article_excerpt: article?.excerpt || "N/A",
          language: languageName,
        },
      );

      if (!promptConfig) {
        this.logger.warn(
          'Prompt "google-ads.keyword-expansion" not found, using fallback',
        );
        return this.expandKeywordFallback(originalKeyword);
      }

      this.logger.log(
        `Using LLM to expand keyword "${originalKeyword}" (current count: ${currentCount}, provider: ${promptConfig.provider})`,
      );
      const content = await this.executeChatCompletion(promptConfig);
      const result = safeJsonParse<{
        alternative_keywords: string[];
        reasoning: string;
      }>(content, this.logger);

      if (
        !result ||
        !result.alternative_keywords ||
        !Array.isArray(result.alternative_keywords)
      ) {
        this.logger.warn(
          "Failed to parse keyword expansion JSON, using fallback",
        );
        return this.expandKeywordFallback(originalKeyword);
      }

      this.logger.log(
        `LLM generated ${result.alternative_keywords.length} alternative keywords: ${result.alternative_keywords.join(", ")}`,
      );

      return {
        alternativeKeywords: result.alternative_keywords.slice(0, 4),
        reasoning: result.reasoning || "Expansão gerada por IA",
      };
    } catch (error) {
      this.logger.error(`Failed to expand keyword: ${error}`);
      return this.expandKeywordFallback(originalKeyword);
    }
  }

  /**
   * Simple fallback keyword expansion without AI
   * Creates variations by removing/modifying parts of the original keyword
   */
  private expandKeywordFallback(originalKeyword: string): {
    alternativeKeywords: string[];
    reasoning: string;
  } {
    const words = originalKeyword.split(" ").filter((w) => w.length > 2);
    const alternatives: string[] = [];

    // Strategy 1: Use first 2-3 words only
    if (words.length > 3) {
      alternatives.push(words.slice(0, 3).join(" "));
      alternatives.push(words.slice(0, 2).join(" "));
    }

    // Strategy 2: Use last 2-3 words only
    if (words.length > 3) {
      alternatives.push(words.slice(-3).join(" "));
      alternatives.push(words.slice(-2).join(" "));
    }

    // Strategy 3: Remove common modifiers
    const modifiersToRemove = [
      "melhor",
      "melhores",
      "best",
      "top",
      "como",
      "how",
      "gratis",
      "free",
      "barato",
      "cheap",
      "2024",
      "2025",
    ];
    const filteredWords = words.filter(
      (w) => !modifiersToRemove.includes(w.toLowerCase()),
    );
    if (filteredWords.length >= 2 && filteredWords.length !== words.length) {
      alternatives.push(filteredWords.join(" "));
    }

    // Deduplicate and return max 4
    const unique = [...new Set(alternatives)].slice(0, 4);

    return {
      alternativeKeywords:
        unique.length > 0 ? unique : [words[0] || originalKeyword],
      reasoning: "Expansão baseada em remoção de modificadores específicos",
    };
  }

  /**
   * Mock keyword expansion for when OpenRouter is not configured
   */
  private getMockKeywordExpansion(originalKeyword: string): {
    alternativeKeywords: string[];
    reasoning: string;
  } {
    const words = originalKeyword.split(" ");
    return {
      alternativeKeywords: [
        words.slice(0, 2).join(" ") || originalKeyword,
        words[0] || originalKeyword,
        `como ${words[0] || "fazer"}`,
        `${words[0] || "guia"} completo`,
      ],
      reasoning: "Mock expansion - OpenRouter not configured",
    };
  }
}
