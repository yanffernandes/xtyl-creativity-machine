import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { SupabaseService } from "../../common/supabase/supabase.service";
import { SearchConsoleService } from "./search-console.service";
import { SitemapService } from "./sitemap.service";
import { IndexingStatsService } from "./indexing-stats.service";
import { SearchConsoleRepository } from "./search-console.repository";

@Injectable()
export class SearchConsoleJobs {
  private readonly logger = new Logger(SearchConsoleJobs.name);

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly service: SearchConsoleService,
    private readonly sitemapService: SitemapService,
    private readonly indexingStatsService: IndexingStatsService,
    private readonly repo: SearchConsoleRepository,
  ) {}

  @Cron("0 * * * *")
  async syncAllSitemaps() {
    const supabase = this.supabaseService.getServiceRoleClient();
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { data: sitemaps } = await supabase
      .from("project_sitemaps")
      .select("id, last_synced_at, is_enabled")
      .eq("is_enabled", true)
      .or(`last_synced_at.is.null,last_synced_at.lt.${cutoff}`)
      .limit(200);

    for (const sitemap of sitemaps || []) {
      try {
        await this.sitemapService.syncSitemap(sitemap.id);
      } catch (error) {
        this.logger.warn(
          `Sitemap sync failed for ${sitemap.id}: ${error?.message || error}`,
        );
      }
    }
  }

  @Cron("0 */6 * * *")
  async verifyPendingUrls() {
    const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
    const pending = await this.repo.listPendingReinspection(cutoff, 200);
    if (!pending.length) return;

    const supabase = this.supabaseService.getServiceRoleClient();

    for (const status of pending) {
      try {
        const { data: connection } = await supabase
          .from("connections")
          .select("id, user_id, metadata, is_active")
          .eq("id", status.connection_id)
          .single();

        if (!connection || !connection.is_active || !connection.user_id) {
          if (!connection?.user_id) {
            this.logger.warn(
              `Skipping reinspect for ${status.url}: connection missing user_id`,
            );
          }
          continue;
        }

        await this.service.inspectUrl({
          userId: connection.user_id,
          workspaceId: status.workspace_id,
          connectionId: status.connection_id,
          url: status.url,
          propertyId: status.property_id || undefined,
          forceRefresh: true,
        });
      } catch (error) {
        this.logger.warn(
          `Reinspect failed for ${status.url}: ${error?.message || error}`,
        );
      }
    }
  }

  @Cron("0 0 * * *")
  async saveDailyStats() {
    const supabase = this.supabaseService.getServiceRoleClient();
    const { data: workspaces } = await supabase
      .from("search_console_indexing_status")
      .select("workspace_id");

    const workspaceIds = Array.from(
      new Set((workspaces || []).map((row: any) => row.workspace_id)),
    ).filter(Boolean);

    for (const workspaceId of workspaceIds) {
      try {
        await this.indexingStatsService.saveDailySnapshot(workspaceId);
      } catch (error) {
        this.logger.warn(
          `Daily stats failed for workspace ${workspaceId}: ${error?.message || error}`,
        );
      }
    }
  }

  @Cron("*/30 * * * *")
  async autoIndexUrls() {
    const supabase = this.supabaseService.getServiceRoleClient();
    const { data: connections } = await supabase
      .from("connections")
      .select("id, workspace_id, user_id, metadata")
      .eq("plataform_name", "google")
      .eq("is_active", true)
      .contains("metadata", { type: "search_console" });

    for (const connection of connections || []) {
      try {
        const autoRunEnabled =
          connection.metadata?.search_console?.auto_run_enabled !== false;
        if (!autoRunEnabled) continue;

        if (!connection.user_id) {
          this.logger.warn(
            `Skipping auto-index for connection ${connection.id}: missing user_id`,
          );
          continue;
        }

        const workspaceId = connection.workspace_id;
        if (!workspaceId) continue;
        await this.service.autoRun(
          connection.id,
          connection.user_id,
          workspaceId,
        );
      } catch (error) {
        this.logger.warn(
          `Auto-index failed for connection ${connection.id}: ${error}`,
        );
      }
    }
  }

  @Cron("30 * * * *")
  async autoInspectStaleUrls() {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const candidates = await this.repo.listStaleForInspection(cutoff, 200);
    if (!candidates.length) return;

    const supabase = this.supabaseService.getServiceRoleClient();
    const byConnection = new Map<string, any[]>();

    for (const status of candidates) {
      if (!status.connection_id) continue;
      const list = byConnection.get(status.connection_id) || [];
      if (list.length >= 10) continue; // cap per connection per run
      list.push(status);
      byConnection.set(status.connection_id, list);
    }

    for (const [connectionId, statuses] of byConnection.entries()) {
      const { data: connection } = await supabase
        .from("connections")
        .select("id, user_id, is_active")
        .eq("id", connectionId)
        .single();

      if (!connection || !connection.is_active || !connection.user_id) continue;

      for (const status of statuses) {
        try {
          await this.service.inspectUrl({
            userId: connection.user_id,
            workspaceId: status.workspace_id,
            connectionId: status.connection_id,
            url: status.url,
            propertyId: status.property_id || undefined,
            forceRefresh: false,
          });
        } catch (error) {
          this.logger.warn(
            `Auto-inspect failed for ${status.url}: ${error?.message || error}`,
          );
        }
      }
    }
  }
}
