import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  InternalServerErrorException,
} from "@nestjs/common";
import { SupabaseClient } from "@supabase/supabase-js";
import { SupabaseService } from "../../common/supabase/supabase.service";

interface RunMetricsResponse {
  total_attempts: number;
  successful: number;
  failed: number;
  pending: number;
  error_breakdown: Record<string, number>;
}

export interface MessageRun {
  id: number;
  user_id: string;
  flow_id: string;
  status: string;
  total_messages: number;
  success_count: number;
  failure_count: number;
  messages_in_queue: number;
  metrics_updated_at: string | null;
  error_summary: Record<string, unknown> | null;
  flow?: {
    project_id: number;
    projects?: {
      user_id: string;
      workspace_id: string | null;
    };
  };
}

@Injectable()
export class RunsService {
  private readonly logger = new Logger(RunsService.name);
  private readonly STATS_API_BASE = "https://message.s3.alvobot.com/stats/run";

  constructor(private supabaseService: SupabaseService) {}

  private get supabase(): SupabaseClient {
    return this.supabaseService.getServiceRoleClient();
  }

  /**
   * Verify that the user owns the run (through flow -> project ownership)
   */
  async verifyRunOwnership(runId: number, userId: string): Promise<MessageRun> {
    const { data: run, error } = await this.supabase
      .from("message_runs")
      .select(
        `
        *,
        flow:message_flows!inner(
          project_id,
          projects!inner(user_id, workspace_id)
        )
      `,
      )
      .eq("id", runId)
      .single();

    if (error || !run) {
      this.logger.warn(`Run ${runId} not found`);
      throw new NotFoundException("Run not found");
    }

    // Check access: run creator, project owner, or workspace member
    const isRunCreator = run.user_id === userId;
    const isProjectOwner = run.flow?.projects?.user_id === userId;

    if (isRunCreator || isProjectOwner) {
      return run as MessageRun;
    }

    // Check workspace membership
    const workspaceId = run.flow?.projects?.workspace_id;
    if (workspaceId) {
      const { data: membership } = await this.supabase
        .from("workspace_members")
        .select("id")
        .eq("workspace_id", workspaceId)
        .eq("user_id", userId)
        .eq("status", "active")
        .maybeSingle();

      if (membership) {
        return run as MessageRun;
      }
    }

    this.logger.warn(
      `User ${userId} attempted to access run ${runId} without permission`,
    );
    throw new ForbiddenException("You do not have access to this run");
  }

  /**
   * Fetch metrics from external stats API
   */
  async fetchExternalMetrics(runId: number): Promise<RunMetricsResponse> {
    const url = `${this.STATS_API_BASE}/${runId}`;

    this.logger.log(`Fetching metrics from ${url}`);

    try {
      const response = await fetch(url, {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(`Stats API error: ${response.status} - ${errorText}`);
        throw new InternalServerErrorException(
          `Failed to fetch metrics: ${response.status}`,
        );
      }

      const data = await response.json();
      this.logger.log(
        `Metrics received for run ${runId}: ${JSON.stringify(data)}`,
      );

      // API returns data directly at root level (not nested in 'data')
      return {
        total_attempts: data.total_attempts ?? 0,
        successful: data.successful ?? 0,
        failed: data.failed ?? 0,
        pending: data.pending ?? 0,
        error_breakdown: data.error_breakdown ?? {},
      };
    } catch (error) {
      if (error instanceof InternalServerErrorException) {
        throw error;
      }
      this.logger.error(`Failed to fetch metrics for run ${runId}:`, error);
      throw new InternalServerErrorException(
        "Failed to fetch metrics from stats service",
      );
    }
  }

  /**
   * Update run metrics in database
   */
  async updateRunMetrics(
    runId: number,
    userId: string,
  ): Promise<{
    success: boolean;
    run: MessageRun;
    metricsUpdated: boolean;
  }> {
    // Verify ownership first
    const run = await this.verifyRunOwnership(runId, userId);

    // Fetch metrics from external API
    const metrics = await this.fetchExternalMetrics(runId);

    // Only update if external metrics have more data than current
    // (same logic as legacy: don't overwrite with lower values)
    const shouldUpdate = metrics.total_attempts >= (run.total_messages || 0);

    if (!shouldUpdate) {
      this.logger.log(
        `Skipping update for run ${runId}: external metrics (${metrics.total_attempts}) < current (${run.total_messages})`,
      );
      return {
        success: true,
        run,
        metricsUpdated: false,
      };
    }

    // Update the run with new metrics
    const { data: updatedRun, error } = await this.supabase
      .from("message_runs")
      .update({
        total_messages: metrics.total_attempts,
        success_count: metrics.successful,
        failure_count: metrics.failed,
        messages_in_queue: metrics.pending,
        error_summary: metrics.error_breakdown,
        metrics_updated_at: new Date().toISOString(),
      })
      .eq("id", runId)
      .select()
      .single();

    if (error) {
      this.logger.error(`Failed to update run ${runId}:`, error);
      throw new InternalServerErrorException("Failed to update run metrics");
    }

    this.logger.log(
      `Updated metrics for run ${runId}: success=${metrics.successful}, failed=${metrics.failed}`,
    );

    return {
      success: true,
      run: updatedRun as MessageRun,
      metricsUpdated: true,
    };
  }

  /**
   * Batch update metrics for multiple runs
   */
  async updateMultipleRunMetrics(
    runIds: number[],
    userId: string,
  ): Promise<{
    success: boolean;
    updated: number[];
    skipped: number[];
    failed: number[];
  }> {
    const updated: number[] = [];
    const skipped: number[] = [];
    const failed: number[] = [];

    for (const runId of runIds) {
      try {
        const result = await this.updateRunMetrics(runId, userId);
        if (result.metricsUpdated) {
          updated.push(runId);
        } else {
          skipped.push(runId);
        }
      } catch (error) {
        this.logger.warn(`Failed to update run ${runId}:`, error);
        failed.push(runId);
      }
    }

    return {
      success: failed.length === 0,
      updated,
      skipped,
      failed,
    };
  }
}
