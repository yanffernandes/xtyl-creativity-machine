import { Controller, Get, Query, Req, UseGuards, Logger } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { Request } from "express";
import { TargetingService } from "./services/targeting.service";

interface AuthenticatedRequest extends Request {
  user: {
    sub: string;
    email: string;
    role: string;
  };
}

@Controller("meta/targeting")
@UseGuards(AuthGuard("jwt"))
export class TargetingController {
  private readonly logger = new Logger(TargetingController.name);

  constructor(private readonly targetingService: TargetingService) {}

  /**
   * Get countries for targeting
   * GET /meta/targeting/countries
   */
  @Get("countries")
  async getCountries(
    @Req() req: AuthenticatedRequest,
    @Query("search") search?: string,
    @Query("limit") limit?: string,
  ) {
    const userId = req.user.sub;
    this.logger.log(
      `Fetching countries for user ${userId}, search: ${search || "none"}`,
    );

    // Get user's access token
    const accessToken = await this.targetingService.getUserAccessToken(userId);

    if (!accessToken) {
      // Return default countries if no connection exists
      return {
        success: true,
        countries: this.getDefaultCountriesResponse(),
      };
    }

    const countries = await this.targetingService.getCountries(
      accessToken,
      search,
      limit ? parseInt(limit, 10) : 100,
    );

    return {
      success: true,
      countries: countries.map((c) => ({
        key: c.key,
        name: c.name,
        countryCode: c.countryCode,
        supportsCity: c.supportsCity,
        supportsRegion: c.supportsRegion,
      })),
    };
  }

  /**
   * Get languages for targeting
   * GET /meta/targeting/languages
   */
  @Get("languages")
  async getLanguages(
    @Req() req: AuthenticatedRequest,
    @Query("search") search?: string,
    @Query("limit") limit?: string,
  ) {
    const userId = req.user.sub;
    this.logger.log(
      `Fetching languages for user ${userId}, search: ${search || "none"}`,
    );

    // Get user's access token
    const accessToken = await this.targetingService.getUserAccessToken(userId);

    if (!accessToken) {
      // Return default languages if no connection exists
      return {
        success: true,
        languages: this.getDefaultLanguagesResponse(),
      };
    }

    const languages = await this.targetingService.getLanguages(
      accessToken,
      search,
      limit ? parseInt(limit, 10) : 100,
    );

    return {
      success: true,
      languages: languages.map((l) => ({
        key: l.key,
        name: l.name,
      })),
    };
  }

  /**
   * Default countries when no connection exists
   */
  private getDefaultCountriesResponse() {
    return [
      {
        key: "BR",
        name: "Brazil",
        countryCode: "BR",
        supportsCity: true,
        supportsRegion: true,
      },
      {
        key: "US",
        name: "United States",
        countryCode: "US",
        supportsCity: true,
        supportsRegion: true,
      },
      {
        key: "PT",
        name: "Portugal",
        countryCode: "PT",
        supportsCity: true,
        supportsRegion: true,
      },
      {
        key: "ES",
        name: "Spain",
        countryCode: "ES",
        supportsCity: true,
        supportsRegion: true,
      },
      {
        key: "MX",
        name: "Mexico",
        countryCode: "MX",
        supportsCity: true,
        supportsRegion: true,
      },
      {
        key: "AR",
        name: "Argentina",
        countryCode: "AR",
        supportsCity: true,
        supportsRegion: true,
      },
      {
        key: "CO",
        name: "Colombia",
        countryCode: "CO",
        supportsCity: true,
        supportsRegion: true,
      },
      {
        key: "CL",
        name: "Chile",
        countryCode: "CL",
        supportsCity: true,
        supportsRegion: true,
      },
      {
        key: "GB",
        name: "United Kingdom",
        countryCode: "GB",
        supportsCity: true,
        supportsRegion: true,
      },
      {
        key: "FR",
        name: "France",
        countryCode: "FR",
        supportsCity: true,
        supportsRegion: true,
      },
      {
        key: "DE",
        name: "Germany",
        countryCode: "DE",
        supportsCity: true,
        supportsRegion: true,
      },
      {
        key: "IT",
        name: "Italy",
        countryCode: "IT",
        supportsCity: true,
        supportsRegion: true,
      },
    ];
  }

  /**
   * Default languages when no connection exists
   */
  private getDefaultLanguagesResponse() {
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
}
