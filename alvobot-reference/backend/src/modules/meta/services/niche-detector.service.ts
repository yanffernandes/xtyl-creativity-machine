/**
 * NicheDetectorService
 *
 * Detects the niche of articles using AI (Gemini 3 Flash) with keyword fallback.
 * Used to determine which specialized templates and concepts to apply.
 */

import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { OpenRouterService } from "../../openrouter/openrouter.service";

// Default model for AI-based niche detection (Gemini Flash)
const DEFAULT_NICHE_DETECTION_MODEL = "google/gemini-3-flash-preview";

// ============================================
// Types
// ============================================

export type DetectedNiche =
  | "generic"
  | "financial"
  | "jobs"
  | "health"
  | "ecommerce";

export interface ArticleForDetection {
  id: number;
  title: string;
  keyword: string;
  excerpt?: string;
  category?: string;
}

export interface KeywordMatch {
  keyword: string;
  niche: DetectedNiche;
  confidence: number;
  source: "title" | "keyword" | "excerpt" | "category";
}

export interface ArticleNicheResult {
  articleId: number;
  detectedNiche: DetectedNiche;
  confidence: number;
  matchedKeywords: KeywordMatch[];
}

export interface NicheDetectionResult {
  detectedNiche: DetectedNiche;
  confidence: number;
  applySpecializedTemplate: boolean;
  articleResults: ArticleNicheResult[];
  triggerKeywords: string[];
  recommendations: {
    useMasterTemplate: boolean;
    suggestedConcepts: string[];
    suggestedVisualGroups?: string[];
  };
}

// ============================================
// Niche Keywords Configuration
// T040-T042C: Niche detection keywords
// ============================================

const NICHE_KEYWORDS: Record<
  DetectedNiche,
  { primary: string[]; secondary: string[] }
> = {
  financial: {
    // T041: Financial niche keywords
    primary: [
      "empréstimo",
      "emprestimo",
      "crédito",
      "credito",
      "financiamento",
      "dinheiro",
      "bank",
      "loan",
      "money",
      "credit",
      "lending",
      "taxa",
      "juros",
      "parcela",
      "simulador",
      "simulate",
    ],
    secondary: [
      "cartão",
      "cartao",
      "conta",
      "aprovação",
      "aprovacao",
      "saldo",
      "investimento",
      "finança",
      "financa",
      "banking",
      "fintech",
      "renda",
      "salário",
      "salario",
      "valor",
      "mil",
      "reais",
    ],
  },
  jobs: {
    // T042: Jobs niche keywords
    primary: [
      "emprego",
      "trabalho",
      "vaga",
      "curriculum",
      "currículo",
      "curriculo",
      "contratação",
      "contratacao",
      "job",
      "career",
      "hiring",
      "work",
    ],
    secondary: [
      "salário",
      "salario",
      "carreira",
      "profissional",
      "home office",
      "remoto",
      "CLT",
      "PJ",
      "freelance",
      "empresa",
      "recrutamento",
    ],
  },
  ecommerce: {
    // T042A: Ecommerce niche keywords
    primary: [
      "loja",
      "comprar",
      "vender",
      "produto",
      "oferta",
      "shop",
      "store",
      "buy",
      "sell",
      "product",
      "offer",
      "deal",
    ],
    secondary: [
      "frete",
      "desconto",
      "promoção",
      "promocao",
      "entrega",
      "carrinho",
      "checkout",
      "pagamento",
      "marketplace",
      "ecommerce",
      "e-commerce",
    ],
  },
  health: {
    // T042B: Health niche keywords
    primary: [
      "saúde",
      "saude",
      "médico",
      "medico",
      "hospital",
      "tratamento",
      "doença",
      "doenca",
      "health",
      "medical",
      "doctor",
      "treatment",
    ],
    secondary: [
      "bem-estar",
      "fitness",
      "nutrição",
      "nutricao",
      "dieta",
      "clínico",
      "clinico",
      "consulta",
      "exame",
      "remédio",
      "remedio",
      "wellness",
    ],
  },
  generic: {
    primary: [],
    secondary: [],
  },
};

// Confidence threshold for applying specialized templates
const OTHER_NICHE_CONFIDENCE_THRESHOLD = 0.8;

@Injectable()
export class NicheDetectorService {
  private readonly logger = new Logger(NicheDetectorService.name);
  private supabase: SupabaseClient;
  private readonly nicheDetectionModel: string;

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

    // Model for AI-based niche detection (can be overridden via env)
    const configuredModel =
      this.configService.get<string>("NICHE_DETECTION_MODEL") ||
      DEFAULT_NICHE_DETECTION_MODEL;
    this.nicheDetectionModel = this.ensureGeminiModelFresh(configuredModel);

    this.logger.log(
      `Niche detection initialized with model: ${this.nicheDetectionModel}`,
    );
  }

  private ensureGeminiModelFresh(model: string): string {
    if (!model) {
      return DEFAULT_NICHE_DETECTION_MODEL;
    }

    if (!model.includes("gemini")) {
      this.logger.warn(
        `Non-Gemini model "${model}" requested. Forcing ${DEFAULT_NICHE_DETECTION_MODEL}.`,
      );
      return DEFAULT_NICHE_DETECTION_MODEL;
    }

    if (this.isLegacyGeminiModel(model)) {
      this.logger.warn(
        `Gemini model "${model}" is older than Gemini 3 Flash. Upgrading to ${DEFAULT_NICHE_DETECTION_MODEL}.`,
      );
      return DEFAULT_NICHE_DETECTION_MODEL;
    }

    return model;
  }

  private isLegacyGeminiModel(model: string): boolean {
    return /gemini-(1|1\\.5|2)/.test(model);
  }

  /**
   * Detect niche from a batch of articles
   * Uses AI (Gemini Flash) with keyword-based fallback
   */
  async detectNiche(
    articles: ArticleForDetection[],
  ): Promise<NicheDetectionResult> {
    if (articles.length === 0) {
      return this.createGenericResult([]);
    }

    // Try AI-based detection first
    if (this.openRouterService.isConfigured()) {
      try {
        const aiResult = await this.detectNicheWithAI(articles);
        if (aiResult) {
          this.logger.log(
            `[AI] Niche detected: ${aiResult.detectedNiche} (confidence: ${aiResult.confidence})`,
          );
          return aiResult;
        }
      } catch (error) {
        this.logger.warn(
          `[AI] Niche detection failed, falling back to keywords: ${error instanceof Error ? error.message : error}`,
        );
      }
    }

    // Fallback to keyword-based detection
    return this.detectNicheWithKeywords(articles);
  }

  /**
   * AI-based niche detection using Gemini Flash via OpenRouter
   */
  private async detectNicheWithAI(
    articles: ArticleForDetection[],
  ): Promise<NicheDetectionResult | null> {
    // Build article summary for the AI
    const articlesSummary = articles.map((a) => ({
      title: a.title,
      keyword: a.keyword,
      excerpt: a.excerpt?.substring(0, 200) || "",
      category: a.category || "",
    }));

    const systemPrompt = `You are a niche classification expert. Analyze the provided articles and classify them into ONE of these niches:
- financial: Banking, loans, credit, investments, money management
- health: Medical, wellness, fitness, nutrition, healthcare
- jobs: Employment, careers, job hunting, recruitment, workplace
- ecommerce: Online shopping, products, deals, stores, marketplaces
- generic: General content that doesn't fit other categories

Respond ONLY with valid JSON in this exact format:
{
  "niche": "financial|health|jobs|ecommerce|generic",
  "confidence": 0.0 to 1.0,
  "reasoning": "Brief explanation of why this niche was chosen",
  "keywords": ["key", "terms", "that", "influenced", "decision"]
}`;

    const userPrompt = `Classify these articles into a niche:

${JSON.stringify(articlesSummary, null, 2)}

Remember: Respond ONLY with the JSON object, no other text.`;

    try {
      const response = await this.openRouterService.chatCompletion(
        this.nicheDetectionModel,
        [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        {
          temperature: 0.1, // Low temperature for consistent classification
          max_tokens: 500,
          response_format: { type: "json_object" },
        },
      );

      // Parse the AI response
      const content = response.content.trim();
      let aiResult: {
        niche: string;
        confidence: number;
        reasoning: string;
        keywords: string[];
      };

      try {
        aiResult = JSON.parse(content);
      } catch {
        // Try to extract JSON from the response if it contains other text
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          aiResult = JSON.parse(jsonMatch[0]);
        } else {
          this.logger.warn(
            `[AI] Could not parse niche detection response: ${content}`,
          );
          return null;
        }
      }

      // Validate the niche
      const validNiches: DetectedNiche[] = [
        "financial",
        "health",
        "jobs",
        "ecommerce",
        "generic",
      ];
      const detectedNiche = validNiches.includes(
        aiResult.niche as DetectedNiche,
      )
        ? (aiResult.niche as DetectedNiche)
        : "generic";

      const confidence = Math.max(0, Math.min(1, aiResult.confidence || 0.5));

      this.logger.debug(
        `[AI] Classification result: ${detectedNiche} (${confidence}) - ${aiResult.reasoning}`,
      );

      // Build article results (simplified for AI detection)
      const articleResults: ArticleNicheResult[] = articles.map((article) => ({
        articleId: article.id,
        detectedNiche,
        confidence,
        matchedKeywords: (aiResult.keywords || []).map((kw) => ({
          keyword: kw,
          niche: detectedNiche,
          confidence,
          source: "title" as const,
        })),
      }));

      // Check if should apply specialized template
      const applySpecializedTemplate = this.shouldApplySpecializedTemplate(
        detectedNiche,
        confidence,
      );

      // Generate recommendations
      const recommendations = await this.generateRecommendations(
        detectedNiche,
        applySpecializedTemplate,
      );

      return {
        detectedNiche,
        confidence,
        applySpecializedTemplate,
        articleResults,
        triggerKeywords: aiResult.keywords || [],
        recommendations,
      };
    } catch (error) {
      this.logger.error(
        `[AI] Error in niche detection: ${error instanceof Error ? error.message : error}`,
      );
      return null;
    }
  }

  /**
   * Keyword-based niche detection (fallback method)
   */
  private async detectNicheWithKeywords(
    articles: ArticleForDetection[],
  ): Promise<NicheDetectionResult> {
    // Analyze each article
    const articleResults: ArticleNicheResult[] = [];
    const allMatches: KeywordMatch[] = [];

    for (const article of articles) {
      const result = this.analyzeArticle(article);
      articleResults.push(result);
      allMatches.push(...result.matchedKeywords);
    }

    // Aggregate results
    const nicheScores = this.calculateNicheScores(allMatches);
    const { detectedNiche, confidence } = this.determineFinalNiche(nicheScores);

    // Check if should apply specialized template
    const applySpecializedTemplate = this.shouldApplySpecializedTemplate(
      detectedNiche,
      confidence,
    );

    // Get trigger keywords
    const triggerKeywords = [
      ...new Set(
        allMatches
          .filter((m) => m.niche === detectedNiche)
          .map((m) => m.keyword),
      ),
    ];

    // Generate recommendations
    const recommendations = await this.generateRecommendations(
      detectedNiche,
      applySpecializedTemplate,
    );

    this.logger.log(
      `[Keywords] Niche detected: ${detectedNiche} (confidence: ${confidence})`,
    );

    return {
      detectedNiche,
      confidence,
      applySpecializedTemplate,
      articleResults,
      triggerKeywords,
      recommendations,
    };
  }

  /**
   * Analyze a single article for niche keywords
   */
  private analyzeArticle(article: ArticleForDetection): ArticleNicheResult {
    const matches: KeywordMatch[] = [];

    // Check each text field
    const textFields: Array<{ text: string; source: KeywordMatch["source"] }> =
      [
        { text: article.title, source: "title" },
        { text: article.keyword, source: "keyword" },
        { text: article.excerpt || "", source: "excerpt" },
        { text: article.category || "", source: "category" },
      ];

    for (const { text, source } of textFields) {
      if (!text) continue;

      const normalizedText = this.normalizeText(text);

      for (const [niche, keywords] of Object.entries(NICHE_KEYWORDS)) {
        if (niche === "generic") continue;

        // Check primary keywords (higher confidence)
        for (const keyword of keywords.primary) {
          if (normalizedText.includes(this.normalizeText(keyword))) {
            matches.push({
              keyword,
              niche: niche as DetectedNiche,
              confidence: 0.95,
              source,
            });
          }
        }

        // Check secondary keywords (lower confidence)
        for (const keyword of keywords.secondary) {
          if (normalizedText.includes(this.normalizeText(keyword))) {
            matches.push({
              keyword,
              niche: niche as DetectedNiche,
              confidence: 0.7,
              source,
            });
          }
        }
      }
    }

    // Determine article's niche
    const articleNicheScores = this.calculateNicheScores(matches);
    const { detectedNiche, confidence } =
      this.determineFinalNiche(articleNicheScores);

    return {
      articleId: article.id,
      detectedNiche,
      confidence,
      matchedKeywords: matches,
    };
  }

  /**
   * Calculate aggregate scores for each niche
   */
  private calculateNicheScores(
    matches: KeywordMatch[],
  ): Record<DetectedNiche, number> {
    const scores: Record<DetectedNiche, number> = {
      generic: 0,
      financial: 0,
      jobs: 0,
      health: 0,
      ecommerce: 0,
    };

    for (const match of matches) {
      scores[match.niche] += match.confidence;
    }

    return scores;
  }

  /**
   * Determine the final niche based on scores
   * T042C: Fallback to generic when no niche is detected
   */
  private determineFinalNiche(scores: Record<DetectedNiche, number>): {
    detectedNiche: DetectedNiche;
    confidence: number;
  } {
    let maxNiche: DetectedNiche = "generic";
    let maxScore = 0;

    for (const [niche, score] of Object.entries(scores)) {
      if (niche !== "generic" && score > maxScore) {
        maxScore = score;
        maxNiche = niche as DetectedNiche;
      }
    }

    // Normalize confidence to 0-1 range
    const confidence = maxScore > 0 ? Math.min(maxScore / 3, 1) : 0;

    // If confidence is too low, default to generic
    if (confidence < 0.5) {
      return { detectedNiche: "generic", confidence: 0.5 };
    }

    return { detectedNiche: maxNiche, confidence };
  }

  /**
   * Determine if specialized template should be applied
   */
  private shouldApplySpecializedTemplate(
    niche: DetectedNiche,
    confidence: number,
  ): boolean {
    if (niche === "generic") {
      return false;
    }

    // Financial should always apply when detected
    if (niche === "financial") {
      return true;
    }

    // Other niches have lower threshold
    return confidence >= OTHER_NICHE_CONFIDENCE_THRESHOLD;
  }

  /**
   * Generate recommendations based on detected niche
   */
  private async generateRecommendations(
    niche: DetectedNiche,
    applyTemplate: boolean,
  ): Promise<NicheDetectionResult["recommendations"]> {
    // Default suggestions for generic niche
    if (niche === "generic" || !applyTemplate) {
      return {
        useMasterTemplate: false,
        suggestedConcepts: [
          "typography",
          "question-hook",
          "comparison",
          "native-ugc",
          "testimonial",
        ],
      };
    }

    // Financial niche suggestions
    if (niche === "financial") {
      return {
        useMasterTemplate: true,
        suggestedConcepts: [
          "simulator-ui",
          "fin-testimonial",
          "fin-comparison",
          "fin-question",
          "fin-simulator",
        ],
        suggestedVisualGroups: ["A", "B", "F", "H"],
      };
    }

    // Jobs niche suggestions
    if (niche === "jobs") {
      return {
        useMasterTemplate: false,
        suggestedConcepts: [
          "typography",
          "question-hook",
          "comparison",
          "before-after",
          "testimonial",
        ],
      };
    }

    // Health niche suggestions
    if (niche === "health") {
      return {
        useMasterTemplate: false,
        suggestedConcepts: [
          "testimonial",
          "before-after",
          "comparison",
          "native-ugc",
          "question-hook",
        ],
      };
    }

    // Ecommerce niche suggestions
    if (niche === "ecommerce") {
      return {
        useMasterTemplate: false,
        suggestedConcepts: [
          "banner-professional",
          "comparison",
          "testimonial",
          "question-hook",
          "native-ugc",
        ],
      };
    }

    // Default
    return {
      useMasterTemplate: false,
      suggestedConcepts: ["typography", "question-hook", "comparison"],
    };
  }

  /**
   * Create a generic result when no articles provided
   */
  private createGenericResult(
    articleResults: ArticleNicheResult[],
  ): NicheDetectionResult {
    return {
      detectedNiche: "generic",
      confidence: 0.5,
      applySpecializedTemplate: false,
      articleResults,
      triggerKeywords: [],
      recommendations: {
        useMasterTemplate: false,
        suggestedConcepts: [
          "typography",
          "question-hook",
          "comparison",
          "native-ugc",
          "testimonial",
        ],
      },
    };
  }

  /**
   * Normalize text for keyword matching
   */
  private normalizeText(text: string): string {
    return text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // Remove diacritics
      .replace(/[^\w\s]/g, " ") // Replace special chars with space
      .replace(/\s+/g, " ") // Normalize whitespace
      .trim();
  }
}
