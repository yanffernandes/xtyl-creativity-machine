import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

// ============================================
// Interfaces
// ============================================

export interface MetaCountry {
  key: string;
  name: string;
  type: "country";
  countryCode: string;
  supportsCity: boolean;
  supportsRegion: boolean;
}

export interface MetaLanguage {
  key: string;
  name: string;
}

// ============================================
// Targeting Service
// ============================================

@Injectable()
export class TargetingService {
  private readonly logger = new Logger(TargetingService.name);
  private supabase: SupabaseClient;

  // Meta Marketing API URL
  private readonly META_API_URL = "https://graph.facebook.com/v21.0";

  // Cache expiry in hours
  private readonly CACHE_EXPIRY_HOURS = 24;

  constructor(private configService: ConfigService) {
    const supabaseUrl = this.configService.get<string>("SUPABASE_URL");
    const supabaseServiceKey = this.configService.get<string>(
      "SUPABASE_SERVICE_KEY",
    );

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Supabase configuration missing");
    }

    this.supabase = createClient(supabaseUrl, supabaseServiceKey);
  }

  // ============================================
  // Countries
  // ============================================

  /**
   * Get countries for targeting
   * First tries cache, then fetches from Meta API
   */
  async getCountries(
    accessToken: string,
    search?: string,
    limit: number = 100,
  ): Promise<MetaCountry[]> {
    // Try cache first
    const cached = await this.getCachedCountries(search, limit);
    if (cached.length > 0) {
      return cached;
    }

    // Fetch from Meta API
    return this.fetchAndCacheCountries(accessToken, search, limit);
  }

  /**
   * Get cached countries from database
   */
  private async getCachedCountries(
    search?: string,
    limit: number = 100,
  ): Promise<MetaCountry[]> {
    const cacheExpiry = new Date();
    cacheExpiry.setHours(cacheExpiry.getHours() - this.CACHE_EXPIRY_HOURS);

    let query = this.supabase
      .from("meta_geo_targets")
      .select("*")
      .eq("type", "country")
      .gt("cached_at", cacheExpiry.toISOString())
      .order("name", { ascending: true })
      .limit(limit);

    if (search) {
      query = query.ilike("name", `%${search}%`);
    }

    const { data, error } = await query;

    if (error) {
      this.logger.warn("Failed to get cached countries:", error);
      return [];
    }

    return (data || []).map((item) => ({
      key: item.id,
      name: item.name,
      type: "country" as const,
      countryCode: item.country_code,
      supportsCity: item.supports_city,
      supportsRegion: item.supports_region,
    }));
  }

  /**
   * Fetch countries from Meta API and cache them
   */
  private async fetchAndCacheCountries(
    accessToken: string,
    search?: string,
    limit: number = 100,
  ): Promise<MetaCountry[]> {
    try {
      const searchQuery = search || "";
      const url = `${this.META_API_URL}/search?type=adgeolocation&location_types=["country"]&q=${encodeURIComponent(searchQuery)}&limit=${limit}&access_token=${accessToken}`;

      const response = await fetch(url);
      if (!response.ok) {
        const errorData = await response.json();
        this.logger.error(
          "Failed to fetch countries from Meta API:",
          errorData,
        );
        return this.getDefaultCountries();
      }

      const data = await response.json();
      const countries: MetaCountry[] = (data.data || []).map((item: any) => ({
        key: item.key,
        name: item.name,
        type: "country" as const,
        countryCode: item.country_code,
        supportsCity: item.supports_city || false,
        supportsRegion: item.supports_region || false,
      }));

      // Cache the results
      await this.cacheCountries(countries);

      return countries;
    } catch (error) {
      this.logger.error("Error fetching countries:", error);
      return this.getDefaultCountries();
    }
  }

  /**
   * Cache countries in database
   */
  private async cacheCountries(countries: MetaCountry[]): Promise<void> {
    if (countries.length === 0) return;

    const records = countries.map((country) => ({
      id: country.key,
      name: country.name,
      type: "country",
      country_code: country.countryCode,
      supports_city: country.supportsCity,
      supports_region: country.supportsRegion,
      cached_at: new Date().toISOString(),
    }));

    const { error } = await this.supabase
      .from("meta_geo_targets")
      .upsert(records, { onConflict: "id" });

    if (error) {
      this.logger.warn("Failed to cache countries:", error);
    }
  }

  /**
   * Get default countries (fallback when API fails)
   */
  private getDefaultCountries(): MetaCountry[] {
    return [
      {
        key: "BR",
        name: "Brazil",
        type: "country",
        countryCode: "BR",
        supportsCity: true,
        supportsRegion: true,
      },
      {
        key: "US",
        name: "United States",
        type: "country",
        countryCode: "US",
        supportsCity: true,
        supportsRegion: true,
      },
      {
        key: "PT",
        name: "Portugal",
        type: "country",
        countryCode: "PT",
        supportsCity: true,
        supportsRegion: true,
      },
      {
        key: "ES",
        name: "Spain",
        type: "country",
        countryCode: "ES",
        supportsCity: true,
        supportsRegion: true,
      },
      {
        key: "MX",
        name: "Mexico",
        type: "country",
        countryCode: "MX",
        supportsCity: true,
        supportsRegion: true,
      },
      {
        key: "AR",
        name: "Argentina",
        type: "country",
        countryCode: "AR",
        supportsCity: true,
        supportsRegion: true,
      },
      {
        key: "CO",
        name: "Colombia",
        type: "country",
        countryCode: "CO",
        supportsCity: true,
        supportsRegion: true,
      },
      {
        key: "CL",
        name: "Chile",
        type: "country",
        countryCode: "CL",
        supportsCity: true,
        supportsRegion: true,
      },
      {
        key: "GB",
        name: "United Kingdom",
        type: "country",
        countryCode: "GB",
        supportsCity: true,
        supportsRegion: true,
      },
      {
        key: "FR",
        name: "France",
        type: "country",
        countryCode: "FR",
        supportsCity: true,
        supportsRegion: true,
      },
      {
        key: "DE",
        name: "Germany",
        type: "country",
        countryCode: "DE",
        supportsCity: true,
        supportsRegion: true,
      },
      {
        key: "IT",
        name: "Italy",
        type: "country",
        countryCode: "IT",
        supportsCity: true,
        supportsRegion: true,
      },
    ];
  }

  // ============================================
  // Languages
  // ============================================

  /**
   * Get languages for targeting
   * First tries cache, then fetches from Meta API
   */
  async getLanguages(
    accessToken: string,
    search?: string,
    limit: number = 100,
  ): Promise<MetaLanguage[]> {
    // Try cache first
    const cached = await this.getCachedLanguages(search, limit);
    if (cached.length > 0) {
      return cached;
    }

    // Fetch from Meta API
    return this.fetchAndCacheLanguages(accessToken, search, limit);
  }

  /**
   * Get cached languages from database
   */
  private async getCachedLanguages(
    search?: string,
    limit: number = 100,
  ): Promise<MetaLanguage[]> {
    const cacheExpiry = new Date();
    cacheExpiry.setHours(cacheExpiry.getHours() - this.CACHE_EXPIRY_HOURS);

    let query = this.supabase
      .from("meta_languages")
      .select("*")
      .gt("cached_at", cacheExpiry.toISOString())
      .order("name", { ascending: true })
      .limit(limit);

    if (search) {
      query = query.ilike("name", `%${search}%`);
    }

    const { data, error } = await query;

    if (error) {
      this.logger.warn("Failed to get cached languages:", error);
      return [];
    }

    return (data || []).map((item) => ({
      key: item.key,
      name: item.name,
    }));
  }

  /**
   * Fetch languages from Meta API and cache them
   */
  private async fetchAndCacheLanguages(
    accessToken: string,
    search?: string,
    limit: number = 100,
  ): Promise<MetaLanguage[]> {
    try {
      const searchQuery = search || "";
      const url = `${this.META_API_URL}/search?type=adlocale&q=${encodeURIComponent(searchQuery)}&limit=${limit}&access_token=${accessToken}`;

      const response = await fetch(url);
      if (!response.ok) {
        const errorData = await response.json();
        this.logger.error(
          "Failed to fetch languages from Meta API:",
          errorData,
        );
        return this.getDefaultLanguages();
      }

      const data = await response.json();
      const languages: MetaLanguage[] = (data.data || []).map((item: any) => ({
        key: String(item.key),
        name: item.name,
      }));

      // Cache the results
      await this.cacheLanguages(languages);

      return languages;
    } catch (error) {
      this.logger.error("Error fetching languages:", error);
      return this.getDefaultLanguages();
    }
  }

  /**
   * Cache languages in database
   */
  private async cacheLanguages(languages: MetaLanguage[]): Promise<void> {
    if (languages.length === 0) return;

    const records = languages.map((lang) => ({
      key: lang.key,
      name: lang.name,
      cached_at: new Date().toISOString(),
    }));

    const { error } = await this.supabase
      .from("meta_languages")
      .upsert(records, { onConflict: "key" });

    if (error) {
      this.logger.warn("Failed to cache languages:", error);
    }
  }

  /**
   * Get default languages (fallback when API fails)
   */
  private getDefaultLanguages(): MetaLanguage[] {
    return [
      { key: "6", name: "Portuguese" },
      { key: "24", name: "English (US)" },
      { key: "25", name: "English (UK)" },
      { key: "7", name: "Spanish" },
      { key: "10", name: "French" },
      { key: "4", name: "German" },
      { key: "16", name: "Italian" },
      { key: "18", name: "Japanese" },
      { key: "20", name: "Korean" },
      { key: "1", name: "Chinese (Simplified)" },
      { key: "28", name: "Dutch" },
      { key: "33", name: "Russian" },
    ];
  }

  /**
   * Get user's access token for Meta API calls
   */
  async getUserAccessToken(userId: string): Promise<string | null> {
    const { data, error } = await this.supabase
      .from("connections")
      .select("access_token")
      .eq("user_id", userId)
      .eq("plataform_name", "meta")
      .eq("is_active", true)
      .is("deleted_at", null)
      .limit(1)
      .single();

    if (error || !data) {
      return null;
    }

    return data.access_token;
  }
}
