import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  UseGuards,
  Req,
  BadRequestException,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { Request } from "express";
import { PageSpeedService } from "./pagespeed.service";
import { PageSpeedQuota } from "./pagespeed.quota";

interface AuthenticatedRequest extends Request {
  user: {
    sub: string;
    email: string;
    role: string;
  };
}

@Controller("pagespeed")
@UseGuards(AuthGuard("jwt"))
export class PageSpeedController {
  constructor(
    private readonly service: PageSpeedService,
    private readonly quota: PageSpeedQuota,
  ) {}

  /**
   * Check PageSpeed for a specific URL without saving to project history.
   * Used for on-demand article speed tests.
   */
  @Post("check-url")
  async checkUrl(
    @Query("url") url: string,
    @Query("workspaceId") workspaceId: string,
  ) {
    if (!url) {
      throw new BadRequestException("url is required");
    }
    if (!workspaceId) {
      throw new BadRequestException("workspaceId is required");
    }

    return this.service.checkUrlOnly({
      url,
      workspaceId,
    });
  }

  @Post("check/:projectId")
  async checkPageSpeed(
    @Param("projectId") projectId: string,
    @Query("domain") domain: string,
    @Query("workspaceId") workspaceId: string,
    @Query("force") force?: string,
    @Req() _req?: AuthenticatedRequest,
  ) {
    if (!domain) {
      throw new BadRequestException("domain is required");
    }
    if (!workspaceId) {
      throw new BadRequestException("workspaceId is required");
    }

    return this.service.checkBothStrategies({
      projectId: Number(projectId),
      workspaceId,
      domain,
      forceCheck: force === "true",
    });
  }

  @Get("history/:projectId")
  async getHistory(
    @Param("projectId") projectId: string,
    @Query("strategy") strategy?: "mobile" | "desktop",
    @Query("limit") limit?: string,
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string,
  ) {
    return this.service.getHistory(Number(projectId), {
      strategy,
      limit: limit ? Number(limit) : undefined,
      startDate,
      endDate,
    });
  }

  @Get("latest/:projectId")
  async getLatest(
    @Param("projectId") projectId: string,
    @Query("strategy") strategy?: "mobile" | "desktop",
  ) {
    return this.service.getLatest(Number(projectId), strategy);
  }

  @Get("quota/:workspaceId")
  async getQuota(@Param("workspaceId") workspaceId: string) {
    const today = new Date().toISOString().slice(0, 10);
    const usage = await this.quota.getUsage(workspaceId, today);
    const remaining = await this.quota.getRemainingQuota(workspaceId, today);

    return {
      date: today,
      used: usage?.requests_count || 0,
      limit: usage?.requests_limit || 400,
      remaining,
    };
  }
}
