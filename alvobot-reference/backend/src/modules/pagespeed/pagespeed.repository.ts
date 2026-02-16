import { Injectable } from "@nestjs/common";
import { SupabaseService } from "../../common/supabase/supabase.service";
import type {
  PageSpeedHistoryRecord,
  PageSpeedQuotaRecord,
  ProjectWithDomain,
} from "./types/pagespeed-api.types";

@Injectable()
export class PageSpeedRepository {
  constructor(private readonly supabaseService: SupabaseService) {}

  private get client() {
    return this.supabaseService.getServiceRoleClient();
  }

  async insertHistory(
    payload: Omit<PageSpeedHistoryRecord, "id" | "created_at">,
  ): Promise<PageSpeedHistoryRecord> {
    const { data, error } = await this.client
      .from("pagespeed_history")
      .insert(payload)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getLatestByProject(
    projectId: number,
    strategy?: "mobile" | "desktop",
  ): Promise<PageSpeedHistoryRecord | null> {
    let query = this.client
      .from("pagespeed_history")
      .select("*")
      .eq("project_id", projectId)
      .order("checked_at", { ascending: false })
      .limit(1);

    if (strategy) {
      query = query.eq("strategy", strategy);
    }

    const { data } = await query.single();
    return data || null;
  }

  async getHistoryByProject(
    projectId: number,
    options: {
      strategy?: string;
      limit?: number;
      startDate?: string;
      endDate?: string;
    },
  ): Promise<PageSpeedHistoryRecord[]> {
    let query = this.client
      .from("pagespeed_history")
      .select("*")
      .eq("project_id", projectId)
      .order("checked_at", { ascending: false });

    if (options.strategy) {
      query = query.eq("strategy", options.strategy);
    }
    if (options.startDate) {
      query = query.gte("checked_at", options.startDate);
    }
    if (options.endDate) {
      query = query.lte("checked_at", options.endDate);
    }
    if (options.limit) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  async updateProjectScores(
    projectId: number,
    mobileScore: number | null,
    desktopScore: number | null,
  ): Promise<void> {
    const { error } = await this.client
      .from("projects")
      .update({
        pagespeed_mobile_score: mobileScore,
        pagespeed_desktop_score: desktopScore,
        pagespeed_last_check: new Date().toISOString(),
        pagespeed_check_error: null,
      })
      .eq("id", projectId);

    if (error) throw error;
  }

  async updateProjectError(
    projectId: number,
    errorMessage: string,
  ): Promise<void> {
    const { error } = await this.client
      .from("projects")
      .update({
        pagespeed_last_check: new Date().toISOString(),
        pagespeed_check_error: errorMessage,
      })
      .eq("id", projectId);

    if (error) throw error;
  }

  async listActiveProjects(limit = 100): Promise<ProjectWithDomain[]> {
    const { data, error } = await this.client
      .from("projects")
      .select("id, domain, workspace_id, pagespeed_last_check")
      .eq("status", true)
      .eq("is_deleted", false)
      .not("domain", "is", null)
      .order("pagespeed_last_check", { ascending: true, nullsFirst: true })
      .limit(limit);

    if (error) throw error;
    return data || [];
  }

  async getQuotaUsage(
    workspaceId: string,
    date: string,
  ): Promise<PageSpeedQuotaRecord | null> {
    const { data } = await this.client
      .from("pagespeed_quota_usage")
      .select("*")
      .eq("workspace_id", workspaceId)
      .eq("date", date)
      .single();

    return data || null;
  }

  async upsertQuotaUsage(
    workspaceId: string,
    date: string,
    count: number,
    limit: number,
  ): Promise<PageSpeedQuotaRecord> {
    const { data, error } = await this.client
      .from("pagespeed_quota_usage")
      .upsert(
        {
          workspace_id: workspaceId,
          date,
          requests_count: count,
          requests_limit: limit,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "workspace_id,date" },
      )
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Get the previous performance score for comparison (before the most recent check)
   */
  async getPreviousScore(
    projectId: number,
    strategy: "mobile" | "desktop",
  ): Promise<number | null> {
    // Get the second most recent check (skip the first one which is current)
    const { data } = await this.client
      .from("pagespeed_history")
      .select("performance_score")
      .eq("project_id", projectId)
      .eq("strategy", strategy)
      .not("performance_score", "is", null)
      .order("checked_at", { ascending: false })
      .range(1, 1) // Skip first (current), get second
      .single();

    return data?.performance_score ?? null;
  }

  /**
   * Get project with workspace owner info for notifications
   */
  async getProjectWithOwner(projectId: number): Promise<{
    id: number;
    name: string;
    domain: string;
    workspace_id: string;
    owner_user_id: string;
  } | null> {
    const { data, error } = await this.client
      .from("projects")
      .select(
        `
        id,
        name,
        domain,
        workspace_id,
        workspaces!inner(owner_user_id)
      `,
      )
      .eq("id", projectId)
      .single();

    if (error || !data) {
      return null;
    }

    return {
      id: data.id,
      name: data.name,
      domain: data.domain,
      workspace_id: data.workspace_id,
      // Supabase join returns object for single() query
      owner_user_id: (data.workspaces as unknown as { owner_user_id: string })
        ?.owner_user_id,
    };
  }
}
