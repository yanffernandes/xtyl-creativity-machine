import {
  Controller,
  Post,
  Body,
  Req,
  UseGuards,
  Logger,
  BadRequestException,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { Request } from "express";
import { RevenueService } from "./revenue.service";
import {
  RevenueReportRequestDto,
  RevenueExpandRequestDto,
  ActiveNetworksRequestDto,
} from "./dto/revenue-report.dto";

interface AuthenticatedRequest extends Request {
  user: {
    sub: string;
    email: string;
    role: string;
  };
}

@Controller("revenue")
export class RevenueController {
  private readonly logger = new Logger(RevenueController.name);

  constructor(private readonly revenueService: RevenueService) {}

  /**
   * Get active Ad Manager networks for multiple connections (batch)
   * POST /revenue/networks/active
   *
   * Centralized endpoint for revenue dashboard - avoids N+1 queries
   * when fetching networks for multiple Ad Manager connections.
   */
  @Post("networks/active")
  @UseGuards(AuthGuard("jwt"))
  async getActiveNetworks(
    @Body() dto: ActiveNetworksRequestDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const userId = req.user.sub;

    if (!dto.connectionIds?.length) {
      return { success: true, networks: [] };
    }

    const startTime = Date.now();
    this.logger.log(
      `[HTTP] POST /revenue/networks/active | Connections: ${dto.connectionIds.length}`,
    );

    try {
      const result = await this.revenueService.getActiveNetworks(
        dto.connectionIds,
        userId,
      );
      const totalTime = Date.now() - startTime;
      this.logger.log(
        `[HTTP] POST /revenue/networks/active COMPLETED | ${totalTime}ms | Networks: ${result.networks.length}`,
      );
      return result;
    } catch (error: any) {
      const totalTime = Date.now() - startTime;
      this.logger.error(
        `[HTTP] POST /revenue/networks/active FAILED | ${totalTime}ms | Error: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Get unified revenue report from multiple sources
   * POST /revenue/report
   *
   * This endpoint:
   * - Accepts multiple sources (Ad Manager and/or AdSense)
   * - Uses optimized queries with minimal dimensions based on groupBy
   * - Fetches data in parallel from all sources
   * - Returns aggregated and normalized data
   *
   * Example request:
   * {
   *   "sources": [
   *     { "type": "ad_manager", "connectionId": "...", "networkId": "..." },
   *     { "type": "adsense", "connectionId": "...", "accountId": "..." }
   *   ],
   *   "startDate": "2025-12-29",
   *   "endDate": "2026-01-27",
   *   "groupBy": "domain"
   * }
   */
  @Post("report")
  @UseGuards(AuthGuard("jwt"))
  async getReport(
    @Body() dto: RevenueReportRequestDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const userId = req.user.sub;

    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(dto.startDate) || !dateRegex.test(dto.endDate)) {
      throw new BadRequestException("Invalid date format. Expected YYYY-MM-DD");
    }

    // Validate date range
    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      throw new BadRequestException("Invalid date values");
    }

    if (startDate > endDate) {
      throw new BadRequestException("startDate cannot be after endDate");
    }

    if (endDate > today) {
      throw new BadRequestException("endDate cannot be in the future");
    }

    // Validate sources
    if (!dto.sources || dto.sources.length === 0) {
      throw new BadRequestException("At least one source is required");
    }

    const startTime = Date.now();
    this.logger.log(
      `[HTTP] POST /revenue/report | Sources: ${dto.sources.length}, Date: ${dto.startDate} to ${dto.endDate}, GroupBy: ${dto.groupBy || "domain"}`,
    );

    try {
      const result = await this.revenueService.getReport(dto, userId);
      const totalTime = Date.now() - startTime;
      this.logger.log(
        `[HTTP] POST /revenue/report COMPLETED | ${totalTime}ms (${(totalTime / 1000).toFixed(1)}s) | Rows: ${result.rows.length}`,
      );
      return result;
    } catch (error: any) {
      const totalTime = Date.now() - startTime;
      this.logger.error(
        `[HTTP] POST /revenue/report FAILED | ${totalTime}ms | Error: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Expand a parent item with hierarchical sub-grouping
   * POST /revenue/expand
   *
   * This endpoint is called when a user expands a row in the table
   * to see sub-grouped data (e.g., domain -> dates, date -> URLs)
   *
   * Example request:
   * {
   *   "sources": [...],
   *   "startDate": "2025-12-29",
   *   "endDate": "2026-01-27",
   *   "primaryGroupBy": "domain",
   *   "subGroupBy": "date_week",
   *   "parentKey": "superxplace.com"
   * }
   */
  @Post("expand")
  @UseGuards(AuthGuard("jwt"))
  async expand(
    @Body() dto: RevenueExpandRequestDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const userId = req.user.sub;

    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(dto.startDate) || !dateRegex.test(dto.endDate)) {
      throw new BadRequestException("Invalid date format. Expected YYYY-MM-DD");
    }

    // Validate sources
    if (!dto.sources || dto.sources.length === 0) {
      throw new BadRequestException("At least one source is required");
    }

    // Validate parentKey
    if (!dto.parentKey) {
      throw new BadRequestException("parentKey is required for expand");
    }

    const startTime = Date.now();
    this.logger.log(
      `[HTTP] POST /revenue/expand | Primary: ${dto.primaryGroupBy}, Sub: ${dto.subGroupBy}, Parent: ${dto.parentKey}`,
    );

    try {
      const result = await this.revenueService.expand(dto, userId);
      const totalTime = Date.now() - startTime;
      this.logger.log(
        `[HTTP] POST /revenue/expand COMPLETED | ${totalTime}ms | Items: ${result.items.length}`,
      );
      return result;
    } catch (error: any) {
      const totalTime = Date.now() - startTime;
      this.logger.error(
        `[HTTP] POST /revenue/expand FAILED | ${totalTime}ms | Error: ${error.message}`,
      );
      throw error;
    }
  }
}
