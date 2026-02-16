import {
  Injectable,
  Logger,
  Inject,
  Optional,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import OpenAI from "openai";
import { GoogleGenAI } from "@google/genai";
import {
  ImageModel,
  ImageFormat,
  ArticleContextDto,
} from "../dto/generate-image.dto";
import { OpenRouterService } from "../../openrouter/openrouter.service";
import { ReplicateService } from "../../replicate/replicate.service";
import { AIProvider } from "../../../common/types/ai-provider.types";
import {
  PromptComposerService,
  CreativeConcept,
  CreativeBackground,
  VisualGroup,
  NicheTemplate,
  TextOverlay,
  ArticleContext as PromptArticleContext,
} from "./prompt-composer.service";
import {
  buildLocalizationContext,
  type LocalizationInfo,
} from "../data/localization-data";

export interface GeneratedAdCopy {
  headline: string;
  primaryText: string;
  description?: string;
  callToAction: string;
}

export interface GeneratedCreative {
  imageUrl: string;
  imageBase64?: string;
  revisedPrompt?: string;
}

export interface ArticleContext {
  title: string;
  keyword: string;
  excerpt?: string;
  destinationUrl?: string;
  objective?: string;
  language?: string;
  // Full localization context (extracted from keyword_snapshot)
  localization?: LocalizationInfo;
}

interface SystemPrompt {
  key: string;
  system_prompt: string;
  user_prompt_template: string;
  provider: AIProvider | null;
  provider_model: string | null;
  model: string;
  temperature: number;
  max_tokens: number;
}

/**
 * Custom exception for pending image generations
 * Thrown when image generation times out but may still complete on the provider side
 * This should NOT trigger fallback - the caller should store this for later retrieval
 */
export class PendingGenerationException extends HttpException {
  constructor(
    public readonly predictionId: string,
    public readonly provider: string,
    public readonly model: string,
    public readonly prompt: string,
    message = "A geração está demorando mais que o esperado. Você pode verificar o status posteriormente.",
  ) {
    super(
      {
        statusCode: HttpStatus.ACCEPTED, // 202 - Accepted but not completed
        message,
        pending: true,
        predictionId,
        provider,
        model,
      },
      HttpStatus.ACCEPTED,
    );
  }
}

// Valid Meta CTA values - Official list from Meta Marketing API
// Source: https://github.com/facebook/facebook-business-sdk-codegen/blob/main/api_specs/specs/enum_types.json
export const VALID_META_CTA_VALUES = [
  // Most common for ads
  "LEARN_MORE",
  "SHOP_NOW",
  "SIGN_UP",
  "CONTACT_US",
  "GET_OFFER",
  "DOWNLOAD",
  "BOOK_NOW",
  "SUBSCRIBE",
  "APPLY_NOW",
  "MESSAGE_PAGE", // Official name for "Send Message"
  "WHATSAPP_MESSAGE",
  // Additional common CTAs
  "BUY_NOW",
  "ORDER_NOW",
  "GET_QUOTE",
  "CALL_NOW",
  "CALL",
  "GET_DIRECTIONS",
  "WATCH_MORE",
  "WATCH_VIDEO",
  "LISTEN_NOW",
  "PLAY_GAME",
  "INSTALL_APP",
  "USE_APP",
  "GET_STARTED",
  "DONATE_NOW",
  "DONATE",
  "BUY_TICKETS",
  "REQUEST_TIME",
  "SEE_MORE",
  "SEND_UPDATES",
  "GET_SHOWTIMES",
  "EVENT_RSVP",
  "NO_BUTTON",
] as const;

/**
 * Validates and sanitizes CTA value from AI response
 * Handles typos, case issues, and invalid values
 */
function sanitizeCTA(rawCta: string | undefined | null): string {
  if (!rawCta) return "LEARN_MORE";

  // Normalize: uppercase, trim, remove extra spaces/underscores
  const normalized = rawCta
    .toString()
    .toUpperCase()
    .trim()
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_");

  // Check if it's a valid CTA
  if (
    VALID_META_CTA_VALUES.includes(
      normalized as (typeof VALID_META_CTA_VALUES)[number],
    )
  ) {
    return normalized;
  }

  // Handle common typos/variations and legacy names
  const typoMap: Record<string, string> = {
    // Typos
    LEAR_MORE: "LEARN_MORE",
    LEARNMORE: "LEARN_MORE",
    LEARN: "LEARN_MORE",
    // Portuguese translations (AI might return these)
    SAIBA_MAIS: "LEARN_MORE",
    SAIBAMAIS: "LEARN_MORE",
    COMPRAR_AGORA: "SHOP_NOW",
    COMPRAR: "SHOP_NOW",
    CADASTRAR: "SIGN_UP",
    CADASTRE_SE: "SIGN_UP",
    INSCREVER: "SIGN_UP",
    BAIXAR: "DOWNLOAD",
    RESERVAR: "BOOK_NOW",
    LIGAR: "CALL_NOW",
    ENVIAR_MENSAGEM: "MESSAGE_PAGE",
    // Common variations
    SHOPNOW: "SHOP_NOW",
    SHOP: "SHOP_NOW",
    BUY: "BUY_NOW",
    SIGNUP: "SIGN_UP",
    SIGN: "SIGN_UP",
    CONTACT: "CONTACT_US",
    CONTACTUS: "CONTACT_US",
    GETOFFER: "GET_OFFER",
    OFFER: "GET_OFFER",
    BOOKNOW: "BOOK_NOW",
    BOOK: "BOOK_NOW",
    APPLYNOW: "APPLY_NOW",
    APPLY: "APPLY_NOW",
    // Legacy/alias names
    SEND_MESSAGE: "MESSAGE_PAGE", // Legacy name maps to official
    SENDMESSAGE: "MESSAGE_PAGE",
    MESSAGE: "MESSAGE_PAGE",
    WHATSAPP: "WHATSAPP_MESSAGE",
    CALLNOW: "CALL_NOW",
    GETQUOTE: "GET_QUOTE",
    ORDERNOW: "ORDER_NOW",
    WATCHVIDEO: "WATCH_VIDEO",
    WATCHMORE: "WATCH_MORE",
    GETSTARTED: "GET_STARTED",
    INSTALLAPP: "INSTALL_APP",
  };

  if (typoMap[normalized]) {
    return typoMap[normalized];
  }

  // Default fallback
  return "LEARN_MORE";
}

// Creative styles for variation
export const CREATIVE_STYLES = [
  "photorealistic",
  "illustration",
  "minimalist",
  "cinematic",
  "watercolor",
] as const;

const PROMPT_JSON_REFINER_MODEL = "google/gemini-3-flash-preview";
const BANNED_PROMPT_WORDS = [
  "imediato",
  "hoje",
  "agora",
  "instantâneo",
  "bani pe loc",
  "azi",
];

export type CreativeStyle = (typeof CREATIVE_STYLES)[number];

// T053: Model rotation for diversity (Andromeda compliance)
// Models are rotated to ensure visual diversity in generated creatives
// FR-002: Gemini 3 Pro via OpenRouter (primary), Replicate models (fallback)
export const AVAILABLE_MODELS = [
  {
    provider: "openrouter" as AIProvider,
    model: "google/gemini-3-pro-image-preview",
    displayName: "Gemini 3 Pro",
  },
  {
    provider: "replicate" as AIProvider,
    model: "google/nano-banana-pro",
    displayName: "Nano Banana Pro",
  },
  {
    provider: "replicate" as AIProvider,
    model: "openai/gpt-image-1.5",
    displayName: "GPT Image 1.5",
  },
] as const;

export type AvailableModel = (typeof AVAILABLE_MODELS)[number];

export interface ImageGenerationResult {
  imageUrl: string;
  imageBase64?: string;
  storagePath?: string;
  promptUsed: string;
  model: ImageModel;
  style: CreativeStyle;
}

// Interface for platform settings default image model
interface DefaultImageModelConfig {
  provider: AIProvider;
  model: string;
}

// T022: Options for concept-based image generation
export interface ConceptGenerationOptions {
  concept?: CreativeConcept;
  background?: CreativeBackground;
  visualGroup?: VisualGroup;
  visualGroupVariationIndex?: number;
  nicheTemplate?: NicheTemplate;
  userDirections?: string;
  autoDirections?: string;
  textOverlay?: TextOverlay;
  targeting?: {
    countries: string[];
    languages?: Array<{ key: string; name: string }>;
  };
  // T055: Used models tracking for rotation
  usedModels?: string[];
  // Forced model identifier (provider/model) for deterministic rotation
  forcedModelId?: string;
}

// T023: Result with concept tracking
export interface ConceptGenerationResult {
  imageBase64: string;
  mimeType: string;
  modelUsed: string;
  conceptId?: string;
  conceptSlug?: string;
  backgroundSlug?: string;
  visualGroupCode?: string;
  visualGroupVariationIndex?: number;
  promptUsed: string;
  revisedPrompt?: string;
}

@Injectable()
export class AiCreativeService {
  private readonly logger = new Logger(AiCreativeService.name);
  private readonly openai: OpenAI;
  private readonly googleAI: GoogleGenAI | null = null;
  private readonly model = "google/gemini-3-flash-preview";
  private readonly imageModel = "dall-e-3";
  private readonly imagenModel = "imagen-3.0-generate-002";
  private supabase: SupabaseClient;
  private openRouterService: OpenRouterService | null = null;
  private replicateService: ReplicateService | null = null;
  private promptComposerService: PromptComposerService | null = null;

  constructor(
    private readonly configService: ConfigService,
    @Optional()
    @Inject(OpenRouterService)
    private readonly injectedOpenRouterService?: OpenRouterService,
    @Optional()
    @Inject(ReplicateService)
    private readonly injectedReplicateService?: ReplicateService,
    @Optional()
    @Inject(PromptComposerService)
    private readonly injectedPromptComposerService?: PromptComposerService,
  ) {
    this.openRouterService = this.injectedOpenRouterService || null;
    this.replicateService = this.injectedReplicateService || null;
    this.promptComposerService = this.injectedPromptComposerService || null;
    const apiKey = this.configService.get<string>("OPENAI_API_KEY");
    if (!apiKey) {
      this.logger.warn(
        "OPENAI_API_KEY not configured - AI features will not work",
      );
    }
    this.openai = new OpenAI({ apiKey: apiKey || "" });

    // Initialize Google AI for Imagen
    const googleAiKey = this.configService.get<string>("GOOGLE_AI_API_KEY");
    if (googleAiKey) {
      this.googleAI = new GoogleGenAI({ apiKey: googleAiKey });
      this.logger.log("Google AI (Imagen) initialized");
    } else {
      this.logger.warn(
        "GOOGLE_AI_API_KEY not configured - Imagen features will not work",
      );
    }

    // Initialize Supabase for fetching prompts
    const supabaseUrl = this.configService.get<string>("SUPABASE_URL");
    const supabaseServiceKey = this.configService.get<string>(
      "SUPABASE_SERVICE_KEY",
    );
    if (supabaseUrl && supabaseServiceKey) {
      this.supabase = createClient(supabaseUrl, supabaseServiceKey);
    }
  }

  /**
   * Get style for index (cycles through available styles)
   */
  getStyleForIndex(index: number): CreativeStyle {
    return CREATIVE_STYLES[index % CREATIVE_STYLES.length];
  }

  /**
   * T054: Get next model with round-robin rotation
   * Used to ensure visual diversity by rotating between available models
   * @param usedModels Array of previously used model identifiers in this session
   * @returns The next model to use, preferring unused models
   */
  getNextModel(usedModels: string[] = []): {
    provider: AIProvider;
    model: string;
    displayName: string;
  } {
    // Track model usage counts
    const modelUsage: Record<string, number> = {};
    for (const model of AVAILABLE_MODELS) {
      const modelId = `${model.provider}/${model.model}`;
      modelUsage[modelId] = usedModels.filter((m) => m === modelId).length;
    }

    // Find the model with minimum usage
    let minUsage = Infinity;
    let selectedIndex = 0;

    for (let i = 0; i < AVAILABLE_MODELS.length; i++) {
      const model = AVAILABLE_MODELS[i];
      const modelId = `${model.provider}/${model.model}`;
      if (modelUsage[modelId] < minUsage) {
        minUsage = modelUsage[modelId];
        selectedIndex = i;
      }
    }

    const selectedModel = AVAILABLE_MODELS[selectedIndex];

    this.logger.debug(
      `T054: Selected model ${selectedModel.provider}/${selectedModel.model} (usage: ${minUsage}, total used: ${usedModels.length})`,
    );

    return {
      provider: selectedModel.provider,
      model: selectedModel.model,
      displayName: selectedModel.displayName,
    };
  }

  getAvailableModelIds(): string[] {
    const enabledModels = AVAILABLE_MODELS.filter((model) =>
      this.isModelProviderConfigured(model.provider),
    );
    if (enabledModels.length === 0) {
      this.logger.warn(
        "No AI providers configured for model rotation; falling back to full model list",
      );
      return AVAILABLE_MODELS.map(
        (model) => `${model.provider}/${model.model}`,
      );
    }
    return enabledModels.map((model) => `${model.provider}/${model.model}`);
  }

  /**
   * T056: Generate image with model rotation
   * Extends generateImageWithConfiguredModel to use rotating models for diversity
   */
  async generateImageWithRotatedModel(
    prompt: string,
    format: ImageFormat,
    usedModels: string[] = [],
  ): Promise<{
    imageBase64: string;
    mimeType: string;
    modelUsed: string;
    revisedPrompt?: string;
  }> {
    // Get the next model in rotation
    const rotatedModel = this.getNextModel(usedModels);
    const modelId = `${rotatedModel.provider}/${rotatedModel.model}`;

    this.logger.debug(`T056: Generating image with rotated model: ${modelId}`);

    try {
      // T057: Try primary model with fallback
      if (rotatedModel.provider === "openrouter") {
        const result = await this.generateImageWithOpenRouter(
          prompt,
          rotatedModel.model,
          format,
        );
        return { ...result, modelUsed: modelId };
      } else if (rotatedModel.provider === "replicate") {
        // FR-005: Replicate models (Nano Banana Pro, GPT Image 1.5)
        const result = await this.generateImageWithReplicate(
          prompt,
          rotatedModel.model,
          format,
        );
        return { ...result, modelUsed: modelId };
      } else if (rotatedModel.provider === "google") {
        const result = await this.generateImageWithImagen(prompt, format);
        return { ...result, modelUsed: modelId };
      } else {
        // OpenAI
        const result = await this.generateImageWithDallE(prompt, format);
        return { ...result, modelUsed: modelId };
      }
    } catch (primaryError) {
      // Do NOT fallback on PendingGenerationException - image may still be generating
      if (primaryError instanceof PendingGenerationException) {
        this.logger.warn(
          `Model ${modelId} returned pending status - NOT triggering fallback`,
        );
        throw primaryError;
      }

      // T057: Fallback to next available model (only for real failures)
      this.logger.warn(
        `Model ${modelId} failed, trying fallback...`,
        primaryError instanceof Error ? primaryError.message : primaryError,
      );

      // Try other models in order
      for (const fallbackModel of AVAILABLE_MODELS) {
        const fallbackId = `${fallbackModel.provider}/${fallbackModel.model}`;
        if (fallbackId === modelId) continue; // Skip the one that just failed

        try {
          this.logger.debug(`T057: Trying fallback model: ${fallbackId}`);

          if (fallbackModel.provider === "openrouter") {
            const result = await this.generateImageWithOpenRouter(
              prompt,
              fallbackModel.model,
              format,
            );
            return { ...result, modelUsed: `${fallbackId} (fallback)` };
          } else if (fallbackModel.provider === "replicate") {
            // FR-005: Replicate fallback
            const result = await this.generateImageWithReplicate(
              prompt,
              fallbackModel.model,
              format,
            );
            return { ...result, modelUsed: `${fallbackId} (fallback)` };
          } else if (fallbackModel.provider === "google") {
            const result = await this.generateImageWithImagen(prompt, format);
            return { ...result, modelUsed: `${fallbackId} (fallback)` };
          } else {
            const result = await this.generateImageWithDallE(prompt, format);
            return { ...result, modelUsed: `${fallbackId} (fallback)` };
          }
        } catch (fallbackError) {
          // Do NOT continue fallback if pending - image may still be generating
          if (fallbackError instanceof PendingGenerationException) {
            throw fallbackError;
          }
          this.logger.warn(
            `Fallback model ${fallbackId} also failed`,
            fallbackError instanceof Error
              ? fallbackError.message
              : fallbackError,
          );
          continue; // Try next fallback
        }
      }

      // T057A: All models failed - throw error (no credits consumed)
      this.logger.error("All available models failed for image generation");
      throw primaryError;
    }
  }

  /**
   * Generate image with an explicit provider/model identifier
   * Accepts "provider/model" strings (e.g., "openrouter/google/gemini-3-pro-image-preview")
   */
  async generateImageWithSpecificModel(
    prompt: string,
    format: ImageFormat,
    modelId: string,
  ): Promise<{
    imageBase64: string;
    mimeType: string;
    modelUsed: string;
    revisedPrompt?: string;
  }> {
    const cleanedModelId = modelId.replace(/\s*\(fallback\)$/i, "");
    const { provider, model } = this.parseModelIdentifier(cleanedModelId);

    try {
      if (provider === "openrouter") {
        const result = await this.generateImageWithOpenRouter(
          prompt,
          model,
          format,
        );
        return { ...result, modelUsed: `${provider}/${model}` };
      }
      if (provider === "replicate") {
        const result = await this.generateImageWithReplicate(
          prompt,
          model,
          format,
        );
        return { ...result, modelUsed: `${provider}/${model}` };
      }
      if (provider === "google") {
        const result = await this.generateImageWithImagen(prompt, format);
        return { ...result, modelUsed: `${provider}/${model}` };
      }

      const result = await this.generateImageWithDallE(prompt, format);
      return { ...result, modelUsed: `${provider}/${model}` };
    } catch (primaryError) {
      // Do NOT fallback on PendingGenerationException
      if (primaryError instanceof PendingGenerationException) {
        throw primaryError;
      }

      // Fallback to other models if the forced one fails
      for (const fallbackModel of AVAILABLE_MODELS) {
        const fallbackId = `${fallbackModel.provider}/${fallbackModel.model}`;
        if (fallbackId === cleanedModelId) continue;

        try {
          if (fallbackModel.provider === "openrouter") {
            const result = await this.generateImageWithOpenRouter(
              prompt,
              fallbackModel.model,
              format,
            );
            return { ...result, modelUsed: `${fallbackId} (fallback)` };
          }
          if (fallbackModel.provider === "replicate") {
            const result = await this.generateImageWithReplicate(
              prompt,
              fallbackModel.model,
              format,
            );
            return { ...result, modelUsed: `${fallbackId} (fallback)` };
          }
          if (fallbackModel.provider === "google") {
            const result = await this.generateImageWithImagen(prompt, format);
            return { ...result, modelUsed: `${fallbackId} (fallback)` };
          }

          const result = await this.generateImageWithDallE(prompt, format);
          return { ...result, modelUsed: `${fallbackId} (fallback)` };
        } catch (fallbackError) {
          // Do NOT continue fallback if pending
          if (fallbackError instanceof PendingGenerationException) {
            throw fallbackError;
          }
          this.logger.warn(
            `Fallback model ${fallbackId} failed`,
            fallbackError instanceof Error
              ? fallbackError.message
              : fallbackError,
          );
        }
      }

      throw primaryError;
    }
  }

  /**
   * Parse provider/model identifier into parts
   */
  private parseModelIdentifier(modelId: string): {
    provider: AIProvider;
    model: string;
  } {
    if (modelId.includes("/")) {
      const [provider, ...rest] = modelId.split("/");
      return { provider: provider as AIProvider, model: rest.join("/") };
    }

    // Default to OpenRouter if provider not specified
    return { provider: "openrouter", model: modelId };
  }

  private isModelProviderConfigured(provider: AIProvider): boolean {
    if (provider === "openrouter") {
      return !!this.openRouterService?.isConfigured();
    }
    if (provider === "replicate") {
      return !!this.replicateService?.isConfigured();
    }
    if (provider === "google") {
      return !!this.googleAI;
    }
    return true;
  }

  /**
   * Get article context from database for ad copy generation
   * Extracts language and full localization from keyword_snapshot
   * to ensure correct language, currency, and cultural context in generated copy
   */
  async getArticleContext(articleId: number): Promise<{
    title: string;
    keyword: string;
    excerpt: string;
    language: string;
    localization: LocalizationInfo;
  } | null> {
    if (!this.supabase) {
      this.logger.warn("Supabase not configured for fetching article context");
      return null;
    }

    const { data, error } = await this.supabase
      .from("articles")
      .select("title, keyword_used, excerpt, keyword_snapshot, language")
      .eq("id", articleId)
      .single();

    if (error || !data) {
      this.logger.warn(`Article ${articleId} not found: ${error?.message}`);
      return null;
    }

    // Extract language and country from keyword_snapshot (JSON field)
    // Priority: keyword_snapshot.language > article.language > 'portugues'
    let language = "portugues";
    let country: string | null = null;

    if (data.keyword_snapshot) {
      const snapshot =
        typeof data.keyword_snapshot === "string"
          ? JSON.parse(data.keyword_snapshot)
          : data.keyword_snapshot;

      if (snapshot.language) {
        language = snapshot.language;
      }
      if (snapshot.country) {
        country = snapshot.country;
      }
    } else if (data.language) {
      language = data.language;
    }

    // Build comprehensive localization context
    const localization = buildLocalizationContext(country, language);

    this.logger.debug(
      `Article ${articleId} context: keyword="${data.keyword_used}", language="${language}", country="${country}", currency="${localization.currency_symbol}"`,
    );

    return {
      title: data.title || "",
      keyword: data.keyword_used || "",
      excerpt: data.excerpt || "",
      language,
      localization,
    };
  }

  /**
   * Fetch a system prompt from the database
   */
  private async getSystemPrompt(key: string): Promise<SystemPrompt | null> {
    if (!this.supabase) {
      this.logger.warn("Supabase not configured for fetching prompts");
      return null;
    }

    const { data, error } = await this.supabase
      .from("system_prompts")
      .select(
        "key, system_prompt, user_prompt_template, provider, provider_model, model, temperature, max_tokens",
      )
      .eq("key", key)
      .eq("is_active", true)
      .single();

    if (error || !data) {
      this.logger.warn(`System prompt not found: ${key}`);
      return null;
    }

    return data;
  }

  /**
   * Execute a chat completion with provider routing (OpenAI or OpenRouter)
   */
  private async executeChatCompletion(
    systemPrompt: SystemPrompt,
    userPrompt: string,
    options: { responseFormat?: "json" | "text" } = {},
  ): Promise<string> {
    let provider = systemPrompt.provider || "openrouter";
    let model =
      provider === "openrouter" && systemPrompt.provider_model
        ? systemPrompt.provider_model
        : systemPrompt.model || this.model;

    if (model.includes("gpt-4o-mini")) {
      provider = "openrouter";
      model = this.model;
    }

    if (model.includes("gemini") && provider !== "openrouter") {
      provider = "openrouter";
    }

    const messages: Array<{
      role: "system" | "user" | "assistant";
      content: string;
    }> = [
      { role: "system", content: systemPrompt.system_prompt },
      { role: "user", content: userPrompt },
    ];

    this.logger.debug(
      `Executing chat completion with provider: ${provider}, model: ${model}`,
    );

    if (provider === "openrouter") {
      if (!this.openRouterService) {
        throw new Error("OpenRouter service not available");
      }

      const result = await this.openRouterService.chatCompletion(
        this.ensureGeminiModelFresh(model),
        messages,
        {
          temperature: systemPrompt.temperature || 0.7,
          max_tokens: systemPrompt.max_tokens || 2000,
          response_format:
            options.responseFormat === "json"
              ? { type: "json_object" }
              : undefined,
        },
      );

      if (!result.content) {
        throw new Error("Empty response from OpenRouter");
      }

      return result.content;
    }

    // Default to OpenAI
    const response = await this.openai.chat.completions.create({
      model: model,
      messages,
      temperature: systemPrompt.temperature || 0.7,
      max_tokens: systemPrompt.max_tokens || 2000,
      response_format:
        options.responseFormat === "json" ? { type: "json_object" } : undefined,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("Empty response from OpenAI");
    }

    return content;
  }

  private async executeGeminiChat(
    prompt: string,
    options: {
      temperature?: number;
      responseFormat?: "json" | "text";
      maxTokens?: number;
    } = {},
  ): Promise<string> {
    if (!this.openRouterService) {
      throw new Error("OpenRouter service not available");
    }

    const result = await this.openRouterService.chatCompletion(
      this.ensureGeminiModelFresh(this.model),
      [{ role: "user", content: prompt }],
      {
        temperature: options.temperature,
        max_tokens: options.maxTokens,
        response_format:
          options.responseFormat === "json"
            ? { type: "json_object" }
            : undefined,
      },
    );

    if (!result.content) {
      throw new Error("Empty response from OpenRouter");
    }

    return result.content;
  }

  private ensureGeminiModelFresh(model: string): string {
    if (!model) {
      return this.model;
    }

    if (!model.includes("gemini")) {
      this.logger.warn(
        `Non-Gemini model "${model}" requested. Forcing ${this.model}.`,
      );
      return this.model;
    }

    if (/gemini-(1|1\\.5|2)/.test(model)) {
      this.logger.warn(
        `Gemini model "${model}" is older than Gemini 3 Flash. Upgrading to ${this.model}.`,
      );
      return this.model;
    }

    return model;
  }

  /**
   * Replace template variables in a prompt
   */
  private replaceVariables(
    template: string,
    variables: Record<string, string>,
  ): string {
    let result = template;
    for (const [key, value] of Object.entries(variables)) {
      result = result.replace(new RegExp(`{{${key}}}`, "g"), value || "");
    }
    return result;
  }

  /**
   * Generate complete ad copy from article context using database prompts
   */
  async generateAdCopyFromArticle(
    article: ArticleContext,
  ): Promise<GeneratedAdCopy> {
    const promptKey = "meta-ads.complete-copy";
    const systemPrompt = await this.getSystemPrompt(promptKey);

    // Fallback to hardcoded if not in database
    if (!systemPrompt) {
      this.logger.warn("Using fallback prompt for ad copy generation");
      return this.generateAdCopyFallback(article);
    }

    const variables = {
      article_title: article.title || "",
      keyword: article.keyword || "",
      article_excerpt: article.excerpt || "",
      destination_url: article.destinationUrl || "",
      objective: article.objective || "TRAFFIC",
      language: article.language || "portugues",
      // Add valid CTAs list for prompts to use via {{valid_ctas}}
      valid_ctas: VALID_META_CTA_VALUES.join(" | "),
    };

    const userPrompt = this.replaceVariables(
      systemPrompt.user_prompt_template,
      variables,
    );

    this.logger.debug(`Generating ad copy from article: ${article.title}`);
    const startTime = Date.now();

    try {
      const content = await this.executeChatCompletion(
        systemPrompt,
        userPrompt,
        { responseFormat: "json" },
      );
      const parsed = JSON.parse(content);

      this.logger.debug(`Generated ad copy in ${Date.now() - startTime}ms`);

      return {
        primaryText: parsed.primary_text || "",
        headline: parsed.headline || "",
        description: parsed.description || "",
        callToAction: sanitizeCTA(parsed.suggested_cta),
      };
    } catch (error) {
      this.logger.error("Failed to generate ad copy from article:", error);
      throw error;
    }
  }

  /**
   * Fallback method for ad copy generation when database prompt is not available
   */
  private async generateAdCopyFallback(
    article: ArticleContext,
  ): Promise<GeneratedAdCopy> {
    // List valid CTAs in prompt to ensure AI returns correct values
    const validCtaList = VALID_META_CTA_VALUES.join(" | ");

    const prompt = `Voce e um copywriter especialista em anuncios Meta/Facebook Ads.

Crie textos para um anuncio baseado neste artigo:
- Titulo: ${article.title}
- Palavra-chave: ${article.keyword}
- Resumo: ${article.excerpt || "Nao disponivel"}
- Objetivo: ${article.objective || "TRAFFIC"}
- Idioma: ${article.language || "portugues"}

Retorne um JSON com:
{
  "primary_text": "Texto principal do anuncio (max 125 chars)",
  "headline": "Headline curta (max 27 chars)",
  "description": "Descricao curta (max 27 chars)",
  "suggested_cta": "LEARN_MORE | SHOP_NOW | SIGN_UP | CONTACT_US | GET_OFFER | DOWNLOAD"
}

RESTRICAO: O campo "suggested_cta" DEVE ser EXATAMENTE um destes valores (em MAIUSCULAS, sem espacos):
${validCtaList}

Escolha o CTA mais apropriado para o objetivo. Padrao: LEARN_MORE.`;

    const content = await this.executeGeminiChat(prompt, {
      temperature: 0.8,
      responseFormat: "json",
    });
    const parsed = JSON.parse(content);
    return {
      primaryText: parsed.primary_text || "",
      headline: parsed.headline || "",
      description: parsed.description || "",
      callToAction: sanitizeCTA(parsed.suggested_cta),
    };
  }

  /**
   * Generate ad copy variations for a product/service
   */
  async generateAdCopy(
    productName: string,
    options: {
      productDescription?: string;
      targetAudience?: string;
      campaignObjective?: string;
      tone?: string;
      language?: string;
      variations?: number;
    } = {},
  ): Promise<GeneratedAdCopy[]> {
    const {
      productDescription = "",
      targetAudience = "público geral",
      campaignObjective = "tráfego",
      tone = "profissional",
      language = "pt-BR",
      variations = 3,
    } = options;

    // List valid CTAs to ensure AI returns correct values
    const validCtaList = VALID_META_CTA_VALUES.join(" | ");

    const prompt = `Você é um especialista em copywriting para anúncios do Meta (Facebook/Instagram).

Gere ${variations} variações de copy para anúncio com as seguintes informações:

**Produto/Serviço:** ${productName}
**Descrição:** ${productDescription || "Não especificada"}
**Público-alvo:** ${targetAudience}
**Objetivo da campanha:** ${campaignObjective}
**Tom de voz:** ${tone}
**Idioma:** ${language}

Para cada variação, crie:
1. **headline**: Título curto e impactante (máx. 40 caracteres)
2. **primaryText**: Texto principal do anúncio (máx. 125 caracteres para melhor performance)
3. **description**: Descrição adicional (máx. 30 caracteres)
4. **callToAction**: Um dos valores EXATOS: ${validCtaList}

Retorne um JSON no formato:
{
  "copies": [
    {
      "headline": "...",
      "primaryText": "...",
      "description": "...",
      "callToAction": "LEARN_MORE"
    }
  ]
}

RESTRICAO OBRIGATORIA: O campo "callToAction" DEVE ser EXATAMENTE um destes valores (MAIUSCULAS, sem espacos):
${validCtaList}

Importante:
- Use técnicas de copywriting persuasivo (AIDA, PAS, etc.)
- Inclua gatilhos mentais quando apropriado
- Seja criativo mas mantenha a clareza
- Evite clichês e frases genéricas
- Considere o objetivo da campanha ao criar o copy`;

    this.logger.debug(
      `Generating ${variations} ad copy variations for: ${productName}`,
    );
    const startTime = Date.now();

    try {
      const content = await this.executeGeminiChat(prompt, {
        temperature: 0.9,
        responseFormat: "json",
      });

      const parsed = JSON.parse(content);
      const rawCopies = parsed.copies || [];

      // Sanitize CTA values for all variations
      const copies: GeneratedAdCopy[] = rawCopies.map(
        (copy: Record<string, unknown>) => ({
          headline: (copy.headline as string) || "",
          primaryText:
            (copy.primaryText as string) || (copy.primary_text as string) || "",
          description: (copy.description as string) || "",
          callToAction: sanitizeCTA(
            (copy.callToAction as string) || (copy.call_to_action as string),
          ),
        }),
      );

      this.logger.debug(
        `Generated ${copies.length} ad copies in ${Date.now() - startTime}ms`,
      );

      return copies;
    } catch (error) {
      this.logger.error("Failed to generate ad copy:", error);
      throw error;
    }
  }

  /**
   * Generate headlines only (lighter operation)
   */
  async generateHeadlines(
    productName: string,
    options: {
      productDescription?: string;
      count?: number;
      language?: string;
    } = {},
  ): Promise<string[]> {
    const { productDescription = "", count = 5, language = "pt-BR" } = options;

    const prompt = `Gere ${count} headlines criativas para anúncios do ${productName}.
${productDescription ? `Descrição: ${productDescription}` : ""}
Idioma: ${language}

Regras:
- Máximo 40 caracteres cada
- Impactantes e persuasivas
- Variadas em estilo (pergunta, afirmação, urgência, benefício, etc.)

Retorne JSON: { "headlines": ["...", "..."] }`;

    try {
      const content = await this.executeGeminiChat(prompt, {
        temperature: 1,
        responseFormat: "json",
      });

      const parsed = JSON.parse(content);
      return parsed.headlines || [];
    } catch (error) {
      this.logger.error("Failed to generate headlines:", error);
      throw error;
    }
  }

  /**
   * Generate ice breakers (conversation starters) for message ads
   * based on the creative copy. Returns a greeting + strategic questions
   * that match the ad content language and niche.
   *
   * @param primaryText - The main ad body text
   * @param headline - The ad headline
   * @param description - The ad description (optional)
   * @returns Object with greeting text and ice breakers array
   */
  async generateIceBreakers(
    primaryText: string,
    headline: string,
    description?: string,
  ): Promise<{
    greeting: string;
    iceBreakers: Array<{ title: string; response: string }>;
  }> {
    const prompt = `You are an expert in Meta Ads click-to-message campaigns.

Generate a conversation configurator (greeting + ice breakers) for this ad:

AD COPY:
- Headline: ${headline}
- Primary Text: ${primaryText}
${description ? `- Description: ${description}` : ""}

CRITICAL RULES:
1. Detect the ad copy language and write ALL text in that SAME language
2. BE EXTREMELY CONCISE - this is a chat interface, not an email
3. Greeting: max 80 chars. Short, warm, use {{user_first_name}}. One sentence only. Example: "Olá {{user_first_name}}! 👋 De que valor você precisa?"
4. Ice breaker titles: max 40 chars. Short labels like button text. Example: "💰 Até R$ 50.000"
5. Ice breaker responses: max 80 chars. One short sentence. Example: "Ótimo! Me envie seu telefone para continuar."
6. Generate exactly 3 ice breakers that self-qualify the user (budget ranges, service types, etc.)
7. Use 1 relevant emoji per ice breaker title
8. NO long explanations, NO formal language, NO multiple sentences
9. Think of it as WhatsApp quick-reply buttons, not paragraphs

Return JSON:
{
  "greeting": "Short greeting with {{user_first_name}}",
  "iceBreakers": [
    { "title": "Emoji + short label", "response": "One short reply sentence" },
    { "title": "Emoji + short label", "response": "One short reply sentence" },
    { "title": "Emoji + short label", "response": "One short reply sentence" }
  ]
}`;

    try {
      const content = await this.executeGeminiChat(prompt, {
        temperature: 0.7,
        responseFormat: "json",
        maxTokens: 600,
      });

      const parsed = JSON.parse(content);

      // Validate structure
      if (
        !parsed.greeting ||
        !Array.isArray(parsed.iceBreakers) ||
        parsed.iceBreakers.length === 0
      ) {
        throw new Error("Invalid ice breakers response structure");
      }

      // Enforce limits
      return {
        greeting: parsed.greeting.slice(0, 300),
        iceBreakers: parsed.iceBreakers.slice(0, 3).map(
          (ib: { title: string; response: string }) => ({
            title: (ib.title || "").slice(0, 80),
            response: (ib.response || "").slice(0, 300),
          }),
        ),
      };
    } catch (error) {
      this.logger.warn(
        `Failed to generate ice breakers via AI, using fallback: ${error.message}`,
      );
      // Fallback: generate basic ice breakers from the headline
      return this.generateIceBreakersFallback(primaryText, headline);
    }
  }

  /**
   * Fallback ice breaker generation when AI is unavailable.
   * Uses simple pattern matching on the ad copy.
   */
  private generateIceBreakersFallback(
    primaryText: string,
    headline: string,
  ): {
    greeting: string;
    iceBreakers: Array<{ title: string; response: string }>;
  } {
    return {
      greeting: `Olá, {{user_first_name}}! ${headline}. Como podemos ajudar?`,
      iceBreakers: [
        {
          title: "✅ Quero saber mais!",
          response:
            "Que ótimo! Vou te passar todas as informações que você precisa.",
        },
        {
          title: "💬 Tenho uma dúvida",
          response:
            "Claro, estou aqui para ajudar! Me conta qual é a sua dúvida.",
        },
        {
          title: "🚀 Como posso começar?",
          response:
            "Fico feliz com o seu interesse! Vou te mostrar o passo a passo.",
        },
      ],
    };
  }

  /**
   * Generate image using DALL-E
   * Note: This is more expensive and should be used carefully
   */
  async generateImage(
    prompt: string,
    options: {
      style?: string;
      aspectRatio?: string;
      quality?: "standard" | "hd";
    } = {},
  ): Promise<GeneratedCreative> {
    const {
      style = "photorealistic",
      aspectRatio = "1:1",
      quality = "standard",
    } = options;

    // Map aspect ratio to DALL-E size
    const sizeMap: Record<string, "1024x1024" | "1792x1024" | "1024x1792"> = {
      "1:1": "1024x1024",
      "16:9": "1792x1024",
      "9:16": "1024x1792",
    };
    const size = sizeMap[aspectRatio] || "1024x1024";

    const enhancedPrompt = `Create a professional advertisement image: ${prompt}. Style: ${style}. High quality, suitable for social media advertising.`;

    this.logger.debug(
      `Generating image with DALL-E: ${prompt.substring(0, 50)}...`,
    );
    const startTime = Date.now();

    try {
      const response = await this.openai.images.generate({
        model: this.imageModel,
        prompt: enhancedPrompt,
        n: 1,
        size,
        quality,
        response_format: "url",
      });

      const image = response.data[0];
      if (!image?.url) {
        throw new Error("No image generated");
      }

      this.logger.debug(`Generated image in ${Date.now() - startTime}ms`);

      return {
        imageUrl: image.url,
        revisedPrompt: image.revised_prompt,
      };
    } catch (error) {
      this.logger.error("Failed to generate image:", error);
      throw error;
    }
  }

  /**
   * Suggest improvements for existing ad copy
   */
  async suggestImprovements(
    currentCopy: {
      headline: string;
      primaryText: string;
      description?: string;
    },
    options: {
      campaignObjective?: string;
      currentPerformance?: string;
      language?: string;
    } = {},
  ): Promise<{ suggestions: string[]; improvedCopy: GeneratedAdCopy }> {
    const {
      campaignObjective = "conversões",
      currentPerformance = "não especificado",
      language = "pt-BR",
    } = options;

    const prompt = `Analise este copy de anúncio e sugira melhorias:

**Copy atual:**
- Headline: "${currentCopy.headline}"
- Texto principal: "${currentCopy.primaryText}"
- Descrição: "${currentCopy.description || "N/A"}"

**Contexto:**
- Objetivo: ${campaignObjective}
- Performance atual: ${currentPerformance}
- Idioma: ${language}

Retorne JSON com:
{
  "suggestions": ["sugestão 1", "sugestão 2", ...],
  "improvedCopy": {
    "headline": "...",
    "primaryText": "...",
    "description": "...",
    "callToAction": "..."
  }
}`;

    try {
      const content = await this.executeGeminiChat(prompt, {
        temperature: 0.7,
        responseFormat: "json",
      });

      return JSON.parse(content);
    } catch (error) {
      this.logger.error("Failed to suggest improvements:", error);
      throw error;
    }
  }

  /**
   * Generate a complete creative package for a campaign
   */
  async generateCreativePackage(
    productName: string,
    options: {
      productDescription?: string;
      targetAudience?: string;
      campaignObjective?: string;
      tone?: string;
      includeImage?: boolean;
      imagePrompt?: string;
      language?: string;
    } = {},
  ): Promise<{
    copies: GeneratedAdCopy[];
    image?: GeneratedCreative;
  }> {
    const copies = await this.generateAdCopy(productName, {
      productDescription: options.productDescription,
      targetAudience: options.targetAudience,
      campaignObjective: options.campaignObjective,
      tone: options.tone,
      language: options.language,
      variations: 3,
    });

    let image: GeneratedCreative | undefined;
    if (options.includeImage && options.imagePrompt) {
      image = await this.generateImage(options.imagePrompt, {
        style: "photorealistic",
        aspectRatio: "1:1",
      });
    }

    return { copies, image };
  }

  // ============================================
  // New Image Generation Methods (Imagen + DALL-E)
  // ============================================

  /**
   * Generate an image prompt from article context using database prompts
   */
  async generateImagePrompt(
    article: ArticleContextDto,
    style: CreativeStyle,
    format: ImageFormat,
    userDirections?: string,
  ): Promise<string> {
    const promptKey = "meta-ads.image-prompt-generator";
    const systemPrompt = await this.getSystemPrompt(promptKey);

    // Fallback to hardcoded if not in database
    if (!systemPrompt) {
      this.logger.warn("Using fallback prompt for image generation");
      return this.generateImagePromptFallback(
        article,
        style,
        format,
        userDirections,
      );
    }

    const variables: Record<string, string> = {
      article_title: article.title || "",
      keyword: article.keyword || "",
      article_excerpt: article.excerpt || "",
      style: style,
      format: format,
      user_directions: userDirections || "",
    };

    const userPrompt = this.replaceVariables(
      systemPrompt.user_prompt_template,
      variables,
    );

    this.logger.debug(`Generating image prompt for: ${article.title}`);

    try {
      const content = await this.executeChatCompletion(
        systemPrompt,
        userPrompt,
        { responseFormat: "text" },
      );
      return content.trim();
    } catch (error) {
      this.logger.error("Failed to generate image prompt:", error);
      return this.generateImagePromptFallback(
        article,
        style,
        format,
        userDirections,
      );
    }
  }

  /**
   * Generate a JSON prompt wrapper for image generation
   * Always returns JSON + prompt text used for image model
   */
  async generateImagePromptJson(
    article: ArticleContextDto,
    style: CreativeStyle,
    format: ImageFormat,
    userDirections?: string,
  ): Promise<{ promptJson: string; promptText: string }> {
    const template = {
      meta: {
        version: "prompt-master-json-v1",
        generated_at: new Date().toISOString(),
      },
      input: {
        article: {
          title: article.title || "",
          keyword: article.keyword || "",
          excerpt: article.excerpt || "",
        },
        style,
        format,
        user_directions: userDirections || null,
      },
      constraints: {
        output_format: "png",
        banned_words: BANNED_PROMPT_WORDS,
        no_carousel: true,
        text_policy:
          "Do not add any on-image text unless explicitly requested in user_directions.",
        cta_policy:
          "If CTA is requested, it must be large and highly visible; if not requested, do not add one.",
      },
    };

    let promptText: string | null = null;
    let output: {
      prompts?: Array<{ id?: number; prompt?: string }>;
      validation_summary?: {
        total_prompts: number;
        prohibited_words_found: string[];
      };
    } | null = null;

    if (this.openRouterService?.isConfigured()) {
      const systemPrompt = `You are a senior performance creative director.
Return ONLY valid JSON with this exact structure:
{
  "prompts": [
    { "id": 1, "prompt": "DETAILED PROMPT STRING" }
  ],
  "validation_summary": {
    "total_prompts": 1,
    "prohibited_words_found": []
  }
}

Rules:
- Prompt must be highly detailed (composition, lighting, style, camera, texture).
- Output format PNG.
- Do not add any text unless user_directions explicitly request it.
- Do not promise guaranteed approval, credit release, or guaranteed money.
- Never use carousel.
- Do NOT include any banned words listed in constraints.banned_words.
- CRITICAL TYPOGRAPHY SIZE: This image will be used as a Meta/Facebook ad on mobile phones (~350px display width). ALL text in the image must be LARGE and readable at a glance. Headlines at minimum 48pt, body text at minimum 28pt, UI labels at minimum 22pt. For UI-style images (notes, chat, dashboard, simulator), use oversized ad-optimized text that looks native but is 2-3x larger than real app text. When in doubt, make text BIGGER.
`;

      const userPrompt = `Template JSON:
${JSON.stringify(template, null, 2)}`;

      try {
        const response = await this.openRouterService.chatCompletion(
          PROMPT_JSON_REFINER_MODEL,
          [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          {
            temperature: 0.35,
            max_tokens: 1600,
            response_format: { type: "json_object" },
          },
        );
        output = JSON.parse(response.content.trim());
        promptText = output?.prompts?.[0]?.prompt || null;
      } catch (error) {
        this.logger.warn(
          `[AI] Failed to build JSON prompt, falling back: ${error instanceof Error ? error.message : error}`,
        );
      }
    }

    if (!promptText) {
      promptText = await this.generateImagePrompt(
        article,
        style,
        format,
        userDirections,
      );
      output = {
        prompts: [{ id: 1, prompt: promptText }],
        validation_summary: { total_prompts: 1, prohibited_words_found: [] },
      };
    }

    return {
      promptJson: JSON.stringify(output, null, 2),
      promptText: promptText.trim(),
    };
  }

  /**
   * Fallback method for image prompt generation
   */
  private generateImagePromptFallback(
    article: ArticleContextDto,
    style: CreativeStyle,
    format: ImageFormat,
    userDirections?: string,
  ): string {
    const styleDescriptions: Record<CreativeStyle, string> = {
      photorealistic: "Ultra-realistic professional photography style",
      illustration: "Modern digital illustration with clean lines",
      minimalist: "Simple, clean design with focus on essential elements",
      cinematic: "Movie-poster style with dramatic lighting",
      watercolor: "Artistic, soft watercolor painting style",
    };

    let prompt = `Professional advertisement image for Meta/Facebook ads about "${article.title}". `;
    prompt += `Focus on the topic: ${article.keyword}. `;
    prompt += `Visual style: ${styleDescriptions[style]}. `;
    prompt += `The image should be eye-catching and suitable for social media advertising. `;
    prompt += `No text in the image. High quality, professional composition.`;

    if (userDirections) {
      prompt += ` Additional requirements: ${userDirections}`;
    }

    return prompt;
  }

  /**
   * Generate image using Google Imagen 3
   */
  async generateImageWithImagen(
    prompt: string,
    format: ImageFormat,
  ): Promise<{ imageBase64: string; mimeType: string }> {
    if (!this.googleAI) {
      throw new Error("Google AI not configured");
    }

    // Map format to aspect ratio
    const aspectRatioMap: Record<ImageFormat, string> = {
      "1:1": "1:1",
      "9:16": "9:16",
      "16:9": "16:9",
    };

    this.logger.debug(
      `Generating image with Imagen: ${prompt.substring(0, 50)}...`,
    );
    const startTime = Date.now();

    try {
      const response = await this.googleAI.models.generateImages({
        model: this.imagenModel,
        prompt: prompt,
        config: {
          numberOfImages: 1,
          aspectRatio: aspectRatioMap[format],
        },
      });

      if (!response.generatedImages || response.generatedImages.length === 0) {
        throw new Error("No image generated by Imagen");
      }

      const generatedImage = response.generatedImages[0];
      if (!generatedImage.image?.imageBytes) {
        throw new Error("No image bytes in Imagen response");
      }

      this.logger.debug(
        `Generated image with Imagen in ${Date.now() - startTime}ms`,
      );

      return {
        imageBase64: generatedImage.image.imageBytes,
        mimeType: "image/png",
      };
    } catch (error) {
      this.logger.error("Failed to generate image with Imagen:", error);
      throw error;
    }
  }

  /**
   * Generate image using DALL-E 3 (returns base64)
   */
  async generateImageWithDallE(
    prompt: string,
    format: ImageFormat,
  ): Promise<{
    imageBase64: string;
    mimeType: string;
    revisedPrompt?: string;
  }> {
    // Map aspect ratio to DALL-E size
    const sizeMap: Record<
      ImageFormat,
      "1024x1024" | "1792x1024" | "1024x1792"
    > = {
      "1:1": "1024x1024",
      "16:9": "1792x1024",
      "9:16": "1024x1792",
    };
    const size = sizeMap[format];

    this.logger.debug(
      `Generating image with DALL-E: ${prompt.substring(0, 50)}...`,
    );
    const startTime = Date.now();

    try {
      const response = await this.openai.images.generate({
        model: this.imageModel,
        prompt: prompt,
        n: 1,
        size,
        quality: "standard",
        response_format: "b64_json",
      });

      const image = response.data[0];
      if (!image?.b64_json) {
        throw new Error("No image generated by DALL-E");
      }

      this.logger.debug(
        `Generated image with DALL-E in ${Date.now() - startTime}ms`,
      );

      return {
        imageBase64: image.b64_json,
        mimeType: "image/png",
        revisedPrompt: image.revised_prompt,
      };
    } catch (error: any) {
      const errorMessage = error?.message || "Unknown error";
      const errorStatus = error?.status || error?.response?.status || "N/A";
      const errorCode = error?.code || error?.error?.code || "N/A";
      this.logger.error(
        `Failed to generate image with DALL-E: ${errorMessage} (status: ${errorStatus}, code: ${errorCode})`,
      );
      if (error?.response?.data) {
        this.logger.error(
          `DALL-E API response: ${JSON.stringify(error.response.data)}`,
        );
      }
      throw error;
    }
  }

  /**
   * Generate image with model fallback (try primary, fallback to alternate)
   */
  async generateImageWithFallback(
    prompt: string,
    format: ImageFormat,
    preferredModel: ImageModel,
  ): Promise<{
    imageBase64: string;
    mimeType: string;
    actualModel: ImageModel;
    revisedPrompt?: string;
  }> {
    const isImagen = preferredModel === ImageModel.IMAGEN_3;

    try {
      if (isImagen) {
        const result = await this.generateImageWithImagen(prompt, format);
        return { ...result, actualModel: ImageModel.IMAGEN_3 };
      } else {
        const result = await this.generateImageWithDallE(prompt, format);
        return { ...result, actualModel: ImageModel.DALLE_3 };
      }
    } catch (primaryError) {
      this.logger.warn(
        `Primary model ${preferredModel} failed, trying fallback...`,
      );

      try {
        if (isImagen) {
          // Fallback to DALL-E
          const result = await this.generateImageWithDallE(prompt, format);
          return { ...result, actualModel: ImageModel.DALLE_3 };
        } else {
          // Fallback to Imagen
          const result = await this.generateImageWithImagen(prompt, format);
          return { ...result, actualModel: ImageModel.IMAGEN_3 };
        }
      } catch (fallbackError) {
        this.logger.error(
          "Both primary and fallback models failed",
          fallbackError,
        );
        throw primaryError; // Throw the original error
      }
    }
  }

  /**
   * Upload image to Supabase Storage
   */
  async uploadImageToStorage(
    imageBase64: string,
    mimeType: string,
    userId: string,
    filename?: string,
  ): Promise<{ url: string; path: string }> {
    if (!this.supabase) {
      throw new Error("Supabase not configured");
    }

    const bucket = "meta-creatives";
    const extension = mimeType === "image/png" ? "png" : "jpg";
    const timestamp = Date.now();
    const finalFilename = filename || `creative_${timestamp}.${extension}`;
    const path = `${userId}/${finalFilename}`;

    // Convert base64 to buffer
    const buffer = Buffer.from(imageBase64, "base64");

    this.logger.debug(`Uploading image to storage: ${path}`);

    const { error } = await this.supabase.storage
      .from(bucket)
      .upload(path, buffer, {
        contentType: mimeType,
        upsert: true,
      });

    if (error) {
      this.logger.error("Failed to upload image to storage:", error);
      throw new Error(`Storage upload failed: ${error.message}`);
    }

    // Get public URL
    const { data: urlData } = this.supabase.storage
      .from(bucket)
      .getPublicUrl(path);

    return {
      url: urlData.publicUrl,
      path: path,
    };
  }

  /**
   * Save approved image to creative library
   * T041: Store full model identifier (provider/model format)
   */
  async saveToLibrary(
    userId: string,
    workspaceId: string | null,
    imageUrl: string,
    storagePath: string,
    articleId: number | null,
    model: ImageModel | string, // T041: Accept full model identifier string
    style: CreativeStyle,
    promptUsed: string,
    format: ImageFormat,
  ): Promise<string> {
    if (!this.supabase) {
      throw new Error("Supabase not configured");
    }

    const insertData: Record<string, unknown> = {
      user_id: userId,
      article_id: articleId,
      image_url: imageUrl,
      storage_path: storagePath,
      model_used: model, // T041: Stores full identifier like "openrouter/google/gemini-3-pro-image-preview"
      style_used: style,
      prompt_used: promptUsed,
      format: format,
      status: "approved",
    };

    // Add workspace_id if provided
    if (workspaceId) {
      insertData.workspace_id = workspaceId;
    }

    const { data, error } = await this.supabase
      .from("creative_library")
      .insert(insertData)
      .select("id")
      .single();

    if (error) {
      this.logger.error("Failed to save to library:", error);
      throw new Error(`Library save failed: ${error.message}`);
    }

    return data.id;
  }

  // ============================================
  // T038-T040: OpenRouter Integration Methods
  // ============================================

  /**
   * T038: Get default image model from platform_settings
   * FR-002: Default to Nano Banana Pro via OpenRouter
   */
  async getDefaultImageModel(): Promise<DefaultImageModelConfig> {
    // FR-002: Default to first available model (Nano Banana Pro)
    const defaultModel = AVAILABLE_MODELS[0];
    const fallbackConfig = {
      provider: defaultModel.provider,
      model: defaultModel.model,
    };

    if (!this.supabase) {
      this.logger.warn(
        `Supabase not configured, using default ${defaultModel.displayName}`,
      );
      return fallbackConfig;
    }

    try {
      const { data, error } = await this.supabase
        .from("platform_settings")
        .select("value")
        .eq("key", "default_image_model")
        .single();

      if (error || !data) {
        this.logger.warn(
          `Default image model not found in platform_settings, using ${defaultModel.displayName}`,
        );
        return fallbackConfig;
      }

      const config = data.value as DefaultImageModelConfig;
      this.logger.debug(
        `Using default image model: ${config.provider}/${config.model}`,
      );
      return config;
    } catch (error) {
      this.logger.error("Error fetching default image model:", error);
      return fallbackConfig;
    }
  }

  /**
   * T017H: Helper to add timeout to promises
   */
  private withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number,
    errorMessage: string,
  ): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error(errorMessage)), timeoutMs),
      ),
    ]);
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * T039: Generate image using OpenRouter
   * T017H: Added 30s timeout + user-facing timeout error
   * T017A: Quota handling with exponential backoff
   * T017B: External integration logging
   */
  async generateImageWithOpenRouter(
    prompt: string,
    model: string,
    format: ImageFormat,
  ): Promise<{ imageBase64: string; mimeType: string }> {
    if (!this.openRouterService) {
      throw new Error("OpenRouter service not configured");
    }

    // Map format to aspect ratio for OpenRouter
    const aspectRatioMap: Record<ImageFormat, "1:1" | "16:9" | "9:16"> = {
      "1:1": "1:1",
      "9:16": "9:16",
      "16:9": "16:9",
    };

    const startTime = Date.now();

    // T017B: Log external integration call start
    this.logger.log(
      `[OpenRouter] Starting image generation - model: ${model}, format: ${format}, prompt_length: ${prompt.length}`,
    );

    const OPENROUTER_TIMEOUT_MS = 60000;
    const maxAttempts = 3;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const result = await this.withTimeout(
          this.openRouterService.generateImage(model, prompt, {
            aspectRatio: aspectRatioMap[format],
          }),
          OPENROUTER_TIMEOUT_MS,
          "A geração da imagem demorou muito tempo. Por favor, tente novamente.",
        );

        const elapsedMs = Date.now() - startTime;

        this.logger.log(
          `[OpenRouter] Image generation SUCCESS - model: ${model}, elapsed_ms: ${elapsedMs}, attempt: ${attempt}`,
        );

        return {
          imageBase64: result.imageBase64,
          mimeType: result.mimeType || "image/png",
        };
      } catch (error) {
        const elapsedMs = Date.now() - startTime;
        const errorMessage =
          error instanceof Error ? error.message : String(error);

        this.logger.error(
          `[OpenRouter] Image generation FAILED - model: ${model}, elapsed_ms: ${elapsedMs}, attempt: ${attempt}, error: ${errorMessage}`,
        );

        // Timeout
        if (
          errorMessage.includes("demorou muito tempo") ||
          errorMessage.includes("timeout")
        ) {
          throw new Error(
            "A geração da imagem demorou muito tempo. Por favor, tente novamente.",
          );
        }

        // Rate limit or quota: backoff + retry
        if (
          errorMessage.includes("rate limit") ||
          errorMessage.includes("429") ||
          errorMessage.includes("quota") ||
          errorMessage.includes("insufficient")
        ) {
          if (attempt < maxAttempts) {
            const backoffMs = 500 * Math.pow(2, attempt - 1);
            this.logger.warn(
              `[OpenRouter] Rate limited/quota issue. Retrying in ${backoffMs}ms (attempt ${attempt}/${maxAttempts})`,
            );
            await this.sleep(backoffMs);
            continue;
          }

          if (
            errorMessage.includes("quota") ||
            errorMessage.includes("insufficient")
          ) {
            throw new Error(
              "Créditos insuficientes no provedor de IA. Por favor, contate o suporte.",
            );
          }

          throw new Error(
            "Limite de requisições atingido. Por favor, aguarde alguns segundos e tente novamente.",
          );
        }

        throw error;
      }
    }

    throw new Error("Falha ao gerar imagem via OpenRouter.");
  }

  /**
   * FR-005: Generate image using Replicate API
   * Supports Nano Banana Pro and GPT Image 1.5 models
   *
   * On timeout: throws PendingGenerationException (should NOT trigger fallback)
   * On real error: throws regular Error (can trigger fallback)
   */
  async generateImageWithReplicate(
    prompt: string,
    model: string,
    format: ImageFormat,
  ): Promise<{ imageBase64: string; mimeType: string }> {
    if (!this.replicateService) {
      throw new Error("Replicate service not configured");
    }

    // Map format to aspect ratio for Replicate
    const aspectRatioMap: Record<ImageFormat, "1:1" | "16:9" | "9:16"> = {
      "1:1": "1:1",
      "9:16": "9:16",
      "16:9": "16:9",
    };

    const startTime = Date.now();

    // Log external integration call start
    this.logger.log(
      `[Replicate] Starting image generation - model: ${model}, format: ${format}, prompt_length: ${prompt.length}`,
    );

    const maxAttempts = 3;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const isNanoBanana = model.includes("nano-banana-pro");
        const result = await this.replicateService.generateImage(
          model,
          prompt,
          {
            aspectRatio: aspectRatioMap[format],
            outputFormat: "png",
            resolution: isNanoBanana ? "2K" : undefined,
            safetyFilterLevel: isNanoBanana ? "block_only_high" : undefined,
            quality: !isNanoBanana ? "high" : undefined,
            background: !isNanoBanana ? "auto" : undefined,
            moderation: !isNanoBanana ? "auto" : undefined,
            inputFidelity: !isNanoBanana ? "low" : undefined,
            numberOfImages: 1,
          },
        );

        const elapsedMs = Date.now() - startTime;

        // Handle pending status (timeout but still processing)
        if (result.status === "pending") {
          this.logger.warn(
            `[Replicate] Image generation PENDING - model: ${model}, elapsed_ms: ${elapsedMs}, predictionId: ${result.predictionId}`,
          );
          // Throw PendingGenerationException - this should NOT trigger fallback
          throw new PendingGenerationException(
            result.predictionId,
            "replicate",
            model,
            prompt,
          );
        }

        // Completed successfully
        this.logger.log(
          `[Replicate] Image generation SUCCESS - model: ${model}, elapsed_ms: ${elapsedMs}, attempt: ${attempt}`,
        );

        return {
          imageBase64: result.imageBase64,
          mimeType: result.mimeType || "image/png",
        };
      } catch (error) {
        // Re-throw PendingGenerationException without triggering fallback
        if (error instanceof PendingGenerationException) {
          throw error;
        }

        const elapsedMs = Date.now() - startTime;
        const errorMessage =
          error instanceof Error ? error.message : String(error);

        // Log external integration error
        this.logger.error(
          `[Replicate] Image generation FAILED - model: ${model}, elapsed_ms: ${elapsedMs}, attempt: ${attempt}, error: ${errorMessage}`,
        );

        // Rate limit handling with backoff
        if (
          errorMessage.includes("rate limit") ||
          errorMessage.includes("429")
        ) {
          if (attempt < maxAttempts) {
            const backoffMs = 500 * Math.pow(2, attempt - 1);
            this.logger.warn(
              `[Replicate] Rate limited. Retrying in ${backoffMs}ms (attempt ${attempt}/${maxAttempts})`,
            );
            await this.sleep(backoffMs);
            continue;
          }

          throw new Error(
            "Limite de requisições atingido. Por favor, aguarde alguns segundos e tente novamente.",
          );
        }

        throw error;
      }
    }

    throw new Error("Falha ao gerar imagem via Replicate.");
  }

  /**
   * T039-T040: Generate image using admin-configured model with fallback
   * This is the main entry point for image generation that uses platform settings
   */
  async generateImageWithConfiguredModel(
    prompt: string,
    format: ImageFormat,
  ): Promise<{
    imageBase64: string;
    mimeType: string;
    modelUsed: string;
    revisedPrompt?: string;
  }> {
    const config = await this.getDefaultImageModel();
    this.logger.debug(
      `Attempting image generation with configured model: ${config.provider}/${config.model}`,
    );

    try {
      // T039: Route to appropriate provider
      if (config.provider === "openrouter") {
        const result = await this.generateImageWithOpenRouter(
          prompt,
          config.model,
          format,
        );
        return {
          ...result,
          modelUsed: `openrouter/${config.model}`,
        };
      } else if (config.provider === "google") {
        const result = await this.generateImageWithImagen(prompt, format);
        return {
          ...result,
          modelUsed: `google/${config.model}`,
        };
      } else {
        // OpenAI (default)
        const result = await this.generateImageWithDallE(prompt, format);
        return {
          ...result,
          modelUsed: `openai/${config.model}`,
        };
      }
    } catch (primaryError) {
      // Do NOT fallback on PendingGenerationException
      if (primaryError instanceof PendingGenerationException) {
        throw primaryError;
      }

      const fallbackModel =
        AVAILABLE_MODELS.find(
          (model) =>
            model.provider === "replicate" &&
            model.model === "openai/gpt-image-1.5",
        ) ||
        AVAILABLE_MODELS.find((model) => model.provider === "replicate") ||
        null;

      const isFallbackModel =
        fallbackModel &&
        config.provider === fallbackModel.provider &&
        config.model === fallbackModel.model;

      if (
        fallbackModel &&
        !isFallbackModel &&
        this.replicateService?.isConfigured()
      ) {
        this.logger.warn(
          `Primary model ${config.provider}/${config.model} failed, falling back to ${fallbackModel.displayName}`,
          primaryError instanceof Error ? primaryError.message : primaryError,
        );

        try {
          const fallbackResult = await this.generateImageWithReplicate(
            prompt,
            fallbackModel.model,
            format,
          );
          return {
            ...fallbackResult,
            modelUsed: `replicate/${fallbackModel.model} (fallback)`,
          };
        } catch (fallbackError) {
          // Do NOT continue fallback if pending
          if (fallbackError instanceof PendingGenerationException) {
            throw fallbackError;
          }
          this.logger.error(
            `Fallback to ${fallbackModel.displayName} also failed:`,
            fallbackError,
          );
          throw primaryError; // Throw original error if fallback also fails
        }
      }

      throw primaryError;
    }
  }

  // ============================================
  // T022-T023: Concept-Based Image Generation
  // ============================================

  /**
   * T022: Generate image with concept-based prompt composition
   * T023: Tracks concept and background used in result
   *
   * Uses PromptComposerService to build prompts from:
   * 1. User directions (highest priority)
   * 2. Niche template (if applicable)
   * 3. Concept prompt template
   * 4. Background specification
   * 5. Article context
   */
  async generateImageWithConcept(
    article: PromptArticleContext,
    format: ImageFormat,
    options: ConceptGenerationOptions = {},
  ): Promise<ConceptGenerationResult> {
    let prompt: string;
    let promptUsedJson: string | undefined;

    // Build prompt based on whether concept is provided
    if (options.concept && this.promptComposerService) {
      // Use PromptComposerService for concept-based prompt composition
      const composed = await this.promptComposerService.composeConceptPrompt(
        article,
        options.concept,
        {
          background: options.background,
          nicheTemplate: options.nicheTemplate,
          visualGroup: options.visualGroup,
          userDirections: options.userDirections,
          autoDirections: options.autoDirections,
          textOverlay: options.textOverlay,
          targeting: options.targeting,
          format,
        },
      );
      prompt = composed.promptText;

      this.logger.debug(
        `Composed concept-based prompt for "${options.concept.name}" (${options.concept.slug})`,
      );
      // Store JSON prompt for audit/tracing
      promptUsedJson = composed.promptJson;
    } else {
      // Fallback to basic prompt generation
      const composed = await this.generateImagePromptJson(
        {
          id: article.id,
          title: article.title,
          keyword: article.keyword,
          excerpt: article.excerpt,
        },
        "photorealistic",
        format,
        options.userDirections,
      );
      prompt = composed.promptText;
      promptUsedJson = composed.promptJson;
    }

    // T055-T056: Generate the image with model rotation for diversity
    // If usedModels is provided, use rotated model; otherwise use configured model
    const result = options.forcedModelId
      ? await this.generateImageWithSpecificModel(
          prompt,
          format,
          options.forcedModelId,
        )
      : options.usedModels
        ? await this.generateImageWithRotatedModel(
            prompt,
            format,
            options.usedModels,
          )
        : await this.generateImageWithConfiguredModel(prompt, format);

    // T023: Return with concept tracking
    return {
      imageBase64: result.imageBase64,
      mimeType: result.mimeType,
      modelUsed: result.modelUsed,
      conceptId: options.concept?.id,
      conceptSlug: options.concept?.slug,
      backgroundSlug: options.background?.slug,
      visualGroupCode: options.visualGroup?.code,
      visualGroupVariationIndex: options.visualGroupVariationIndex,
      promptUsed: promptUsedJson || prompt,
      revisedPrompt: result.revisedPrompt,
    };
  }

  /**
   * T024: Extended saveToLibrary with concept and diversity metadata
   */
  async saveToLibraryWithConcept(
    userId: string,
    workspaceId: string | null,
    imageUrl: string,
    storagePath: string,
    articleId: number | null,
    result: ConceptGenerationResult,
    format: ImageFormat,
    sessionId?: string,
    diversityMetadata?: {
      usedConcepts: string[];
      usedBackgrounds: string[];
      usedModels: string[];
      diversityScore: number;
    },
  ): Promise<string> {
    if (!this.supabase) {
      throw new Error("Supabase not configured");
    }

    const insertData: Record<string, unknown> = {
      user_id: userId,
      article_id: articleId,
      image_url: imageUrl,
      storage_path: storagePath,
      model_used: result.modelUsed,
      style_used: "concept-based", // Mark as concept-based generation
      prompt_used: result.promptUsed,
      format: format,
      status: "approved",
      // T024: New fields for concept tracking
      concept_id: result.conceptId || null,
      background_used: result.backgroundSlug || null,
      visual_group_code: result.visualGroupCode || null,
      session_id: sessionId || null,
    };

    // Add workspace_id if provided
    if (workspaceId) {
      insertData.workspace_id = workspaceId;
    }

    // T024: Add diversity metadata if provided
    if (diversityMetadata) {
      insertData.diversity_metadata = {
        used_concepts: diversityMetadata.usedConcepts,
        used_backgrounds: diversityMetadata.usedBackgrounds,
        used_models: diversityMetadata.usedModels,
        diversity_score: diversityMetadata.diversityScore,
        generated_at: new Date().toISOString(),
      };
    }

    const { data, error } = await this.supabase
      .from("creative_library")
      .insert(insertData)
      .select("id")
      .single();

    if (error) {
      this.logger.error("Failed to save to library with concept:", error);
      throw new Error(`Library save failed: ${error.message}`);
    }

    return data.id;
  }
}
