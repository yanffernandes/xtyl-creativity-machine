import { Injectable, Logger } from "@nestjs/common";
import { SupabaseService } from "../../common/supabase/supabase.service";
import { WordPressClient } from "./utils/wordpress-client.util";
import { EncryptionUtil } from "./utils/encryption.util";
import {
  TestConnectionDto,
  WordPressConnectionResponse,
} from "./dto/test-connection.dto";
import {
  InstallEssentialPluginsDto,
  InstallEssentialPluginsResponse,
} from "./dto/install-essential-plugins.dto";
import {
  InstallPluginDto,
  PluginInstallResponse,
} from "./dto/install-plugin.dto";

/**
 * Essential plugins to be installed automatically on new WordPress projects
 */
export const ESSENTIAL_PLUGINS = [
  {
    name: "Instant Indexing",
    slug: "fast-indexing-api",
    description: "Facilita a indexação rápida de páginas nos motores de busca",
  },
  {
    name: "Missed Schedule Posts",
    slug: "missed-scheduled-posts-publisher",
    description:
      "Realiza a publicação automática de posts agendados que perderam o prazo",
  },
  {
    name: "Rank Math",
    slug: "seo-by-rank-math",
    description: "Plugin avançado para otimização de SEO no WordPress",
  },
  {
    name: "JetPack",
    slug: "jetpack",
    description:
      "Conjunto de ferramentas para segurança, performance e marketing",
  },
  {
    name: "Widgets Clássicos",
    slug: "classic-widgets",
    description: "Restaura o editor de widgets clássico do WordPress",
  },
  {
    name: "Cookie Notice",
    slug: "cookie-notice",
    description: "Exibe notificações para consentimento de cookies no site",
  },
  {
    name: "Site Kit by Google",
    slug: "google-site-kit",
    description:
      "Integração completa com serviços do Google para análises, SEO e desempenho",
  },
  {
    name: "Polylang",
    slug: "polylang",
    description: "Permite criar um site WordPress multilíngue facilmente",
  },
];

@Injectable()
export class WordPressService {
  private readonly logger = new Logger(WordPressService.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  /**
   * Test WordPress connection and validate credentials
   */
  async testConnection(
    dto: TestConnectionDto,
  ): Promise<WordPressConnectionResponse> {
    this.logger.log(`Testing connection to ${dto.domain}`);

    try {
      const client = new WordPressClient(dto.domain, dto.login, dto.password);

      // Test authentication by calling /wp-json/wp/v2/users/me
      const userResponse = await client.get("/wp-json/wp/v2/users/me");

      if (!userResponse.data) {
        return {
          success: false,
          message: "Falha ao autenticar. Verifique suas credenciais.",
        };
      }

      const user = userResponse.data;

      // Get WordPress version and site info
      const wpInfoResponse = await client.get("/wp-json/");
      const wpInfo = wpInfoResponse.data;

      // Get user capabilities for response data
      const capabilities = user.capabilities || {};

      // Try to get plugins list
      let plugins: Array<{ name: string; version: string; active: boolean }> =
        [];
      try {
        const pluginsResponse = await client.get("/wp-json/wp/v2/plugins");
        if (pluginsResponse.data && Array.isArray(pluginsResponse.data)) {
          plugins = pluginsResponse.data.map((p: any) => ({
            name: p.name || p.plugin,
            version: p.version || "?",
            active: p.status === "active",
          }));
        }
      } catch {
        this.logger.warn(
          "Could not fetch plugins list (may require admin permissions)",
        );
      }

      return {
        success: true,
        message: "Conexão estabelecida com sucesso!",
        data: {
          wpVersion: wpInfo.description || wpInfo.name || "Unknown",
          siteUrl: wpInfo.url || dto.domain,
          siteName: wpInfo.name || "WordPress Site",
          plugins,
          user: {
            id: user.id,
            name: user.name,
            username: user.slug || user.username,
            capabilities: Object.keys(capabilities).filter(
              (key) => capabilities[key],
            ),
          },
        },
      };
    } catch (error: any) {
      this.logger.error(`Connection test failed: ${error.message}`);
      return {
        success: false,
        message: error.message || "Erro ao conectar com WordPress",
      };
    }
  }

  /**
   * Get WordPress site information for an existing project
   */
  async getWordPressInfo(
    projectId: number,
    _userId: string,
  ): Promise<WordPressConnectionResponse> {
    this.logger.log(`Fetching WordPress info for project ${projectId}`);

    // Get project from database
    // Note: Access control is handled by RLS in the frontend - if user can see the project, they can test it
    const { data: project, error } = await this.supabaseService.projects
      .select("*")
      .eq("id", projectId)
      .single();

    if (error || !project) {
      this.logger.error(`Project ${projectId} not found: ${error?.message}`);
      throw new Error("Project not found");
    }

    this.logger.log(`Project found: ${project.name} (${project.domain})`);

    if (!project.domain || !project.login || !project.pass) {
      throw new Error("Project does not have WordPress credentials configured");
    }

    // Decrypt credentials (or use plain text if not encrypted)
    const decryptedPassword = EncryptionUtil.isEncrypted(project.pass)
      ? EncryptionUtil.decrypt(project.pass)
      : project.pass;

    // Test connection
    return this.testConnection({
      domain: project.domain,
      login: project.login,
      password: decryptedPassword,
    });
  }

  /**
   * Install a single plugin via API endpoint
   * Used for individual plugin installation with real-time UI updates
   */
  async installSinglePlugin(
    dto: InstallPluginDto,
    userId?: string,
  ): Promise<PluginInstallResponse> {
    this.logger.log(
      `Installing single plugin ${dto.pluginSlug} for project ${dto.projectId}`,
    );

    // Get project from database (including workspace_id for membership check)
    const { data: project, error } = await this.supabaseService.projects
      .select("*")
      .eq("id", dto.projectId)
      .single();

    if (error || !project) {
      throw new Error("Project not found");
    }

    // Check if user has access: either owns the project OR is a member of the workspace
    if (userId && userId !== "test-user-id") {
      const hasDirectAccess = project.user_id === userId;

      if (!hasDirectAccess && project.workspace_id) {
        const { data: membership } = await this.supabaseService
          .getClient()
          .from("workspace_members")
          .select("id")
          .eq("workspace_id", project.workspace_id)
          .eq("user_id", userId)
          .eq("status", "active")
          .single();

        if (!membership) {
          throw new Error("Project not found");
        }
      } else if (!hasDirectAccess) {
        throw new Error("Project not found");
      }
    }

    if (!project.domain || !project.login || !project.pass) {
      throw new Error("Project does not have WordPress credentials configured");
    }

    // Decrypt credentials (or use plain text if not encrypted)
    const decryptedPassword = EncryptionUtil.isEncrypted(project.pass)
      ? EncryptionUtil.decrypt(project.pass)
      : project.pass;

    return this.installPlugin(
      project.domain,
      project.login,
      decryptedPassword,
      dto.token,
      dto.pluginSlug,
    );
  }

  /**
   * Install a single plugin via AlvoBot WordPress API (internal method)
   */
  async installPlugin(
    domain: string,
    login: string,
    password: string,
    token: string,
    pluginSlug: string,
  ): Promise<PluginInstallResponse> {
    this.logger.log(`Installing plugin ${pluginSlug} on ${domain}`);

    try {
      const client = new WordPressClient(domain, login, password);

      const response = await client.post(
        "/wp-json/alvobot-pro/v1/plugins/commands",
        {
          token,
          command: "install_plugin",
          plugin_slug: pluginSlug,
        },
      );

      const result = response.data;

      if (result.success) {
        return {
          slug: pluginSlug,
          name:
            ESSENTIAL_PLUGINS.find((p) => p.slug === pluginSlug)?.name ||
            pluginSlug,
          status:
            result.data?.status === "already_active"
              ? "already_installed"
              : "installed",
        };
      } else {
        return {
          slug: pluginSlug,
          name:
            ESSENTIAL_PLUGINS.find((p) => p.slug === pluginSlug)?.name ||
            pluginSlug,
          status: "error",
          error: result.message || "Failed to install plugin",
        };
      }
    } catch (error: any) {
      this.logger.error(
        `Failed to install plugin ${pluginSlug}: ${error.message}`,
      );
      return {
        slug: pluginSlug,
        name:
          ESSENTIAL_PLUGINS.find((p) => p.slug === pluginSlug)?.name ||
          pluginSlug,
        status: "error",
        error: error.message || "Unknown error",
      };
    }
  }

  /**
   * Get the URL of a specific WordPress post
   */
  async getPostUrl(
    projectId: number,
    wpPostId: number,
    userId: string,
  ): Promise<{
    success: boolean;
    url?: string;
    message?: string;
    status?: string;
  }> {
    this.logger.log(
      `Fetching post URL for post ${wpPostId} in project ${projectId}`,
    );

    // Get project from database (including workspace_id for membership check)
    const { data: project, error } = await this.supabaseService.projects
      .select("*")
      .eq("id", projectId)
      .single();

    if (error || !project) {
      return { success: false, message: "Project not found" };
    }

    // Check if user has access: either owns the project OR is a member of the workspace
    const hasDirectAccess = project.user_id === userId;

    if (!hasDirectAccess && project.workspace_id) {
      // Check workspace membership
      const { data: membership } = await this.supabaseService
        .getClient()
        .from("workspace_members")
        .select("id")
        .eq("workspace_id", project.workspace_id)
        .eq("user_id", userId)
        .eq("status", "active")
        .single();

      if (!membership) {
        return { success: false, message: "Project not found" };
      }
    } else if (!hasDirectAccess) {
      // No workspace_id and not the owner
      return { success: false, message: "Project not found" };
    }

    if (!project.domain || !project.login || !project.pass) {
      return {
        success: false,
        message: "Project does not have WordPress credentials configured",
      };
    }

    try {
      // Decrypt credentials (or use plain text if not encrypted)
      const decryptedPassword = EncryptionUtil.isEncrypted(project.pass)
        ? EncryptionUtil.decrypt(project.pass)
        : project.pass;

      const client = new WordPressClient(
        project.domain,
        project.login,
        decryptedPassword,
      );

      // Fetch post from WordPress API
      // Note: We need to include trashed posts to detect deleted articles
      const response = await client.get(
        `/wp-json/wp/v2/posts/${wpPostId}?context=edit`,
      );

      if (response.data) {
        this.logger.log(
          `Post ${wpPostId} status: ${response.data.status}, slug: ${response.data.slug}, link: ${response.data.link}`,
        );

        // Check for trashed pattern FIRST - can be in slug OR link
        // This catches posts that were trashed and may have inconsistent status
        const hasTrashedSlug =
          response.data.slug && response.data.slug.includes("__trashed");
        const hasTrashedLink =
          response.data.link && response.data.link.includes("__trashed");

        if (hasTrashedSlug || hasTrashedLink) {
          this.logger.warn(
            `Post ${wpPostId} is trashed - slug: ${response.data.slug}, link: ${response.data.link}`,
          );
          return {
            success: false,
            message: "Este artigo foi excluído do WordPress",
            status: "trashed",
          };
        }

        // Check if post is in trash by status
        if (response.data.status === "trash") {
          this.logger.warn(
            `Post ${wpPostId} is in trash (deleted from WordPress)`,
          );
          return {
            success: false,
            message: "Este artigo foi excluído do WordPress",
            status: "trashed",
          };
        }

        // Check if post is not published
        if (response.data.status !== "publish") {
          this.logger.warn(
            `Post ${wpPostId} has status: ${response.data.status}`,
          );
          return {
            success: false,
            message: `Artigo não está publicado (status: ${response.data.status})`,
            status: response.data.status,
          };
        }

        let url = response.data.link;

        // If WordPress returns a URL with ?p=ID format (default permalinks),
        // try to build a proper URL using the slug instead
        if (url && url.includes("?p=") && response.data.slug) {
          // Build URL using slug: https://domain.com/slug/
          const baseUrl = project.domain.replace(/\/$/, ""); // Remove trailing slash
          url = `${baseUrl}/${response.data.slug}/`;
          this.logger.log(
            `WordPress returned ?p= URL, using slug instead: ${url}`,
          );
        }

        // Final check: if the constructed URL contains __trashed, the post was deleted
        if (url && url.includes("__trashed")) {
          this.logger.warn(`Post ${wpPostId} has trashed URL: ${url}`);
          return {
            success: false,
            message: "Este artigo foi excluído do WordPress",
            status: "trashed",
          };
        }

        if (url) {
          return { success: true, url };
        }
      }

      return { success: false, message: "Post not found or has no URL" };
    } catch (error: any) {
      this.logger.error(`Failed to get post URL: ${error.message}`);
      return {
        success: false,
        message: error.message || "Failed to fetch post URL",
      };
    }
  }

  /**
   * Fetch URL from WordPress and save it to the article
   * Uses redirect detection as primary method (simpler, no auth needed)
   * Falls back to WP API if redirect doesn't work
   */
  async syncArticleUrl(
    articleId: number,
    userId: string,
  ): Promise<{
    success: boolean;
    url?: string;
    slug?: string;
    message?: string;
  }> {
    this.logger.log(`Syncing URL for article ${articleId}`);

    // Get article with project info
    const { data: article, error: articleError } = await this.supabaseService
      .getClient()
      .from("articles")
      .select(
        `
        id,
        wpPost_id,
        url,
        slug,
        project_id,
        project:projects!inner(id, domain, login, pass, user_id, workspace_id)
      `,
      )
      .eq("id", articleId)
      .single();

    if (articleError || !article) {
      return { success: false, message: "Article not found" };
    }

    if (!article.wpPost_id) {
      return {
        success: false,
        message: "Article has no WordPress post ID",
      };
    }

    // Type assertion for Supabase join result
    const projectData = article.project as unknown;
    const project = (
      Array.isArray(projectData) ? projectData[0] : projectData
    ) as {
      id: number;
      domain: string;
      login: string;
      pass: string;
      user_id: string;
      workspace_id: string | null;
    };

    // Check user access
    const hasDirectAccess = project.user_id === userId;

    if (!hasDirectAccess && project.workspace_id) {
      const { data: membership } = await this.supabaseService
        .getClient()
        .from("workspace_members")
        .select("id")
        .eq("workspace_id", project.workspace_id)
        .eq("user_id", userId)
        .eq("status", "active")
        .single();

      if (!membership) {
        return { success: false, message: "Access denied" };
      }
    } else if (!hasDirectAccess) {
      return { success: false, message: "Access denied" };
    }

    if (!project.domain) {
      return {
        success: false,
        message: "Project does not have domain configured",
      };
    }

    // Method 1: Try to get URL by following redirect from ?p=ID
    // This is simpler and doesn't require WP credentials
    const redirectUrl = await this.getUrlByRedirect(
      project.domain,
      article.wpPost_id,
    );

    if (redirectUrl) {
      // Extract slug from URL
      const slug = this.extractSlugFromUrl(redirectUrl);

      // Update the article
      const { error: updateError } = await this.supabaseService
        .getClient()
        .from("articles")
        .update({
          url: redirectUrl,
          slug: slug || article.slug,
          url_added: true,
        })
        .eq("id", articleId);

      if (updateError) {
        this.logger.error(`Failed to update article: ${updateError.message}`);
        return { success: false, message: "Failed to save URL to article" };
      }

      this.logger.log(
        `Successfully synced URL for article ${articleId} via redirect: ${redirectUrl}`,
      );

      return {
        success: true,
        url: redirectUrl,
        slug: slug || undefined,
      };
    }

    // Method 2: Fallback to WP API if redirect didn't work and we have credentials
    if (project.login && project.pass) {
      return this.syncArticleUrlViaApi(articleId, article, project);
    }

    return {
      success: false,
      message: "Could not determine article URL. Post may not be published.",
    };
  }

  /**
   * Get the canonical URL by following the ?p=ID redirect
   */
  private async getUrlByRedirect(
    domain: string,
    wpPostId: number,
  ): Promise<string | null> {
    try {
      const baseUrl = domain.startsWith("http")
        ? domain.replace(/\/$/, "")
        : `https://${domain.replace(/\/$/, "")}`;

      const shortUrl = `${baseUrl}/?p=${wpPostId}`;

      this.logger.log(`Checking redirect for: ${shortUrl}`);

      // Use fetch with redirect: 'manual' to capture the redirect location
      const response = await fetch(shortUrl, {
        method: "HEAD",
        redirect: "manual",
        headers: {
          "User-Agent": "AlvoBot/1.0",
        },
      });

      // Check for redirect (301, 302, 307, 308)
      if ([301, 302, 307, 308].includes(response.status)) {
        const location = response.headers.get("location");
        if (location) {
          // Handle relative URLs
          const finalUrl = location.startsWith("http")
            ? location
            : `${baseUrl}${location}`;

          // Verify it's not still the ?p= format and not a trashed post
          if (!finalUrl.includes("?p=") && !finalUrl.includes("__trashed")) {
            this.logger.log(`Redirect resolved to: ${finalUrl}`);
            return finalUrl;
          }
        }
      }

      // If no redirect, try GET request and check final URL
      // Some WordPress setups do internal rewrites instead of redirects
      if (response.status === 200) {
        // For HEAD requests that return 200, the URL might already be canonical
        // We need to do a GET request to follow any internal rewrites
        const getResponse = await fetch(shortUrl, {
          method: "GET",
          redirect: "follow",
          headers: {
            "User-Agent": "AlvoBot/1.0",
          },
        });

        const finalUrl = getResponse.url;
        if (
          finalUrl &&
          !finalUrl.includes("?p=") &&
          !finalUrl.includes("__trashed") &&
          getResponse.status === 200
        ) {
          this.logger.log(`Final URL after following: ${finalUrl}`);
          return finalUrl;
        }
      }

      return null;
    } catch (error: any) {
      this.logger.warn(`Failed to get URL by redirect: ${error.message}`);
      return null;
    }
  }

  /**
   * Extract slug from a WordPress URL
   * e.g., https://example.com/my-post-slug/ -> my-post-slug
   */
  private extractSlugFromUrl(url: string): string | null {
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;

      // Remove leading/trailing slashes and get the last segment
      const segments = pathname.split("/").filter(Boolean);

      if (segments.length > 0) {
        return segments[segments.length - 1];
      }

      return null;
    } catch {
      return null;
    }
  }

  /**
   * Sync article URL using WordPress REST API (fallback method)
   */
  private async syncArticleUrlViaApi(
    articleId: number,
    article: { wpPost_id: number; slug?: string },
    project: {
      domain: string;
      login: string;
      pass: string;
    },
  ): Promise<{
    success: boolean;
    url?: string;
    slug?: string;
    message?: string;
  }> {
    try {
      const decryptedPassword = EncryptionUtil.isEncrypted(project.pass)
        ? EncryptionUtil.decrypt(project.pass)
        : project.pass;

      const client = new WordPressClient(
        project.domain,
        project.login,
        decryptedPassword,
      );

      const response = await client.get(
        `/wp-json/wp/v2/posts/${article.wpPost_id}?context=edit`,
      );

      if (!response.data) {
        return { success: false, message: "Post not found in WordPress" };
      }

      const wpPost = response.data;

      if (
        wpPost.status === "trash" ||
        wpPost.slug?.includes("__trashed") ||
        wpPost.link?.includes("__trashed")
      ) {
        return {
          success: false,
          message: "Post was deleted in WordPress",
        };
      }

      let url = wpPost.link;
      const slug = wpPost.slug;

      if (url && url.includes("?p=") && slug) {
        const baseUrl = project.domain.replace(/\/$/, "");
        url = `${baseUrl}/${slug}/`;
      }

      if (!url && !slug) {
        return { success: false, message: "Could not determine article URL" };
      }

      const updateData: { url?: string; slug?: string; url_added?: boolean } =
        {};

      if (url) {
        updateData.url = url;
        updateData.url_added = true;
      }
      if (slug) {
        updateData.slug = slug;
      }

      const { error: updateError } = await this.supabaseService
        .getClient()
        .from("articles")
        .update(updateData)
        .eq("id", articleId);

      if (updateError) {
        this.logger.error(`Failed to update article: ${updateError.message}`);
        return { success: false, message: "Failed to save URL to article" };
      }

      this.logger.log(
        `Successfully synced URL for article ${articleId} via API: ${url}`,
      );

      return {
        success: true,
        url: url || undefined,
        slug: slug || undefined,
      };
    } catch (error: any) {
      this.logger.error(`Failed to sync article URL via API: ${error.message}`);
      return {
        success: false,
        message: error.message || "Failed to fetch post from WordPress",
      };
    }
  }

  /**
   * Fetch URLs from WordPress and save them to multiple articles
   */
  async syncArticleUrlsBatch(
    articleIds: number[],
    userId: string,
  ): Promise<{
    success: boolean;
    results: Array<{
      articleId: number;
      success: boolean;
      url?: string;
      message?: string;
    }>;
    synced: number;
    failed: number;
  }> {
    this.logger.log(`Syncing URLs for ${articleIds.length} articles`);

    const results: Array<{
      articleId: number;
      success: boolean;
      url?: string;
      message?: string;
    }> = [];

    let synced = 0;
    let failed = 0;

    // Process articles sequentially to avoid rate limits
    for (const articleId of articleIds) {
      const result = await this.syncArticleUrl(articleId, userId);

      results.push({
        articleId,
        success: result.success,
        url: result.url,
        message: result.message,
      });

      if (result.success) {
        synced++;
      } else {
        failed++;
      }

      // Small delay to avoid overwhelming WordPress API
      await new Promise((resolve) => setTimeout(resolve, 200));
    }

    return {
      success: synced > 0,
      results,
      synced,
      failed,
    };
  }

  /**
   * Install all essential plugins sequentially
   */
  async installEssentialPlugins(
    dto: InstallEssentialPluginsDto,
    userId?: string,
  ): Promise<InstallEssentialPluginsResponse> {
    this.logger.log(
      `Installing essential plugins for project ${dto.projectId}`,
    );

    // Get project from database (including workspace_id for membership check)
    const { data: project, error } = await this.supabaseService.projects
      .select("*")
      .eq("id", dto.projectId)
      .single();

    if (error || !project) {
      throw new Error("Project not found");
    }

    // Check if user has access: either owns the project OR is a member of the workspace
    if (userId && userId !== "test-user-id") {
      const hasDirectAccess = project.user_id === userId;

      if (!hasDirectAccess && project.workspace_id) {
        const { data: membership } = await this.supabaseService
          .getClient()
          .from("workspace_members")
          .select("id")
          .eq("workspace_id", project.workspace_id)
          .eq("user_id", userId)
          .eq("status", "active")
          .single();

        if (!membership) {
          throw new Error("Project not found");
        }
      } else if (!hasDirectAccess) {
        throw new Error("Project not found");
      }
    }

    if (!project.domain || !project.login || !project.pass) {
      throw new Error("Project does not have WordPress credentials configured");
    }

    // Decrypt credentials (or use plain text if not encrypted)
    const decryptedPassword = EncryptionUtil.isEncrypted(project.pass)
      ? EncryptionUtil.decrypt(project.pass)
      : project.pass;

    const results: PluginInstallResponse[] = [];
    let installed = 0;
    let failed = 0;

    // Install plugins sequentially (not parallel to avoid race conditions)
    for (const plugin of ESSENTIAL_PLUGINS) {
      const result = await this.installPlugin(
        project.domain,
        project.login,
        decryptedPassword,
        dto.token,
        plugin.slug,
      );

      results.push(result);

      if (
        result.status === "installed" ||
        result.status === "already_installed"
      ) {
        installed++;
      } else {
        failed++;
      }
    }

    // Update project.plugins field in database
    try {
      const installedPlugins = results
        .filter(
          (r) => r.status === "installed" || r.status === "already_installed",
        )
        .map((r) => ({ slug: r.slug, name: r.name }));

      await this.supabaseService.projects
        .update({ plugins: installedPlugins })
        .eq("id", dto.projectId);
    } catch (err) {
      this.logger.error(`Failed to update project plugins: ${err.message}`);
    }

    return {
      totalPlugins: ESSENTIAL_PLUGINS.length,
      installed,
      failed,
      results,
    };
  }
}
