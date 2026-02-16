import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  Logger,
  BadRequestException,
  HttpCode,
  HttpStatus,
  Sse,
  MessageEvent,
} from "@nestjs/common";
import { Observable } from "rxjs";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import {
  AiCreativeService,
  PendingGenerationException,
} from "./services/ai-creative.service";
import { CreditsService, CREDIT_COSTS } from "./services/credits.service";
import { ReplicateService } from "../replicate/replicate.service";
import { CreativeLibraryService } from "./services/creative-library.service";
import {
  PromptComposerService,
  CreativeConcept,
  LocalizationRule,
  TextOverlay,
} from "./services/prompt-composer.service";
import { NicheDetectorService } from "./services/niche-detector.service";
import {
  GenerateImagesDto,
  RegenerateImageDto,
  GenerateAdCopyDto,
  GeneratedImageResult,
  GenerateImagesResponse,
  GenerateAdCopyResponse,
  ImageFormat,
} from "./dto/generate-image.dto";
import {
  LibraryQueryDto,
  CreditsPreviewDto,
  LibraryResponseDto,
  CreditsPreviewResponseDto,
  LibraryFilterOptionsDto,
} from "./dto/creative-library.dto";
import {
  GenerateCreativesDto,
  GenerateCreativesResponseDto,
  GeneratedCreativeResultDto,
  GenerationMode,
  DetectNicheDto,
  DetectNicheResponseDto,
} from "./dto/generate-creative.dto";
import {
  InitCreativeGenerationDto,
  InitCreativeGenerationResponseDto,
  RetryGenerationDto,
  CreativeSlotDto,
} from "./dto/creative-stream.dto";
import { CreativeSessionService } from "./services/creative-session.service";
import { v4 as uuidv4 } from "uuid";
import { buildLocalizationContext } from "./data/localization-data";

interface AuthenticatedRequest extends Request {
  user: {
    sub: string; // User ID from JWT
    email?: string;
  };
}

@Controller("meta/creatives")
@UseGuards(JwtAuthGuard)
export class CreativeController {
  private readonly logger = new Logger(CreativeController.name);

  constructor(
    private readonly aiCreativeService: AiCreativeService,
    private readonly creditsService: CreditsService,
    private readonly creativeLibraryService: CreativeLibraryService,
    private readonly promptComposerService: PromptComposerService,
    private readonly nicheDetectorService: NicheDetectorService,
    private readonly replicateService: ReplicateService,
    private readonly creativeSessionService: CreativeSessionService,
  ) {}

  // ============================================
  // Image Generation Endpoints
  // ============================================

  /**
   * POST /meta/creatives/generate-images
   * Generate AI images for multiple articles
   */
  @Post("generate-images")
  async generateImages(
    @Request() req: AuthenticatedRequest,
    @Body() dto: GenerateImagesDto,
  ): Promise<GenerateImagesResponse> {
    const userId = req.user.sub;
    const workspaceId = dto.workspaceId || null;
    this.logger.log(`User ${userId} requesting ${dto.count} images`);

    // 1. Validate credits (workspace-aware)
    const creditCheck = await this.creditsService.checkCredits(
      userId,
      "CREATIVE_AI_GENERATED",
      dto.count,
      workspaceId,
    );

    if (!creditCheck.hasCredits) {
      throw new BadRequestException(
        `Créditos insuficientes. Necessário: ${creditCheck.required}, Disponível: ${creditCheck.available}`,
      );
    }

    // 2. Generate images
    const results: GeneratedImageResult[] = [];
    let totalGenerated = 0;
    let totalFailed = 0;
    let styleIndex = 0;

    for (const article of dto.articles) {
      for (
        let adsetIndex = 0;
        adsetIndex < dto.count / dto.articles.length;
        adsetIndex++
      ) {
        const style = this.aiCreativeService.getStyleForIndex(styleIndex);
        styleIndex++;

        try {
          // Generate image prompt
          const promptBundle =
            await this.aiCreativeService.generateImagePromptJson(
              article,
              style,
              dto.format,
              dto.userDirections,
            );

          // Generate image using admin-configured model (with fallback)
          const imageResult =
            await this.aiCreativeService.generateImageWithConfiguredModel(
              promptBundle.promptText,
              dto.format,
            );

          // Upload to storage
          const filename = `creative_${article.id}_${adsetIndex}_${Date.now()}.png`;
          const storage = await this.aiCreativeService.uploadImageToStorage(
            imageResult.imageBase64,
            imageResult.mimeType,
            userId,
            filename,
          );

          // Save to library
          const libraryId = await this.aiCreativeService.saveToLibrary(
            userId,
            dto.workspaceId || null,
            storage.url,
            storage.path,
            article.id,
            imageResult.modelUsed,
            style,
            promptBundle.promptJson,
            dto.format,
          );

          results.push({
            id: libraryId,
            articleId: article.id,
            imageUrl: storage.url,
            storagePath: storage.path,
            model: imageResult.modelUsed,
            style: style,
            promptUsed: promptBundle.promptJson,
            format: dto.format,
            status: "completed",
            adsetIndex: adsetIndex,
          });

          totalGenerated++;
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "Unknown error";
          const errorStack = error instanceof Error ? error.stack : "";
          this.logger.error(
            `Failed to generate image for article ${article.id}: ${errorMessage}`,
          );
          this.logger.error(`Stack trace: ${errorStack}`);

          results.push({
            id: uuidv4(),
            articleId: article.id,
            imageUrl: "",
            storagePath: "",
            model: dto.model,
            style: style,
            promptUsed: "",
            format: dto.format,
            status: "failed",
            error: error instanceof Error ? error.message : "Generation failed",
            adsetIndex: adsetIndex,
          });

          totalFailed++;
        }
      }
    }

    // 3. Consume credits for successful generations (workspace-aware)
    if (totalGenerated > 0) {
      await this.creditsService.consumeCredits(
        userId,
        "CREATIVE_AI_GENERATED",
        totalGenerated,
        {
          resourceType: "meta_creative",
          description: `Geração de ${totalGenerated} imagens por IA`,
          workspaceId,
        },
      );
    }

    return {
      images: results,
      creditsConsumed: totalGenerated * CREDIT_COSTS.CREATIVE_AI_GENERATED,
      totalGenerated,
      totalFailed,
    };
  }

  // ============================================
  // T025: Concept-Based Generation Endpoint (Andromeda)
  // ============================================

  /**
   * POST /meta/creatives/generate
   * Generate diverse creatives using concept-based prompts
   * Supports both preset mode (user selects concepts) and free mode (AI selects)
   */
  @Post("generate")
  async generateCreatives(
    @Request() req: AuthenticatedRequest,
    @Body() dto: GenerateCreativesDto,
  ): Promise<GenerateCreativesResponseDto> {
    const userId = req.user.sub;
    const workspaceId = dto.workspaceId || null;
    // T079: Only use sessionId from DTO if explicitly provided (and exists in generation_sessions)
    // Don't auto-generate as it would violate FK constraint
    const sessionId = dto.sessionId || null;
    const responseSessionId = sessionId || uuidv4(); // For response tracking only
    const startTime = Date.now();

    this.logger.log(
      `User ${userId} requesting ${dto.count} diverse creatives (mode: ${dto.mode})`,
    );

    // 1. Validate credits (workspace-aware)
    const creditCheck = await this.creditsService.checkCredits(
      userId,
      "CREATIVE_AI_GENERATED",
      dto.count,
      workspaceId,
    );

    if (!creditCheck.hasCredits) {
      throw new BadRequestException(
        `Créditos insuficientes. Necessário: ${creditCheck.required}, Disponível: ${creditCheck.available}`,
      );
    }

    // 2. Detect niche from articles
    const nicheResult = await this.nicheDetectorService.detectNiche(
      dto.articles.map((a) => ({
        id: a.id,
        title: a.title,
        keyword: a.keyword,
        excerpt: a.excerpt,
      })),
    );

    this.logger.debug(
      `Detected niche: ${nicheResult.detectedNiche} (confidence: ${nicheResult.confidence})`,
    );

    // 3. Get niche template if applicable
    const nicheTemplate = nicheResult.applySpecializedTemplate
      ? await this.promptComposerService.getNicheTemplate(
          nicheResult.detectedNiche,
        )
      : undefined;

    // 4. Build ordered concept sequence (respects mode + diversity)
    const { sequence: conceptSequence, autoDirectionsByArticleId } =
      await this.buildConceptSequence(dto, nicheResult.detectedNiche);
    if (conceptSequence.length !== dto.count) {
      throw new BadRequestException(
        `Unable to build concept sequence for ${dto.count} creatives.`,
      );
    }

    // 5. Pre-calculate all generation tasks with diversity controls
    interface GenerationTask {
      index: number;
      article: (typeof dto.articles)[0];
      concept: CreativeConcept;
      background: Awaited<
        ReturnType<typeof this.promptComposerService.selectNextBackground>
      > | null;
      visualGroup: Awaited<
        ReturnType<typeof this.promptComposerService.selectRandomVisualGroup>
      > | null;
      autoDirections?: string;
      textOverlay?: TextOverlay;
      forcedModelId: string;
    }

    const generationTasks: GenerationTask[] = [];
    const preUsedBackgrounds: string[] = [];
    const preUsedVisualGroups: string[] = [];
    const usedLayoutSignatures: string[] = [];
    const usedTitles: string[] = [];
    const usedSubtexts: string[] = [];
    const usedCtas: string[] = [];
    const usedValueSets: string[] = [];
    const modelIds = this.aiCreativeService.getAvailableModelIds();
    if (modelIds.length < 2) {
      this.logger.warn(
        "Only one image model configured; consecutive model diversity cannot be enforced.",
      );
    }
    const layoutProfiles = this.getLayoutProfiles();
    let lastBackgroundCategory: string | null = null;
    let lastForcedModelId: string | null = null;

    for (let index = 0; index < conceptSequence.length; index++) {
      const articleIndex = index % dto.articles.length;
      const article = dto.articles[articleIndex];
      const concept = conceptSequence[index];

      const background = await this.promptComposerService.selectNextBackground(
        preUsedBackgrounds,
        nicheResult.detectedNiche,
        lastBackgroundCategory,
      );
      if (background) {
        preUsedBackgrounds.push(background.slug);
        lastBackgroundCategory = background.category || null;
      }

      const visualGroup =
        nicheResult.detectedNiche === "financial"
          ? await this.promptComposerService.selectRandomVisualGroup(
              preUsedVisualGroups,
              nicheResult.detectedNiche,
            )
          : null;
      if (visualGroup) preUsedVisualGroups.push(visualGroup.group.code);

      let forcedModelId = modelIds[index % modelIds.length];
      if (
        lastForcedModelId &&
        modelIds.length > 1 &&
        forcedModelId === lastForcedModelId
      ) {
        forcedModelId = modelIds[(index + 1) % modelIds.length];
      }
      lastForcedModelId = forcedModelId;
      const autoDirections = autoDirectionsByArticleId.get(article.id)?.[
        concept.id
      ];
      const layoutProfile = this.pickLayoutProfile(
        layoutProfiles,
        usedLayoutSignatures,
        background?.category || "default",
      );
      const textOverlay =
        concept.slug === "fin-simulator" || concept.slug === "simulator-ui"
          ? this.buildSimulatorTextOverlay(
              {
                index,
                targeting: dto.targeting,
                nicheTemplate,
                layoutProfile,
              },
              usedTitles,
              usedSubtexts,
              usedCtas,
              usedValueSets,
            )
          : undefined;

      generationTasks.push({
        index,
        article,
        concept,
        background,
        visualGroup,
        autoDirections,
        textOverlay,
        forcedModelId,
      });
    }

    this.logger.log(`Starting generation of ${generationTasks.length} images`);

    const executeTask = async (task: GenerationTask) => {
      const {
        index,
        article,
        concept,
        background,
        visualGroup,
        autoDirections,
        textOverlay,
        forcedModelId,
      } = task;

      try {
        // Build localization context from article's country/language
        const articleLocalization = buildLocalizationContext(
          article.country,
          article.language,
        );

        // Generate image with pre-assigned model
        const genResult = await this.aiCreativeService.generateImageWithConcept(
          {
            id: article.id,
            title: article.title,
            keyword: article.keyword,
            excerpt: article.excerpt,
            language: article.language,
            localization: articleLocalization,
          },
          dto.format,
          {
            concept,
            background: background || undefined,
            visualGroup: visualGroup?.group || undefined,
            visualGroupVariationIndex: visualGroup?.variationIndex,
            nicheTemplate: nicheTemplate || undefined,
            userDirections: dto.userDirections,
            autoDirections,
            textOverlay,
            targeting: dto.targeting,
            forcedModelId,
          },
        );

        // Upload to storage
        const filename = `creative_${article.id}_${index}_${Date.now()}.png`;
        const storage = await this.aiCreativeService.uploadImageToStorage(
          genResult.imageBase64,
          genResult.mimeType,
          userId,
          filename,
        );

        // Save to library with concept tracking
        const libraryId = await this.aiCreativeService.saveToLibraryWithConcept(
          userId,
          dto.workspaceId || null,
          storage.url,
          storage.path,
          article.id,
          genResult,
          dto.format,
          sessionId || undefined,
          {
            usedConcepts: [concept.id],
            usedBackgrounds: [background?.slug || "default"],
            usedModels: [genResult.modelUsed],
            diversityScore: 0,
          },
        );

        return {
          success: true as const,
          result: {
            id: uuidv4(),
            articleId: article.id,
            imageUrl: storage.url,
            storagePath: storage.path,
            modelUsed: genResult.modelUsed,
            conceptUsed: {
              id: concept.id,
              slug: concept.slug,
              name: concept.name,
            },
            visualGroup: visualGroup
              ? {
                  code: visualGroup.group.code,
                  name: visualGroup.group.name,
                  variationIndex: visualGroup.variationIndex,
                }
              : undefined,
            backgroundStyle: background?.name || "default",
            promptUsed: genResult.promptUsed,
            format: dto.format,
            status: "completed" as const,
            adsetIndex: index,
            libraryId,
            createdAt: new Date().toISOString(),
          },
          concept,
          background,
          modelUsed: genResult.modelUsed,
        };
      } catch (error) {
        // Handle pending generation (timeout but still processing)
        if (error instanceof PendingGenerationException) {
          this.logger.warn(
            `Creative for article ${article.id} is pending - saving for later retrieval`,
          );

          // Save to pending_image_generations table
          try {
            const pendingId =
              await this.creativeLibraryService.createPendingGeneration({
                user_id: userId,
                workspace_id: dto.workspaceId || null,
                article_id: article.id,
                provider: error.provider,
                provider_prediction_id: error.predictionId,
                model: error.model,
                prompt: error.prompt,
                format: dto.format,
                metadata: {
                  conceptId: concept.id,
                  conceptSlug: concept.slug,
                  backgroundSlug: background?.slug,
                },
              });

            return {
              success: false as const,
              result: {
                id: pendingId,
                articleId: article.id,
                imageUrl: "",
                storagePath: "",
                modelUsed: forcedModelId,
                conceptUsed: {
                  id: concept.id,
                  slug: concept.slug,
                  name: concept.name,
                },
                visualGroup: visualGroup
                  ? {
                      code: visualGroup.group.code,
                      name: visualGroup.group.name,
                      variationIndex: visualGroup.variationIndex,
                    }
                  : undefined,
                backgroundStyle: background?.name || "",
                promptUsed: error.prompt,
                format: dto.format,
                status: "pending" as const, // Special status for pending
                error:
                  "A imagem está sendo gerada. Verifique em alguns minutos.",
                adsetIndex: index,
                libraryId: "",
                createdAt: new Date().toISOString(),
              },
              concept,
              background,
              modelUsed: forcedModelId,
            };
          } catch (saveError) {
            this.logger.error(
              `Failed to save pending generation: ${saveError}`,
            );
          }
        }

        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        this.logger.error(
          `Failed to generate creative for article ${article.id}: ${errorMessage}`,
        );

        return {
          success: false as const,
          result: {
            id: uuidv4(),
            articleId: article.id,
            imageUrl: "",
            storagePath: "",
            modelUsed: "",
            conceptUsed: {
              id: concept.id,
              slug: concept.slug,
              name: concept.name,
            },
            visualGroup: visualGroup
              ? {
                  code: visualGroup.group.code,
                  name: visualGroup.group.name,
                  variationIndex: visualGroup.variationIndex,
                }
              : undefined,
            backgroundStyle: "",
            promptUsed: "",
            format: dto.format,
            status: "failed" as const,
            error: errorMessage,
            adsetIndex: index,
            libraryId: "",
            createdAt: new Date().toISOString(),
          },
          concept,
          background: null,
          modelUsed: "",
        };
      }
    };

    // 6. Execute image generations with limited concurrency
    const maxParallel = 3;
    const generationResults: Awaited<ReturnType<typeof executeTask>>[] = [];

    for (let i = 0; i < generationTasks.length; i += maxParallel) {
      const batch = generationTasks.slice(i, i + maxParallel);
      const batchResults = await Promise.all(batch.map(executeTask));
      generationResults.push(...batchResults);
    }

    // 7. Collect results and track diversity
    const results: GeneratedCreativeResultDto[] = [];
    const usedConcepts: string[] = [];
    const usedBackgrounds: string[] = [];
    const usedModels: string[] = [];
    let totalGenerated = 0;
    let totalFailed = 0;

    for (const genResult of generationResults) {
      results.push(genResult.result);

      if (genResult.success) {
        usedConcepts.push(genResult.concept.id);
        if (genResult.background)
          usedBackgrounds.push(genResult.background.slug);
        usedModels.push(genResult.modelUsed);
        totalGenerated++;
      } else {
        totalFailed++;
      }
    }

    this.logger.log(
      `Parallel generation complete: ${totalGenerated} succeeded, ${totalFailed} failed`,
    );

    // Sort results by adsetIndex to maintain order
    results.sort((a, b) => a.adsetIndex - b.adsetIndex);

    // 6. Calculate diversity score
    const diversityScore = this.promptComposerService.calculateDiversityScore(
      usedConcepts,
      usedBackgrounds,
      usedModels,
      totalGenerated,
    );

    // 7. Consume credits for successful generations (workspace-aware)
    if (totalGenerated > 0) {
      await this.creditsService.consumeCredits(
        userId,
        "CREATIVE_AI_GENERATED",
        totalGenerated,
        {
          resourceType: "meta_creative_diverse",
          description: `Geração de ${totalGenerated} criativos diversos (Andromeda)`,
          workspaceId,
        },
      );
    }

    const totalTime = Date.now() - startTime;

    return {
      creatives: results,
      sessionId: responseSessionId, // T079: Use response-only session ID for tracking
      diversity: {
        uniqueConcepts: new Set(usedConcepts).size,
        uniqueBackgrounds: new Set(usedBackgrounds).size,
        uniqueModels: new Set(usedModels).size,
        totalGenerated,
        diversityScore: diversityScore.score,
        meetsThreshold: diversityScore.meetsThreshold,
      },
      creditsConsumed: totalGenerated * CREDIT_COSTS.CREATIVE_AI_GENERATED,
      stats: {
        totalRequested: dto.count,
        totalGenerated,
        totalFailed,
        averageGenerationTime:
          totalGenerated > 0 ? Math.round(totalTime / totalGenerated) : 0,
      },
      detectedNiche: nicheResult.detectedNiche,
    };
  }

  // ============================================
  // T080: Streaming Generation Endpoints (SSE)
  // ============================================

  /**
   * POST /meta/creatives/generate/init
   * Initialize a streaming generation session
   * Returns session ID and pre-allocated image slots
   */
  @Post("generate/init")
  async initStreamingGeneration(
    @Request() req: AuthenticatedRequest,
    @Body() dto: InitCreativeGenerationDto,
  ): Promise<InitCreativeGenerationResponseDto> {
    const userId = req.user.sub;
    const workspaceId = dto.workspaceId || null;
    this.logger.log(
      `User ${userId} initializing streaming generation for ${dto.count} images`,
    );

    // 1. Validate credits (workspace-aware)
    const creditCheck = await this.creditsService.checkCredits(
      userId,
      "CREATIVE_AI_GENERATED",
      dto.count,
      workspaceId,
    );

    if (!creditCheck.hasCredits) {
      throw new BadRequestException(
        `Créditos insuficientes. Necessário: ${creditCheck.required}, Disponível: ${creditCheck.available}`,
      );
    }

    // 2. Detect niche
    const nicheResult = await this.nicheDetectorService.detectNiche(
      dto.articles.map((a) => ({
        id: a.id,
        title: a.title,
        keyword: a.keyword,
        excerpt: a.excerpt,
      })),
    );

    // 3. Build concept sequence (reuse existing logic)
    const { sequence: conceptSequence } = await this.buildConceptSequence(
      {
        ...dto,
        articles: dto.articles.map((a) => ({
          ...a,
          excerpt: a.excerpt || "",
        })),
      } as GenerateCreativesDto,
      nicheResult.detectedNiche,
    );

    // 4. Create session with pre-allocated slots
    const session = this.creativeSessionService.createSession(
      userId,
      dto,
      conceptSequence.map((c) => ({ id: c.id, slug: c.slug, name: c.name })),
    );

    // 5. Start generation in background (fire and forget)
    this.executeStreamingGeneration(
      session.sessionId,
      userId,
      dto,
      nicheResult,
      conceptSequence,
    ).catch((error) => {
      this.logger.error(
        `Streaming generation failed for session ${session.sessionId}:`,
        error,
      );
    });

    // 6. Return session info immediately
    return {
      sessionId: session.sessionId,
      totalImages: dto.count,
      estimatedTimeSeconds: dto.count * 20, // ~20s per image average
      images: this.creativeSessionService.getSessionSlots(session.sessionId),
    };
  }

  /**
   * GET /meta/creatives/generate/stream
   * SSE endpoint for real-time generation progress
   */
  @Sse("generate/stream")
  streamGeneration(
    @Query("sessionId") sessionId: string,
    @Query("token") token: string,
    @Request() req: AuthenticatedRequest,
  ): Observable<MessageEvent> {
    // Note: For SSE, we need to validate token from query param since EventSource doesn't support headers
    // The JwtAuthGuard should still validate the request, but we log for debugging
    const userId = req.user?.sub;
    this.logger.log(
      `User ${userId || "unknown"} connecting to generation stream ${sessionId}`,
    );

    const session = this.creativeSessionService.getSession(sessionId);
    if (!session) {
      throw new BadRequestException("Sessão de geração não encontrada");
    }

    if (
      userId &&
      !this.creativeSessionService.isSessionOwner(sessionId, userId)
    ) {
      throw new BadRequestException("Sessão pertence a outro usuário");
    }

    const observable =
      this.creativeSessionService.getSessionObservable(sessionId);
    if (!observable) {
      throw new BadRequestException("Stream não disponível");
    }

    // Send current state of all slots first (for reconnection)
    const slots = this.creativeSessionService.getSessionSlots(sessionId);

    return new Observable<MessageEvent>((subscriber) => {
      // Emit current state immediately (sync event)
      subscriber.next({
        data: JSON.stringify({
          type: "sync",
          sessionId,
          slots,
          timestamp: new Date().toISOString(),
        }),
      });

      // Subscribe to live events
      const subscription = observable.subscribe({
        next: (event) => {
          subscriber.next({
            data: JSON.stringify(event),
          });
        },
        error: (err) => {
          this.logger.error(`Stream error for session ${sessionId}:`, err);
          subscriber.error(err);
        },
        complete: () => {
          this.logger.log(`Stream completed for session ${sessionId}`);
          subscriber.complete();
        },
      });

      // Cleanup on unsubscribe
      return () => {
        subscription.unsubscribe();
        this.logger.debug(`Client disconnected from stream ${sessionId}`);
      };
    });
  }

  /**
   * POST /meta/creatives/generate/retry
   * Retry a failed image generation
   */
  @Post("generate/retry")
  async retryGeneration(
    @Request() req: AuthenticatedRequest,
    @Body() body: RetryGenerationDto,
  ): Promise<{ success: boolean; message: string }> {
    const userId = req.user.sub;
    const workspaceId = body.workspaceId || null;
    this.logger.log(
      `User ${userId} retrying image ${body.imageId} in session ${body.sessionId}`,
    );

    const session = this.creativeSessionService.getSession(body.sessionId);
    if (!session) {
      throw new BadRequestException("Sessão de geração não encontrada");
    }

    if (!this.creativeSessionService.isSessionOwner(body.sessionId, userId)) {
      throw new BadRequestException("Sessão pertence a outro usuário");
    }

    const slot = this.creativeSessionService.getSlot(
      body.sessionId,
      body.imageId,
    );
    if (!slot) {
      throw new BadRequestException("Imagem não encontrada na sessão");
    }

    if (slot.status !== "failed") {
      throw new BadRequestException(
        "Apenas imagens com falha podem ser regeneradas",
      );
    }

    // Check credits for retry (workspace-aware)
    const creditCheck = await this.creditsService.checkCredits(
      userId,
      "CREATIVE_AI_GENERATED",
      1,
      workspaceId,
    );

    if (!creditCheck.hasCredits) {
      throw new BadRequestException(
        `Créditos insuficientes. Necessário: 1, Disponível: ${creditCheck.available}`,
      );
    }

    // Emit retrying event
    this.creativeSessionService.emitEvent(body.sessionId, {
      type: "retrying",
      sessionId: body.sessionId,
      imageId: body.imageId,
      index: slot.index,
      attempt: 1,
      maxAttempts: 2,
      timestamp: new Date().toISOString(),
    });

    // Execute retry in background
    this.executeRetry(body.sessionId, userId, slot, workspaceId).catch(
      (error) => {
        this.logger.error(`Retry failed for ${body.imageId}:`, error);
      },
    );

    return { success: true, message: "Regeneração iniciada" };
  }

  /**
   * Execute retry generation in background
   */
  private async executeRetry(
    sessionId: string,
    userId: string,
    slot: CreativeSlotDto,
    workspaceId: string | null = null,
  ): Promise<void> {
    try {
      // Get article context
      const articleContext = await this.aiCreativeService.getArticleContext(
        slot.articleId,
      );

      // Generate with basic prompt
      const promptBundle = await this.aiCreativeService.generateImagePromptJson(
        {
          id: slot.articleId,
          title: articleContext?.title || `Article ${slot.articleId}`,
          keyword: articleContext?.keyword || "",
          excerpt: articleContext?.excerpt || "",
        },
        "photorealistic",
        ImageFormat.SQUARE,
      );

      const result =
        await this.aiCreativeService.generateImageWithConfiguredModel(
          promptBundle.promptText,
          ImageFormat.SQUARE,
        );

      // Upload to storage
      const filename = `creative_retry_${slot.articleId}_${Date.now()}.png`;
      const storage = await this.aiCreativeService.uploadImageToStorage(
        result.imageBase64,
        result.mimeType,
        userId,
        filename,
      );

      // Save to library
      const libraryId = await this.aiCreativeService.saveToLibrary(
        userId,
        null,
        storage.url,
        storage.path,
        slot.articleId,
        result.modelUsed,
        "photorealistic",
        promptBundle.promptJson,
        ImageFormat.SQUARE,
      );

      // Consume credits (workspace-aware)
      await this.creditsService.consumeCredits(
        userId,
        "CREATIVE_AI_GENERATED",
        1,
        {
          resourceType: "meta_creative_retry",
          description: "Regeneração de criativo",
          workspaceId,
        },
      );

      // Update slot and emit completed
      this.creativeSessionService.updateSlotCompleted(sessionId, slot.imageId, {
        imageUrl: storage.url,
        storagePath: storage.path,
        modelUsed: result.modelUsed,
        promptUsed: promptBundle.promptJson,
        libraryId,
      });

      this.creativeSessionService.emitEvent(sessionId, {
        type: "completed",
        sessionId,
        imageId: slot.imageId,
        index: slot.index,
        imageUrl: storage.url,
        storagePath: storage.path,
        modelUsed: result.modelUsed,
        promptUsed: promptBundle.promptJson,
        libraryId,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Erro desconhecido";

      this.creativeSessionService.updateSlotFailed(sessionId, slot.imageId, {
        error: errorMessage,
        canRetry: true,
        isPending: false,
      });

      this.creativeSessionService.emitEvent(sessionId, {
        type: "failed",
        sessionId,
        imageId: slot.imageId,
        index: slot.index,
        error: errorMessage,
        canRetry: true,
        isPending: false,
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Execute streaming generation in background
   */
  private async executeStreamingGeneration(
    sessionId: string,
    userId: string,
    dto: InitCreativeGenerationDto,
    nicheResult: Awaited<
      ReturnType<typeof this.nicheDetectorService.detectNiche>
    >,
    conceptSequence: CreativeConcept[],
  ): Promise<void> {
    const session = this.creativeSessionService.getSession(sessionId);
    if (!session) return;

    const slots = this.creativeSessionService.getSessionSlots(sessionId);

    // Emit started event
    this.creativeSessionService.emitEvent(sessionId, {
      type: "started",
      sessionId,
      totalImages: dto.count,
      timestamp: new Date().toISOString(),
    });

    // Get niche template if applicable
    const nicheTemplate = nicheResult.applySpecializedTemplate
      ? await this.promptComposerService.getNicheTemplate(
          nicheResult.detectedNiche,
        )
      : undefined;

    // Track diversity
    const usedConcepts: string[] = [];
    const usedBackgrounds: string[] = [];
    const usedModels: string[] = [];
    let totalGenerated = 0;
    let totalFailed = 0;
    let totalPending = 0;

    // Pre-allocate backgrounds
    const preUsedBackgrounds: string[] = [];
    let lastBackgroundCategory: string | null = null;

    // Get available models for rotation
    const modelIds = this.aiCreativeService.getAvailableModelIds();
    let lastForcedModelId: string | null = null;

    // Execute with limited concurrency (3 parallel)
    const maxParallel = 3;

    for (let i = 0; i < slots.length; i += maxParallel) {
      const batch = slots.slice(i, i + maxParallel);

      await Promise.all(
        batch.map(async (slot, batchIndex) => {
          const index = i + batchIndex;
          const articleIndex = index % dto.articles.length;
          const article = dto.articles[articleIndex];
          const concept = conceptSequence[index];

          // Select background with diversity
          const background =
            await this.promptComposerService.selectNextBackground(
              preUsedBackgrounds,
              nicheResult.detectedNiche,
              lastBackgroundCategory,
            );
          if (background) {
            preUsedBackgrounds.push(background.slug);
            lastBackgroundCategory = background.category || null;
          }

          // Model rotation
          let forcedModelId = modelIds[index % modelIds.length];
          if (
            lastForcedModelId &&
            modelIds.length > 1 &&
            forcedModelId === lastForcedModelId
          ) {
            forcedModelId = modelIds[(index + 1) % modelIds.length];
          }
          lastForcedModelId = forcedModelId;

          // Emit generating event
          this.creativeSessionService.emitEvent(sessionId, {
            type: "generating",
            sessionId,
            imageId: slot.imageId,
            index: slot.index,
            model: forcedModelId,
            timestamp: new Date().toISOString(),
          });

          try {
            // Build localization context from article's country/language
            const articleLocalization = buildLocalizationContext(
              article.country,
              article.language,
            );

            // Generate image with concept
            const genResult =
              await this.aiCreativeService.generateImageWithConcept(
                {
                  id: article.id,
                  title: article.title,
                  keyword: article.keyword,
                  excerpt: article.excerpt,
                  language: article.language,
                  localization: articleLocalization,
                },
                dto.format,
                {
                  concept,
                  background: background || undefined,
                  nicheTemplate: nicheTemplate || undefined,
                  userDirections: dto.userDirections,
                  targeting: dto.targeting,
                  forcedModelId,
                },
              );

            // Upload to storage
            const filename = `creative_${article.id}_${index}_${Date.now()}.png`;
            const storage = await this.aiCreativeService.uploadImageToStorage(
              genResult.imageBase64,
              genResult.mimeType,
              userId,
              filename,
            );

            // Save to library
            const libraryId =
              await this.aiCreativeService.saveToLibraryWithConcept(
                userId,
                dto.workspaceId || null,
                storage.url,
                storage.path,
                article.id,
                genResult,
                dto.format,
                undefined,
                {
                  usedConcepts: [concept.id],
                  usedBackgrounds: [background?.slug || "default"],
                  usedModels: [genResult.modelUsed],
                  diversityScore: 0,
                },
              );

            // Update slot and emit completed
            this.creativeSessionService.updateSlotCompleted(
              sessionId,
              slot.imageId,
              {
                imageUrl: storage.url,
                storagePath: storage.path,
                modelUsed: genResult.modelUsed,
                backgroundStyle: background?.name,
                promptUsed: genResult.promptUsed,
                libraryId,
                conceptUsed: {
                  id: concept.id,
                  slug: concept.slug,
                  name: concept.name,
                },
              },
            );

            this.creativeSessionService.emitEvent(sessionId, {
              type: "completed",
              sessionId,
              imageId: slot.imageId,
              index: slot.index,
              imageUrl: storage.url,
              storagePath: storage.path,
              modelUsed: genResult.modelUsed,
              conceptUsed: {
                id: concept.id,
                slug: concept.slug,
                name: concept.name,
              },
              backgroundStyle: background?.name,
              promptUsed: genResult.promptUsed,
              libraryId,
              timestamp: new Date().toISOString(),
            });

            usedConcepts.push(concept.id);
            if (background) usedBackgrounds.push(background.slug);
            usedModels.push(genResult.modelUsed);
            totalGenerated++;
          } catch (error) {
            const isPending = error instanceof PendingGenerationException;
            const errorMessage =
              error instanceof Error ? error.message : "Erro desconhecido";

            let pendingId: string | undefined;
            if (isPending) {
              // Save pending generation
              pendingId =
                await this.creativeLibraryService.createPendingGeneration({
                  user_id: userId,
                  workspace_id: dto.workspaceId || null,
                  article_id: article.id,
                  provider: (error as PendingGenerationException).provider,
                  provider_prediction_id: (error as PendingGenerationException)
                    .predictionId,
                  model: (error as PendingGenerationException).model,
                  prompt: (error as PendingGenerationException).prompt,
                  format: dto.format,
                  metadata: {
                    sessionId,
                    imageId: slot.imageId,
                    conceptId: concept.id,
                  },
                });
              totalPending++;
            } else {
              totalFailed++;
            }

            this.creativeSessionService.updateSlotFailed(
              sessionId,
              slot.imageId,
              {
                error: isPending
                  ? "A imagem está sendo gerada. Verifique em alguns minutos."
                  : errorMessage,
                canRetry: !isPending,
                isPending,
                pendingId,
              },
            );

            this.creativeSessionService.emitEvent(sessionId, {
              type: "failed",
              sessionId,
              imageId: slot.imageId,
              index: slot.index,
              error: isPending
                ? "A imagem está sendo gerada. Verifique em alguns minutos."
                : errorMessage,
              canRetry: !isPending,
              isPending,
              pendingId,
              timestamp: new Date().toISOString(),
            });
          }
        }),
      );
    }

    // Consume credits for successful generations (workspace-aware)
    if (totalGenerated > 0) {
      await this.creditsService.consumeCredits(
        userId,
        "CREATIVE_AI_GENERATED",
        totalGenerated,
        {
          resourceType: "meta_creative_streaming",
          description: `Geração de ${totalGenerated} criativos (streaming)`,
          workspaceId: dto.workspaceId || undefined,
        },
      );
    }

    // Calculate diversity score
    const diversityScore = this.promptComposerService.calculateDiversityScore(
      usedConcepts,
      usedBackgrounds,
      usedModels,
      totalGenerated,
    );

    // Emit done event
    this.creativeSessionService.emitEvent(sessionId, {
      type: "done",
      sessionId,
      totalGenerated,
      totalFailed,
      totalPending,
      creditsConsumed: totalGenerated * CREDIT_COSTS.CREATIVE_AI_GENERATED,
      diversity: {
        uniqueConcepts: new Set(usedConcepts).size,
        uniqueBackgrounds: new Set(usedBackgrounds).size,
        uniqueModels: new Set(usedModels).size,
        diversityScore: diversityScore.score,
      },
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Helper: Build ordered concept sequence based on mode
   */
  private async buildConceptSequence(
    dto: GenerateCreativesDto,
    niche: string,
  ): Promise<{
    sequence: CreativeConcept[];
    autoDirectionsByArticleId: Map<number, Record<string, string>>;
  }> {
    if (dto.mode === GenerationMode.PRESET) {
      return {
        sequence: await this.buildPresetConceptSequence(dto),
        autoDirectionsByArticleId: new Map(),
      };
    }

    return this.buildFreeConceptSequence(dto, niche);
  }

  private async buildPresetConceptSequence(
    dto: GenerateCreativesDto,
  ): Promise<CreativeConcept[]> {
    if (!dto.conceptSelections || dto.conceptSelections.length === 0) {
      throw new BadRequestException("Preset mode requires concept selections.");
    }

    const totalSelected = dto.conceptSelections.reduce(
      (sum, s) => sum + s.quantity,
      0,
    );
    if (totalSelected !== dto.count) {
      throw new BadRequestException(
        `Preset selections (${totalSelected}) must equal count (${dto.count}).`,
      );
    }

    const buckets: Array<{ concept: CreativeConcept; remaining: number }> = [];

    for (const selection of dto.conceptSelections) {
      const concept = await this.promptComposerService.getConceptById(
        selection.conceptId,
      );
      if (!concept) {
        throw new BadRequestException(
          `Concept ${selection.conceptId} not found or inactive.`,
        );
      }
      buckets.push({ concept, remaining: selection.quantity });
    }

    const sequence: CreativeConcept[] = [];
    const usedConcepts: string[] = [];
    const diversityWindow = 3;

    while (sequence.length < dto.count) {
      const available = buckets.filter((b) => b.remaining > 0);
      if (available.length === 0) break;

      const recent = new Set(usedConcepts.slice(-diversityWindow));
      let selected = available.find((b) => !recent.has(b.concept.id));

      if (!selected) {
        selected = available.sort((a, b) => b.remaining - a.remaining)[0];
      }

      sequence.push(selected.concept);
      usedConcepts.push(selected.concept.id);
      selected.remaining -= 1;
    }

    return sequence;
  }

  private async buildFreeConceptSequence(
    dto: GenerateCreativesDto,
    niche: string,
  ): Promise<{
    sequence: CreativeConcept[];
    autoDirectionsByArticleId: Map<number, Record<string, string>>;
  }> {
    const sequence: CreativeConcept[] = [];
    const usedConcepts: string[] = [];
    const diversityWindow = 3;
    const autoDirectionsByArticleId = new Map<number, Record<string, string>>();
    const rankingCache = new Map<
      number,
      { concepts: CreativeConcept[]; directionsById: Record<string, string> }
    >();

    const financialCategories = [
      "narrativa",
      "prova_social",
      "produto",
      "curiosidade",
      "estilo_visual",
    ];

    for (let i = 0; i < dto.count; i++) {
      const article = dto.articles[i % dto.articles.length];
      const preferredCategory =
        niche === "financial"
          ? financialCategories[i % financialCategories.length]
          : undefined;
      const preferSimulator = this.shouldPreferSimulatorConcept(article, niche);

      let ranking = rankingCache.get(article.id);
      if (!ranking) {
        // Build localization context for ranking (used for cultural context)
        const articleLocalization = buildLocalizationContext(
          article.country,
          article.language,
        );
        ranking = await this.promptComposerService.rankConceptsForArticle(
          {
            id: article.id,
            title: article.title,
            keyword: article.keyword,
            excerpt: article.excerpt,
            language: article.language,
            localization: articleLocalization,
          },
          niche,
          [],
        );
        rankingCache.set(article.id, ranking);
        autoDirectionsByArticleId.set(article.id, ranking.directionsById);
      }
      const ranked = ranking.concepts;

      const recent = new Set(usedConcepts.slice(-diversityWindow));
      let selected: CreativeConcept | undefined;

      if (preferSimulator) {
        const simulatorSlugs =
          niche === "financial"
            ? ["fin-simulator", "simulator-ui"]
            : ["simulator-ui"];
        selected = ranked.find(
          (concept) =>
            simulatorSlugs.includes(concept.slug) && !recent.has(concept.id),
        );
      }

      if (!selected) {
        selected = ranked.find(
          (concept) =>
            !recent.has(concept.id) &&
            (!preferredCategory || concept.category === preferredCategory),
        );
      }

      if (!selected) {
        selected = ranked.find((concept) => !recent.has(concept.id));
      }

      if (!selected) {
        selected = await this.promptComposerService.getNextConcept(
          usedConcepts,
          niche,
          preferredCategory ? [preferredCategory] : undefined,
        );
      }

      if (selected) {
        sequence.push(selected);
        usedConcepts.push(selected.id);
      }
    }

    return {
      sequence,
      autoDirectionsByArticleId,
    };
  }

  private getLayoutProfiles(): Array<{
    id: string;
    titlePosition: string;
    buttonPosition: string;
    ctaPosition: string;
  }> {
    return [
      {
        id: "title-top-center_buttons-horizontal_center_cta-below",
        titlePosition: "Topo centralizado",
        buttonPosition: "Horizontal, centro",
        ctaPosition: "Abaixo dos botões",
      },
      {
        id: "title-top-left_buttons-vertical-right_cta-bottom-right",
        titlePosition: "Topo esquerdo",
        buttonPosition: "Vertical, lado direito",
        ctaPosition: "Canto inferior direito",
      },
      {
        id: "title-center_buttons-left_cta-bottom-left",
        titlePosition: "Centro",
        buttonPosition: "Esquerda",
        ctaPosition: "Canto inferior esquerdo",
      },
      {
        id: "title-over-image_buttons-card-floating_cta-integrated",
        titlePosition: "Sobre imagem",
        buttonPosition: "Card flutuante",
        ctaPosition: "Integrado ao UI",
      },
      {
        id: "title-top-center_buttons-panel-ui_cta-center",
        titlePosition: "Topo centralizado",
        buttonPosition: "Painel UI",
        ctaPosition: "Central",
      },
      {
        id: "title-top-left_buttons-diagonal_cta-below",
        titlePosition: "Topo esquerdo",
        buttonPosition: "Curva/diagonal",
        ctaPosition: "Abaixo dos botões",
      },
    ];
  }

  private pickLayoutProfile(
    profiles: Array<{
      id: string;
      titlePosition: string;
      buttonPosition: string;
      ctaPosition: string;
    }>,
    usedSignatures: string[],
    backgroundCategory: string,
  ): {
    id: string;
    titlePosition: string;
    buttonPosition: string;
    ctaPosition: string;
  } {
    for (const profile of profiles) {
      const signature = `${backgroundCategory}:${profile.id}:${profile.buttonPosition}`;
      if (!usedSignatures.includes(signature)) {
        usedSignatures.push(signature);
        return profile;
      }
    }

    this.logger.warn(
      "Layout signatures exhausted; reusing a layout profile for this session.",
    );
    const fallback = profiles[0];
    const fallbackSignature = `${backgroundCategory}:${fallback.id}:${fallback.buttonPosition}`;
    usedSignatures.push(fallbackSignature);
    return fallback;
  }

  private buildSimulatorTextOverlay(
    params: {
      index: number;
      targeting?: GenerateCreativesDto["targeting"];
      nicheTemplate?:
        | { localization_rules?: Record<string, LocalizationRule> | null }
        | undefined;
      layoutProfile: {
        titlePosition: string;
        buttonPosition: string;
        ctaPosition: string;
      };
    },
    usedTitles: string[],
    usedSubtexts: string[],
    usedCtas: string[],
    usedValueSets: string[],
  ): TextOverlay {
    const titleOptions = [
      "Precisa de dinheiro?",
      "De quanto você precisa?",
      "Um empréstimo te ajudaria?",
      "Quanto você quer solicitar?",
      "Pensando em um empréstimo?",
    ];
    const subtextOptions = [
      "Escolha o valor que faz sentido para você",
      "Selecione o valor desejado",
      "Comece escolhendo o montante",
      "Defina o valor do empréstimo",
    ];
    const ctaOptions = [
      "Quero simular",
      "Começar simulação",
      "Iniciar simulação",
    ];

    const title = this.pickNextValue(usedTitles, titleOptions);
    const subtext = this.pickNextValue(usedSubtexts, subtextOptions);
    const cta = this.pickNextValue(usedCtas, ctaOptions);

    const country = params.targeting?.countries?.[0] || "default";
    const localization = this.getLocalizationRule(
      country,
      params.nicheTemplate?.localization_rules,
    );
    const values = localization.values?.length
      ? localization.values
      : ["5K", "10K", "20K"];
    const valueSetSignature = values.join("|");
    const valueSetKey = usedValueSets.includes(valueSetSignature)
      ? `${valueSetSignature}:${params.index}`
      : valueSetSignature;
    usedValueSets.push(valueSetKey);

    const formattedValues = values.map((value) =>
      localization.currency_position === "before"
        ? `[ ${localization.currency} ${value} ]`
        : `[ ${value} ${localization.currency} ]`,
    );

    const includeCulturalElement =
      Boolean(params.targeting?.countries?.length) && params.index % 3 === 0;
    const culturalElement = includeCulturalElement
      ? `Include subtle cultural reference for ${country} (flag or local architecture), not dominant.`
      : null;

    return {
      title,
      subtext,
      valueButtons: formattedValues,
      cta,
      titlePosition: params.layoutProfile.titlePosition,
      buttonPosition: params.layoutProfile.buttonPosition,
      ctaPosition: params.layoutProfile.ctaPosition,
      culturalElement,
    };
  }

  private pickNextValue(used: string[], options: string[]): string {
    const available = options.filter((option) => !used.includes(option));
    const next =
      available.length > 0
        ? available[0]
        : options[used.length % options.length];
    used.push(next);
    return next;
  }

  private getLocalizationRule(
    country: string,
    localizationRules?: Record<string, LocalizationRule> | null,
  ): LocalizationRule {
    const defaultRule: LocalizationRule = {
      currency: "$",
      currency_position: "before",
      values: ["5K", "10K", "20K"],
      language: "en",
    };

    if (!localizationRules) {
      return defaultRule;
    }

    return (
      localizationRules[country] || localizationRules["default"] || defaultRule
    );
  }

  private shouldPreferSimulatorConcept(
    article: GenerateCreativesDto["articles"][0],
    niche: string,
  ): boolean {
    if (niche !== "financial" && niche !== "generic") {
      return false;
    }

    const text =
      `${article.title} ${article.keyword} ${article.excerpt || ""}`.toLowerCase();
    const simulatorKeywords = [
      "simulador",
      "calculadora",
      "parcelas",
      "juros",
      "financiamento",
      "emprestimo",
      "empréstimo",
      "loan calculator",
      "loan simulation",
      "loan simulator",
      "installments",
    ];

    return simulatorKeywords.some((keyword) => text.includes(keyword));
  }

  /**
   * POST /meta/creatives/detect-niche
   * Detect niche from articles for preview
   */
  @Post("detect-niche")
  async detectNiche(
    @Request() req: AuthenticatedRequest,
    @Body() dto: DetectNicheDto,
  ): Promise<DetectNicheResponseDto> {
    const userId = req.user.sub;
    this.logger.log(
      `User ${userId} detecting niche for ${dto.articles.length} articles`,
    );

    const result = await this.nicheDetectorService.detectNiche(
      dto.articles.map((a) => ({
        id: a.id,
        title: a.title,
        keyword: a.keyword,
        excerpt: a.excerpt,
      })),
    );

    return {
      detectedNiche: result.detectedNiche,
      confidence: result.confidence,
      applySpecializedTemplate: result.applySpecializedTemplate,
      articleResults: result.articleResults.map((ar) => ({
        articleId: ar.articleId,
        detectedNiche: ar.detectedNiche,
        confidence: ar.confidence,
        matchedKeywords: ar.matchedKeywords,
      })),
      triggerKeywords: result.triggerKeywords,
      recommendations: result.recommendations,
    };
  }

  /**
   * POST /meta/creatives/regenerate-image
   * Regenerate a single image
   *
   * Supports three modes:
   * 1. Reuse original prompt (originalPrompt provided, no userDirections) - same prompt exactly
   * 2. Edit and regenerate (originalPrompt + userDirections) - combines original with edit directions
   * 3. Generate new prompt (no originalPrompt) - creates entirely new prompt
   */
  @Post("regenerate-image")
  async regenerateImage(
    @Request() req: AuthenticatedRequest,
    @Body() dto: RegenerateImageDto,
  ): Promise<GeneratedImageResult> {
    const userId = req.user.sub;
    const workspaceId = dto.workspaceId || null;
    const hasOriginalPrompt = !!dto.originalPrompt;
    const hasUserDirections = !!dto.userDirections;
    const mode =
      hasOriginalPrompt && hasUserDirections
        ? "edit"
        : hasOriginalPrompt
          ? "reuse"
          : "new";

    this.logger.log(
      `User ${userId} regenerating image for article ${dto.articleId} (mode: ${mode})`,
    );

    // 1. Check credits (workspace-aware)
    const creditCheck = await this.creditsService.checkCredits(
      userId,
      "CREATIVE_AI_GENERATED",
      1,
      workspaceId,
    );

    if (!creditCheck.hasCredits) {
      throw new BadRequestException(
        `Créditos insuficientes. Necessário: ${creditCheck.required}, Disponível: ${creditCheck.available}`,
      );
    }

    try {
      let promptText: string;
      let promptJson: string;
      let style = this.aiCreativeService.getStyleForIndex(dto.adsetIndex);

      // Mode 1: Reuse original prompt exactly (no userDirections)
      if (dto.originalPrompt && !dto.userDirections) {
        this.logger.debug("Reusing original prompt exactly for regeneration");
        // Try to parse the original prompt JSON to extract the prompt text
        try {
          const parsed = JSON.parse(dto.originalPrompt);
          promptText = parsed.prompts?.[0]?.prompt || dto.originalPrompt;
          promptJson = dto.originalPrompt;
        } catch {
          // If not JSON, use as-is
          promptText = dto.originalPrompt;
          promptJson = dto.originalPrompt;
        }
      }
      // Mode 2: Edit and regenerate - combine original prompt with user directions
      else if (dto.originalPrompt && dto.userDirections) {
        this.logger.debug("Combining original prompt with edit directions");

        // Extract original prompt text
        let originalPromptText: string;
        try {
          const parsed = JSON.parse(dto.originalPrompt);
          originalPromptText =
            parsed.prompts?.[0]?.prompt || dto.originalPrompt;
        } catch {
          originalPromptText = dto.originalPrompt;
        }

        // Combine original prompt with edit directions
        promptText = `${originalPromptText}\n\nIMPORTANT MODIFICATIONS:\n${dto.userDirections}`;

        // Create new JSON structure with combined prompt
        promptJson = JSON.stringify({
          prompts: [
            {
              prompt: promptText,
              editDirections: dto.userDirections,
              originalPrompt: originalPromptText,
            },
          ],
        });
      }
      // Mode 3: Generate entirely new prompt
      else {
        this.logger.debug("Generating new prompt for regeneration");
        const articleContext = await this.aiCreativeService.getArticleContext(
          dto.articleId,
        );

        const contextForPrompt = articleContext
          ? {
              id: dto.articleId,
              title: articleContext.title,
              keyword: articleContext.keyword,
              excerpt: articleContext.excerpt,
            }
          : {
              id: dto.articleId,
              title: `Article ${dto.articleId}`,
              keyword: "",
            };

        // Use different style for variety when generating new prompt
        style = this.aiCreativeService.getStyleForIndex(
          dto.adsetIndex + Date.now(),
        );

        const promptBundle =
          await this.aiCreativeService.generateImagePromptJson(
            contextForPrompt,
            style,
            dto.format,
            dto.userDirections,
          );
        promptText = promptBundle.promptText;
        promptJson = promptBundle.promptJson;
      }

      // Generate image - use original model if provided, otherwise use configured default
      let imageResult;
      if (dto.originalModel) {
        this.logger.debug(`Using original model: ${dto.originalModel}`);
        imageResult =
          await this.aiCreativeService.generateImageWithSpecificModel(
            promptText,
            dto.format,
            dto.originalModel,
          );
      } else {
        imageResult =
          await this.aiCreativeService.generateImageWithConfiguredModel(
            promptText,
            dto.format,
          );
      }

      // Upload to storage
      const filename = `creative_${dto.articleId}_${dto.adsetIndex}_regen_${Date.now()}.png`;
      const storage = await this.aiCreativeService.uploadImageToStorage(
        imageResult.imageBase64,
        imageResult.mimeType,
        userId,
        filename,
      );

      // Save to library
      const libraryId = await this.aiCreativeService.saveToLibrary(
        userId,
        dto.workspaceId || null,
        storage.url,
        storage.path,
        dto.articleId,
        imageResult.modelUsed,
        style,
        promptJson,
        dto.format,
      );

      // Consume credits (workspace-aware)
      const creditDescriptions = {
        reuse: "Regeneração de imagem (mesmo prompt)",
        edit: "Regeneração de imagem (prompt editado)",
        new: "Regeneração de imagem (novo prompt)",
      };
      await this.creditsService.consumeCredits(
        userId,
        "CREATIVE_AI_GENERATED",
        1,
        {
          resourceType: "meta_creative",
          description: creditDescriptions[mode],
          workspaceId,
        },
      );

      return {
        id: libraryId,
        articleId: dto.articleId,
        imageUrl: storage.url,
        storagePath: storage.path,
        model: imageResult.modelUsed,
        style: style,
        promptUsed: promptJson,
        format: dto.format,
        status: "completed",
        adsetIndex: dto.adsetIndex,
      };
    } catch (error) {
      this.logger.error("Failed to regenerate image:", error);
      throw new BadRequestException(
        error instanceof Error ? error.message : "Falha ao regenerar imagem",
      );
    }
  }

  /**
   * POST /meta/creatives/generate-ad-copy
   * Generate ad copy for an approved image
   */
  @Post("generate-ad-copy")
  async generateAdCopy(
    @Request() req: AuthenticatedRequest,
    @Body() dto: GenerateAdCopyDto,
  ): Promise<GenerateAdCopyResponse> {
    const userId = req.user.sub;
    const workspaceId = dto.workspaceId || null;
    this.logger.log(
      `User ${userId} generating ad copy for image ${dto.libraryId}`,
    );

    // 1. Check credits (workspace-aware)
    const creditCheck = await this.creditsService.checkCredits(
      userId,
      "AD_COPY_GENERATION",
      1,
      workspaceId,
    );

    if (!creditCheck.hasCredits) {
      throw new BadRequestException(
        `Créditos insuficientes. Necessário: ${creditCheck.required}, Disponível: ${creditCheck.available}`,
      );
    }

    try {
      // Fetch article data from database to get real context including language
      const articleContext = await this.aiCreativeService.getArticleContext(
        dto.articleId,
      );

      if (!articleContext) {
        this.logger.warn(
          `Article ${dto.articleId} not found, using fallback context`,
        );
      }

      // Generate ad copy using article context with correct language
      const adCopy = await this.aiCreativeService.generateAdCopyFromArticle({
        title: articleContext?.title || `Article ${dto.articleId}`,
        keyword: articleContext?.keyword || "",
        excerpt: articleContext?.excerpt || "",
        objective: "TRAFFIC",
        language: articleContext?.language || "portugues",
      });

      // Consume credits (workspace-aware)
      await this.creditsService.consumeCredits(
        userId,
        "AD_COPY_GENERATION",
        1,
        {
          resourceType: "meta_ad_copy",
          resourceId: dto.libraryId,
          description: `Geração de texto de anúncio`,
          workspaceId,
        },
      );

      return {
        primaryText: adCopy.primaryText,
        headline: adCopy.headline,
        description: adCopy.description || "",
        suggestedCta: adCopy.callToAction,
        creditsConsumed: CREDIT_COSTS.AD_COPY_GENERATION,
      };
    } catch (error) {
      this.logger.error("Failed to generate ad copy:", error);
      throw new BadRequestException(
        error instanceof Error
          ? error.message
          : "Falha ao gerar textos do anúncio",
      );
    }
  }

  // ============================================
  // Ice Breakers Generation Endpoint
  // ============================================

  /**
   * POST /meta/creatives/generate-ice-breakers
   * Generate greeting message + ice breakers for message ads based on ad copy
   */
  @Post("generate-ice-breakers")
  async generateIceBreakers(
    @Request() req: AuthenticatedRequest,
    @Body()
    dto: {
      primaryText: string;
      headline: string;
      description?: string;
    },
  ) {
    const userId = req.user.sub;
    this.logger.log(`User ${userId} generating ice breakers`);

    try {
      const result = await this.aiCreativeService.generateIceBreakers(
        dto.primaryText,
        dto.headline,
        dto.description,
      );

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      this.logger.error("Failed to generate ice breakers:", error);
      throw new BadRequestException(
        error instanceof Error
          ? error.message
          : "Falha ao gerar configuração de conversa",
      );
    }
  }

  // ============================================
  // Credits Preview Endpoint
  // ============================================

  /**
   * POST /meta/creatives/credits/preview
   * Preview credit cost before generation
   */
  @Post("credits/preview")
  async previewCredits(
    @Request() req: AuthenticatedRequest,
    @Body() dto: CreditsPreviewDto,
  ): Promise<CreditsPreviewResponseDto> {
    const userId = req.user.sub;
    const workspaceId = dto.workspaceId || null;

    // Use workspace credits if workspaceId provided, otherwise user credits
    const credits = await this.creditsService.getCredits(userId, workspaceId);

    const imageCredits = dto.imageCount * CREDIT_COSTS.CREATIVE_AI_GENERATED;
    const textCredits = dto.generateAdCopy
      ? dto.imageCount * CREDIT_COSTS.AD_COPY_GENERATION
      : 0;
    const totalCredits = imageCredits + textCredits;

    return {
      imageCredits,
      textCredits,
      totalCredits,
      userBalance: credits.totalCreditsAvailable,
      hasSufficientCredits: credits.totalCreditsAvailable >= totalCredits,
    };
  }

  // ============================================
  // Library Endpoints
  // ============================================

  /**
   * GET /meta/creatives/library
   * List user's creative library with filters
   */
  @Get("library")
  async listLibrary(
    @Request() req: AuthenticatedRequest,
    @Query() query: LibraryQueryDto,
  ): Promise<LibraryResponseDto> {
    const userId = req.user.sub;
    const workspaceId = (query as { workspaceId?: string }).workspaceId || null;
    this.logger.debug(`User ${userId} listing library with filters:`, query);

    return this.creativeLibraryService.listLibrary(userId, workspaceId, query);
  }

  /**
   * GET /meta/creatives/library/:id
   * Get a single creative from library
   */
  @Get("library/:id")
  async getLibraryCreative(
    @Request() req: AuthenticatedRequest,
    @Param("id") id: string,
  ) {
    const userId = req.user.sub;
    this.logger.debug(`User ${userId} getting creative ${id}`);

    const creative = await this.creativeLibraryService.getCreative(userId, id);
    if (!creative) {
      throw new BadRequestException(`Criativo ${id} não encontrado`);
    }
    return creative;
  }

  /**
   * GET /meta/creatives/library-stats
   * Get library statistics for a user
   */
  @Get("library-stats")
  async getLibraryStats(
    @Request() req: AuthenticatedRequest,
    @Query("workspaceId") workspaceId?: string,
  ) {
    const userId = req.user.sub;
    return this.creativeLibraryService.getLibraryStats(
      userId,
      workspaceId || null,
    );
  }

  /**
   * GET /meta/creatives/library-filters
   * Get filter options for library dropdowns (articles, niches, languages, models)
   */
  @Get("library-filters")
  async getLibraryFilterOptions(
    @Request() req: AuthenticatedRequest,
    @Query("workspaceId") workspaceId?: string,
  ): Promise<LibraryFilterOptionsDto> {
    const userId = req.user.sub;
    this.logger.debug(`User ${userId} getting library filter options`);
    return this.creativeLibraryService.getFilterOptions(
      userId,
      workspaceId || null,
    );
  }

  /**
   * DELETE /meta/creatives/library/:id
   * Soft delete a creative from library
   */
  @Delete("library/:id")
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteFromLibrary(
    @Request() req: AuthenticatedRequest,
    @Param("id") id: string,
  ): Promise<void> {
    const userId = req.user.sub;
    this.logger.log(`User ${userId} deleting creative ${id} from library`);

    await this.creativeLibraryService.deleteCreative(userId, id);
  }

  // ============================================
  // Pending Generations Endpoints
  // ============================================

  /**
   * GET /meta/creatives/pending/batch
   * Batch check status of multiple pending generations (used by frontend polling)
   */
  @Get("pending/batch")
  async batchCheckPending(
    @Request() req: AuthenticatedRequest,
    @Query("ids") ids: string,
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
    const userId = req.user.sub;
    const idList = (ids || "").split(",").filter(Boolean);

    if (idList.length === 0) {
      return [];
    }

    if (idList.length > 50) {
      throw new BadRequestException("Máximo de 50 IDs por requisição");
    }

    this.logger.debug(
      `User ${userId} batch checking ${idList.length} pending generation(s)`,
    );

    return this.creativeLibraryService.batchGetPendingStatus(userId, idList);
  }

  /**
   * GET /meta/creatives/pending
   * List user's pending image generations
   */
  @Get("pending")
  async listPendingGenerations(@Request() req: AuthenticatedRequest): Promise<{
    pending: Array<{
      id: string;
      provider: string;
      model: string;
      status: string;
      createdAt: string;
      expiresAt: string;
    }>;
  }> {
    const userId = req.user.sub;
    this.logger.debug(`User ${userId} listing pending generations`);

    const pending =
      await this.creativeLibraryService.listPendingGenerations(userId);
    return { pending };
  }

  /**
   * POST /meta/creatives/pending/:id/check
   * Check status of a pending generation and retrieve if completed
   */
  @Post("pending/:id/check")
  async checkPendingGeneration(
    @Request() req: AuthenticatedRequest,
    @Param("id") id: string,
  ): Promise<{
    status: "pending" | "completed" | "failed" | "expired";
    message: string;
    creative?: {
      id: string;
      imageUrl: string;
      storagePath: string;
    };
  }> {
    const userId = req.user.sub;
    this.logger.log(`User ${userId} checking pending generation ${id}`);

    // Get the pending generation record
    const pending = await this.creativeLibraryService.getPendingGeneration(
      userId,
      id,
    );

    if (!pending) {
      throw new BadRequestException("Geração pendente não encontrada");
    }

    if (pending.status === "completed") {
      return {
        status: "completed",
        message: "Imagem já foi processada anteriormente",
        creative: {
          id: pending.id,
          imageUrl: pending.image_url || "",
          storagePath: pending.storage_path || "",
        },
      };
    }

    if (pending.status === "failed") {
      return {
        status: "failed",
        message: pending.error_message || "A geração falhou",
      };
    }

    if (
      pending.status === "expired" ||
      new Date(pending.expires_at) < new Date()
    ) {
      await this.creativeLibraryService.updatePendingGeneration(id, {
        status: "expired",
      });
      return {
        status: "expired",
        message: "A geração expirou. Por favor, tente novamente.",
      };
    }

    // Check with provider
    if (pending.provider === "replicate") {
      try {
        const result = await this.replicateService.checkPrediction(
          pending.provider_prediction_id,
        );

        if (result.status === "completed") {
          // Upload to storage
          const filename = `creative_pending_${id}_${Date.now()}.png`;
          const storage = await this.aiCreativeService.uploadImageToStorage(
            result.imageBase64,
            result.mimeType,
            userId,
            filename,
          );

          // Update pending record
          await this.creativeLibraryService.updatePendingGeneration(id, {
            status: "completed",
            image_url: storage.url,
            storage_path: storage.path,
            completed_at: new Date().toISOString(),
          });

          // Save to library if we have article info
          if (pending.article_id) {
            // Map string format to ImageFormat enum
            const formatMap: Record<string, ImageFormat> = {
              "1:1": ImageFormat.SQUARE,
              "9:16": ImageFormat.STORY,
              "16:9": ImageFormat.LANDSCAPE,
            };
            const format = formatMap[pending.format] || ImageFormat.SQUARE;

            await this.aiCreativeService.saveToLibrary(
              userId,
              pending.workspace_id,
              storage.url,
              storage.path,
              pending.article_id,
              pending.model,
              "photorealistic", // Default style for recovered pending generations
              pending.prompt,
              format,
            );
          }

          this.logger.log(`Pending generation ${id} completed successfully`);

          return {
            status: "completed",
            message: "Imagem gerada com sucesso!",
            creative: {
              id,
              imageUrl: storage.url,
              storagePath: storage.path,
            },
          };
        }

        // Still pending
        return {
          status: "pending",
          message: result.message,
        };
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Erro ao verificar status";
        this.logger.error(
          `Failed to check pending generation ${id}: ${errorMessage}`,
        );

        // Mark as failed if provider says it failed
        if (
          errorMessage.includes("failed") ||
          errorMessage.includes("not found") ||
          errorMessage.includes("expired")
        ) {
          await this.creativeLibraryService.updatePendingGeneration(id, {
            status: "failed",
            error_message: errorMessage,
          });
          return {
            status: "failed",
            message: errorMessage,
          };
        }

        throw new BadRequestException(errorMessage);
      }
    }

    // Unsupported provider
    return {
      status: "failed",
      message: `Provider ${pending.provider} não suporta verificação de status`,
    };
  }
}
