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
import { GoogleDashboardService } from "../services/google-dashboard.service";
import {
  GetCampaignsQueryDto,
  DashboardPeriod,
  CampaignStatusFilter,
} from "../dto/campaign-metrics.dto";
import {
  UpdateBudgetDto,
  UpdateBidDto,
  CampaignActionDto,
} from "../dto/campaign-action.dto";
import { ActionLogFilters } from "../entities/action-log.entity";

@Controller("google/dashboard")
@UseGuards(JwtAuthGuard)
export class GoogleDashboardController {
  constructor(private readonly dashboardService: GoogleDashboardService) {}

  /**
   * GET /google/dashboard/campaigns
   * Get all campaigns with metrics for a connection or workspace
   * T019: Campaigns endpoint
   *
   * Supports two modes:
   * - connectionId: Fetch campaigns from a single connection
   * - workspaceId: Fetch campaigns from ALL Google connections in the workspace
   */
  @Get("campaigns")
  async getCampaigns(
    @Request() req: any,
    @Query() query: GetCampaignsQueryDto,
  ) {
    const userId = req.user.sub;

    // Map status filter
    let statusFilter: "ENABLED" | "PAUSED" | "all" | undefined;
    if (query.status === CampaignStatusFilter.ENABLED) {
      statusFilter = "ENABLED";
    } else if (query.status === CampaignStatusFilter.PAUSED) {
      statusFilter = "PAUSED";
    } else if (query.status === CampaignStatusFilter.ALL) {
      statusFilter = "all";
    }

    return this.dashboardService.getCampaigns(
      userId,
      query.connectionId,
      query.period || DashboardPeriod.LAST_7D,
      query.startDate,
      query.endDate,
      statusFilter,
      query.sortBy,
      query.sortOrder,
      query.forceRefresh,
      query.workspaceId,
    );
  }

  /**
   * GET /google/dashboard/campaigns/:campaignId/details
   * Get detailed information for a specific campaign
   * Includes budget, bidding strategy, network settings, metrics, and counts
   */
  @Get("campaigns/:campaignId/details")
  async getCampaignDetails(
    @Request() req: any,
    @Param("campaignId") campaignId: string,
    @Query("connectionId") connectionId: string,
    @Query("customerId") customerId?: string,
    @Query("loginCustomerId") loginCustomerId?: string,
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string,
  ) {
    const userId = req.user.sub;

    if (!connectionId) {
      return { success: false, error: "connectionId is required" };
    }

    return this.dashboardService.getCampaignDetails(
      userId,
      connectionId,
      campaignId,
      customerId,
      loginCustomerId,
      startDate,
      endDate,
    );
  }

  /**
   * GET /google/dashboard/campaigns/:campaignId/hierarchy
   * Get campaign hierarchy (ad groups with their ads)
   * Used for expandable rows in the performance table
   */
  @Get("campaigns/:campaignId/hierarchy")
  async getCampaignHierarchy(
    @Request() req: any,
    @Param("campaignId") campaignId: string,
    @Query("connectionId") connectionId: string,
    @Query("customerId") customerId?: string,
    @Query("loginCustomerId") loginCustomerId?: string,
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
      customerId,
      loginCustomerId,
      startDate,
      endDate,
    );
  }

  /**
   * POST /google/dashboard/campaigns/:campaignId/pause
   * Pause a campaign
   * T034: Pause endpoint
   */
  @Post("campaigns/:campaignId/pause")
  async pauseCampaign(
    @Request() req: any,
    @Param("campaignId") campaignId: string,
    @Body() body: CampaignActionDto,
  ) {
    const userId = req.user.sub;

    return this.dashboardService.pauseCampaign(
      userId,
      body.connectionId,
      campaignId,
    );
  }

  /**
   * POST /google/dashboard/campaigns/:campaignId/enable
   * Enable a campaign
   * T035: Enable endpoint
   */
  @Post("campaigns/:campaignId/enable")
  async enableCampaign(
    @Request() req: any,
    @Param("campaignId") campaignId: string,
    @Body() body: CampaignActionDto,
  ) {
    const userId = req.user.sub;

    return this.dashboardService.enableCampaign(
      userId,
      body.connectionId,
      campaignId,
    );
  }

  /**
   * PATCH /google/dashboard/campaigns/:campaignId/budget
   * Update campaign budget
   * T036: Budget endpoint
   */
  @Patch("campaigns/:campaignId/budget")
  async updateBudget(
    @Request() req: any,
    @Param("campaignId") campaignId: string,
    @Body() body: UpdateBudgetDto & { budgetId: string },
  ) {
    const userId = req.user.sub;

    console.log(
      "[Controller] updateBudget - received body:",
      JSON.stringify(body, null, 2),
    );

    return this.dashboardService.updateBudget(
      userId,
      body.connectionId,
      campaignId,
      body.budgetId,
      body.newBudget,
      body.customerId,
      body.loginCustomerId,
    );
  }

  /**
   * PATCH /google/dashboard/campaigns/:campaignId/bid
   * Update campaign CPC bid (updates all ad groups)
   */
  @Patch("campaigns/:campaignId/bid")
  async updateBid(
    @Request() req: any,
    @Param("campaignId") campaignId: string,
    @Body() body: UpdateBidDto,
  ) {
    const userId = req.user.sub;

    return this.dashboardService.updateBid(
      userId,
      body.connectionId,
      campaignId,
      body.newBid,
      body.customerId,
      body.loginCustomerId,
    );
  }

  /**
   * GET /google/dashboard/history/actions
   * Get action history with filters and pagination
   * T070: History actions endpoint
   */
  @Get("history/actions")
  async getActionHistory(
    @Request() req: any,
    @Query("connectionId") connectionId?: string,
    @Query("source") source?: "manual" | "automation" | "all",
    @Query("campaignId") campaignId?: string,
    @Query("actionType") actionType?: string,
    @Query("status") status?: string,
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ) {
    const userId = req.user.sub;

    const filters: ActionLogFilters = {
      connection_id: connectionId,
      source: source as any,
      google_campaign_id: campaignId,
      action_type: actionType as any,
      status: status as any,
      start_date: startDate,
      end_date: endDate,
    };

    return this.dashboardService.getActionHistory(
      userId,
      filters,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
    );
  }

  /**
   * GET /google/dashboard/history/actions/:actionId
   * Get a single action log by ID
   * T071: Action detail endpoint
   */
  @Get("history/actions/:actionId")
  async getActionDetail(
    @Request() req: any,
    @Param("actionId") actionId: string,
  ) {
    const userId = req.user.sub;

    // For now, just fetch from history with specific action
    // In a real implementation, would have a dedicated method
    const result = await this.dashboardService.getActionHistory(
      userId,
      {},
      1,
      1000,
    );
    const action = result.actions.find((a) => a.id === actionId);

    if (!action) {
      return { success: false, error: "Action not found" };
    }

    return { success: true, action };
  }

  /**
   * GET /google/dashboard/history/stats
   * Get action statistics for a connection
   * T072: Stats endpoint
   */
  @Get("history/stats")
  async getActionStats(
    @Request() req: any,
    @Query("connectionId") connectionId: string,
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string,
  ) {
    const userId = req.user.sub;

    return this.dashboardService.getActionStats(
      userId,
      connectionId,
      startDate,
      endDate,
    );
  }

  /**
   * POST /google/dashboard/adgroups/:adGroupId/pause
   * Pause an ad group
   */
  @Post("adgroups/:adGroupId/pause")
  async pauseAdGroup(
    @Request() req: any,
    @Param("adGroupId") adGroupId: string,
    @Body() body: CampaignActionDto,
  ) {
    const userId = req.user.sub;

    return this.dashboardService.pauseAdGroup(
      userId,
      body.connectionId,
      adGroupId,
    );
  }

  /**
   * POST /google/dashboard/adgroups/:adGroupId/enable
   * Enable an ad group
   */
  @Post("adgroups/:adGroupId/enable")
  async enableAdGroup(
    @Request() req: any,
    @Param("adGroupId") adGroupId: string,
    @Body() body: CampaignActionDto,
  ) {
    const userId = req.user.sub;

    return this.dashboardService.enableAdGroup(
      userId,
      body.connectionId,
      adGroupId,
    );
  }

  /**
   * POST /google/dashboard/ads/:adId/pause
   * Pause an ad
   */
  @Post("ads/:adId/pause")
  async pauseAd(
    @Request() req: any,
    @Param("adId") adId: string,
    @Body() body: CampaignActionDto,
  ) {
    const userId = req.user.sub;

    return this.dashboardService.pauseAd(userId, body.connectionId, adId);
  }

  /**
   * POST /google/dashboard/ads/:adId/enable
   * Enable an ad
   */
  @Post("ads/:adId/enable")
  async enableAd(
    @Request() req: any,
    @Param("adId") adId: string,
    @Body() body: CampaignActionDto,
  ) {
    const userId = req.user.sub;

    return this.dashboardService.enableAd(userId, body.connectionId, adId);
  }
}
