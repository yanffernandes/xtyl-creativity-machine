/**
 * AlvoBot Campaign Service
 * Resolves campaign IDs created by AlvoBot from Supabase tables.
 *
 * Sources:
 * - campaign_templates.published_campaign_id (Meta campaigns)
 * - ad_campaign_templates.platform_ids->>'campaignId' (Google campaigns)
 *
 * Uses in-memory TTL cache to avoid hitting Supabase on every search request.
 */

import { Injectable, Logger } from "@nestjs/common";
import { SupabaseService } from "../../../common/supabase/supabase.service";

interface CacheEntry {
  ids: Set<string>;
  cachedAt: number;
}

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

@Injectable()
export class AlvobotCampaignService {
  private readonly logger = new Logger(AlvobotCampaignService.name);
  private readonly cache = new Map<string, CacheEntry>();

  constructor(private readonly supabaseService: SupabaseService) {}

  /**
   * Get AlvoBot campaign IDs for a workspace.
   * Results are cached for 5 minutes to avoid repeated Supabase queries.
   *
   * @param workspaceId - Workspace ID to scope the lookup (optional)
   * @returns Set of campaign IDs created by AlvoBot
   */
  async getAlvobotCampaignIds(workspaceId?: string): Promise<Set<string>> {
    const cacheKey = workspaceId || "__no_workspace__";

    // Check cache
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
      return cached.ids;
    }

    const ids: string[] = [];
    const supabase = this.supabaseService.getClient();

    // Fetch Meta campaign IDs from campaign_templates
    try {
      let metaQuery = supabase
        .from("campaign_templates")
        .select("published_campaign_id")
        .eq("status", "published")
        .not("published_campaign_id", "is", null)
        .is("deleted_at", null);

      if (workspaceId) {
        metaQuery = metaQuery.or(
          `workspace_id.eq.${workspaceId},workspace_id.is.null`,
        );
      }

      const { data: metaTemplates, error: metaError } = await metaQuery;

      if (metaError) {
        this.logger.error(
          `Error fetching Meta AlvoBot campaigns: ${metaError.message}`,
        );
      } else if (metaTemplates) {
        for (const t of metaTemplates) {
          if (t.published_campaign_id) {
            ids.push(t.published_campaign_id);
          }
        }
      }
    } catch (error) {
      this.logger.error(
        `Failed to fetch Meta AlvoBot campaigns: ${error.message}`,
      );
    }

    // Fetch Google campaign IDs from ad_campaign_templates
    try {
      let googleQuery = supabase
        .from("ad_campaign_templates")
        .select("platform_ids")
        .eq("platform", "google_ads")
        .eq("status", "published")
        .not("platform_ids", "is", null);

      if (workspaceId) {
        googleQuery = googleQuery.or(
          `workspace_id.eq.${workspaceId},workspace_id.is.null`,
        );
      }

      const { data: googleTemplates, error: googleError } = await googleQuery;

      if (googleError) {
        this.logger.error(
          `Error fetching Google AlvoBot campaigns: ${googleError.message}`,
        );
      } else if (googleTemplates) {
        for (const t of googleTemplates) {
          const platformIds = t.platform_ids as {
            campaignId?: string;
          } | null;
          if (platformIds?.campaignId) {
            ids.push(platformIds.campaignId);
          }
        }
      }
    } catch (error) {
      this.logger.error(
        `Failed to fetch Google AlvoBot campaigns: ${error.message}`,
      );
    }

    const idSet = new Set(ids);

    // Update cache
    this.cache.set(cacheKey, {
      ids: idSet,
      cachedAt: Date.now(),
    });

    this.logger.debug(
      `Resolved ${idSet.size} AlvoBot campaign IDs for workspace ${workspaceId || "(all)"}`,
    );

    return idSet;
  }

  /**
   * Clear the cache for a specific workspace or all workspaces.
   * Call this when campaigns are published/deleted to ensure fresh data.
   */
  clearCache(workspaceId?: string): void {
    if (workspaceId) {
      this.cache.delete(workspaceId);
    } else {
      this.cache.clear();
    }
  }
}
