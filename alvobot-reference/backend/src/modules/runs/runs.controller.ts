import {
  Controller,
  Post,
  Param,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Req,
  BadRequestException,
  ParseIntPipe,
} from "@nestjs/common";
import { IsArray, ArrayNotEmpty, IsNumber } from "class-validator";
import { Type } from "class-transformer";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { RunsService } from "./runs.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";

// ============================================
// Inline DTOs (required for ValidationPipe whitelist)
// ============================================

class BatchUpdateRunMetricsDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsNumber({}, { each: true })
  @Type(() => Number)
  runIds: number[];
}

@ApiTags("Runs")
@Controller("runs")
export class RunsController {
  constructor(private readonly runsService: RunsService) {}

  @Post(":runId/metrics")
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Update run metrics",
    description:
      "Fetches the latest metrics for a run from the external stats API and updates the database.",
  })
  @ApiResponse({
    status: 200,
    description: "Metrics updated successfully",
    schema: {
      type: "object",
      properties: {
        success: { type: "boolean" },
        run: {
          type: "object",
          properties: {
            id: { type: "number" },
            total_messages: { type: "number" },
            success_count: { type: "number" },
            failure_count: { type: "number" },
            messages_in_queue: { type: "number" },
            metrics_updated_at: { type: "string", format: "date-time" },
          },
        },
        metricsUpdated: { type: "boolean" },
      },
    },
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({
    status: 403,
    description: "Forbidden - user does not own this run",
  })
  @ApiResponse({ status: 404, description: "Run not found" })
  @ApiResponse({
    status: 500,
    description: "Failed to fetch or update metrics",
  })
  async updateRunMetrics(
    @Param("runId", ParseIntPipe) runId: number,
    @Req() req: any,
  ) {
    const userId = req.user?.sub;
    if (!userId) {
      throw new BadRequestException("User ID not found in token");
    }

    return this.runsService.updateRunMetrics(runId, userId);
  }

  @Post("metrics/batch")
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Batch update run metrics",
    description:
      "Updates metrics for multiple runs at once. Useful for refreshing all visible runs.",
  })
  @ApiResponse({
    status: 200,
    description: "Batch update completed",
    schema: {
      type: "object",
      properties: {
        success: { type: "boolean" },
        updated: {
          type: "array",
          items: { type: "number" },
          description: "Run IDs that were successfully updated",
        },
        skipped: {
          type: "array",
          items: { type: "number" },
          description: "Run IDs that were skipped (no new data)",
        },
        failed: {
          type: "array",
          items: { type: "number" },
          description: "Run IDs that failed to update",
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  async batchUpdateRunMetrics(
    @Body() body: BatchUpdateRunMetricsDto,
    @Req() req: any,
  ) {
    const userId = req.user?.sub;
    if (!userId) {
      throw new BadRequestException("User ID not found in token");
    }

    if (
      !body.runIds ||
      !Array.isArray(body.runIds) ||
      body.runIds.length === 0
    ) {
      throw new BadRequestException("runIds must be a non-empty array");
    }

    // Limit batch size to prevent abuse
    if (body.runIds.length > 50) {
      throw new BadRequestException("Maximum 50 runs per batch");
    }

    return this.runsService.updateMultipleRunMetrics(body.runIds, userId);
  }
}
