import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import { SupabaseService } from "../../common/supabase/supabase.service";

interface ParsedSitemapUrl {
  url: string;
  path: string;
  lastmod: string | null;
  changefreq?: string | null;
  priority?: number | null;
}

interface SyncOptions {
  connectionId?: string;
}

@Injectable()
export class SitemapService {
  private readonly logger = new Logger(SitemapService.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  private get client() {
    return this.supabaseService.getServiceRoleClient();
  }

  async listProjectSitemaps(projectId: string) {
    const { data, error } = await this.client
      .from("project_sitemaps")
      .select("*")
      .eq("project_id", projectId)
      .order("is_primary", { ascending: false })
      .order("created_at", { ascending: true });
    if (error) throw error;
    return data || [];
  }

  async createSitemap(
    projectId: string,
    workspaceId: string,
    payload: { url: string; isPrimary?: boolean },
  ) {
    if (payload.isPrimary) {
      await this.client
        .from("project_sitemaps")
        .update({ is_primary: false })
        .eq("project_id", projectId);
    }

    const { data, error } = await this.client
      .from("project_sitemaps")
      .insert({
        project_id: projectId,
        workspace_id: workspaceId,
        url: payload.url,
        sitemap_type: "manual",
        is_primary: payload.isPrimary || false,
        is_enabled: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async updateSitemap(
    sitemapId: string,
    payload: { url?: string; isPrimary?: boolean; isEnabled?: boolean },
  ) {
    if (payload.isPrimary) {
      const { data: existing } = await this.client
        .from("project_sitemaps")
        .select("project_id")
        .eq("id", sitemapId)
        .single();

      if (existing?.project_id) {
        await this.client
          .from("project_sitemaps")
          .update({ is_primary: false })
          .eq("project_id", existing.project_id);
      }
    }

    const { data, error } = await this.client
      .from("project_sitemaps")
      .update({
        ...(payload.url ? { url: payload.url } : {}),
        ...(payload.isPrimary !== undefined
          ? { is_primary: payload.isPrimary }
          : {}),
        ...(payload.isEnabled !== undefined
          ? { is_enabled: payload.isEnabled }
          : {}),
        updated_at: new Date().toISOString(),
      })
      .eq("id", sitemapId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async deleteSitemap(sitemapId: string) {
    const { error } = await this.client
      .from("project_sitemaps")
      .delete()
      .eq("id", sitemapId);
    if (error) throw error;
    return { success: true };
  }

  /**
   * Generate sitemap URL candidates based on sitemap-finder patterns
   * Full integration of https://github.com/Abromeit/sitemap-finder
   * Organized by priority (most common patterns first)
   */
  private generateSitemapCandidates(baseUrl: string): string[] {
    // Extensions to test
    const extensions = ["xml", "xml.gz", "txt"];

    // TIER 1: Most common patterns (test first, ~95% of sitemaps)
    const tier1Filenames = [
      // Standard patterns
      "sitemap",
      "sitemap_index",
      "sitemap-index",
      "sitemapindex",
      "index-sitemap",
      // WordPress native
      "wp-sitemap",
      // Yoast SEO
      "post-sitemap",
      "page-sitemap",
      "category-sitemap",
      "author-sitemap",
      // RankMath / All in One SEO
      "sitemap_index",
      // Google patterns
      "google-sitemap",
      "googlesitemap",
      "gsitemap",
      // News/Video/Image
      "news-sitemap",
      "video-sitemap",
      "image-sitemap",
      // Index variations
      "index",
      "main",
    ];

    // TIER 2: Common variations (test if tier 1 fails)
    const tier2Filenames = [
      // Numbered variations
      "sitemap1",
      "sitemap2",
      "sitemap01",
      "sitemap001",
      "sitemap0001",
      "sitemap-1",
      "sitemap-2",
      "sitemap-01",
      "sitemap-001",
      "sitemap_1",
      "sitemap_2",
      "sitemap_01",
      "sitemap_001",
      // WordPress extended
      "wp-sitemap-posts-post-1",
      "wp-sitemap-posts-page-1",
      "wp-sitemap-taxonomies-category-1",
      "wp-sitemap-users-1",
      // Site variations
      "site",
      "site-map",
      "site_map",
      "site1",
      "site01",
      "site-1",
      "site_1",
      "siteindex",
      "sites",
      // Short names
      "sm",
      "s1",
      "s-1",
      "s_1",
      // XML variations
      "xml-sitemap",
      "xml_sitemap",
      // Main/default
      "sitemap-main",
      "sitemap.main",
      "sitemap-default",
      "sitemap.default",
      "main-sitemap",
      "default",
      "standard_sitemap",
      // Content types
      "sitemap-pages",
      "sitemap-posts",
      "sitemap-products",
      "sitemappages",
      "sitemapproducts",
      // Google News
      "newssitemap",
      "news_sitemap",
      "googlenews",
      "google-news-sitemap",
      "sitemap-news",
      "sitemap_news",
      "gNewsSiteMap",
      "googleNewsList",
      "sitemap_gnews",
    ];

    // TIER 3: Language-specific patterns
    const languages = [
      "en",
      "de",
      "pt",
      "es",
      "fr",
      "it",
      "nl",
      "ru",
      "ja",
      "zh",
    ];
    const tier3Filenames: string[] = [];
    for (const lang of languages) {
      tier3Filenames.push(
        `sitemap-${lang}`,
        `sitemap_${lang}`,
        `sitemap.${lang}`,
        `sitemap-${lang}-${lang}`,
        `sitemap_index_${lang}`,
        `${lang}/sitemap`,
        `${lang}/sitemap_index`,
        `${lang}/wp-sitemap`,
      );
    }

    // TIER 4: Directory-based patterns (common CMS structures)
    const tier4Paths = [
      // Blog structures
      "blog/sitemap",
      "blog/sitemap_index",
      "blog/post-sitemap",
      "blog/page-sitemap",
      // CMS directories
      "cms/sitemap",
      "cms/sitemap_index",
      // Media/files directories
      "media/sitemap",
      "files/sitemap",
      "files/sitemap_index",
      "files/xml/sitemap",
      "files/sitemap/sitemap",
      // SEO plugin directories
      "seo/sitemap",
      "seo/sitemap_index",
      // Export/feed directories
      "export/sitemap",
      "export/sitemap_index",
      "feeds/sitemap",
      "feed/google_sitemap",
      // Static directories
      "static/sitemap",
      "pub/sitemap",
      // Sitemap subdirectories
      "sitemap/sitemap",
      "sitemap/sitemap-index",
      "sitemap/index",
      "sitemaps/sitemap",
      "sitemaps/index",
      "map/sitemap",
      "xml/sitemap",
      // Fileadmin (TYPO3)
      "fileadmin/sitemap/sitemap",
      "typo3temp/sitemap",
    ];

    // TIER 5: Misc/rare patterns
    const tier5Filenames = [
      // SSL/secure variations
      "sitemap-ssl",
      "sitemap.ssl",
      "secure-sitemap",
      "sitemap-secure",
      // Complete/all variations
      "sitemap-complete",
      "all-sitemaps-xml",
      "all",
      // Web/www variations
      "sitemap-web",
      "sitemap-website",
      "sitemap-www",
      // Root variations
      "sitemap-root",
      "sitemap.root",
      // Geo variations
      "geositemap",
      // Hreflang
      "sitemap_hreflang",
      // RSS/Atom (can contain URLs)
      "rss",
      "rss2",
      "atom",
      "feed",
      // Misc
      "List",
      "full",
      "content",
      "content_index",
      "add-sitemap",
      "items",
      "files",
      // Case variations
      "Sitemap",
      "SiteMap",
      "GSiteMap",
    ];

    // Build candidates in priority order
    const candidates: string[] = [];

    // Helper to add candidates with extensions
    const addWithExtensions = (path: string) => {
      for (const ext of extensions) {
        // Some paths already include the extension
        if (
          path.endsWith(".xml") ||
          path.endsWith(".gz") ||
          path.endsWith(".txt")
        ) {
          candidates.push(`${baseUrl}/${path}`);
        } else {
          candidates.push(`${baseUrl}/${path}.${ext}`);
        }
      }
    };

    // Add tier 1 (highest priority)
    for (const filename of tier1Filenames) {
      addWithExtensions(filename);
    }

    // Add tier 2
    for (const filename of tier2Filenames) {
      addWithExtensions(filename);
    }

    // Add tier 3 (language patterns)
    for (const path of tier3Filenames) {
      addWithExtensions(path);
    }

    // Add tier 4 (directory patterns)
    for (const path of tier4Paths) {
      addWithExtensions(path);
    }

    // Add tier 5 (rare patterns)
    for (const filename of tier5Filenames) {
      addWithExtensions(filename);
    }

    // Remove duplicates while preserving order
    return [...new Set(candidates)];
  }

  async detectSitemaps(projectId: string, workspaceId?: string) {
    const { data: project, error } = await this.client
      .from("projects")
      .select("id, domain, workspace_id")
      .eq("id", projectId)
      .single();

    if (error || !project) {
      throw new BadRequestException("Project not found");
    }

    const domain = this.normalizeDomain(project.domain);
    if (!domain) {
      throw new BadRequestException("Project domain not configured");
    }

    const baseUrl = domain.replace(/\/$/, "");

    // Start with robots.txt (most reliable source)
    const candidates = new Set<string>();

    try {
      const robots = await this.fetchText(`${baseUrl}/robots.txt`);
      if (robots) {
        this.extractSitemapUrlsFromRobots(robots).forEach((url) =>
          candidates.add(url),
        );
        this.logger.debug(`Found ${candidates.size} sitemaps in robots.txt`);
      }
    } catch (error) {
      this.logger.debug(`robots.txt not accessible for ${baseUrl}: ${error}`);
    }

    // Add common candidates (prioritized list)
    const commonCandidates = this.generateSitemapCandidates(baseUrl);

    // Test candidates in parallel batches for performance
    const existing = await this.listProjectSitemaps(projectId);
    const existingMap = new Map(existing.map((s: any) => [s.url, s]));
    const hasPrimary = existing.some((s: any) => s.is_primary);

    const detected: any[] = [];
    const testedUrls = new Set<string>();

    // First, test URLs from robots.txt (most reliable)
    for (const url of candidates) {
      if (testedUrls.has(url)) continue;
      testedUrls.add(url);

      const result = await this.fetchSitemapWithRedirect(url);
      if (!result) continue;

      const type = result.content.toLowerCase().includes("<sitemapindex")
        ? "index"
        : "auto";
      const finalUrl = result.finalUrl;
      const existingItem = existingMap.get(finalUrl);
      const isPrimary =
        existingItem?.is_primary ?? (!hasPrimary && detected.length === 0);

      // Add final URL (after redirect) to avoid duplicates
      testedUrls.add(finalUrl);

      detected.push({
        project_id: projectId,
        workspace_id: project.workspace_id || workspaceId,
        url: finalUrl,
        sitemap_type: type,
        is_primary: isPrimary,
        is_enabled: true,
        updated_at: new Date().toISOString(),
      });

      this.logger.debug(`Detected sitemap: ${finalUrl} (type: ${type})`);
    }

    // Test common patterns with adaptive limits in small parallel batches
    const maxTestsWithResults = 50;
    const maxTestsWithoutResults = 120;
    const batchSize = 5;
    let additionalTests = 0;
    let consecutiveFailures = 0;
    const maxConsecutiveFailures = 25;

    for (let i = 0; i < commonCandidates.length; i += batchSize) {
      const currentMax =
        detected.length > 0 ? maxTestsWithResults : maxTestsWithoutResults;
      if (additionalTests >= currentMax) break;

      if (
        consecutiveFailures >= maxConsecutiveFailures &&
        detected.length > 0
      ) {
        this.logger.debug(
          `Stopping after ${consecutiveFailures} consecutive failures`,
        );
        break;
      }

      const batch = commonCandidates.slice(i, i + batchSize).filter((url) => {
        if (testedUrls.has(url)) return false;
        testedUrls.add(url);
        additionalTests++;
        return additionalTests <= currentMax;
      });

      if (!batch.length) continue;

      const results = await Promise.all(
        batch.map((url) => this.fetchSitemapWithRedirect(url)),
      );

      for (let j = 0; j < batch.length; j++) {
        const result = results[j];
        if (!result) {
          consecutiveFailures++;
          continue;
        }

        consecutiveFailures = 0;
        const finalUrl = result.finalUrl;
        if (testedUrls.has(finalUrl) && finalUrl !== batch[j]) continue;
        testedUrls.add(finalUrl);

        const type = result.content.toLowerCase().includes("<sitemapindex")
          ? "index"
          : "auto";
        const existingItem = existingMap.get(finalUrl);
        const isPrimary =
          existingItem?.is_primary ?? (!hasPrimary && detected.length === 0);

        detected.push({
          project_id: projectId,
          workspace_id: project.workspace_id || workspaceId,
          url: finalUrl,
          sitemap_type: type,
          is_primary: isPrimary,
          is_enabled: true,
          updated_at: new Date().toISOString(),
        });

        this.logger.debug(`Detected sitemap: ${finalUrl} (type: ${type})`);
      }
    }

    this.logger.log(
      `Tested ${additionalTests} URLs, found ${detected.length} sitemaps for ${baseUrl}`,
    );

    if (!detected.length) {
      this.logger.warn(`No sitemaps found for ${baseUrl}`);
      return [];
    }

    const { data, error: upsertError } = await this.client
      .from("project_sitemaps")
      .upsert(detected, { onConflict: "project_id,url" })
      .select();

    if (upsertError) throw upsertError;

    this.logger.log(
      `Detected ${data?.length || 0} sitemaps for project ${projectId}`,
    );
    return data || [];
  }

  async syncSitemap(sitemapId: string, options: SyncOptions = {}) {
    const { data: sitemap, error } = await this.client
      .from("project_sitemaps")
      .select("*, projects(id, domain, workspace_id)")
      .eq("id", sitemapId)
      .single();

    if (error || !sitemap) {
      throw new BadRequestException("Sitemap not found");
    }

    const workspaceId = sitemap.workspace_id || sitemap.projects?.workspace_id;
    if (!workspaceId) {
      throw new BadRequestException("Workspace not found for sitemap");
    }

    // Try to resolve connectionId, but don't fail if not found
    // We can still sync the sitemap URLs without Search Console connection
    const connectionId =
      options.connectionId ||
      (await this.resolveConnectionId(workspaceId, sitemap.projects?.domain));

    this.logger.log(
      `Syncing sitemap ${sitemapId}, connectionId: ${connectionId || "none"}`,
    );

    try {
      const {
        urls,
        sitemapType,
        error: parseError,
      } = await this.parseSitemapTree(sitemap.url);

      this.logger.log(
        `Parsed sitemap: ${urls.length} URLs found, type: ${sitemapType}, error: ${parseError || "none"}`,
      );

      if (!urls.length) {
        const errorMessage = parseError || null;
        await this.client
          .from("project_sitemaps")
          .update({
            last_synced_at: new Date().toISOString(),
            last_sync_error: errorMessage,
            sitemap_type: sitemapType,
            urls_count: 0,
            updated_at: new Date().toISOString(),
          })
          .eq("id", sitemapId);
        return { total: 0, inserted: 0, error: errorMessage };
      }

      const urlPayload = await this.enrichSitemapUrls(urls);
      const chunks = this.chunk(urlPayload, 500);
      const urlIdMap = new Map<string, string>();
      let upserted = 0;

      for (const chunk of chunks) {
        const { data, error: upsertError } = await this.client
          .from("sitemap_urls")
          .upsert(
            chunk.map((item) => ({
              sitemap_id: sitemapId,
              workspace_id: workspaceId,
              url: item.url,
              path: item.path,
              lastmod: item.lastmod,
              changefreq: item.changefreq || null,
              priority: item.priority || null,
              article_id: item.article_id || null,
              updated_at: new Date().toISOString(),
            })),
            { onConflict: "sitemap_id,url" },
          )
          .select("id,url");

        if (upsertError) throw upsertError;
        upserted += data?.length || 0;
        data?.forEach((row) => urlIdMap.set(row.url, row.id));
      }

      // Only sync indexing status if we have a Search Console connection
      let statusInserted = 0;
      if (connectionId) {
        statusInserted = await this.syncIndexingStatus(
          workspaceId,
          connectionId,
          sitemap.project_id,
          urlPayload,
          urlIdMap,
        );
      } else {
        this.logger.warn(
          `No Search Console connection found for workspace ${workspaceId}, skipping indexing status sync`,
        );
      }

      await this.client
        .from("project_sitemaps")
        .update({
          last_synced_at: new Date().toISOString(),
          last_sync_error: null,
          sitemap_type: sitemapType,
          urls_count: urlPayload.length,
          updated_at: new Date().toISOString(),
        })
        .eq("id", sitemapId);

      this.logger.log(
        `Sitemap sync complete: ${urlPayload.length} URLs, ${upserted} upserted, ${statusInserted} status records`,
      );
      return { total: urlPayload.length, inserted: upserted, statusInserted };
    } catch (error: any) {
      await this.client
        .from("project_sitemaps")
        .update({
          last_sync_error: error?.message || "sync_failed",
          updated_at: new Date().toISOString(),
        })
        .eq("id", sitemapId);
      throw error;
    }
  }

  async listUrls(params: {
    workspaceId: string;
    projectId?: string;
    sitemapId?: string;
    connectionId?: string;
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const page = params.page && params.page > 0 ? params.page : 1;
    const limit = params.limit && params.limit > 0 ? params.limit : 50;
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = this.client
      .from("sitemap_urls")
      .select(
        `
        id,
        sitemap_id,
        url,
        path,
        lastmod,
        article_id,
        search_console_indexing_status!left(
          id,
          verdict,
          last_inspected_at,
          last_submitted_at,
          indexed_at
        ),
        project_sitemaps!inner(project_id)
      `,
        { count: "exact" },
      )
      .eq("workspace_id", params.workspaceId)
      .order("lastmod", { ascending: false })
      .range(from, to);

    if (params.projectId) {
      query = query.eq("project_sitemaps.project_id", params.projectId);
    }

    if (params.sitemapId) {
      query = query.eq("sitemap_id", params.sitemapId);
    }

    if (params.connectionId) {
      query = query.eq(
        "search_console_indexing_status.connection_id",
        params.connectionId,
      );
    }

    if (params.status) {
      const verdicts = this.mapStatusToVerdicts(params.status);
      if (verdicts.length) {
        query = query.in("search_console_indexing_status.verdict", verdicts);
      }
    }

    if (params.search) {
      const escaped = params.search.replace(/%/g, "\\%");
      query = query.or(`url.ilike.%${escaped}%,path.ilike.%${escaped}%`);
    }

    const { data, error, count } = await query;
    if (error) throw error;

    const rows = (data || []).map((row: any) => {
      const status = Array.isArray(row.search_console_indexing_status)
        ? row.search_console_indexing_status[0]
        : row.search_console_indexing_status;
      return {
        id: row.id,
        sitemap_id: row.sitemap_id,
        url: row.url,
        path: row.path,
        lastmod: row.lastmod,
        article_id: row.article_id,
        indexing_status: status || null,
      };
    });

    return {
      data: rows,
      total: count || 0,
      page,
      limit,
    };
  }

  private mapStatusToVerdicts(status: string): string[] {
    switch (status) {
      case "indexed":
        return ["pass", "indexed"];
      case "in_progress":
        return ["neutral", "pending"];
      case "not_indexed":
        return ["fail", "not_indexed", "verdict_unspecified"];
      case "error":
        return ["error"];
      case "not_checked":
        return ["unknown"];
      default:
        return [];
    }
  }

  private normalizeDomain(domain?: string | null): string | null {
    if (!domain) return null;
    const trimmed = domain.trim();
    if (!trimmed) return null;
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    return `https://${trimmed}`;
  }

  private async fetchText(url: string): Promise<string | null> {
    try {
      const response = await fetch(url, {
        headers: {
          Accept: "application/xml,text/xml,*/*",
          "User-Agent": "Alvobot/1.0",
        },
      });
      if (!response.ok) return null;
      const text = await response.text();

      // Validate that the response looks like XML (sitemap, RSS, or Atom)
      // Based on ultimate-sitemap-parser supported formats
      const trimmed = text.trim();
      if (
        trimmed.startsWith("<!doctype html") ||
        trimmed.startsWith("<!DOCTYPE html")
      ) {
        this.logger.debug(`${url} returned HTML instead of XML`);
        return null;
      }

      // Check for valid XML formats: sitemap, RSS, Atom
      const validFormats = [
        "<urlset", // Standard sitemap
        "<sitemapindex", // Sitemap index
        "<rss", // RSS 2.0
        "<feed", // Atom
        "<channel", // RSS channel
      ];

      const hasValidFormat = validFormats.some((format) =>
        trimmed.toLowerCase().includes(format.toLowerCase()),
      );

      if (!hasValidFormat) {
        this.logger.debug(
          `${url} does not appear to be a valid sitemap/RSS/Atom`,
        );
        return null;
      }

      return text;
    } catch (error) {
      this.logger.debug(`Failed to fetch ${url}: ${error}`);
      return null;
    }
  }

  /**
   * Fetch sitemap following redirects and return both content and final URL
   * Based on sitemap-finder approach: https://github.com/Abromeit/sitemap-finder
   */
  private async fetchSitemapWithRedirect(
    url: string,
    maxRedirects = 5,
  ): Promise<{ content: string; finalUrl: string } | null> {
    let currentUrl = url;
    let redirectCount = 0;

    while (redirectCount < maxRedirects) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

        const response = await fetch(currentUrl, {
          headers: {
            Accept: "application/xml,text/xml,*/*",
            "User-Agent":
              "Mozilla/5.0 (compatible; Alvobot/1.0; +https://alvobot.com)",
          },
          redirect: "manual", // Handle redirects manually to track final URL
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        // Handle redirects
        if (response.status >= 300 && response.status < 400) {
          const location = response.headers.get("location");
          if (!location) {
            this.logger.debug(
              `Redirect without location header: ${currentUrl}`,
            );
            return null;
          }

          // Handle relative redirects
          currentUrl = location.startsWith("http")
            ? location
            : new URL(location, currentUrl).toString();

          redirectCount++;
          this.logger.debug(`Following redirect: ${url} -> ${currentUrl}`);
          continue;
        }

        if (!response.ok) {
          this.logger.debug(`HTTP ${response.status} for ${currentUrl}`);
          return null;
        }

        // Check Content-Type (like sitemap-finder does)
        const contentType = response.headers.get("content-type") || "";
        const validTypes = ["xml", "gzip", "plain", "octet-stream"];
        const hasValidType = validTypes.some((t) =>
          contentType.toLowerCase().includes(t),
        );

        if (!hasValidType && contentType.includes("text/html")) {
          this.logger.debug(
            `${currentUrl} returned HTML content-type: ${contentType}`,
          );
          return null;
        }

        const text = await response.text();

        // Validate XML content
        const trimmed = text.trim();
        if (
          trimmed.startsWith("<!doctype html") ||
          trimmed.startsWith("<!DOCTYPE html")
        ) {
          this.logger.debug(
            `${currentUrl} returned HTML instead of XML sitemap`,
          );
          return null;
        }

        // Check for valid XML formats: sitemap, RSS, Atom
        const validFormats = [
          "<urlset", // Standard sitemap
          "<sitemapindex", // Sitemap index
          "<rss", // RSS 2.0
          "<feed", // Atom
          "<channel", // RSS channel
        ];

        const hasValidFormat = validFormats.some((format) =>
          trimmed.toLowerCase().includes(format.toLowerCase()),
        );

        if (!hasValidFormat) {
          this.logger.debug(
            `${currentUrl} does not appear to be a valid sitemap/RSS/Atom`,
          );
          return null;
        }

        return { content: text, finalUrl: currentUrl };
      } catch (error: any) {
        if (error.name === "AbortError") {
          this.logger.debug(`Timeout fetching ${currentUrl}`);
        } else {
          this.logger.debug(`Failed to fetch ${currentUrl}: ${error.message}`);
        }
        return null;
      }
    }

    this.logger.debug(`Too many redirects for ${url}`);
    return null;
  }

  private extractSitemapUrlsFromRobots(text: string): string[] {
    const urls: string[] = [];
    const lines = text.split(/\r?\n/);
    for (const line of lines) {
      const match = line.match(/^\s*sitemap:\s*(.+)$/i);
      if (match?.[1]) {
        urls.push(match[1].trim());
      }
    }
    return urls;
  }

  private async parseSitemapTree(url: string, tryFallbacks = true) {
    const visited = new Set<string>();
    const entries: ParsedSitemapUrl[] = [];
    let sitemapType = "auto";
    let error: string | null = null;
    let childSitemapsFound = 0;
    let childSitemapsFailed = 0;
    let baseUrl: string | null = null;

    // Extract base URL for fallback attempts
    try {
      const parsed = new URL(url);
      baseUrl = `${parsed.protocol}//${parsed.host}`;
    } catch {
      // ignore
    }

    const crawl = async (sitemapUrl: string, depth: number) => {
      if (visited.has(sitemapUrl) || depth > 2) return;
      visited.add(sitemapUrl);

      this.logger.debug(`Crawling sitemap: ${sitemapUrl} (depth: ${depth})`);

      const xml = await this.fetchText(sitemapUrl);
      if (!xml) {
        if (depth === 0) {
          error =
            "Sitemap inacessível ou inválido (retornou HTML ao invés de XML)";
        } else {
          childSitemapsFailed++;
          this.logger.debug(`Child sitemap failed: ${sitemapUrl}`);
        }
        return;
      }

      const lower = xml.toLowerCase();

      // Handle sitemap index
      if (lower.includes("<sitemapindex")) {
        sitemapType = "index";
        const children = this.extractTagBlocks(xml, "sitemap");
        childSitemapsFound = children.length;
        this.logger.debug(`Found ${children.length} child sitemaps in index`);
        for (const child of children) {
          const loc = this.extractTagValue(child, "loc");
          if (loc) {
            await crawl(loc, depth + 1);
          }
        }
        return;
      }

      // Handle standard sitemap
      if (lower.includes("<urlset")) {
        const urlBlocks = this.extractTagBlocks(xml, "url");
        for (const block of urlBlocks) {
          const loc = this.extractTagValue(block, "loc");
          if (!loc) continue;
          entries.push({
            url: loc,
            path: this.extractPath(loc),
            lastmod: this.parseDate(this.extractTagValue(block, "lastmod")),
            changefreq: this.extractTagValue(block, "changefreq"),
            priority: this.parsePriority(
              this.extractTagValue(block, "priority"),
            ),
          });
        }
        return;
      }

      // Handle RSS 2.0 feeds (based on ultimate-sitemap-parser)
      if (lower.includes("<rss") || lower.includes("<channel")) {
        sitemapType = "rss";
        const items = this.extractTagBlocks(xml, "item");
        for (const item of items) {
          const link = this.extractTagValue(item, "link");
          if (!link) continue;
          entries.push({
            url: link,
            path: this.extractPath(link),
            lastmod: this.parseDate(this.extractTagValue(item, "pubDate")),
            changefreq: null,
            priority: null,
          });
        }
        return;
      }

      // Handle Atom feeds (based on ultimate-sitemap-parser)
      if (lower.includes("<feed")) {
        sitemapType = "atom";
        const atomEntries = this.extractTagBlocks(xml, "entry");
        for (const entry of atomEntries) {
          // Atom uses <link href="..."/> - extract href attribute
          const linkMatch = entry.match(/<link[^>]*href=["']([^"']+)["']/i);
          const link = linkMatch?.[1];
          if (!link) continue;
          entries.push({
            url: link,
            path: this.extractPath(link),
            lastmod: this.parseDate(
              this.extractTagValue(entry, "updated") ||
                this.extractTagValue(entry, "published"),
            ),
            changefreq: null,
            priority: null,
          });
        }
        return;
      }

      // Fallback: try standard sitemap format
      const urlBlocks = this.extractTagBlocks(xml, "url");
      for (const block of urlBlocks) {
        const loc = this.extractTagValue(block, "loc");
        if (!loc) continue;
        entries.push({
          url: loc,
          path: this.extractPath(loc),
          lastmod: this.parseDate(this.extractTagValue(block, "lastmod")),
          changefreq: this.extractTagValue(block, "changefreq"),
          priority: this.parsePriority(this.extractTagValue(block, "priority")),
        });
      }
    };

    await crawl(url, 0);

    // AUTOMATIC FALLBACK: If sitemap index failed (all children returned HTML), try alternatives
    const shouldTryFallbacks =
      tryFallbacks &&
      baseUrl &&
      entries.length === 0 &&
      // Case 1: Index sitemap where all children failed
      ((sitemapType === "index" &&
        childSitemapsFound > 0 &&
        childSitemapsFailed === childSitemapsFound) ||
        // Case 2: Root sitemap returned HTML (error is set)
        error !== null);

    if (shouldTryFallbacks) {
      this.logger.log(
        `Sitemap fallback triggered for ${url}. Trying alternative sources...`,
      );

      // Fallback 1: WordPress native sitemap (wp-sitemap.xml)
      const wpSitemapUrl = `${baseUrl}/wp-sitemap.xml`;
      if (!visited.has(wpSitemapUrl)) {
        this.logger.log(
          `Fallback: Trying WordPress native sitemap: ${wpSitemapUrl}`,
        );
        const wpResult = await this.parseSitemapTree(wpSitemapUrl, false); // Don't recurse fallbacks
        if (wpResult.urls.length > 0) {
          this.logger.log(
            `Fallback success: Found ${wpResult.urls.length} URLs from wp-sitemap.xml`,
          );
          return {
            urls: wpResult.urls,
            sitemapType: `fallback-wp (${wpResult.sitemapType})`,
            error: null,
          };
        }
        this.logger.debug(`Fallback wp-sitemap.xml failed or empty`);
      }

      // Fallback 2: RSS feed (/feed/)
      const feedUrls = [
        `${baseUrl}/feed/`,
        `${baseUrl}/feed`,
        `${baseUrl}/rss`,
        `${baseUrl}/rss.xml`,
      ];

      for (const feedUrl of feedUrls) {
        if (visited.has(feedUrl)) continue;
        this.logger.log(`Fallback: Trying RSS feed: ${feedUrl}`);
        const feedResult = await this.parseSitemapTree(feedUrl, false);
        if (feedResult.urls.length > 0) {
          this.logger.log(
            `Fallback success: Found ${feedResult.urls.length} URLs from RSS feed`,
          );
          return {
            urls: feedResult.urls,
            sitemapType: `fallback-rss (${feedResult.sitemapType})`,
            error: null,
          };
        }
      }

      this.logger.warn(`All fallback attempts failed for ${url}`);
    }

    // If it's an index sitemap and all children failed, set a more informative error
    if (
      sitemapType === "index" &&
      childSitemapsFound > 0 &&
      childSitemapsFailed === childSitemapsFound &&
      entries.length === 0
    ) {
      error = `Sitemap index contém ${childSitemapsFound} sitemaps, mas todos retornaram HTML ao invés de XML. Tentativas de fallback também falharam.`;
    } else if (
      sitemapType === "index" &&
      childSitemapsFailed > 0 &&
      entries.length === 0
    ) {
      error = `Sitemap index: ${childSitemapsFailed} de ${childSitemapsFound} sitemaps filhos falharam ao carregar.`;
    }

    this.logger.log(
      `Sitemap parse complete: ${entries.length} URLs, type: ${sitemapType}, childFound: ${childSitemapsFound}, childFailed: ${childSitemapsFailed}`,
    );
    return { urls: entries, sitemapType, error };
  }

  private extractTagBlocks(xml: string, tag: string): string[] {
    const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "gi");
    const blocks: string[] = [];
    let match: RegExpExecArray | null;
    while ((match = regex.exec(xml)) !== null) {
      blocks.push(match[1]);
    }
    return blocks;
  }

  private extractTagValue(block: string, tag: string): string | null {
    const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i");
    const match = block.match(regex);
    if (!match?.[1]) return null;
    return this.decodeXml(match[1].trim());
  }

  private decodeXml(value: string): string {
    return value
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'");
  }

  private parseDate(value: string | null): string | null {
    if (!value) return null;
    const parsed = Date.parse(value);
    if (Number.isNaN(parsed)) return null;
    return new Date(parsed).toISOString();
  }

  private parsePriority(value: string | null): number | null {
    if (!value) return null;
    const parsed = parseFloat(value);
    if (Number.isNaN(parsed)) return null;
    return Math.min(Math.max(parsed, 0), 1);
  }

  private extractPath(url: string): string {
    try {
      const parsed = new URL(url);
      return parsed.pathname || "/";
    } catch {
      return url;
    }
  }

  private chunk<T>(items: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < items.length; i += size) {
      chunks.push(items.slice(i, i + size));
    }
    return chunks;
  }

  private async resolveConnectionId(
    workspaceId: string,
    domain?: string | null,
  ): Promise<string | null> {
    const candidates: string[] = [];
    if (domain) {
      const normalized = this.normalizeDomain(domain) || "";
      try {
        const parsed = new URL(normalized);
        const host = parsed.hostname;
        candidates.push(normalized.replace(/\/$/, ""));
        candidates.push(`https://${host}`);
        candidates.push(`http://${host}`);
        candidates.push(`sc-domain:${host}`);
      } catch {
        // ignore
      }
    }

    if (candidates.length) {
      const { data } = await this.client
        .from("search_console_properties")
        .select("connection_id, site_url, is_active")
        .eq("workspace_id", workspaceId)
        .in("site_url", candidates);

      const active = (data || []).find((p: any) => p.is_active);
      if (active?.connection_id) return active.connection_id;
      if (data?.length) return data[0].connection_id;
    }

    const { data: connections } = await this.client
      .from("connections")
      .select("id, metadata")
      .eq("workspace_id", workspaceId)
      .eq("plataform_name", "google")
      .eq("is_active", true)
      .contains("metadata", { type: "search_console" })
      .limit(1);

    return connections?.[0]?.id || null;
  }

  private async enrichSitemapUrls(urls: ParsedSitemapUrl[]) {
    const payload = urls.map((url) => ({
      ...url,
      article_id: null as number | null,
    }));
    if (!payload.length) return payload;

    const chunks = this.chunk(payload, 500);
    for (const chunk of chunks) {
      const urlList = chunk.map((item) => item.url);
      const { data } = await this.client
        .from("articles")
        .select("id,url")
        .in("url", urlList);

      const map = new Map<string, number>();
      (data || []).forEach((row: any) => {
        if (row.url) map.set(row.url, row.id);
      });

      chunk.forEach((item) => {
        const articleId = map.get(item.url);
        if (articleId) item.article_id = articleId;
      });
    }

    return payload;
  }

  private async syncIndexingStatus(
    workspaceId: string,
    connectionId: string,
    projectId: string,
    urls: Array<ParsedSitemapUrl & { article_id?: number | null }>,
    urlIdMap: Map<string, string>,
  ) {
    const now = new Date().toISOString();
    let inserted = 0;

    const chunks = this.chunk(urls, 200);
    for (const chunk of chunks) {
      const urlList = chunk.map((item) => item.url);
      const { data: existing } = await this.client
        .from("search_console_indexing_status")
        .select("id,url")
        .in("url", urlList);

      const existingSet = new Set((existing || []).map((row: any) => row.url));

      const toInsert = chunk
        .filter((item) => !existingSet.has(item.url))
        .map((item) => ({
          workspace_id: workspaceId,
          connection_id: connectionId,
          project_id: projectId,
          sitemap_url_id: urlIdMap.get(item.url) || null,
          article_id: item.article_id || null,
          url: item.url,
          verdict: "unknown",
          source: "sitemap",
          created_at: now,
          updated_at: now,
        }));

      if (toInsert.length) {
        const { error } = await this.client
          .from("search_console_indexing_status")
          .insert(toInsert);
        if (error) throw error;
        inserted += toInsert.length;
      }

      for (const item of chunk) {
        if (!existingSet.has(item.url)) continue;
        await this.client
          .from("search_console_indexing_status")
          .update({
            sitemap_url_id: urlIdMap.get(item.url) || null,
            project_id: projectId,
            connection_id: connectionId,
            source: "sitemap",
            updated_at: now,
          })
          .eq("url", item.url);
      }
    }

    return inserted;
  }
}
