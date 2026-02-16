/**
 * Ads Controller
 * REST endpoints for the unified ads search API
 */

import {
  Controller,
  Post,
  Patch,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import {
  IsString,
  IsNumber,
  IsIn,
  IsOptional,
} from "class-validator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { AdsService } from "./ads.service";
import { AdsSearchRequestDto } from "./dto/ads-search.dto";
import { AdsExpandRequestDto } from "./dto/ads-expand.dto";
import {
  AdsSearchResponse,
  AdsExpandResponse,
  AdsActionResponse,
} from "./types/unified-ad-object";

// ============================================
// Action DTOs
// ============================================

class AdsActionRequestDto {
  @IsIn(["google", "meta"])
  platform: "google" | "meta";

  @IsIn(["campaign", "adset", "ad"])
  level: "campaign" | "adset" | "ad";

  @IsString()
  objectId: string;

  @IsString()
  connectionId: string;

  @IsOptional()
  @IsString()
  customerId?: string;

  @IsOptional()
  @IsString()
  loginCustomerId?: string;

  @IsOptional()
  @IsString()
  adAccountId?: string;

  @IsOptional()
  @IsString()
  name?: string;
}

class AdsBudgetUpdateDto {
  @IsIn(["google", "meta"])
  platform: "google" | "meta";

  @IsString()
  campaignId: string;

  @IsNumber()
  newBudget: number;

  @IsString()
  connectionId: string;

  @IsOptional()
  @IsString()
  budgetId?: string;

  @IsOptional()
  @IsString()
  customerId?: string;

  @IsOptional()
  @IsString()
  loginCustomerId?: string;

  @IsOptional()
  @IsString()
  adAccountId?: string;
}

// ============================================
// Controller
// ============================================

@Controller("ads")
@UseGuards(JwtAuthGuard)
export class AdsController {
  constructor(private readonly adsService: AdsService) {}

  /**
   * POST /ads/search
   * Unified search across Google and Meta ad platforms
   */
  @Post("search")
  @HttpCode(HttpStatus.OK)
  async search(
    @Body() dto: AdsSearchRequestDto,
    @Request() req: any,
  ): Promise<AdsSearchResponse> {
    const userId = req.user.sub || req.user.id;
    return this.adsService.search(dto, userId);
  }

  /**
   * POST /ads/expand
   * Drill-down into a parent object (campaign -> adsets, adset -> ads)
   */
  @Post("expand")
  @HttpCode(HttpStatus.OK)
  async expand(
    @Body() dto: AdsExpandRequestDto,
    @Request() req: any,
  ): Promise<AdsExpandResponse> {
    const userId = req.user.sub || req.user.id;
    return this.adsService.expand(dto, userId);
  }

  /**
   * POST /ads/actions/pause
   * Pause a campaign, adset, or ad
   */
  @Post("actions/pause")
  @HttpCode(HttpStatus.OK)
  async pause(
    @Body() dto: AdsActionRequestDto,
    @Request() req: any,
  ): Promise<AdsActionResponse> {
    const userId = req.user.sub || req.user.id;
    return this.adsService.pause(
      dto.platform,
      dto.level,
      dto.objectId,
      dto.connectionId,
      userId,
      dto.customerId,
      dto.loginCustomerId,
      dto.adAccountId,
      dto.name,
    );
  }

  /**
   * POST /ads/actions/enable
   * Enable a campaign, adset, or ad
   */
  @Post("actions/enable")
  @HttpCode(HttpStatus.OK)
  async enable(
    @Body() dto: AdsActionRequestDto,
    @Request() req: any,
  ): Promise<AdsActionResponse> {
    const userId = req.user.sub || req.user.id;
    return this.adsService.enable(
      dto.platform,
      dto.level,
      dto.objectId,
      dto.connectionId,
      userId,
      dto.customerId,
      dto.loginCustomerId,
      dto.adAccountId,
      dto.name,
    );
  }

  /**
   * PATCH /ads/actions/budget
   * Update campaign budget
   */
  @Patch("actions/budget")
  async updateBudget(
    @Body() dto: AdsBudgetUpdateDto,
    @Request() req: any,
  ): Promise<AdsActionResponse> {
    const userId = req.user.sub || req.user.id;
    return this.adsService.updateBudget(
      dto.platform,
      dto.campaignId,
      dto.newBudget,
      dto.connectionId,
      userId,
      dto.budgetId,
      dto.customerId,
      dto.loginCustomerId,
      dto.adAccountId,
    );
  }
}
