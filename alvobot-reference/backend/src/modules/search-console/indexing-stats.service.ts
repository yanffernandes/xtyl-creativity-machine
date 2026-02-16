import { Injectable } from "@nestjs/common";
import { SupabaseService } from "../../common/supabase/supabase.service";

interface StatsFilters {
  projectId?: string;
  connectionId?: string;
}

@Injectable()
export class IndexingStatsService {
  constructor(private readonly supabaseService: SupabaseService) {}

  private get client() {
    return this.supabaseService.getServiceRoleClient();
  }

  async getCurrentStats(workspaceId: string, filters: StatsFilters = {}) {
    const total = await this.countStatus(workspaceId, filters);
    const indexed = await this.countStatus(workspaceId, filters, [
      "pass",
      "indexed",
    ]);
    const inProgress = await this.countStatus(workspaceId, filters, [
      "neutral",
      "pending",
    ]);
    const notIndexed = await this.countStatus(workspaceId, filters, [
      "fail",
      "not_indexed",
      "verdict_unspecified",
    ]);
    const error = await this.countStatus(workspaceId, filters, ["error"]);
    const notChecked = await this.countStatus(workspaceId, filters, [
      "unknown",
    ]);

    return {
      total_urls: total,
      indexed,
      indexed_percent: this.percent(indexed, total),
      in_progress: inProgress,
      in_progress_percent: this.percent(inProgress, total),
      not_indexed: notIndexed,
      not_indexed_percent: this.percent(notIndexed, total),
      error,
      error_percent: this.percent(error, total),
      not_checked: notChecked,
      not_checked_percent: this.percent(notChecked, total),
    };
  }

  async saveDailySnapshot(workspaceId: string, date = new Date()) {
    const dayStart = new Date(
      Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
    );
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
    const dateStr = dayStart.toISOString().slice(0, 10);

    const { data: combos } = await this.client
      .from("search_console_indexing_status")
      .select("workspace_id, project_id, connection_id")
      .eq("workspace_id", workspaceId);

    const unique = new Map<
      string,
      { project_id?: string | null; connection_id?: string | null }
    >();
    (combos || []).forEach((row: any) => {
      const key = `${row.project_id || "null"}:${row.connection_id || "null"}`;
      if (!unique.has(key)) {
        unique.set(key, {
          project_id: row.project_id,
          connection_id: row.connection_id,
        });
      }
    });

    if (!unique.size) {
      unique.set("null:null", { project_id: null, connection_id: null });
    }

    for (const combo of unique.values()) {
      const filters: StatsFilters = {
        projectId: combo.project_id || undefined,
        connectionId: combo.connection_id || undefined,
      };
      const stats = await this.getCurrentStats(workspaceId, filters);
      const actions = await this.getActionStats(
        workspaceId,
        filters,
        dayStart,
        dayEnd,
      );

      await this.client.from("indexing_stats_daily").upsert(
        {
          workspace_id: workspaceId,
          project_id: combo.project_id || null,
          connection_id: combo.connection_id || null,
          date: dateStr,
          total_urls: stats.total_urls,
          indexed_count: stats.indexed,
          in_progress_count: stats.in_progress,
          not_indexed_count: stats.not_indexed,
          error_count: stats.error,
          not_checked_count: stats.not_checked,
          submissions_today: actions.submissions_today,
          inspections_today: actions.inspections_today,
          new_indexed_today: actions.new_indexed_today,
          lost_indexed_today: actions.lost_indexed_today,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "workspace_id,project_id,connection_id,date" },
      );
    }
  }

  async getHistory(params: {
    workspaceId: string;
    projectId?: string;
    connectionId?: string;
    startDate: string;
    endDate: string;
  }) {
    let query = this.client
      .from("indexing_stats_daily")
      .select("*")
      .eq("workspace_id", params.workspaceId)
      .gte("date", params.startDate)
      .lte("date", params.endDate)
      .order("date", { ascending: true });

    if (params.projectId) {
      query = query.eq("project_id", params.projectId);
    }
    if (params.connectionId) {
      query = query.eq("connection_id", params.connectionId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  private async countStatus(
    workspaceId: string,
    filters: StatsFilters,
    verdicts?: string[],
  ) {
    let query = this.client
      .from("search_console_indexing_status")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId);

    if (filters.projectId) {
      query = query.eq("project_id", filters.projectId);
    }
    if (filters.connectionId) {
      query = query.eq("connection_id", filters.connectionId);
    }
    if (verdicts && verdicts.length) {
      query = query.in("verdict", verdicts);
    }

    const { count, error } = await query;
    if (error) throw error;
    return count || 0;
  }

  private async getActionStats(
    workspaceId: string,
    filters: StatsFilters,
    dayStart: Date,
    dayEnd: Date,
  ) {
    const startIso = dayStart.toISOString();
    const endIso = dayEnd.toISOString();

    let submissionsQuery = this.client
      .from("search_console_indexing_requests")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .gte("requested_at", startIso)
      .lt("requested_at", endIso);

    if (filters.connectionId) {
      submissionsQuery = submissionsQuery.eq(
        "connection_id",
        filters.connectionId,
      );
    }

    const { count: submissions } = await submissionsQuery;

    let inspectionsQuery = this.client
      .from("search_console_indexing_status")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .gte("last_inspected_at", startIso)
      .lt("last_inspected_at", endIso);

    if (filters.connectionId) {
      inspectionsQuery = inspectionsQuery.eq(
        "connection_id",
        filters.connectionId,
      );
    }
    if (filters.projectId) {
      inspectionsQuery = inspectionsQuery.eq("project_id", filters.projectId);
    }

    const { count: inspections } = await inspectionsQuery;

    let newIndexedQuery = this.client
      .from("search_console_indexing_status")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .gte("indexed_at", startIso)
      .lt("indexed_at", endIso);

    if (filters.connectionId) {
      newIndexedQuery = newIndexedQuery.eq(
        "connection_id",
        filters.connectionId,
      );
    }
    if (filters.projectId) {
      newIndexedQuery = newIndexedQuery.eq("project_id", filters.projectId);
    }

    const { count: newIndexed } = await newIndexedQuery;

    let lostIndexedQuery = this.client
      .from("search_console_indexing_status")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .in("verdict", ["fail", "not_indexed", "verdict_unspecified", "error"])
      .gte("updated_at", startIso)
      .lt("updated_at", endIso)
      .not("indexed_at", "is", null);

    if (filters.connectionId) {
      lostIndexedQuery = lostIndexedQuery.eq(
        "connection_id",
        filters.connectionId,
      );
    }
    if (filters.projectId) {
      lostIndexedQuery = lostIndexedQuery.eq("project_id", filters.projectId);
    }

    const { count: lostIndexed } = await lostIndexedQuery;

    return {
      submissions_today: submissions || 0,
      inspections_today: inspections || 0,
      new_indexed_today: newIndexed || 0,
      lost_indexed_today: lostIndexed || 0,
    };
  }

  private percent(value: number, total: number) {
    if (!total) return 0;
    return Math.round((value / total) * 10000) / 100;
  }
}
