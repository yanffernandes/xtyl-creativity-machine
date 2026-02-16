/**
 * Meta Dashboard Controller
 * T037: Controller for Meta dashboard operations
 *
 * Exposes endpoints for the unified ads dashboard to manage
 * Meta campaigns, metrics, and actions.
 */

import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Query,
  Body,
  UseGuards,
  Request,
} from "@nestjs/common";
import { JwtAuthGuard } from "../../../common/guards/jwt-auth.guard";
import { MetaDashboardService } from "../services/meta-dashboard.service";
import {
  GetMetaCampaignsQueryDto,
  MetaDashboardPeriod,
  MetaCampaignStatusFilter,
  MetaCampaignActionDto,
  MetaUpdateBudgetDto,
  MetaActionLogFilters,
} from "../dto/meta-campaign-metrics.dto";

@Controller("meta/dashboard")
@UseGuards(JwtAuthGuard)
export class MetaDashboardController {
  constructor(private readonly dashboardService: MetaDashboardService) {}

  /**
   * GET /meta/dashboard/campaigns
   * Get all Meta campaigns with metrics for a connection or workspace
   * T040: Campaigns endpoint
   */
  @Get("campaigns")
  async getCampaigns(
    @Request() req: any,
    @Query() query: GetMetaCampaignsQueryDto,
  ) {
    const userId = req.user.sub;

    // Map status filter
    let statusFilter: "ACTIVE" | "PAUSED" | "all" | undefined;
    if (query.status === MetaCampaignStatusFilter.ACTIVE) {
      statusFilter = "ACTIVE";
    } else if (query.status === MetaCampaignStatusFilter.PAUSED) {
      statusFilter = "PAUSED";
    } else if (query.status === MetaCampaignStatusFilter.ALL) {
      statusFilter = "all";
    }

    return this.dashboardService.getCampaigns(
      userId,
      query.connectionId,
      query.period || MetaDashboardPeriod.LAST_7D,
      query.startDate,
      query.endDate,
      statusFilter,
      query.sortBy || "spend",
      query.sortOrder || "desc",
      query.forceRefresh,
      query.workspaceId,
      query.page || 1,
      query.limit || 20,
    );
  }

  /**
   * POST /meta/dashboard/campaigns/:campaignId/pause
   * Pause a Meta campaign
   * T041: Pause endpoint
   */
  @Post("campaigns/:campaignId/pause")
  async pauseCampaign(
    @Request() req: any,
    @Param("campaignId") campaignId: string,
    @Body() body: MetaCampaignActionDto,
  ) {
    const userId = req.user.sub;

    return this.dashboardService.pauseCampaign(
      userId,
      body.connectionId,
      campaignId,
      body.adAccountId,
    );
  }

  /**
   * POST /meta/dashboard/campaigns/:campaignId/enable
   * Enable a Meta campaign
   * T042: Enable endpoint
   */
  @Post("campaigns/:campaignId/enable")
  async enableCampaign(
    @Request() req: any,
    @Param("campaignId") campaignId: string,
    @Body() body: MetaCampaignActionDto,
  ) {
    const userId = req.user.sub;

    return this.dashboardService.enableCampaign(
      userId,
      body.connectionId,
      campaignId,
      body.adAccountId,
    );
  }

  /**
   * PATCH /meta/dashboard/campaigns/:campaignId/budget
   * Update Meta campaign budget
   * T043: Budget endpoint
   */
  @Patch("campaigns/:campaignId/budget")
  async updateBudget(
    @Request() req: any,
    @Param("campaignId") campaignId: string,
    @Body() body: MetaUpdateBudgetDto,
  ) {
    const userId = req.user.sub;

    return this.dashboardService.updateBudget(
      userId,
      body.connectionId,
      campaignId,
      body.newBudget,
      body.adAccountId,
    );
  }

  /**
   * GET /meta/dashboard/campaigns/:campaignId/hierarchy
   * Get campaign ad sets (first level of expansion)
   * Returns only ad sets - ads are fetched separately via /adsets/:adSetId/ads
   */
  @Get("campaigns/:campaignId/hierarchy")
  async getCampaignHierarchy(
    @Request() req: any,
    @Param("campaignId") campaignId: string,
    @Query("connectionId") connectionId: string,
    @Query("adAccountId") adAccountId?: string,
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string,
  ) {
    const userId = req.user.sub;

    if (!connectionId) {
      return { success: false, error: "connectionId is required" };
    }

    return this.dashboardService.getCampaignHierarchy(
      userId,
      connectionId,
      campaignId,
      adAccountId,
      startDate,
      endDate,
    );
  }

  /**
   * GET /meta/dashboard/adsets/:adSetId/ads
   * Get ads for a specific ad set (second level of expansion)
   * Called when user expands an ad set row to see its ads
   */
  @Get("adsets/:adSetId/ads")
  async getAdSetAds(
    @Request() req: any,
    @Param("adSetId") adSetId: string,
    @Query("connectionId") connectionId: string,
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string,
  ) {
    const userId = req.user.sub;

    if (!connectionId) {
      return { success: false, error: "connectionId is required" };
    }

    return this.dashboardService.getAdSetAds(
      userId,
      connectionId,
      adSetId,
      startDate,
      endDate,
    );
  }

  /**
   * GET /meta/dashboard/accounts
   * Get all active Meta ad accounts for a user/workspace
   */
  @Get("accounts")
  async getAdAccounts(
    @Request() req: any,
    @Query("workspaceId") workspaceId?: string,
  ) {
    const userId = req.user.sub;
    return this.dashboardService.getAdAccounts(userId, workspaceId);
  }

  /**
   * GET /meta/dashboard/history/actions
   * Get action history for Meta campaigns
   * Supports workspaceId to show all logs from workspace connections
   */
  @Get("history/actions")
  async getActionHistory(
    @Request() req: any,
    @Query("connectionId") connectionId?: string,
    @Query("adAccountId") adAccountId?: string,
    @Query("source") source?: "manual" | "automation" | "all",
    @Query("campaignId") campaignId?: string,
    @Query("actionType") actionType?: string,
    @Query("status") status?: string,
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
    @Query("workspaceId") workspaceId?: string,
  ) {
    const userId = req.user.sub;

    const filters: MetaActionLogFilters = {
      connectionId,
      adAccountId,
      campaignId,
      source: source !== "all" ? source : undefined,
      actionType: actionType as any,
      status: status as any,
      startDate,
      endDate,
    };

    return this.dashboardService.getActionHistory(
      userId,
      filters,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
      workspaceId,
    );
  }

  /**
   * POST /meta/dashboard/adsets/:adSetId/pause
   * Pause an ad set
   */
  @Post("adsets/:adSetId/pause")
  async pauseAdSet(
    @Request() req: any,
    @Param("adSetId") adSetId: string,
    @Body() body: MetaCampaignActionDto,
  ) {
    const userId = req.user.sub;

    return this.dashboardService.pauseAdSet(
      userId,
      body.connectionId,
      adSetId,
      body.adAccountId,
    );
  }

  /**
   * POST /meta/dashboard/adsets/:adSetId/enable
   * Enable an ad set
   */
  @Post("adsets/:adSetId/enable")
  async enableAdSet(
    @Request() req: any,
    @Param("adSetId") adSetId: string,
    @Body() body: MetaCampaignActionDto,
  ) {
    const userId = req.user.sub;

    return this.dashboardService.enableAdSet(
      userId,
      body.connectionId,
      adSetId,
      body.adAccountId,
    );
  }

  /**
   * POST /meta/dashboard/ads/:adId/pause
   * Pause an ad
   */
  @Post("ads/:adId/pause")
  async pauseAd(
    @Request() req: any,
    @Param("adId") adId: string,
    @Body() body: MetaCampaignActionDto,
  ) {
    const userId = req.user.sub;

    return this.dashboardService.pauseAd(
      userId,
      body.connectionId,
      adId,
      body.adAccountId,
    );
  }

  /**
   * POST /meta/dashboard/ads/:adId/enable
   * Enable an ad
   */
  @Post("ads/:adId/enable")
  async enableAd(
    @Request() req: any,
    @Param("adId") adId: string,
    @Body() body: MetaCampaignActionDto,
  ) {
    const userId = req.user.sub;

    return this.dashboardService.enableAd(
      userId,
      body.connectionId,
      adId,
      body.adAccountId,
    );
  }

  /**
   * GET /meta/dashboard/ads/:adId/creative-details
   * Get full creative details for an ad (high-res images, video data, etc.)
   */
  @Get("ads/:adId/creative-details")
  async getAdCreativeDetails(
    @Request() req: any,
    @Param("adId") adId: string,
    @Query("connectionId") connectionId: string,
  ) {
    const userId = req.user.sub;

    return this.dashboardService.getAdCreativeDetails(
      userId,
      connectionId,
      adId,
    );
  }

  /**
   * POST /meta/dashboard/history/backfill-campaign-names
   * Backfill missing campaign names in action logs
   * Updates all records with NULL or "Unknown Campaign" by fetching from Meta API
   */
  @Post("history/backfill-campaign-names")
  async backfillCampaignNames(
    @Request() req: any,
    @Query("workspaceId") workspaceId?: string,
  ) {
    const userId = req.user.sub;

    return this.dashboardService.backfillCampaignNames(userId, workspaceId);
  }
}
