import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from "@nestjs/common";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import {
  BulkOperationService,
  CreateBulkLocationJobDto,
  CreateBulkProductJobDto,
} from "./services/bulk-operation.service";
import {
  BulkOperationType,
  BulkOperationStatus,
} from "./entities/bulk-operation-job.entity";
import { BulkItemStatus } from "./entities/bulk-operation-item.entity";

// DTOs for estimate endpoint
interface EstimateCreditsDto {
  type: BulkOperationType;
  itemCount: number;
  options?: {
    hasExtensions?: boolean;
    aiSettings?: {
      generateKeywords?: boolean;
      generateHeadlines?: boolean;
      generateDescriptions?: boolean;
    };
  };
}

@Controller("google/bulk")
@UseGuards(JwtAuthGuard)
export class GoogleBulkController {
  constructor(private readonly bulkOperationService: BulkOperationService) {}

  /**
   * Get user's Google connections for selection
   */
  @Get("connections")
  async getConnections(@Request() req: any) {
    const userId = req.user.sub;
    const connections =
      await this.bulkOperationService.getUserGoogleConnections(userId);

    return {
      success: true,
      data: connections.map((c) => ({
        id: c.id,
        name: c.connection_name,
        email: c.metadata.user_email,
        customerId: c.metadata.customer_id,
        customerName: c.metadata.customer_name,
        isActive: c.is_active,
        lastUsedAt: c.last_used_at,
      })),
    };
  }

  /**
   * Get user's credit balance
   */
  @Get("credits")
  async getCredits(@Request() req: any) {
    const userId = req.user.sub;
    const balance =
      await this.bulkOperationService.getUserCreditsBalance(userId);

    return {
      success: true,
      data: balance,
    };
  }

  /**
   * Estimate credits for a bulk operation
   */
  @Post("credits/estimate")
  async estimateCredits(@Body() dto: EstimateCreditsDto) {
    const estimate = this.bulkOperationService.estimateCredits(
      dto.type,
      dto.itemCount,
      dto.options,
    );

    return {
      success: true,
      data: estimate,
    };
  }

  /**
   * Get available geo targets (countries)
   */
  @Get("geo-targets")
  async getGeoTargets(@Query("search") search?: string) {
    const targets = await this.bulkOperationService.getGeoTargets(search);

    return {
      success: true,
      data: targets,
    };
  }

  /**
   * Get available languages for Google Ads targeting
   */
  @Get("languages")
  async getLanguages(@Query("search") search?: string) {
    const languages =
      await this.bulkOperationService.getAvailableLanguages(search);

    return {
      success: true,
      data: languages,
    };
  }

  /**
   * Get campaign templates
   */
  @Get("templates")
  async getTemplates(@Request() req: any) {
    const userId = req.user.sub;
    const templates =
      await this.bulkOperationService.getCampaignTemplates(userId);

    return {
      success: true,
      data: templates,
    };
  }

  /**
   * Create a bulk location job
   */
  @Post("jobs/location")
  async createBulkLocationJob(
    @Request() req: any,
    @Body() dto: CreateBulkLocationJobDto,
  ) {
    const userId = req.user.sub;
    const job = await this.bulkOperationService.createBulkLocationJob(
      userId,
      dto,
    );

    return {
      success: true,
      message: "Bulk location job created successfully",
      data: job,
    };
  }

  /**
   * Create a bulk product job
   */
  @Post("jobs/product")
  async createBulkProductJob(
    @Request() req: any,
    @Body() dto: CreateBulkProductJobDto,
  ) {
    const userId = req.user.sub;
    const job = await this.bulkOperationService.createBulkProductJob(
      userId,
      dto,
    );

    return {
      success: true,
      message: "Bulk product job created successfully",
      data: job,
    };
  }

  /**
   * Get user's jobs
   */
  @Get("jobs")
  async getJobs(
    @Request() req: any,
    @Query("status") status?: BulkOperationStatus,
    @Query("type") type?: BulkOperationType,
    @Query("limit") limit?: string,
    @Query("offset") offset?: string,
  ) {
    const userId = req.user.sub;
    const result = await this.bulkOperationService.getUserJobs(userId, {
      status,
      type,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });

    return {
      success: true,
      data: result.jobs,
      meta: {
        total: result.total,
        limit: limit ? parseInt(limit, 10) : 20,
        offset: offset ? parseInt(offset, 10) : 0,
      },
    };
  }

  /**
   * Get a specific job
   */
  @Get("jobs/:jobId")
  async getJob(@Request() req: any, @Param("jobId") jobId: string) {
    const userId = req.user.sub;
    const job = await this.bulkOperationService.getJob(userId, jobId);

    return {
      success: true,
      data: job,
    };
  }

  /**
   * Get job progress
   */
  @Get("jobs/:jobId/progress")
  async getJobProgress(@Request() req: any, @Param("jobId") jobId: string) {
    const userId = req.user.sub;
    const progress = await this.bulkOperationService.getJobProgress(
      userId,
      jobId,
    );

    return {
      success: true,
      data: progress,
    };
  }

  /**
   * Get job items
   */
  @Get("jobs/:jobId/items")
  async getJobItems(
    @Request() req: any,
    @Param("jobId") jobId: string,
    @Query("status") status?: BulkItemStatus,
    @Query("limit") limit?: string,
    @Query("offset") offset?: string,
  ) {
    const userId = req.user.sub;
    const result = await this.bulkOperationService.getJobItems(userId, jobId, {
      status,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });

    return {
      success: true,
      data: result.items,
      meta: {
        total: result.total,
        limit: limit ? parseInt(limit, 10) : 50,
        offset: offset ? parseInt(offset, 10) : 0,
      },
    };
  }

  /**
   * Cancel a job
   */
  @Post("jobs/:jobId/cancel")
  async cancelJob(@Request() req: any, @Param("jobId") jobId: string) {
    const userId = req.user.sub;
    const job = await this.bulkOperationService.cancelJob(userId, jobId);

    return {
      success: true,
      message: "Job cancelled successfully",
      data: job,
    };
  }
}
