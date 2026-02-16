import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import {
  LibraryQueryDto,
  LibraryCreativeDto,
  LibraryResponseDto,
  LibraryFilterOptionsDto,
} from "../dto/creative-library.dto";

interface CreativeLibraryRow {
  id: string;
  user_id: string;
  workspace_id: string | null;
  image_url: string;
  storage_path: string;
  article_id: number | null;
  model_used: string;
  style_used: string | null;
  prompt_used: string | null;
  format: string;
  status: "approved" | "deleted";
  created_at: string;
  updated_at: string;
  session_id: string | null;
  concept_id: string | null;
}

interface ArticleRow {
  id: number;
  title: string;
  project_id: number | null;
  language: string | null;
}

interface ProjectRow {
  id: number;
  default_language: string | null;
  niche_selected: string | null;
}

interface GenerationSessionRow {
  id: string;
  detected_niche: string | null;
}

interface ConceptRow {
  id: string;
  slug: string;
  name: string;
}

@Injectable()
export class CreativeLibraryService {
  private readonly logger = new Logger(CreativeLibraryService.name);
  private readonly supabase: SupabaseClient;

  constructor(private configService: ConfigService) {
    const supabaseUrl = this.configService.get<string>("SUPABASE_URL");
    const supabaseServiceKey = this.configService.get<string>(
      "SUPABASE_SERVICE_KEY",
    );

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("SUPABASE_URL and SUPABASE_SERVICE_KEY must be defined");
    }

    this.supabase = createClient(supabaseUrl, supabaseServiceKey);
  }

  /**
   * List creative library with filters and pagination
   * When workspaceId is provided: show all workspace creatives (from any member)
   * When workspaceId is null: show only user's personal creatives
   */
  async listLibrary(
    userId: string,
    workspaceId: string | null,
    query: LibraryQueryDto,
  ): Promise<LibraryResponseDto> {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const offset = (page - 1) * limit;

    try {
      // Build query - filter by workspace OR by user (not both)
      let supabaseQuery = this.supabase
        .from("creative_library")
        .select("*", { count: "exact" })
        .eq("status", "approved")
        .order("created_at", { ascending: false });

      // Workspace mode: show all creatives from workspace members
      // Personal mode: show only user's own creatives
      if (workspaceId) {
        supabaseQuery = supabaseQuery.eq("workspace_id", workspaceId);
      } else {
        supabaseQuery = supabaseQuery.eq("user_id", userId);
      }

      // Add optional filters
      if (query.articleId) {
        supabaseQuery = supabaseQuery.eq("article_id", query.articleId);
      }
      if (query.model) {
        // Support both full provider/model and short model names
        if (query.model.includes("/")) {
          supabaseQuery = supabaseQuery.eq("model_used", query.model);
        } else {
          supabaseQuery = supabaseQuery.or(
            `model_used.ilike.%/${query.model},model_used.eq.${query.model}`,
          );
        }
      }
      if (query.style) {
        supabaseQuery = supabaseQuery.eq("style_used", query.style);
      }
      if (query.format) {
        supabaseQuery = supabaseQuery.eq("format", query.format);
      }

      // Apply pagination
      supabaseQuery = supabaseQuery.range(offset, offset + limit - 1);

      const { data: creatives, error, count } = await supabaseQuery;

      if (error) {
        this.logger.error(`Failed to list library: ${error.message}`);
        throw error;
      }

      // Fetch article data with project info for creatives that have article_id
      const articleIds = [
        ...new Set(
          (creatives || [])
            .filter((c: CreativeLibraryRow) => c.article_id !== null)
            .map((c: CreativeLibraryRow) => c.article_id),
        ),
      ];

      // Fetch session data for niche info
      const sessionIds = [
        ...new Set(
          (creatives || [])
            .filter((c: CreativeLibraryRow) => c.session_id !== null)
            .map((c: CreativeLibraryRow) => c.session_id),
        ),
      ];

      // Article info (title + project_id + language)
      let articleData: Record<
        number,
        { title: string; projectId: number | null; language: string | null }
      > = {};
      let projectData: Record<
        number,
        { language: string | null; niche: string | null }
      > = {};

      if (articleIds.length > 0) {
        const { data: articles } = await this.supabase
          .from("articles")
          .select("id, title, project_id, language")
          .in("id", articleIds);

        if (articles) {
          const projectIds = [
            ...new Set(
              (articles as ArticleRow[])
                .filter((a) => a.project_id !== null)
                .map((a) => a.project_id),
            ),
          ];

          // Fetch project data for language and niche
          if (projectIds.length > 0) {
            const { data: projects } = await this.supabase
              .from("projects")
              .select("id, default_language, niche_selected")
              .in("id", projectIds);

            if (projects) {
              projectData = (projects as ProjectRow[]).reduce(
                (acc, project) => {
                  acc[project.id] = {
                    language: project.default_language,
                    niche: project.niche_selected,
                  };
                  return acc;
                },
                {} as Record<
                  number,
                  { language: string | null; niche: string | null }
                >,
              );
            }
          }

          articleData = (articles as ArticleRow[]).reduce(
            (acc, article) => {
              acc[article.id] = {
                title: article.title,
                projectId: article.project_id,
                language: article.language,
              };
              return acc;
            },
            {} as Record<
              number,
              {
                title: string;
                projectId: number | null;
                language: string | null;
              }
            >,
          );
        }
      }

      // Session info for detected_niche (primary source)
      let sessionNiches: Record<string, string | null> = {};
      if (sessionIds.length > 0) {
        const { data: sessions } = await this.supabase
          .from("generation_sessions")
          .select("id, detected_niche")
          .in("id", sessionIds);

        if (sessions) {
          sessionNiches = (sessions as GenerationSessionRow[]).reduce(
            (acc, session) => {
              acc[session.id] = session.detected_niche;
              return acc;
            },
            {} as Record<string, string | null>,
          );
        }
      }

      // Concept info for Andromeda tracking
      const conceptIds = [
        ...new Set(
          (creatives || [])
            .filter((c: CreativeLibraryRow) => c.concept_id !== null)
            .map((c: CreativeLibraryRow) => c.concept_id),
        ),
      ];

      let conceptData: Record<string, ConceptRow> = {};
      if (conceptIds.length > 0) {
        const { data: concepts } = await this.supabase
          .from("creative_concepts")
          .select("id, slug, name")
          .in("id", conceptIds);

        if (concepts) {
          conceptData = (concepts as ConceptRow[]).reduce(
            (acc, concept) => {
              acc[concept.id] = concept;
              return acc;
            },
            {} as Record<string, ConceptRow>,
          );
        }
      }

      // Map to response format with niche, language, and concept info
      let data: LibraryCreativeDto[] = (creatives || []).map(
        (creative: CreativeLibraryRow) => {
          const article = creative.article_id
            ? articleData[creative.article_id]
            : null;
          const project = article?.projectId
            ? projectData[article.projectId]
            : null;
          const sessionNiche = creative.session_id
            ? sessionNiches[creative.session_id]
            : null;
          const concept = creative.concept_id
            ? conceptData[creative.concept_id]
            : null;

          // Niche priority: session detected_niche > project niche_selected
          const niche = sessionNiche || project?.niche || null;
          // Language priority: article.language > project.default_language
          const language = article?.language || project?.language || null;

          return {
            id: creative.id,
            imageUrl: creative.image_url,
            articleId: creative.article_id,
            articleTitle: article?.title || null,
            model: creative.model_used,
            style: creative.style_used,
            format: creative.format,
            createdAt: creative.created_at,
            niche,
            language,
            // Andromeda concept tracking
            conceptId: creative.concept_id,
            conceptInfo: concept
              ? {
                  id: concept.id,
                  slug: concept.slug,
                  name: concept.name,
                }
              : null,
            promptUsed: creative.prompt_used,
          };
        },
      );

      // Apply post-fetch filters for niche and language (since they come from joins)
      if (query.niche) {
        data = data.filter((c) => c.niche === query.niche);
      }
      if (query.language) {
        data = data.filter((c) => c.language === query.language);
      }

      const total = query.niche || query.language ? data.length : count || 0;
      const totalPages = Math.ceil(total / limit);

      // If filtering by niche/language, we need to re-paginate
      if (query.niche || query.language) {
        data = data.slice(offset, offset + limit);
      }

      return {
        data,
        pagination: {
          page,
          limit,
          total,
          totalPages,
        },
      };
    } catch (error) {
      this.logger.error("Error listing creative library:", error);
      throw error;
    }
  }

  /**
   * Get filter options for library (distinct articles, niches, languages)
   * When workspaceId is provided: show options from all workspace creatives
   * When workspaceId is null: show options from user's personal creatives only
   */
  async getFilterOptions(
    userId: string,
    workspaceId: string | null,
  ): Promise<LibraryFilterOptionsDto> {
    try {
      // Build base query - filter by workspace OR by user (not both)
      let baseQuery = this.supabase
        .from("creative_library")
        .select("article_id, model_used, session_id")
        .eq("status", "approved");

      // Workspace mode: show filters from all workspace creatives
      // Personal mode: show filters from user's own creatives only
      if (workspaceId) {
        baseQuery = baseQuery.eq("workspace_id", workspaceId);
      } else {
        baseQuery = baseQuery.eq("user_id", userId);
      }

      const { data: creatives, error } = await baseQuery;

      if (error) {
        this.logger.error(`Failed to get filter options: ${error.message}`);
        throw error;
      }

      // Get unique article IDs
      const articleIds = [
        ...new Set(
          (creatives || [])
            .filter((c) => c.article_id !== null)
            .map((c) => c.article_id),
        ),
      ];

      // Get unique session IDs
      const sessionIds = [
        ...new Set(
          (creatives || [])
            .filter((c) => c.session_id !== null)
            .map((c) => c.session_id),
        ),
      ];

      // Get unique models
      const models = [
        ...new Set((creatives || []).map((c) => c.model_used).filter(Boolean)),
      ];

      // Fetch articles with titles and project info
      const articles: Array<{ id: number; title: string }> = [];
      const niches = new Set<string>();
      const languages = new Set<string>();

      if (articleIds.length > 0) {
        const { data: articleRows } = await this.supabase
          .from("articles")
          .select("id, title, project_id, language")
          .in("id", articleIds)
          .order("title");

        if (articleRows) {
          for (const article of articleRows as ArticleRow[]) {
            articles.push({ id: article.id, title: article.title });

            // Add article language if exists (priority source)
            if (article.language) {
              languages.add(article.language);
            }

            if (article.project_id) {
              const { data: project } = await this.supabase
                .from("projects")
                .select("default_language, niche_selected")
                .eq("id", article.project_id)
                .single();

              if (project) {
                // Add project language as fallback
                if (project.default_language) {
                  languages.add(project.default_language);
                }
                if (project.niche_selected) {
                  niches.add(project.niche_selected);
                }
              }
            }
          }
        }
      }

      // Fetch session niches (primary source for niche)
      if (sessionIds.length > 0) {
        const { data: sessions } = await this.supabase
          .from("generation_sessions")
          .select("detected_niche")
          .in("id", sessionIds);

        if (sessions) {
          for (const session of sessions as GenerationSessionRow[]) {
            if (session.detected_niche) {
              niches.add(session.detected_niche);
            }
          }
        }
      }

      return {
        articles,
        niches: [...niches].sort(),
        languages: [...languages].sort(),
        models: models.sort(),
      };
    } catch (error) {
      this.logger.error("Error getting filter options:", error);
      throw error;
    }
  }

  /**
   * Get a single creative by ID
   */
  async getCreative(
    userId: string,
    creativeId: string,
  ): Promise<LibraryCreativeDto | null> {
    try {
      const { data: creative, error } = await this.supabase
        .from("creative_library")
        .select("*")
        .eq("id", creativeId)
        .eq("user_id", userId)
        .eq("status", "approved")
        .single();

      if (error || !creative) {
        return null;
      }

      // Fetch article title and project info if exists
      let articleTitle: string | null = null;
      let language: string | null = null;
      let niche: string | null = null;

      if (creative.article_id) {
        const { data: article } = await this.supabase
          .from("articles")
          .select("title, project_id, language")
          .eq("id", creative.article_id)
          .single();

        articleTitle = article?.title || null;
        // Priority: article.language > project.default_language
        language = article?.language || null;

        // Fetch project for fallback language and niche
        if (article?.project_id) {
          const { data: project } = await this.supabase
            .from("projects")
            .select("default_language, niche_selected")
            .eq("id", article.project_id)
            .single();

          // Use project language only as fallback
          if (!language && project?.default_language) {
            language = project.default_language;
          }
          niche = project?.niche_selected || null;
        }
      }

      // Session niche takes priority over project niche
      if (creative.session_id) {
        const { data: session } = await this.supabase
          .from("generation_sessions")
          .select("detected_niche")
          .eq("id", creative.session_id)
          .single();

        if (session?.detected_niche) {
          niche = session.detected_niche;
        }
      }

      // Fetch concept info if exists
      let conceptInfo = null;
      if (creative.concept_id) {
        const { data: concept } = await this.supabase
          .from("creative_concepts")
          .select("id, slug, name")
          .eq("id", creative.concept_id)
          .single();

        if (concept) {
          conceptInfo = {
            id: concept.id,
            slug: concept.slug,
            name: concept.name,
          };
        }
      }

      return {
        id: creative.id,
        imageUrl: creative.image_url,
        articleId: creative.article_id,
        articleTitle,
        model: creative.model_used,
        style: creative.style_used,
        format: creative.format,
        createdAt: creative.created_at,
        niche,
        language,
        // Andromeda concept tracking
        conceptId: creative.concept_id,
        conceptInfo,
        promptUsed: creative.prompt_used,
      };
    } catch (error) {
      this.logger.error(`Error getting creative ${creativeId}:`, error);
      throw error;
    }
  }

  /**
   * Soft delete a creative (set status to 'deleted')
   */
  async deleteCreative(userId: string, creativeId: string): Promise<void> {
    try {
      // First check if the creative exists and belongs to the user
      const { data: existing, error: fetchError } = await this.supabase
        .from("creative_library")
        .select("id")
        .eq("id", creativeId)
        .eq("user_id", userId)
        .single();

      if (fetchError || !existing) {
        throw new NotFoundException(`Criativo ${creativeId} não encontrado`);
      }

      // Soft delete by updating status
      const { error: updateError } = await this.supabase
        .from("creative_library")
        .update({ status: "deleted", updated_at: new Date().toISOString() })
        .eq("id", creativeId)
        .eq("user_id", userId);

      if (updateError) {
        this.logger.error(`Failed to delete creative: ${updateError.message}`);
        throw updateError;
      }

      this.logger.log(`Creative ${creativeId} soft deleted by user ${userId}`);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Error deleting creative ${creativeId}:`, error);
      throw error;
    }
  }

  /**
   * Get library statistics for a user
   * When workspaceId is provided: show stats from all workspace creatives
   * When workspaceId is null: show stats from user's personal creatives only
   */
  async getLibraryStats(
    userId: string,
    workspaceId?: string | null,
  ): Promise<{
    totalCreatives: number;
    byModel: Record<string, number>;
    byFormat: Record<string, number>;
  }> {
    try {
      // Build query - filter by workspace OR by user (not both)
      let query = this.supabase
        .from("creative_library")
        .select("model_used, format")
        .eq("status", "approved");

      // Workspace mode: show stats from all workspace creatives
      // Personal mode: show stats from user's own creatives only
      if (workspaceId) {
        query = query.eq("workspace_id", workspaceId);
      } else {
        query = query.eq("user_id", userId);
      }

      const { data: creatives, error } = await query;

      if (error) {
        throw error;
      }

      const byModel: Record<string, number> = {};
      const byFormat: Record<string, number> = {};

      (creatives || []).forEach(
        (creative: { model_used: string; format: string }) => {
          byModel[creative.model_used] =
            (byModel[creative.model_used] || 0) + 1;
          byFormat[creative.format] = (byFormat[creative.format] || 0) + 1;
        },
      );

      return {
        totalCreatives: creatives?.length || 0,
        byModel,
        byFormat,
      };
    } catch (error) {
      this.logger.error("Error getting library stats:", error);
      throw error;
    }
  }

  // ============================================
  // Pending Generations Methods
  // ============================================

  /**
   * List pending generations for a user
   */
  async listPendingGenerations(userId: string): Promise<
    Array<{
      id: string;
      provider: string;
      model: string;
      status: string;
      createdAt: string;
      expiresAt: string;
    }>
  > {
    try {
      const { data, error } = await this.supabase
        .from("pending_image_generations")
        .select("id, provider, model, status, created_at, expires_at")
        .eq("user_id", userId)
        .in("status", ["pending"])
        .order("created_at", { ascending: false });

      if (error) {
        this.logger.error(
          `Failed to list pending generations: ${error.message}`,
        );
        throw error;
      }

      return (data || []).map((row) => ({
        id: row.id,
        provider: row.provider,
        model: row.model,
        status: row.status,
        createdAt: row.created_at,
        expiresAt: row.expires_at,
      }));
    } catch (error) {
      this.logger.error("Error listing pending generations:", error);
      throw error;
    }
  }

  /**
   * Get a single pending generation
   */
  async getPendingGeneration(
    userId: string,
    id: string,
  ): Promise<{
    id: string;
    provider: string;
    provider_prediction_id: string;
    model: string;
    prompt: string;
    format: string;
    status: string;
    image_url: string | null;
    storage_path: string | null;
    error_message: string | null;
    article_id: number | null;
    workspace_id: string | null;
    expires_at: string;
  } | null> {
    try {
      const { data, error } = await this.supabase
        .from("pending_image_generations")
        .select("*")
        .eq("id", id)
        .eq("user_id", userId)
        .single();

      if (error || !data) {
        return null;
      }

      return data;
    } catch (error) {
      this.logger.error(`Error getting pending generation ${id}:`, error);
      return null;
    }
  }

  /**
   * Update a pending generation record
   */
  async updatePendingGeneration(
    id: string,
    updates: {
      status?: string;
      image_url?: string;
      storage_path?: string;
      error_message?: string;
      completed_at?: string;
    },
  ): Promise<void> {
    try {
      const { error } = await this.supabase
        .from("pending_image_generations")
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) {
        this.logger.error(
          `Failed to update pending generation: ${error.message}`,
        );
        throw error;
      }
    } catch (error) {
      this.logger.error(`Error updating pending generation ${id}:`, error);
      throw error;
    }
  }

  /**
   * Batch get pending generation statuses for multiple IDs
   * Used by the frontend polling hook to check multiple pending generations at once
   */
  async batchGetPendingStatus(
    userId: string,
    ids: string[],
  ): Promise<
    Array<{
      id: string;
      status: string;
      error_message: string | null;
      image_url: string | null;
      storage_path: string | null;
      creative?: {
        id: string;
        imageUrl: string;
        storagePath: string;
      };
    }>
  > {
    if (ids.length === 0) return [];

    try {
      const { data, error } = await this.supabase
        .from("pending_image_generations")
        .select("id, status, error_message, image_url, storage_path")
        .eq("user_id", userId)
        .in("id", ids);

      if (error) {
        this.logger.error(
          `Failed to batch get pending status: ${error.message}`,
        );
        throw error;
      }

      return (data || []).map((row) => ({
        id: row.id,
        status: row.status,
        error_message: row.error_message,
        image_url: row.image_url,
        storage_path: row.storage_path,
        creative:
          row.status === "completed" && row.image_url
            ? {
                id: row.id,
                imageUrl: row.image_url,
                storagePath: row.storage_path || "",
              }
            : undefined,
      }));
    } catch (error) {
      this.logger.error("Error batch getting pending status:", error);
      throw error;
    }
  }

  /**
   * Create a new pending generation record
   */
  async createPendingGeneration(data: {
    user_id: string;
    workspace_id?: string | null;
    article_id?: number | null;
    provider: string;
    provider_prediction_id: string;
    model: string;
    prompt: string;
    format: string;
    metadata?: Record<string, unknown>;
  }): Promise<string> {
    try {
      const { data: result, error } = await this.supabase
        .from("pending_image_generations")
        .insert({
          user_id: data.user_id,
          workspace_id: data.workspace_id || null,
          article_id: data.article_id || null,
          provider: data.provider,
          provider_prediction_id: data.provider_prediction_id,
          model: data.model,
          prompt: data.prompt,
          format: data.format,
          status: "pending",
          metadata: data.metadata || {},
        })
        .select("id")
        .single();

      if (error) {
        this.logger.error(
          `Failed to create pending generation: ${error.message}`,
        );
        throw error;
      }

      this.logger.log(
        `Created pending generation ${result.id} for prediction ${data.provider_prediction_id}`,
      );

      return result.id;
    } catch (error) {
      this.logger.error("Error creating pending generation:", error);
      throw error;
    }
  }
}
