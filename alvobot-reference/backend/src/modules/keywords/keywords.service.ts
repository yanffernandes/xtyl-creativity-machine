import { Injectable, Logger, Inject, Optional } from "@nestjs/common";
import { HttpService } from "@nestjs/axios";
import { ConfigService } from "@nestjs/config";
import { firstValueFrom, timeout, catchError } from "rxjs";
import {
  MineKeywordsDto,
  MiningResultDto,
  MineKeywordsServiceResponseDto,
} from "./dto/mine-keywords.dto";
import { SupabaseService } from "../../common/supabase/supabase.service";
import { OpenRouterService } from "../openrouter/openrouter.service";

// RapidAPI Google Keyword Insight response item
interface RapidApiKeywordItem {
  text: string;
  volume: number;
  low_bid: number;
  high_bid: number;
  competition_level?: string;
  competition_index?: number;
  trend?: number;
}

// Response can be an array or an error object
type RapidApiKeywordResponse = RapidApiKeywordItem[] | { error?: string };

// Gemini response for keyword suggestions
interface OpenAiKeywordSuggestion {
  keyword: string;
}

@Injectable()
export class KeywordsService {
  private readonly logger = new Logger(KeywordsService.name);
  private readonly rapidApiKey: string;
  private readonly rapidApiHost = "google-keyword-insight1.p.rapidapi.com";
  private readonly geminiModel = "google/gemini-3-flash-preview";

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly supabaseService: SupabaseService,
    @Optional()
    @Inject(OpenRouterService)
    private readonly openRouterService?: OpenRouterService,
  ) {
    this.rapidApiKey = this.configService.get<string>("RAPIDAPI_KEY", "");
  }

  /**
   * Mine keywords using RapidAPI Google Keyword Insight
   * When keyword is empty, picks random existing user keywords + AI suggestions
   */
  async mineKeywords(
    dto: MineKeywordsDto,
    userId?: string,
  ): Promise<MineKeywordsServiceResponseDto> {
    const { keyword, country, language } = dto;

    this.logger.log(
      `Mining keywords for: "${keyword || "AI suggestion"}" in ${country}/${language}`,
    );

    try {
      let keywordsToMine: string[] = [];

      if (!keyword || keyword.trim() === "") {
        // AI mode: use existing keywords + AI suggestions
        this.logger.log(
          "No keyword provided, using hybrid approach (existing + AI)...",
        );
        keywordsToMine = await this.getHybridKeywordSuggestions(
          userId,
          country,
          language,
        );
      } else {
        keywordsToMine = [keyword.trim()];
      }

      if (keywordsToMine.length === 0) {
        return {
          success: false,
          results: [],
          error: "No keywords to mine",
        };
      }

      // Mine each keyword using RapidAPI
      const allResults: MiningResultDto[] = [];

      for (const kw of keywordsToMine) {
        try {
          const results = await this.mineKeywordWithRapidApi(
            kw,
            country,
            language,
          );
          allResults.push(...results);

          // Small delay between requests to respect rate limits
          if (keywordsToMine.length > 1) {
            await this.delay(2000);
          }
        } catch (error) {
          this.logger.warn(`Failed to mine keyword "${kw}": ${error.message}`);
          // Continue with other keywords
        }
      }

      // Remove duplicates based on keyword
      const uniqueResults = this.removeDuplicates(allResults);

      // Sort by discrepancy (best first)
      uniqueResults.sort((a, b) => b.discrepancy - a.discrepancy);

      this.logger.log(
        `Mining completed: ${uniqueResults.length} keywords found`,
      );

      return {
        success: true,
        results: uniqueResults,
      };
    } catch (error) {
      this.logger.error(`Mining failed: ${error.message}`);

      return {
        success: false,
        results: [],
        error: error.message || "Failed to mine keywords",
      };
    }
  }

  /**
   * Get hybrid keyword suggestions: 2 random from user's existing + 2 from AI
   */
  private async getHybridKeywordSuggestions(
    userId: string | undefined,
    country: string,
    language: string,
  ): Promise<string[]> {
    const keywordsToMine: string[] = [];

    // Step 1: Get 2 random keywords from user's existing keywords
    if (userId) {
      try {
        const existingKeywords = await this.getRandomUserKeywords(userId, 2);
        if (existingKeywords.length > 0) {
          keywordsToMine.push(...existingKeywords);
          this.logger.log(
            `Selected ${existingKeywords.length} existing keywords: ${existingKeywords.join(", ")}`,
          );
        }
      } catch (error) {
        this.logger.warn(`Failed to get existing keywords: ${error.message}`);
      }
    }

    // Step 2: Generate 2 AI suggestions based on existing keywords
    const aiSuggestions = await this.generateAiKeywordSuggestions(
      country,
      language,
      keywordsToMine, // Pass existing keywords as reference
    );
    keywordsToMine.push(...aiSuggestions);

    this.logger.log(`Total keywords to mine: ${keywordsToMine.length}`);
    return keywordsToMine;
  }

  /**
   * Get random keywords from user's existing mined keywords
   */
  private async getRandomUserKeywords(
    userId: string,
    count: number,
  ): Promise<string[]> {
    const supabase = this.supabaseService.getClient();

    // Query user's keywords through the junction table
    const { data, error } = await supabase
      .from("users_keywords")
      .select("keywords:keyword_id(word)")
      .eq("user_id", userId)
      .limit(50); // Get up to 50 to have a good pool

    if (error) {
      this.logger.error(`Supabase error: ${error.message}`);
      throw error;
    }

    if (!data || data.length === 0) {
      this.logger.log("User has no existing keywords");
      return [];
    }

    // Extract keyword words and shuffle
    // Supabase returns the relation - we use 'as unknown' to safely cast
    const keywords = data
      .map((item) => {
        // The query returns {keywords: {word: string}} for a single FK relation
        const kw = item.keywords as unknown as { word: string } | null;
        return kw?.word;
      })
      .filter((word): word is string => !!word);

    // Shuffle and pick random ones
    const shuffled = keywords.sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
  }

  /**
   * Call RapidAPI Google Keyword Insight to get keyword data
   */
  private async mineKeywordWithRapidApi(
    keyword: string,
    country: string,
    language: string,
  ): Promise<MiningResultDto[]> {
    if (!this.rapidApiKey) {
      throw new Error("RAPIDAPI_KEY not configured");
    }

    const url = `https://${this.rapidApiHost}/keysuggest`;

    this.logger.debug(`Calling RapidAPI for keyword: ${keyword}`);

    const response = await firstValueFrom(
      this.httpService
        .get<RapidApiKeywordResponse>(url, {
          params: {
            keyword: keyword,
            location: country.toUpperCase(),
            lang: language.toLowerCase(),
            mode: "all",
          },
          headers: {
            "x-rapidapi-host": this.rapidApiHost,
            "x-rapidapi-key": this.rapidApiKey,
          },
          timeout: 30000,
        })
        .pipe(
          timeout(30000),
          catchError((error) => {
            this.logger.error(`RapidAPI error: ${error.message}`);
            throw error;
          }),
        ),
    );

    const data = response.data;

    // Debug log to see the raw response
    this.logger.debug(
      `RapidAPI raw response: ${JSON.stringify(data).substring(0, 500)}`,
    );

    // Check if response is an error object
    if (!Array.isArray(data)) {
      if (data.error) {
        throw new Error(data.error);
      }
      this.logger.warn(
        `RapidAPI returned unexpected response format for keyword: ${keyword}`,
      );
      return [];
    }

    // Response is an array of keyword items
    const items = data as RapidApiKeywordItem[];

    // Check if results is empty and log
    if (items.length === 0) {
      this.logger.warn(`RapidAPI returned no results for keyword: ${keyword}`);
    } else {
      this.logger.debug(
        `RapidAPI returned ${items.length} results for keyword: ${keyword}`,
      );
    }

    // Transform results to our format
    // API returns: text, volume, low_bid, high_bid
    return items.map((item) => {
      const searchVolume = item.volume || 0;
      const cpcMin = item.low_bid || 0;
      const cpcMax = item.high_bid || 0;
      const discrepancy = cpcMin > 0 ? Number((cpcMax / cpcMin).toFixed(2)) : 0;

      // Calculate quality based on volume and discrepancy
      // Higher discrepancy = more price variation (cpc_max/cpc_min ratio)
      let quality: "high" | "medium" | "low" = "medium";
      if (discrepancy >= 3 && searchVolume > 100000) {
        quality = "high";
      } else if (discrepancy < 2 || searchVolume < 10000) {
        quality = "low";
      }

      return {
        keyword: item.text,
        search_volume: searchVolume,
        cpc_min: Number(cpcMin.toFixed(2)),
        cpc_max: Number(cpcMax.toFixed(2)),
        discrepancy,
        quality,
        trend: item.trend || 0,
      };
    });
  }

  /**
   * Generate keyword suggestions using Gemini via OpenRouter
   * Uses existing keywords as reference if available
   */
  private async generateAiKeywordSuggestions(
    country: string,
    language: string,
    existingKeywords: string[] = [],
  ): Promise<string[]> {
    if (!this.openRouterService?.isConfigured()) {
      this.logger.error(
        "[KeywordsService] OpenRouter not configured - cannot generate AI suggestions",
      );
      throw new Error("OpenRouter not configured");
    }

    const languageNames: Record<string, string> = {
      pt: "Português",
      en: "English",
      es: "Español",
      fr: "Français",
      de: "Deutsch",
      it: "Italiano",
    };

    const countryNames: Record<string, string> = {
      BR: "Brasil",
      US: "United States",
      PT: "Portugal",
      ES: "España",
      FR: "France",
      DE: "Deutschland",
      IT: "Italia",
      MX: "México",
      AR: "Argentina",
      CO: "Colombia",
    };

    // Build reference section if we have existing keywords
    const referenceSection =
      existingKeywords.length > 0
        ? `
### **Palavras-chave de Referência (do histórico do usuário):**
${existingKeywords.map((kw) => `- "${kw}"`).join("\n")}

Use essas palavras como inspiração para sugerir termos RELACIONADOS ou do MESMO NICHO, mas que sejam DIFERENTES e complementares.`
        : "";

    const prompt = `Gere DUAS palavras-chave únicas que tenham alto potencial de busca no Google. O objetivo é identificar termos com um potencial estimado de pelo menos 10.000 pesquisas mensais.

### **Dados de Entrada:**
- **País**: **${countryNames[country] || country}**
- **Idioma**: **${languageNames[language] || language}**
${referenceSection}

### **Diretrizes:**
1. **Potencial de Busca**: Priorize termos com alto volume de pesquisa.
2. **Originalidade**: Cada sugestão deve ser diferente das palavras de referência.
3. **Evite YMYL**: Nunca sugira temas de saúde ou finanças pessoais.
${existingKeywords.length > 0 ? "4. **Relacionado**: As sugestões devem estar no mesmo nicho ou tema das palavras de referência." : ""}

### **Formato da Resposta:**
OBRIGATÓRIO: Envie apenas JSON, sem markdown:

[
    {"keyword": "primeira sugestão"},
    {"keyword": "segunda sugestão"}
]`;

    try {
      if (!this.openRouterService) {
        throw new Error("OpenRouter service not available");
      }
      if (!this.openRouterService.isConfigured()) {
        throw new Error("OpenRouter API key not configured");
      }

      const result = await this.openRouterService.chatCompletion(
        this.geminiModel,
        [
          {
            role: "system",
            content:
              "You are a keyword research expert. Always respond with valid JSON only, no markdown or extra text.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        {
          temperature: 0.8,
          max_tokens: 200,
        },
      );

      const content = result.content || "";

      // Parse JSON response
      let suggestions: OpenAiKeywordSuggestion[] = [];

      try {
        // Try to extract JSON from the response (handles markdown code blocks)
        const jsonMatch = content.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          suggestions = JSON.parse(jsonMatch[0]);
        } else {
          suggestions = JSON.parse(content);
        }
      } catch (parseError) {
        this.logger.error("[KeywordsService] Failed to parse Gemini response", {
          content,
          language,
          country,
          error:
            parseError instanceof Error
              ? parseError.message
              : "Unknown parse error",
        });
        throw new Error("Failed to parse Gemini keyword suggestions");
      }

      const keywords = suggestions
        .filter((s) => s.keyword && typeof s.keyword === "string")
        .map((s) => s.keyword.trim())
        .filter((k) => k.length > 0);

      this.logger.log(`Generated ${keywords.length} AI keyword suggestions`);

      return keywords;
    } catch (error) {
      this.logger.error("[KeywordsService] Gemini suggestion failed", {
        language,
        country,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      throw error;
    }
  }

  /**
   * Remove duplicate keywords from results
   */
  private removeDuplicates(results: MiningResultDto[]): MiningResultDto[] {
    const seen = new Set<string>();
    return results.filter((item) => {
      const key = item.keyword.toLowerCase();
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  /**
   * Delay helper for rate limiting
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
