import { Injectable, Logger, Inject, Optional } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import OpenAI from "openai";
import { PromptsService, PromptConfig } from "./prompts.service";
import { OpenRouterService } from "../../openrouter/openrouter.service";
import type {
  CategoryGroup,
  ArticleTitle,
  AuthorData,
  LogoConfig,
  BlogSettings,
  ArrowArticleContent,
  BaseArticleContent,
} from "../types";

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly openai: OpenAI;
  private readonly defaultModel = "google/gemini-3-flash-preview";

  constructor(
    private readonly configService: ConfigService,
    private readonly promptsService: PromptsService,
    @Optional()
    @Inject(OpenRouterService)
    private readonly openRouterService?: OpenRouterService,
  ) {
    const apiKey = this.configService.get<string>("OPENAI_API_KEY");
    if (!apiKey) {
      this.logger.warn(
        "OPENAI_API_KEY not configured - OpenAI fallback disabled (Gemini via OpenRouter only)",
      );
    }
    this.openai = new OpenAI({ apiKey: apiKey || "" });
  }

  /**
   * Execute completion with proper provider routing
   */
  private async executeCompletion(config: PromptConfig): Promise<string> {
    const messages: Array<{
      role: "system" | "user" | "assistant";
      content: string;
    }> = [];

    // Add system prompt if present
    if (config.systemPrompt) {
      messages.push({ role: "system", content: config.systemPrompt });
    }

    // Add user prompt
    messages.push({ role: "user", content: config.userPrompt });

    const model = this.forceGeminiModel(config.model || this.defaultModel);
    const routedConfig = { ...config, provider: "openrouter" as const, model };
    return this.executeOpenRouterCompletion(routedConfig, messages);
  }

  /**
   * Execute OpenAI completion
   */
  private async executeOpenAICompletion(
    config: PromptConfig,
    messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
  ): Promise<string> {
    this.logger.debug(`Using OpenAI provider with model: ${config.model}`);

    const response = await this.openai.chat.completions.create({
      model: config.model || this.defaultModel,
      messages,
      temperature: config.temperature,
      max_tokens: config.maxTokens,
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("Empty response from OpenAI");
    }

    return content;
  }

  private forceGeminiModel(model: string): string {
    if (!model) {
      return this.defaultModel;
    }

    if (!model.includes("gemini") || /gemini-(1|1\\.5|2)/.test(model)) {
      return this.defaultModel;
    }

    return model;
  }

  /**
   * Execute OpenRouter completion
   */
  private async executeOpenRouterCompletion(
    config: PromptConfig,
    messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
  ): Promise<string> {
    if (!this.openRouterService) {
      throw new Error("OpenRouter service not available");
    }

    if (!this.openRouterService.isConfigured()) {
      throw new Error("OpenRouter API key not configured");
    }

    this.logger.debug(`Using OpenRouter provider with model: ${config.model}`);

    const result = await this.openRouterService.chatCompletion(
      config.model,
      messages,
      {
        temperature: config.temperature,
        max_tokens: config.maxTokens,
        response_format: { type: "json_object" },
      },
    );

    if (!result.content) {
      throw new Error("Empty response from OpenRouter");
    }

    return result.content;
  }

  /**
   * Generate niche suggestions using AI
   */
  async generateNiches(language: string, domain?: string): Promise<string[]> {
    const config = await this.promptsService.getGenerateNichesPromptConfig(
      language,
      domain,
    );

    this.logger.debug(`Generating niches with ${config.provider}...`);
    const startTime = Date.now();

    try {
      const content = await this.executeCompletion(config);
      const parsed = JSON.parse(content);
      const niches: string[] = parsed.niches || [];

      this.logger.debug(
        `Generated ${niches.length} niches in ${Date.now() - startTime}ms`,
      );

      return niches;
    } catch (error) {
      this.logger.error("Failed to generate niches:", error);
      throw error;
    }
  }

  /**
   * Generate categories based on a niche
   */
  async generateCategories(niche: string): Promise<CategoryGroup[][]> {
    const config =
      await this.promptsService.getGenerateCategoriesPromptConfig(niche);

    this.logger.debug(`Generating categories for niche: ${niche}`);
    const startTime = Date.now();

    try {
      const content = await this.executeCompletion(config);
      const parsed = JSON.parse(content);
      const categories: CategoryGroup[][] = parsed.categories || [];

      this.logger.debug(
        `Generated ${categories.length} category groups in ${Date.now() - startTime}ms`,
      );

      return categories;
    } catch (error) {
      this.logger.error("Failed to generate categories:", error);
      throw error;
    }
  }

  /**
   * Generate article titles using 4-layer technique
   */
  async generateTitles(
    niche: string,
    categories: string[],
  ): Promise<ArticleTitle[]> {
    const config = await this.promptsService.getGenerateTitlesPromptConfig(
      niche,
      categories,
    );

    this.logger.debug(
      `Generating titles for ${categories.length} categories in niche: ${niche}`,
    );
    const startTime = Date.now();

    try {
      const content = await this.executeCompletion(config);
      const parsed = JSON.parse(content);
      const titles: ArticleTitle[] = (parsed.titles || []).map(
        (t: { title: string; category: string }, index: number) => ({
          id: `title-${Date.now()}-${index}`,
          title: t.title,
          category: t.category,
        }),
      );

      this.logger.debug(
        `Generated ${titles.length} titles in ${Date.now() - startTime}ms`,
      );

      return titles;
    } catch (error) {
      this.logger.error("Failed to generate titles:", error);
      throw error;
    }
  }

  /**
   * Generate author persona
   */
  async generateAuthor(niche: string): Promise<AuthorData> {
    const config =
      await this.promptsService.getGenerateAuthorPromptConfig(niche);

    this.logger.debug(`Generating author for niche: ${niche}`);

    try {
      const content = await this.executeCompletion(config);
      const parsed = JSON.parse(content);
      return {
        name: parsed.name,
        description: parsed.description,
        sex: parsed.sex,
      };
    } catch (error) {
      this.logger.error("Failed to generate author:", error);
      throw error;
    }
  }

  /**
   * Generate logo configuration
   */
  async generateLogoConfig(niche: string): Promise<LogoConfig> {
    const config = await this.promptsService.getGenerateLogoPromptConfig(niche);

    this.logger.debug(`Generating logo config for niche: ${niche}`);

    try {
      const content = await this.executeCompletion(config);
      const parsed = JSON.parse(content);
      return {
        icon: parsed.icon,
        font: parsed.font,
        color: parsed.color,
      };
    } catch (error) {
      this.logger.error("Failed to generate logo config:", error);
      throw error;
    }
  }

  /**
   * Generate blog title and description
   */
  async generateBlogTitleDescription(
    niche: string,
    wpUrl: string,
  ): Promise<BlogSettings> {
    const config = await this.promptsService.getGenerateBlogTitlePromptConfig(
      niche,
      wpUrl,
    );

    this.logger.debug(`Generating blog title for niche: ${niche}`);

    try {
      const content = await this.executeCompletion(config);
      const parsed = JSON.parse(content);
      return {
        title: parsed.title,
        description: parsed.description,
      };
    } catch (error) {
      this.logger.error("Failed to generate blog title:", error);
      throw error;
    }
  }

  /**
   * Generate arrow article content from keyword
   */
  async generateArrowArticleContent(
    keyword: string,
    title?: string,
    excerpt?: string,
    language?: string,
    country?: string,
  ): Promise<ArrowArticleContent> {
    const config =
      await this.promptsService.getGenerateArrowArticlePromptConfig(
        keyword,
        title,
        excerpt,
        language,
        country,
      );

    this.logger.debug(
      `Generating arrow article content for keyword: ${keyword}`,
    );
    const startTime = Date.now();

    try {
      const content = await this.executeCompletion(config);
      const parsed = JSON.parse(content);

      this.logger.debug(
        `Generated arrow article content in ${Date.now() - startTime}ms`,
      );

      return {
        title: title || parsed.title,
        excerpt: excerpt || parsed.excerpt,
        content: parsed.content,
      };
    } catch (error) {
      this.logger.error("Failed to generate arrow article content:", error);
      throw error;
    }
  }

  /**
   * Generate base article content from title
   */
  async generateBaseArticleContent(
    title: string,
    excerpt?: string,
  ): Promise<BaseArticleContent> {
    const config = await this.promptsService.getGenerateBaseArticlePromptConfig(
      title,
      excerpt,
    );

    this.logger.debug(`Generating base article content for title: ${title}`);
    const startTime = Date.now();

    try {
      const content = await this.executeCompletion(config);
      const parsed = JSON.parse(content);

      this.logger.debug(
        `Generated base article content in ${Date.now() - startTime}ms`,
      );

      return {
        content: parsed.content,
        excerpt: excerpt || parsed.excerpt,
      };
    } catch (error) {
      this.logger.error("Failed to generate base article content:", error);
      throw error;
    }
  }
}
