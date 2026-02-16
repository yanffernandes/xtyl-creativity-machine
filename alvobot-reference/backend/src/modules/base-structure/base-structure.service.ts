import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { ConfigService } from "@nestjs/config";
import { AiService } from "./services/ai.service";
import { WordPressService } from "./services/wordpress.service";
import type {
  SaveStructureResult,
  ArticleTitle,
  ArrowArticleContent,
  BaseArticleContent,
} from "./types";
import type { SaveStructureDto } from "./dto/save-structure.dto";

@Injectable()
export class BaseStructureService {
  private readonly logger = new Logger(BaseStructureService.name);
  private readonly supabase: SupabaseClient;

  constructor(
    private readonly configService: ConfigService,
    private readonly aiService: AiService,
    private readonly wordpressService: WordPressService,
  ) {
    const supabaseUrl = this.configService.get<string>("SUPABASE_URL");
    const supabaseKey = this.configService.get<string>("SUPABASE_SERVICE_KEY");

    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Supabase configuration missing");
    }

    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  /**
   * Verify that the user has access to a project (direct ownership or workspace membership)
   */
  private async verifyProjectAccess(
    projectId: number,
    userId: string,
  ): Promise<any | null> {
    const { data: project, error } = await this.supabase
      .from("projects")
      .select("*")
      .eq("id", projectId)
      .single();

    if (error || !project) {
      return null;
    }

    // Direct ownership
    if (project.user_id === userId) {
      return project;
    }

    // Workspace membership fallback
    if (project.workspace_id) {
      const { data: membership } = await this.supabase
        .from("workspace_members")
        .select("id")
        .eq("workspace_id", project.workspace_id)
        .eq("user_id", userId)
        .eq("status", "active")
        .single();

      if (membership) {
        return project;
      }
    }

    return null;
  }

  /**
   * Generate niche suggestions
   */
  async generateNiches(language: string, domain?: string): Promise<string[]> {
    return this.aiService.generateNiches(language, domain);
  }

  /**
   * Generate categories for a niche
   */
  async generateCategories(niche: string) {
    return this.aiService.generateCategories(niche);
  }

  /**
   * Generate article titles
   */
  async generateTitles(
    niche: string,
    categories: string[],
  ): Promise<ArticleTitle[]> {
    return this.aiService.generateTitles(niche, categories);
  }

  /**
   * Get existing WordPress categories for a project
   */
  async getWordPressCategories(
    projectId: number,
    userId: string,
  ): Promise<{ name: string; slug: string }[]> {
    // Fetch project and verify ownership or workspace membership
    const project = await this.verifyProjectAccess(projectId, userId);
    if (!project) {
      throw new NotFoundException("Project not found or access denied");
    }

    const wpUrl = project.url || project.domain;
    const alvobotToken = project.token;

    if (!wpUrl || !alvobotToken) {
      this.logger.warn("Project missing WordPress URL or token");
      return [];
    }

    try {
      const categories = await this.wordpressService.getCategories(
        wpUrl,
        alvobotToken,
      );
      return categories.map((cat) => ({
        name: cat.name,
        slug: cat.slug,
      }));
    } catch (error) {
      this.logger.error("Failed to fetch WordPress categories:", error);
      return [];
    }
  }

  /**
   * Save the complete structure to WordPress and Supabase
   */
  async saveStructure(
    dto: SaveStructureDto,
    userId: string,
  ): Promise<SaveStructureResult> {
    this.logger.log(`Saving structure for project ${dto.projectId}`);

    // 1. Fetch project and verify ownership or workspace membership
    const project = await this.verifyProjectAccess(dto.projectId, userId);
    if (!project) {
      throw new NotFoundException("Project not found or access denied");
    }

    const wpUrl = project.url || project.domain;
    const alvobotToken = project.token;

    if (!wpUrl || !alvobotToken) {
      throw new Error("Project missing WordPress URL or token");
    }

    const result: SaveStructureResult = {
      success: false,
      articlesCreated: 0,
      categoriesCreated: 0,
    };

    const promises: Promise<void>[] = [];

    // 2. Conditionally create author
    if (dto.authorToggle) {
      promises.push(
        this.createAuthor(dto.niche, wpUrl, alvobotToken)
          .then(() => {
            result.authorCreated = true;
          })
          .catch((error) => {
            // Log error but don't fail the whole operation
            // Author creation requires AlvoBot Pro plugin which may not be installed
            this.logger.warn(
              `Author creation failed (AlvoBot Pro plugin may not be installed): ${error.message}`,
            );
            result.authorCreated = false;
          }),
      );
    }

    // 3. Conditionally create logo
    if (dto.logoToggle) {
      promises.push(
        this.createLogo(dto.niche, wpUrl, alvobotToken)
          .then(() => {
            result.logoCreated = true;
          })
          .catch((error) => {
            this.logger.warn(
              `Logo creation failed (AlvoBot Pro plugin may not be installed): ${error.message}`,
            );
            result.logoCreated = false;
          }),
      );
    }

    // 4. Conditionally update title/description
    if (dto.titleToggle) {
      promises.push(
        this.updateBlogTitle(dto.niche, wpUrl, alvobotToken)
          .then(() => {
            result.titleUpdated = true;
          })
          .catch((error) => {
            this.logger.warn(`Blog title update failed: ${error.message}`);
            result.titleUpdated = false;
          }),
      );
    }

    // 5. Create categories on WordPress
    const wpCategories = await this.wordpressService.createCategories(
      wpUrl,
      alvobotToken,
      dto.categories,
    );
    result.categoriesCreated = wpCategories.length;

    // 6. Save articles to Supabase (as base articles for approval)
    // Note: The 'articles' table doesn't have a 'category' text column
    // Category association is done via wpCategories_id when publishing to WordPress
    // Status is left null so automation can pick up the articles
    const articlesToInsert = dto.articles.map((article) => ({
      project_id: dto.projectId,
      user_id: userId,
      title: article.title,
      is_approval_article: true, // Mark as base/approval article
      url_added: false,
      created_at: new Date().toISOString(),
    }));

    const { data: insertedArticles, error: insertError } = await this.supabase
      .from("articles")
      .insert(articlesToInsert)
      .select();

    if (insertError) {
      this.logger.error("Failed to insert articles:", insertError);
      throw insertError;
    }

    result.articlesCreated = insertedArticles?.length || 0;

    // 7. Update project with niche
    await this.supabase
      .from("projects")
      .update({ niche: dto.niche, updated_at: new Date().toISOString() })
      .eq("id", dto.projectId);

    // 8. Wait for all parallel operations
    try {
      await Promise.all(promises);
    } catch (error) {
      this.logger.error("Some parallel operations failed:", error);
      // Continue - partial success is acceptable
    }

    result.success = true;
    this.logger.log(`Structure saved successfully: ${JSON.stringify(result)}`);

    return result;
  }

  /**
   * Create author on WordPress
   */
  private async createAuthor(
    niche: string,
    wpUrl: string,
    token: string,
  ): Promise<void> {
    this.logger.debug("Creating author...");

    // 1. Generate author persona via AI
    const authorData = await this.aiService.generateAuthor(niche);

    // 2. Fetch profile image from pool
    const { data: image } = await this.supabase
      .from("author_profile_images")
      .select("*")
      .eq("sex", authorData.sex)
      .gt("age", 20)
      .order("usage_count", { ascending: true })
      .limit(1)
      .single();

    let imageBase64: string | undefined;

    if (image) {
      // 3. Increment usage count
      await this.supabase
        .from("author_profile_images")
        .update({ usage_count: (image.usage_count || 0) + 1 })
        .eq("id", image.id);

      // 4. Download and convert to base64
      try {
        const imageUrl = `https://qbmbokpbcyempnaravaw.supabase.co/storage/v1/object/public/${image.path}`;
        const response = await fetch(imageUrl);
        const arrayBuffer = await response.arrayBuffer();
        imageBase64 = Buffer.from(arrayBuffer).toString("base64");
      } catch {
        this.logger.warn("Failed to fetch author image, proceeding without");
      }
    }

    // 5. Update author on WordPress
    await this.wordpressService.updateAuthor(
      wpUrl,
      token,
      authorData,
      imageBase64,
    );
  }

  /**
   * Create logo on WordPress
   */
  private async createLogo(
    niche: string,
    wpUrl: string,
    token: string,
  ): Promise<void> {
    this.logger.debug("Creating logo...");

    // 1. Generate logo config via AI
    const logoConfig = await this.aiService.generateLogoConfig(niche);

    // 2. Get blog name
    const settings = await this.wordpressService.getSettings(wpUrl, token);
    const blogName = settings.title || "Blog";

    // 3. Create logo on WordPress
    await this.wordpressService.createLogo(wpUrl, token, logoConfig, blogName);
  }

  /**
   * Update blog title and description on WordPress
   */
  private async updateBlogTitle(
    niche: string,
    wpUrl: string,
    token: string,
  ): Promise<void> {
    this.logger.debug("Updating blog title...");

    // 1. Generate title/description via AI
    const blogSettings = await this.aiService.generateBlogTitleDescription(
      niche,
      wpUrl,
    );

    // 2. Update WordPress settings
    await this.wordpressService.updateSettings(wpUrl, token, blogSettings);
  }

  /**
   * Generate arrow article content from keyword
   */
  async generateArrowArticleContent(
    keyword: string,
    title?: string,
    excerpt?: string,
    language?: string,
    country?: string,
  ): Promise<ArrowArticleContent> {
    return this.aiService.generateArrowArticleContent(
      keyword,
      title,
      excerpt,
      language,
      country,
    );
  }

  /**
   * Generate base article content from title
   */
  async generateBaseArticleContent(
    title: string,
    excerpt?: string,
  ): Promise<BaseArticleContent> {
    return this.aiService.generateBaseArticleContent(title, excerpt);
  }
}
