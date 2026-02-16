import { Injectable, Logger, Inject } from '@nestjs/common';
import { eq, and, sql } from 'drizzle-orm';
import { DATABASE } from '../../database/database.module';
import {
  documents,
  agentJobs,
} from '../../database/drizzle/schema';
import { OpenRouterService } from '../../integrations/openrouter/openrouter.service';
import { FalAiService } from '../../integrations/fal-ai/fal-ai.service';
import { StorageService } from '../storage/storage.service';
import { randomUUID } from 'crypto';

/**
 * NodeExecutorService executes individual workflow nodes.
 *
 * Ported from backend/services/node_executor.py.
 *
 * Each node type has a dedicated handler method:
 * - start: Initialize workflow with input variables
 * - text_generation: Generate text via LLM
 * - image_generation: Generate images via fal.ai
 * - processing: Transform text (summarize, extract, etc.)
 * - context_retrieval: Query documents with pgvector similarity
 * - conditional: Branch based on condition evaluation
 * - loop: Manage iteration state
 * - finish: Finalize workflow and save outputs
 */
@Injectable()
export class NodeExecutorService {
  private readonly logger = new Logger(NodeExecutorService.name);

  constructor(
    @Inject(DATABASE) private readonly db: any,
    private readonly openRouter: OpenRouterService,
    private readonly falAi: FalAiService,
    private readonly storage: StorageService,
  ) {}

  /**
   * Main dispatcher for node execution.
   *
   * Routes to the appropriate handler based on node type.
   * Creates an agent_job record to track execution progress.
   */
  async executeNode(
    node: { id: string; type: string; data?: Record<string, any> },
    execution: any,
  ): Promise<Record<string, any>> {
    const nodeType = node.type;
    const jobId = randomUUID();

    // Create agent job record
    await this.db.insert(agentJobs).values({
      id: jobId,
      executionId: execution.id,
      nodeId: node.id,
      jobType: nodeType,
      status: 'pending',
      inputDataJson: node.data ?? {},
      startedAt: new Date(),
    });

    try {
      // Update to running
      await this.db
        .update(agentJobs)
        .set({ status: 'running' })
        .where(eq(agentJobs.id, jobId));

      // Route to handler
      let result: Record<string, any>;

      switch (nodeType) {
        case 'start':
          result = await this.executeStart(node, execution);
          break;
        case 'text_generation':
        case 'generate_copy':
          result = await this.executeTextGeneration(node, execution);
          break;
        case 'image_generation':
        case 'generate_image':
          result = await this.executeImageGeneration(node, execution);
          break;
        case 'processing':
          result = await this.executeProcessing(node, execution);
          break;
        case 'context_retrieval':
          result = await this.executeContextRetrieval(node, execution);
          break;
        case 'conditional':
          result = await this.executeConditional(node, execution);
          break;
        case 'loop':
          result = await this.executeLoop(node, execution);
          break;
        case 'finish':
          result = await this.executeFinish(node, execution);
          break;
        case 'attach':
        case 'attach_creative':
          result = await this.executeAttach(node, execution);
          break;
        default:
          throw new Error(`Unknown node type: ${nodeType}`);
      }

      // Mark as completed
      await this.db
        .update(agentJobs)
        .set({
          status: 'completed',
          outputDataJson: result,
          completedAt: new Date(),
        })
        .where(eq(agentJobs.id, jobId));

      return result;
    } catch (error) {
      // Mark as failed
      await this.db
        .update(agentJobs)
        .set({
          status: 'failed',
          errorMessage: error instanceof Error ? error.message : String(error),
          completedAt: new Date(),
        })
        .where(eq(agentJobs.id, jobId));

      throw error;
    }
  }

  // ---------------------------------------------------------------------------
  // Node Handlers
  // ---------------------------------------------------------------------------

  private async executeStart(
    node: { id: string; data?: Record<string, any> },
    execution: any,
  ): Promise<Record<string, any>> {
    this.logger.log(`Starting workflow execution ${execution.id}`);

    const inputVariables = node.data?.inputVariables ?? [];
    const result: Record<string, any> = {
      status: 'started',
      input_variables: {},
    };

    // Extract input variable values from execution config
    for (const variable of inputVariables) {
      const varName = variable.name;
      if (varName && execution.configJson) {
        result.input_variables[varName] =
          execution.configJson[varName] ?? variable.defaultValue ?? '';
      }
    }

    return result;
  }

  private async executeTextGeneration(
    node: { id: string; data?: Record<string, any> },
    execution: any,
  ): Promise<Record<string, any>> {
    const data = node.data ?? {};
    const prompt = data.prompt ?? '';
    const model = data.model ?? 'openai/gpt-4o';
    const temperature = data.temperature ?? 0.7;
    const saveAsDocument = data.save_as_document ?? true;

    this.logger.log(`Generating text with ${model}: ${prompt.slice(0, 100)}...`);

    // Call LLM
    const response = await this.openRouter.chatCompletion(
      [{ role: 'user', content: prompt }],
      model,
      { temperature },
    );

    const content =
      response.choices[0]?.message?.content ?? 'No content generated';

    // If not saving as document, return content only
    if (!saveAsDocument) {
      return {
        content,
        content_length: content.length,
        document_ids: [],
        title: data.title ?? `Generated Copy - ${node.id}`,
      };
    }

    // Create document
    const docId = randomUUID();
    await this.db.insert(documents).values({
      id: docId,
      projectId: execution.projectId,
      title: data.title ?? `Generated Copy - ${node.id}`,
      content,
      status: 'draft',
      mediaType: 'text',
      createdAt: new Date(),
    });

    this.logger.log(`Created document ${docId}`);

    return {
      document_ids: [docId],
      content_length: content.length,
      content,
      title: data.title ?? `Generated Copy - ${node.id}`,
    };
  }

  private async executeImageGeneration(
    node: { id: string; data?: Record<string, any> },
    execution: any,
  ): Promise<Record<string, any>> {
    const data = node.data ?? {};
    const prompt = data.prompt ?? '';
    const model = data.model ?? 'fal-ai/gpt-image-1.5';
    const aspectRatio = data.aspect_ratio ?? '1:1';
    const quality = data.quality ?? 'standard';

    this.logger.log(
      `Generating image with ${model}: ${prompt.slice(0, 100)}...`,
    );

    // Generate image via fal.ai
    const result = await this.falAi.generateImage({
      prompt,
      modelId: model,
      params: {
        aspect_ratio: aspectRatio,
        quality,
      },
    });

    // Extract image URL
    const imageUrl =
      result.images?.[0]?.url ?? result.image?.url ?? 'No image generated';

    // Download and upload to R2
    let fileUrl = imageUrl;
    let thumbnailUrl = imageUrl;

    try {
      // Download image from fal.ai
      const response = await fetch(imageUrl);
      const buffer = Buffer.from(await response.arrayBuffer());

      // Upload to R2
      const key = `projects/${execution.projectId}/images/${randomUUID()}.png`;
      fileUrl = await this.storage.upload(key, buffer, 'image/png');
      thumbnailUrl = fileUrl; // For now, use same URL (can generate thumbnail later)

      this.logger.log(`Uploaded image to R2: ${fileUrl}`);
    } catch (error) {
      this.logger.warn(
        `Failed to upload to R2, using fal.ai URL: ${error}`,
      );
    }

    // Generate title (simple version, can use LLM)
    const title = data.title ?? `Generated Image - ${prompt.slice(0, 50)}`;

    // Create document
    const docId = randomUUID();
    await this.db.insert(documents).values({
      id: docId,
      projectId: execution.projectId,
      title,
      content: prompt,
      mediaType: 'image',
      status: 'art_ok',
      fileUrl,
      thumbnailUrl,
      generationMetadata: {
        model,
        prompt,
        aspectRatio,
        quality,
      },
      createdAt: new Date(),
    });

    this.logger.log(`Created image document ${docId}`);

    return {
      image_ids: [docId],
      file_url: fileUrl,
      thumbnail_url: thumbnailUrl,
      title,
      prompt,
    };
  }

  private async executeProcessing(
    node: { id: string; data?: Record<string, any> },
    _execution: any,
  ): Promise<Record<string, any>> {
    const data = node.data ?? {};
    const prompt = data.prompt ?? '';
    const model = data.model ?? 'openai/gpt-4o';
    const temperature = data.temperature ?? 0.7;

    this.logger.log(`Processing with ${model}: ${prompt.slice(0, 100)}...`);

    // Call LLM for processing
    const response = await this.openRouter.chatCompletion(
      [{ role: 'user', content: prompt }],
      model,
      { temperature },
    );

    const content =
      response.choices[0]?.message?.content ?? 'No content generated';

    return {
      content,
      title: data.title ?? 'Processed Content',
    };
  }

  private async executeContextRetrieval(
    node: { id: string; data?: Record<string, any> },
    execution: any,
  ): Promise<Record<string, any>> {
    const data = node.data ?? {};
    const query = data.query ?? '';
    const maxResults = data.maxResults ?? 5;

    this.logger.log(`Retrieving context for: ${query.slice(0, 100)}...`);

    // Simple implementation: fetch recent documents from project
    // Full implementation would use pgvector similarity search
    const docs = await this.db
      .select()
      .from(documents)
      .where(
        and(
          eq(documents.projectId, execution.projectId),
          eq(documents.mediaType, 'text'),
        ),
      )
      .limit(maxResults);

    const context = docs.map((d: any) => d.content).join('\n\n');

    return {
      documents: docs.map((d: any) => ({ id: d.id, title: d.title })),
      count: docs.length,
      context,
      content: context,
    };
  }

  private async executeConditional(
    node: { id: string; data?: Record<string, any> },
    execution: any,
  ): Promise<Record<string, any>> {
    const data = node.data ?? {};
    const condition = data.condition ?? '';

    this.logger.log(`Evaluating condition: ${condition}`);

    // Simple evaluation (can be enhanced with LLM-based evaluation)
    let result = true;

    // Basic keyword checks
    if (condition.toLowerCase().includes('no documents')) {
      const count = await this.db
        .select({ count: sql<number>`count(*)` })
        .from(documents)
        .where(eq(documents.projectId, execution.projectId));

      result = count[0]?.count === 0;
    }

    return {
      branch: result ? 'true' : 'false',
      condition_evaluated: condition,
      result,
    };
  }

  private async executeLoop(
    node: { id: string; data?: Record<string, any> },
    _execution: any,
  ): Promise<Record<string, any>> {
    const data = node.data ?? {};
    const iterations = data.iterations ?? 1;

    this.logger.log(`Loop node: iterations=${iterations}`);

    return {
      status: 'loop_initialized',
      iterations,
      current_iteration: 0,
    };
  }

  private async executeFinish(
    node: { id: string; data?: Record<string, any> },
    execution: any,
  ): Promise<Record<string, any>> {
    const data = node.data ?? {};
    const saveToProject = data.saveToProject ?? true;

    this.logger.log(`Finishing workflow execution ${execution.id}`);

    const result: Record<string, any> = {
      status: 'completed',
      saved_documents: [],
      notification_sent: false,
    };

    // Update generated documents status if needed
    if (saveToProject && execution.generatedDocumentIds?.length > 0) {
      await this.db
        .update(documents)
        .set({ status: 'done' })
        .where(
          sql`${documents.id} = ANY(${execution.generatedDocumentIds}::text[])`,
        );

      result.saved_documents = execution.generatedDocumentIds;
    }

    return result;
  }

  private async executeAttach(
    node: { id: string; data?: Record<string, any> },
    _execution: any,
  ): Promise<Record<string, any>> {
    const data = node.data ?? {};
    const documentRef = data.document_ref;
    const imageRef = data.image_ref;

    this.logger.log(
      `Attaching image ${imageRef} to document ${documentRef}`,
    );

    // Update document with image reference
    if (documentRef && imageRef) {
      try {
        const [imageDoc] = await this.db
          .select()
          .from(documents)
          .where(eq(documents.id, imageRef))
          .limit(1);

        if (imageDoc) {
          await this.db
            .update(documents)
            .set({
              thumbnailUrl: imageDoc.thumbnailUrl ?? imageDoc.fileUrl,
            })
            .where(eq(documents.id, documentRef));
        }
      } catch (error) {
        this.logger.warn(`Failed to attach image: ${error}`);
      }
    }

    return {
      attached: true,
      document_id: documentRef,
      image_id: imageRef,
    };
  }
}
