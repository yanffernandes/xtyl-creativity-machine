/**
 * PromptComposerService
 *
 * Composes prompts for AI image generation using the Andromeda Creative Diversity System.
 * Handles concept-based prompt composition, niche templates, and diversity tracking.
 */

import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { OpenRouterService } from "../../openrouter/openrouter.service";
import {
  getLocalizationByCountry,
  getLanguageName,
  getSampleValues,
  type LocalizationInfo,
} from "../data/localization-data";

// ============================================
// Types
// ============================================

export interface CreativeConcept {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  prompt_template: string;
  prompt_template_json: Record<string, unknown> | null;
  icon: string | null;
  category: string;
  niche: string;
  works_for_niches: string[];
  example_images: string[];
  sort_order: number;
  is_active: boolean;
}

export interface VisualGroup {
  id: string;
  code: string;
  name: string;
  description: string | null;
  variations: VisualGroupVariation[];
  niche: string;
  sort_order: number;
  is_active: boolean;
}

export interface VisualGroupVariation {
  index: number;
  name: string;
  prompt: string;
}

export interface NicheTemplate {
  id: string;
  niche: string;
  name: string;
  description: string | null;
  template: string;
  prohibited_words: string[];
  required_elements: string[];
  format_requirements: Record<string, unknown> | null;
  localization_rules: Record<string, LocalizationRule> | null;
  is_active: boolean;
}

export interface LocalizationRule {
  currency: string;
  currency_position: "before" | "after";
  values: string[];
  language: string;
}

export interface CreativeBackground {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  css_value: string;
  background_type: "solid" | "gradient" | "pattern";
  niche: string;
  works_for_niches: string[];
  category: string | null;
  sort_order: number;
  is_active: boolean;
}

export interface ArticleContext {
  id: number;
  title: string;
  keyword: string;
  excerpt?: string;
  language?: string; // Source language of the article (e.g., 'english', 'portugues')
  // Full localization context (extracted from keyword_snapshot)
  localization?: {
    country_code: string;
    country_name: string;
    currency_code: string;
    currency_symbol: string;
    currency_position: "before" | "after";
    language_name: string;
    locale: string;
  };
}

export interface Targeting {
  countries: string[];
  languages?: Array<{ key: string; name: string }>;
}

export interface TextOverlay {
  title: string;
  subtext: string;
  valueButtons: string[];
  cta: string;
  titlePosition: string;
  buttonPosition: string;
  ctaPosition: string;
  culturalElement?: string | null;
}

export interface PromptJsonTemplate {
  meta: {
    version: string;
    generated_at: string;
  };
  input: {
    article: ArticleContext;
    concept: {
      id: string;
      slug: string;
      name: string;
      description: string | null;
      prompt_template: string;
      prompt_template_json: Record<string, unknown> | null;
      category: string;
      niche: string;
    };
    user_directions?: string | null;
    auto_directions?: string | null;
    visual_group?: {
      code: string;
      name: string;
      variation_index: number;
      variation_prompt: string;
    } | null;
    niche_template?: {
      template: string;
      required_elements: string[];
      prohibited_words: string[];
    } | null;
    background?: {
      name: string;
      description: string | null;
      css_value: string;
      category: string | null;
    } | null;
    text_overlay?: {
      title: string;
      subtext: string;
      value_buttons: string[];
      cta: string;
      positions: {
        title: string;
        buttons: string;
        cta: string;
      };
      cultural_element?: string | null;
    } | null;
    localization?: {
      country: string;
      currency: string;
      currency_position: "before" | "after";
      values: string[];
      language: string;
    } | null;
    format?: string | null;
  };
  constraints: {
    output_format: "png";
    banned_words: string[];
    no_carousel: boolean;
    text_policy: string;
    cta_policy: string;
    language_policy?: string | null; // CRITICAL: Language enforcement rule based on article source language
  };
}

export interface PromptJsonOutput {
  prompts: Array<{
    id: number;
    concept_slug?: string | null;
    visual_group_primary?: string | null;
    visual_group_secondary?: string | null;
    visual_style?: string | null;
    background_category?: string | null;
    background_description?: string | null;
    button_position?: string | null;
    cta_position?: string | null;
    title_position?: string | null;
    typography?: Record<string, string | null> | null;
    prompt: string;
  }>;
  validation_summary?: Record<string, unknown>;
}

export interface PromptComposeResult {
  promptJson: string;
  promptText: string;
  parsed?: PromptJsonOutput;
}

export interface PromptCompositionOptions {
  visualGroup?: VisualGroup;
  visualGroupVariationIndex?: number;
  nicheTemplate?: NicheTemplate;
  background?: CreativeBackground;
  userDirections?: string;
  autoDirections?: string;
  textOverlay?: TextOverlay;
  targeting?: Targeting;
  format?: string;
}

// ============================================
// Constants
// ============================================

const DIVERSITY_WINDOW_CONCEPTS = 3; // Don't repeat same concept in last 3
const DIVERSITY_WINDOW_BACKGROUNDS = 4; // Don't repeat same background in last 4
const DEFAULT_CONCEPT_RANKING_MODEL = "google/gemini-3-flash-preview";
const DEFAULT_PROMPT_REFINER_MODEL = "google/gemini-3-flash-preview";
const BANNED_TEXT_PATTERNS = [
  "imediato",
  "hoje",
  "agora",
  "instantâneo",
  "bani pe loc",
  "azi",
];
const GLOBAL_PROMPT_RULES = [
  "OUTPUT FORMAT: PNG only.",
  "TEXT: Use ONLY the provided overlay text; do not add extra words.",
  "TEXT: Do not promise guaranteed approval, guaranteed credit release, or guaranteed money.",
  "TEXT: If a CTA is provided, it MUST be the most attention-grabbing element following visual hierarchy principles: maximum contrast against background, largest or most prominent text element, strategic positioning for immediate eye capture. The CTA should dominate the visual hierarchy. If no CTA is provided, do not invent one.",
  "TEXT: Value buttons must include numeric values inside them.",
  "TYPOGRAPHY SIZE (CRITICAL): All text in the image MUST be large enough to be easily readable on a mobile phone screen at ad size (roughly 1080x1080px displayed at ~350px). Headlines must be at minimum 48pt equivalent, body text at minimum 28pt equivalent, and UI labels/captions at minimum 22pt equivalent. Text that is too small to read at a glance on mobile WILL FAIL as an ad. When in doubt, make text BIGGER. This is an advertisement, not a magazine — legibility at small display sizes is paramount.",
  "TYPOGRAPHY SIZE: For UI-style concepts (notes app, chat, dashboard, simulator, checklist, forum), scale up ALL interface text proportionally so it remains readable when the entire image is viewed on a mobile feed. Avoid realistic tiny UI text — instead, use oversized, ad-optimized UI text that looks native but is 2-3x larger than real app text would be.",
  "LAYOUT: Do not use carousel.",
  "LAYOUT: Do not repeat the same dominant visual group as the previous prompt.",
  "LAYOUT: Do not repeat the same combination of background + layout + button position.",
  "MODEL: Do not reuse the same visual model as the previous prompt.",
].join("\n");

@Injectable()
export class PromptComposerService {
  private readonly logger = new Logger(PromptComposerService.name);
  private supabase: SupabaseClient;
  private readonly conceptRankingModel: string;
  private readonly promptRefinerModel: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly openRouterService: OpenRouterService,
  ) {
    const supabaseUrl = this.configService.get<string>("SUPABASE_URL");
    const supabaseKey = this.configService.get<string>("SUPABASE_SERVICE_KEY");

    if (!supabaseUrl || !supabaseKey) {
      this.logger.warn("Supabase credentials not configured");
    }

    this.supabase = createClient(supabaseUrl || "", supabaseKey || "");

    const configuredModel =
      this.configService.get<string>("CONCEPT_RANKING_MODEL") ||
      DEFAULT_CONCEPT_RANKING_MODEL;
    this.conceptRankingModel = this.ensureGeminiModelFresh(configuredModel);

    const configuredPromptModel =
      this.configService.get<string>("PROMPT_REFINER_MODEL") ||
      DEFAULT_PROMPT_REFINER_MODEL;
    this.promptRefinerModel = this.ensureGeminiModelFresh(
      configuredPromptModel,
    );
  }

  // ============================================
  // Concept Methods
  // ============================================

  /**
   * Get a concept by ID
   */
  async getConceptById(conceptId: string): Promise<CreativeConcept | null> {
    const { data, error } = await this.supabase
      .from("creative_concepts")
      .select("*")
      .eq("id", conceptId)
      .eq("is_active", true)
      .single();

    if (error) {
      this.logger.error(`Failed to get concept ${conceptId}:`, error.message);
      return null;
    }

    return data;
  }

  /**
   * Get concepts for a specific niche
   */
  async getConceptsByNiche(niche: string): Promise<CreativeConcept[]> {
    const { data, error } = await this.supabase
      .from("creative_concepts")
      .select("*")
      .eq("is_active", true)
      .contains("works_for_niches", [niche])
      .order("sort_order");

    if (error) {
      this.logger.error(
        `Failed to get concepts for niche ${niche}:`,
        error.message,
      );
      return [];
    }

    return data || [];
  }

  /**
   * Get all universal concepts
   */
  async getUniversalConcepts(): Promise<CreativeConcept[]> {
    const { data, error } = await this.supabase
      .from("creative_concepts")
      .select("*")
      .eq("is_active", true)
      .eq("category", "universal")
      .order("sort_order");

    if (error) {
      this.logger.error("Failed to get universal concepts:", error.message);
      return [];
    }

    return data || [];
  }

  /**
   * Get next concept with diversity window (don't repeat last N)
   * FR-012F: Prompt composition priority order
   */
  async getNextConcept(
    usedConcepts: string[],
    niche: string,
    preferredCategories?: string[],
  ): Promise<CreativeConcept | null> {
    const concepts = await this.getConceptsByNiche(niche);

    if (concepts.length === 0) {
      this.logger.warn(`No concepts found for niche: ${niche}`);
      return null;
    }

    // Get recently used concepts (last N)
    const recentlyUsed = new Set(
      usedConcepts.slice(-DIVERSITY_WINDOW_CONCEPTS),
    );

    // Filter out recently used concepts
    let eligible = concepts.filter((c) => !recentlyUsed.has(c.id));

    // If all concepts were recently used, allow reuse
    if (eligible.length === 0) {
      eligible = concepts;
    }

    // If preferred categories specified, try to use them first
    if (preferredCategories && preferredCategories.length > 0) {
      const categoryFiltered = eligible.filter((c) =>
        preferredCategories.includes(c.category),
      );
      if (categoryFiltered.length > 0) {
        eligible = categoryFiltered;
      }
    }

    // Random selection from eligible concepts
    const randomIndex = Math.floor(Math.random() * eligible.length);
    return eligible[randomIndex];
  }

  // ============================================
  // Visual Group Methods
  // ============================================

  /**
   * Get visual groups for a niche
   */
  async getVisualGroups(niche: string): Promise<VisualGroup[]> {
    const { data, error } = await this.supabase
      .from("visual_groups")
      .select("*")
      .eq("is_active", true)
      .eq("niche", niche)
      .order("sort_order");

    if (error) {
      this.logger.error(
        `Failed to get visual groups for ${niche}:`,
        error.message,
      );
      return [];
    }

    return data || [];
  }

  /**
   * Select random visual group with rotation to avoid repeats
   */
  async selectRandomVisualGroup(
    usedGroups: string[],
    niche: string,
  ): Promise<{ group: VisualGroup; variationIndex: number } | null> {
    const groups = await this.getVisualGroups(niche);

    if (groups.length === 0) {
      return null;
    }

    // Filter out recently used groups
    const recentlyUsed = new Set(usedGroups.slice(-3));
    let eligible = groups.filter((g) => !recentlyUsed.has(g.code));

    if (eligible.length === 0) {
      eligible = groups;
    }

    // Random selection
    const group = eligible[Math.floor(Math.random() * eligible.length)];
    const variationIndex = Math.floor(Math.random() * group.variations.length);

    return { group, variationIndex };
  }

  // ============================================
  // Background Methods
  // ============================================

  /**
   * Get backgrounds for a niche
   */
  async getBackgrounds(niche: string): Promise<CreativeBackground[]> {
    const { data, error } = await this.supabase
      .from("creative_backgrounds")
      .select("*")
      .eq("is_active", true)
      .contains("works_for_niches", [niche])
      .order("sort_order");

    if (error) {
      this.logger.error(
        `Failed to get backgrounds for ${niche}:`,
        error.message,
      );
      return [];
    }

    return data || [];
  }

  /**
   * Select next background with diversity window (don't repeat last N)
   * T021A: Background selection with no repeat last 4
   */
  async selectNextBackground(
    usedBackgrounds: string[],
    niche: string,
    lastCategory?: string | null,
  ): Promise<CreativeBackground | null> {
    const backgrounds = await this.getBackgrounds(niche);

    if (backgrounds.length === 0) {
      this.logger.warn(`No backgrounds found for niche: ${niche}`);
      return null;
    }

    // Get recently used backgrounds (last N)
    const recentlyUsed = new Set(
      usedBackgrounds.slice(-DIVERSITY_WINDOW_BACKGROUNDS),
    );

    // Filter out recently used backgrounds
    let eligible = backgrounds.filter((b) => !recentlyUsed.has(b.slug));

    // Avoid repeating background category consecutively when possible
    if (lastCategory) {
      const categoryFiltered = eligible.filter(
        (b) => b.category !== lastCategory,
      );
      if (categoryFiltered.length > 0) {
        eligible = categoryFiltered;
      }
    }

    // If all backgrounds were recently used, allow reuse
    if (eligible.length === 0) {
      eligible = backgrounds;
    }

    // Random selection
    const randomIndex = Math.floor(Math.random() * eligible.length);
    return eligible[randomIndex];
  }

  // ============================================
  // Niche Template Methods
  // ============================================

  /**
   * Get niche template
   */
  async getNicheTemplate(niche: string): Promise<NicheTemplate | null> {
    const { data, error } = await this.supabase
      .from("niche_templates")
      .select("*")
      .eq("niche", niche)
      .eq("is_active", true)
      .single();

    if (error) {
      this.logger.warn(`No template found for niche ${niche}:`, error.message);
      return null;
    }

    return data;
  }

  // ============================================
  // Prompt Composition
  // ============================================

  /**
   * Compose a complete prompt from components
   * T017D: Prompt composition priority order (FR-012F)
   *
   * Priority Order:
   * 1. User directions (ALWAYS respected)
   * 2. Niche template (if applicable)
   * 3. Concept + Visual Group
   * 4. Localization from targeting
   */
  async composeConceptPrompt(
    article: ArticleContext,
    concept: CreativeConcept,
    options: PromptCompositionOptions = {},
  ): Promise<PromptComposeResult> {
    const template = this.buildPromptJsonTemplate(article, concept, options);
    const fallbackPrompt = this.buildFallbackPromptText(
      article,
      concept,
      options,
    );

    let output = await this.refinePromptJsonWithAI(template);

    if (!output) {
      output = this.buildFallbackPromptJson(template, fallbackPrompt);
    }

    let promptText = output.prompts[0]?.prompt || fallbackPrompt;
    promptText = this.sanitizeText(promptText);
    output.prompts[0].prompt = promptText;

    output.validation_summary = this.buildValidationSummary(output, template);

    return {
      promptJson: JSON.stringify(output, null, 2),
      promptText,
      parsed: output,
    };
  }

  /**
   * Get localization rules for a country
   * T074: Implement localization rules from targeting
   * Now uses comprehensive localization-data.ts for accurate country info
   */
  private getLocalizationForCountry(
    country: string,
    localizationRules?: Record<string, LocalizationRule> | null,
  ): LocalizationRule {
    // First check if there are custom rules in the niche template
    if (localizationRules) {
      const customRule =
        localizationRules[country] || localizationRules["default"];
      if (customRule) {
        return customRule;
      }
    }

    // Use comprehensive localization data
    const locInfo = getLocalizationByCountry(country);
    const sampleValues = getSampleValues(locInfo);

    return {
      currency: locInfo.currency_symbol,
      currency_position: locInfo.currency_position,
      values: sampleValues.formatted,
      language: locInfo.language_name,
    };
  }

  // ============================================
  // Diversity Score Calculation
  // ============================================

  /**
   * Calculate diversity score for a generation session
   * T061: Diversity score calculation (concepts 50%, backgrounds 30%, models 20%)
   */
  calculateDiversityScore(
    usedConcepts: string[],
    usedBackgrounds: string[],
    usedModels: string[],
    totalGenerated: number,
  ): { score: number; meetsThreshold: boolean } {
    if (totalGenerated === 0) {
      return { score: 0, meetsThreshold: false };
    }

    const uniqueConcepts = new Set(usedConcepts).size;
    const uniqueBackgrounds = new Set(usedBackgrounds).size;
    const uniqueModels = new Set(usedModels).size;

    // Weight: 50% concepts, 30% backgrounds, 20% models (0-100 scale)
    const conceptScore = Math.min(uniqueConcepts / totalGenerated, 1) * 50;
    const backgroundScore =
      Math.min(uniqueBackgrounds / totalGenerated, 1) * 30;
    const modelScore = Math.min(uniqueModels / totalGenerated, 1) * 20;

    const score = conceptScore + backgroundScore + modelScore;
    const meetsThreshold = score >= 70;

    return { score: Math.round(score * 100) / 100, meetsThreshold };
  }

  // ============================================
  // Free Mode Concept Ranking
  // ============================================

  /**
   * Rank concepts by relevance to article for free mode
   * T036: Free mode logic - AI ranks concepts by relevance
   */
  async rankConceptsForArticle(
    article: ArticleContext,
    niche: string,
    usedConcepts: string[],
  ): Promise<{
    concepts: CreativeConcept[];
    directionsById: Record<string, string>;
  }> {
    const concepts = await this.getConceptsByNiche(niche);
    if (concepts.length === 0) {
      return { concepts: [], directionsById: {} };
    }

    // Try AI-based ranking first
    if (this.openRouterService.isConfigured()) {
      try {
        const aiResult = await this.rankConceptsWithAI(article, concepts);
        if (aiResult) {
          const rankedConcepts = this.applyRecentPenalty(
            aiResult.concepts,
            usedConcepts,
          );
          return {
            concepts: rankedConcepts,
            directionsById: aiResult.directionsById,
          };
        }
      } catch (error) {
        this.logger.warn(
          `[AI] Concept ranking failed, falling back to keyword scoring: ${error instanceof Error ? error.message : error}`,
        );
      }
    }

    // Fallback to keyword-based scoring
    const scored = concepts.map((concept) => {
      let score = 0;

      // Check if article keywords appear in concept description
      const articleWords =
        `${article.title} ${article.keyword} ${article.excerpt || ""}`
          .toLowerCase()
          .split(/\s+/);

      const conceptWords = `${concept.name} ${concept.description || ""}`
        .toLowerCase()
        .split(/\s+/);

      for (const word of articleWords) {
        if (conceptWords.includes(word) && word.length > 3) {
          score += 1;
        }
      }

      // Penalize recently used concepts
      const recentlyUsed = new Set(
        usedConcepts.slice(-DIVERSITY_WINDOW_CONCEPTS),
      );
      if (recentlyUsed.has(concept.id)) {
        score -= 10;
      }

      return { concept, score };
    });

    // Sort by score descending
    scored.sort((a, b) => b.score - a.score);

    return {
      concepts: scored.map((s) => s.concept),
      directionsById: {},
    };
  }

  private applyRecentPenalty(
    concepts: CreativeConcept[],
    usedConcepts: string[],
  ): CreativeConcept[] {
    const recent = new Set(usedConcepts.slice(-DIVERSITY_WINDOW_CONCEPTS));
    const fresh = concepts.filter((concept) => !recent.has(concept.id));
    const repeated = concepts.filter((concept) => recent.has(concept.id));
    return [...fresh, ...repeated];
  }

  private async rankConceptsWithAI(
    article: ArticleContext,
    concepts: CreativeConcept[],
  ): Promise<{
    concepts: CreativeConcept[];
    directionsById: Record<string, string>;
  } | null> {
    const conceptSummaries = concepts.map((concept) => ({
      id: concept.id,
      slug: concept.slug,
      name: concept.name,
      description: concept.description || "",
      category: concept.category,
    }));

    const systemPrompt = `You are a senior creative strategist for performance ads. 
Rank the most appropriate creative concepts for the given article. 
Prioritize formats that feel native to the platform, maximize CTR, and match the article's theme.
Never suggest carousel. Return ONLY JSON.`;

    const userPrompt = `Article:
${JSON.stringify(
  {
    title: article.title,
    keyword: article.keyword,
    excerpt: article.excerpt || "",
  },
  null,
  2,
)}

Available concepts:
${JSON.stringify(conceptSummaries, null, 2)}

Return JSON in this exact format:
{
  "ranked_concepts": [
    { "id": "concept-id", "direction": "1-2 short sentences of creative direction" }
  ]
}`;

    const response = await this.openRouterService.chatCompletion(
      this.conceptRankingModel,
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      {
        temperature: 0.2,
        max_tokens: 1200,
        response_format: { type: "json_object" },
      },
    );

    const content = response.content.trim();
    let parsed: {
      ranked_concepts?: Array<{ id?: string; direction?: string }>;
    };

    try {
      parsed = JSON.parse(content);
    } catch {
      this.logger.warn(`[AI] Failed to parse concept ranking JSON: ${content}`);
      return null;
    }

    if (!parsed.ranked_concepts || parsed.ranked_concepts.length === 0) {
      return null;
    }

    const conceptById = new Map(
      concepts.map((concept) => [concept.id, concept]),
    );
    const seen = new Set<string>();
    const directionsById: Record<string, string> = {};
    const ordered: CreativeConcept[] = [];

    for (const entry of parsed.ranked_concepts) {
      if (!entry.id || !conceptById.has(entry.id)) continue;
      if (seen.has(entry.id)) continue;
      const concept = conceptById.get(entry.id);
      if (!concept) continue;
      ordered.push(concept);
      seen.add(entry.id);
      if (entry.direction && entry.direction.trim()) {
        directionsById[entry.id] = entry.direction.trim();
      }
    }

    const remaining = concepts.filter((concept) => !seen.has(concept.id));
    return {
      concepts: [...ordered, ...remaining],
      directionsById,
    };
  }

  private ensureGeminiModelFresh(model: string): string {
    if (!model) {
      return DEFAULT_CONCEPT_RANKING_MODEL;
    }

    if (!model.includes("gemini")) {
      this.logger.warn(
        `Non-Gemini model "${model}" requested. Forcing ${DEFAULT_CONCEPT_RANKING_MODEL}.`,
      );
      return DEFAULT_CONCEPT_RANKING_MODEL;
    }

    if (this.isLegacyGeminiModel(model)) {
      this.logger.warn(
        `Gemini model "${model}" is older than Gemini 3 Flash. Upgrading to ${DEFAULT_CONCEPT_RANKING_MODEL}.`,
      );
      return DEFAULT_CONCEPT_RANKING_MODEL;
    }

    return model;
  }

  private isLegacyGeminiModel(model: string): boolean {
    return /gemini-(1|1\\.5|2)/.test(model);
  }

  private sanitizeText(text: string): string {
    let sanitized = text;
    for (const pattern of BANNED_TEXT_PATTERNS) {
      const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(`\\b${escaped}\\b`, "gi");
      sanitized = sanitized.replace(regex, "");
    }

    return sanitized.replace(/\s{2,}/g, " ").trim();
  }

  /**
   * Build comprehensive language policy for prompts
   * Ensures all text elements respect the article's source language and localization
   */
  private buildLanguagePolicy(
    article: ArticleContext,
    localization: PromptJsonTemplate["input"]["localization"],
  ): string | null {
    const parts: string[] = [];

    // Language enforcement
    if (article.language) {
      const languageName = getLanguageName(article.language);
      parts.push(
        `ALL text elements (title, subtext, CTA, buttons) MUST be in ${languageName.toUpperCase()} (${article.language}).`,
      );
    } else if (localization?.language) {
      parts.push(
        `ALL text elements (title, subtext, CTA, buttons) MUST be in ${localization.language.toUpperCase()}.`,
      );
    }

    // Currency enforcement
    if (localization) {
      const currencyExample =
        localization.currency_position === "before"
          ? `${localization.currency} 100`
          : `100 ${localization.currency}`;
      parts.push(
        `When displaying monetary values, use ${localization.currency} symbol ${localization.currency_position === "before" ? "BEFORE" : "AFTER"} the number (e.g., "${currencyExample}").`,
      );
    }

    // Country context
    if (article.localization?.country_name) {
      parts.push(
        `The target audience is from ${article.localization.country_name}. Use culturally appropriate imagery and references.`,
      );
    }

    if (parts.length === 0) {
      return null;
    }

    return parts.join(" ");
  }

  private buildPromptJsonTemplate(
    article: ArticleContext,
    concept: CreativeConcept,
    options: PromptCompositionOptions,
  ): PromptJsonTemplate {
    const userDirections = options.userDirections
      ? this.sanitizeText(options.userDirections)
      : null;
    const autoDirections = options.autoDirections
      ? this.sanitizeText(options.autoDirections)
      : null;

    const visualGroup = options.visualGroup
      ? (() => {
          const variationIndex =
            options.visualGroupVariationIndex !== undefined
              ? options.visualGroupVariationIndex
              : Math.floor(
                  Math.random() * options.visualGroup.variations.length,
                );
          const variation = options.visualGroup.variations[variationIndex];
          return variation
            ? {
                code: options.visualGroup.code,
                name: options.visualGroup.name,
                variation_index: variationIndex,
                variation_prompt: variation.prompt,
              }
            : null;
        })()
      : null;

    // Build localization context
    // Priority: article.localization (from keyword_snapshot) > targeting countries > default
    let localization: PromptJsonTemplate["input"]["localization"] = null;

    if (article.localization) {
      // Use comprehensive localization from keyword_snapshot
      const sampleValues = getSampleValues(
        article.localization as LocalizationInfo,
      );
      localization = {
        country: article.localization.country_code,
        currency: article.localization.currency_symbol,
        currency_position: article.localization.currency_position,
        values: sampleValues.formatted,
        language: article.localization.language_name,
      };
    } else if (options.targeting && options.targeting.countries.length > 0) {
      // Fallback to targeting countries
      const country = options.targeting.countries[0];
      const rule = this.getLocalizationForCountry(
        country,
        options.nicheTemplate?.localization_rules,
      );
      localization = {
        country,
        currency: rule.currency,
        currency_position: rule.currency_position,
        values: rule.values,
        language: options.targeting.languages?.[0]?.name || "Português",
      };
    }

    const nicheTemplate = options.nicheTemplate
      ? {
          template: options.nicheTemplate.template,
          required_elements: options.nicheTemplate.required_elements,
          prohibited_words: options.nicheTemplate.prohibited_words,
        }
      : null;

    const bannedWords = [
      ...BANNED_TEXT_PATTERNS,
      ...(options.nicheTemplate?.prohibited_words || []),
    ];

    return {
      meta: {
        version: "prompt-master-json-v1",
        generated_at: new Date().toISOString(),
      },
      input: {
        article,
        concept: {
          id: concept.id,
          slug: concept.slug,
          name: concept.name,
          description: concept.description,
          prompt_template: concept.prompt_template,
          prompt_template_json: concept.prompt_template_json,
          category: concept.category,
          niche: concept.niche,
        },
        user_directions: userDirections,
        auto_directions: autoDirections,
        visual_group: visualGroup,
        niche_template: nicheTemplate,
        background: options.background
          ? {
              name: options.background.name,
              description: options.background.description,
              css_value: options.background.css_value,
              category: options.background.category,
            }
          : null,
        text_overlay: options.textOverlay
          ? {
              title: options.textOverlay.title,
              subtext: options.textOverlay.subtext,
              value_buttons: options.textOverlay.valueButtons,
              cta: options.textOverlay.cta,
              positions: {
                title: options.textOverlay.titlePosition,
                buttons: options.textOverlay.buttonPosition,
                cta: options.textOverlay.ctaPosition,
              },
              cultural_element: options.textOverlay.culturalElement || null,
            }
          : null,
        localization,
        format: options.format || null,
      },
      constraints: {
        output_format: "png",
        banned_words: bannedWords,
        no_carousel: true,
        text_policy: "Use only overlay text; do not add extra words.",
        cta_policy:
          "If CTA is provided, it MUST be the most attention-grabbing element following visual hierarchy principles: maximum contrast against background, largest or most prominent text element, strategic positioning for immediate eye capture. The CTA should dominate the visual hierarchy. If no CTA is provided, do not add one.",
        // CRITICAL: Respect source article language and localization
        language_policy: this.buildLanguagePolicy(article, localization),
      },
    };
  }

  private buildFallbackPromptText(
    article: ArticleContext,
    concept: CreativeConcept,
    options: PromptCompositionOptions,
  ): string {
    const parts: string[] = [];

    if (options.userDirections && options.userDirections.trim()) {
      const sanitized = this.sanitizeText(options.userDirections);
      if (sanitized) {
        parts.push(`IMPORTANT USER REQUIREMENTS: ${sanitized}`);
      }
    }

    if (options.autoDirections && options.autoDirections.trim()) {
      const sanitized = this.sanitizeText(options.autoDirections);
      if (sanitized) {
        parts.push(`AUTO CREATIVE DIRECTION: ${sanitized}`);
      }
    }

    if (options.nicheTemplate) {
      parts.push(`STYLE TEMPLATE:\n${options.nicheTemplate.template}`);

      if (options.nicheTemplate.required_elements.length > 0) {
        parts.push(
          `REQUIRED ELEMENTS: ${options.nicheTemplate.required_elements.join(", ")}`,
        );
      }
    }

    parts.push(
      `CREATIVE CONCEPT (${concept.name}): ${concept.prompt_template}`,
    );

    if (options.visualGroup) {
      const variationIndex =
        options.visualGroupVariationIndex !== undefined
          ? options.visualGroupVariationIndex
          : Math.floor(Math.random() * options.visualGroup.variations.length);
      const variation = options.visualGroup.variations[variationIndex];
      if (variation) {
        parts.push(`DOMINANT VISUAL GROUP: ${options.visualGroup.name}`);
        parts.push(
          `VISUAL STYLE (${options.visualGroup.name}): ${variation.prompt}`,
        );
      }
    }

    if (options.textOverlay) {
      const overlay = options.textOverlay;
      const valueButtons = overlay.valueButtons.join(" ");
      parts.push(
        `TEXT OVERLAY: Title "${overlay.title}" (extra-large, bold) at ${overlay.titlePosition}. Subtext "${overlay.subtext}" (supporting size). Value buttons ${valueButtons} (large, high-contrast) at ${overlay.buttonPosition}. CTA "${overlay.cta}" (MUST be the most attention-grabbing element: maximum contrast, largest/most prominent, dominant in visual hierarchy) at ${overlay.ctaPosition}.`,
      );
      if (overlay.culturalElement) {
        parts.push(`CULTURAL ELEMENT: ${overlay.culturalElement}`);
      }
    } else {
      parts.push(
        "TEXT POLICY: Use only specified text elements, no extra words.",
      );
    }

    if (options.background) {
      parts.push(
        `BACKGROUND: ${options.background.name} - ${options.background.description || options.background.css_value}`,
      );
    }

    // Add localization context
    if (article.localization) {
      const loc = article.localization;
      const currencyExample =
        loc.currency_position === "before"
          ? `${loc.currency_symbol} 100`
          : `100 ${loc.currency_symbol}`;
      parts.push(
        `LOCALIZATION CONTEXT:\n` +
          `- Country: ${loc.country_name} (${loc.country_code})\n` +
          `- Language: ${loc.language_name}\n` +
          `- Currency: ${loc.currency_symbol} (${loc.currency_code}), position ${loc.currency_position === "before" ? "BEFORE" : "AFTER"} number (e.g., "${currencyExample}")\n` +
          `- ALL text and monetary values MUST follow these rules.`,
      );
    } else if (options.targeting && options.targeting.countries.length > 0) {
      const country = options.targeting.countries[0];
      const localization = this.getLocalizationForCountry(
        country,
        options.nicheTemplate?.localization_rules,
      );
      const language = options.targeting.languages?.[0]?.name || "Português";
      parts.push(
        `LOCALIZATION: Currency ${localization.currency}, Language ${language}`,
      );
    }

    parts.push(
      `ARTICLE CONTEXT:\n- Title: ${article.title}\n- Keyword: ${article.keyword}`,
    );
    if (article.excerpt) {
      parts.push(`- Excerpt: ${article.excerpt}`);
    }

    // CRITICAL: Add language enforcement
    if (article.language) {
      parts.push(
        `CRITICAL LANGUAGE RULE: ALL text elements (title, subtext, CTA, buttons) MUST be in ${article.language.toUpperCase()}. This is the source language of the article and MUST be respected. Do NOT translate or change the language.`,
      );
    }

    if (options.format) {
      parts.push(`FORMAT: ${options.format}`);
    }

    parts.push(`GLOBAL RULES:\n${GLOBAL_PROMPT_RULES}`);

    return parts.join("\n\n");
  }

  private buildFallbackPromptJson(
    template: PromptJsonTemplate,
    promptText: string,
  ): PromptJsonOutput {
    return {
      prompts: [
        {
          id: 1,
          concept_slug: template.input.concept.slug,
          visual_group_primary: template.input.visual_group?.code || null,
          background_category: template.input.background?.category || null,
          background_description:
            template.input.background?.description ||
            template.input.background?.css_value ||
            null,
          button_position:
            template.input.text_overlay?.positions.buttons || null,
          cta_position: template.input.text_overlay?.positions.cta || null,
          title_position: template.input.text_overlay?.positions.title || null,
          prompt: promptText,
        },
      ],
      validation_summary: {},
    };
  }

  private async refinePromptJsonWithAI(
    template: PromptJsonTemplate,
  ): Promise<PromptJsonOutput | null> {
    if (!this.openRouterService.isConfigured()) {
      return null;
    }

    const systemPrompt = `You are a senior performance creative director.
You will receive a JSON template that includes concept, constraints, overlay text, and styling hints.
Return ONLY valid JSON with this exact structure:
{
  "prompts": [
    {
      "id": 1,
      "concept_slug": "...",
      "visual_group_primary": "...",
      "visual_group_secondary": null,
      "visual_style": "...",
      "background_category": "...",
      "background_description": "...",
      "button_position": "...",
      "cta_position": "...",
      "title_position": "...",
      "typography": { "headline_font": "...", "body_font": "...", "cta_font": "..." },
      "prompt": "DETAILED PROMPT STRING"
    }
  ],
  "validation_summary": {
    "total_prompts": 1,
    "prohibited_words_found": [],
    "has_cultural_element": false
  }
}

Rules you must follow:
- The prompt must be highly detailed: layout, composition, lighting, texture, typography, spacing, camera/angle if applicable.
- Use PNG output.
- Use ONLY the overlay text provided; do not add any extra text.
- Do not promise guaranteed approval, credit release, or guaranteed money.
- If CTA is provided, it MUST be the most attention-grabbing element following visual hierarchy principles: maximum contrast against background (e.g., bright color on dark, or vice-versa), largest or most prominent text element, strategic positioning for immediate eye capture. The CTA should dominate the visual hierarchy and be the first thing viewers notice. If no CTA is provided, do not invent one.
- Never use carousel.
- If input.niche_template.required_elements exists, incorporate them.
- Include typography details (font families, weights, spacing).
- CRITICAL TYPOGRAPHY SIZE RULE: This image will be used as a Meta/Facebook ad displayed on mobile phones at roughly 350px width. ALL text must be LARGE and easily readable at that size. Headlines must be at minimum 48pt equivalent, body text at minimum 28pt equivalent, UI labels at minimum 22pt equivalent. For UI-style concepts (notes app, chat, simulator, dashboard, checklist), scale up ALL text 2-3x larger than realistic app text — it should look native but be dramatically oversized for ad legibility. Text that cannot be read at a glance on mobile will make the ad fail. When in doubt, make text BIGGER.
- CRITICAL LANGUAGE RULE: If constraints.language_policy is present, you MUST follow it. All text elements (title, subtext, CTA, buttons) must be generated in the specified language. If input.article.language is provided, ALL text must match that language. Never translate or change the language of text elements.
- Keep overlay text in its original language exactly.
- Do NOT include any of the banned words from constraints.banned_words.
`;

    const userPrompt = `Template JSON:
${JSON.stringify(template, null, 2)}`;

    try {
      const response = await this.openRouterService.chatCompletion(
        this.promptRefinerModel,
        [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        {
          temperature: 0.35,
          max_tokens: 2200,
          response_format: { type: "json_object" },
        },
      );

      const content = response.content.trim();
      const parsed = JSON.parse(content) as PromptJsonOutput;
      if (
        !parsed.prompts ||
        parsed.prompts.length === 0 ||
        !parsed.prompts[0].prompt
      ) {
        return null;
      }
      return parsed;
    } catch (error) {
      this.logger.warn(
        `[AI] Failed to generate JSON prompt: ${error instanceof Error ? error.message : error}`,
      );
      return null;
    }
  }

  private buildValidationSummary(
    output: PromptJsonOutput,
    template: PromptJsonTemplate,
  ): Record<string, unknown> {
    const promptText = output.prompts[0]?.prompt || "";
    const prohibitedFound = template.constraints.banned_words.filter(
      (pattern) =>
        new RegExp(
          `\\b${pattern.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\$&")}\\b`,
          "i",
        ).test(promptText),
    );

    const hasCulturalElement = Boolean(
      template.input.text_overlay?.cultural_element,
    );

    return {
      total_prompts: output.prompts.length,
      prohibited_words_found: prohibitedFound,
      has_cultural_element: hasCulturalElement,
      output_format: template.constraints.output_format,
      no_carousel: template.constraints.no_carousel,
    };
  }
}
