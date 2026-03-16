import { Injectable, Inject, BadRequestException, Logger, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { and, asc, eq, ilike, isNull, or } from 'drizzle-orm';
import pdfParse from 'pdf-parse';
import { DATABASE } from '../../database/database.module';
import {
  OpenRouterService,
  ChatMessage as OpenRouterChatMessage,
} from '../../integrations/openrouter/openrouter.service';
import {
  documents,
  folders,
  projects,
  boards,
  boardColumns,
  chatConversations,
  aiUsageLog,
  systemConfig,
  workspaces,
} from '../../database/drizzle/schema';
import { DocumentsService } from '../documents/documents.service';
import { ImageGenerationService } from '../image-generation/image-generation.service';
import type { ChatCompletionRequest } from './chat.types';

interface ToolApprovalResponse {
  approval_id: string;
  approved: boolean;
}

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);
  private readonly approvals = new Map<
    string,
    {
      tool: string;
      args: Record<string, any>;
      approved?: boolean;
      createdAt: number;
    }
  >();
  private readonly activeToolCalls = new Map<
    string,
    {
      tool: string;
      canceled: boolean;
      createdAt: number;
    }
  >();
  private readonly toolMutationNames = new Set([
    'create_document',
    'edit_document',
    'rename_document',
    'delete_file',
    'create_folder',
    'move_file',
    'generate_image',
    'attach_image_to_document',
    'create_board',
    'assign_document_to_board',
  ]);
  private readonly toolDefinitions: Record<string, unknown>[] = [
    {
      type: 'function',
      function: {
        name: 'read_document',
        description: 'Read the full content of a document by ID.',
        parameters: {
          type: 'object',
          properties: {
            document_id: { type: 'string', description: 'Document ID' },
          },
          required: ['document_id'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'list_documents',
        description: 'List documents in the current project.',
        parameters: {
          type: 'object',
          properties: {
            project_id: { type: 'string', description: 'Project ID' },
          },
          required: ['project_id'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'search_documents',
        description: 'Search documents by title or content in the current project.',
        parameters: {
          type: 'object',
          properties: {
            project_id: { type: 'string', description: 'Project ID' },
            query: { type: 'string', description: 'Search query' },
          },
          required: ['project_id', 'query'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'create_document',
        description: 'Create a new text document in the current project.',
        parameters: {
          type: 'object',
          properties: {
            project_id: { type: 'string', description: 'Project ID' },
            title: { type: 'string', description: 'Document title' },
            content: { type: 'string', description: 'Initial content' },
            status: {
              type: 'string',
              enum: ['draft', 'text_ok', 'art_ok', 'done', 'published'],
            },
          },
          required: ['project_id', 'title'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'edit_document',
        description:
          'Edit an existing document. Use replace, append or prepend mode.',
        parameters: {
          type: 'object',
          properties: {
            document_id: { type: 'string', description: 'Document ID' },
            content: { type: 'string', description: 'New content' },
            title: { type: 'string', description: 'Optional new title' },
            edit_type: {
              type: 'string',
              enum: ['replace', 'append', 'prepend'],
            },
          },
          required: ['document_id'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'rename_document',
        description: 'Rename a document by updating its title.',
        parameters: {
          type: 'object',
          properties: {
            document_id: { type: 'string', description: 'Document ID' },
            new_title: { type: 'string', description: 'New title' },
          },
          required: ['document_id', 'new_title'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'delete_file',
        description: 'Archive a document instead of permanently deleting it.',
        parameters: {
          type: 'object',
          properties: {
            document_id: { type: 'string', description: 'Document ID' },
          },
          required: ['document_id'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'list_folders',
        description: 'List folders in the current project.',
        parameters: {
          type: 'object',
          properties: {
            project_id: { type: 'string', description: 'Project ID' },
            parent_folder_id: {
              type: 'string',
              description: 'Optional parent folder ID',
            },
          },
          required: ['project_id'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'create_folder',
        description: 'Create a folder in the current project.',
        parameters: {
          type: 'object',
          properties: {
            project_id: { type: 'string', description: 'Project ID' },
            name: { type: 'string', description: 'Folder name' },
            parent_folder_id: {
              type: 'string',
              description: 'Optional parent folder ID',
            },
          },
          required: ['project_id', 'name'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'move_file',
        description: 'Move a document into a folder or back to the root.',
        parameters: {
          type: 'object',
          properties: {
            document_id: { type: 'string', description: 'Document ID' },
            folder_id: {
              type: 'string',
              description: 'Target folder ID or null for root',
            },
          },
          required: ['document_id'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'generate_image',
        description:
          'Generate an image in the current project. Optionally attach it to the active document.',
        parameters: {
          type: 'object',
          properties: {
            project_id: { type: 'string', description: 'Project ID' },
            prompt: { type: 'string', description: 'Image prompt' },
            aspect_ratio: {
              type: 'string',
              enum: ['1:1', '16:9', '9:16', '4:3', '3:4'],
            },
            attach_to_document_id: {
              type: 'string',
              description: 'Optional document ID to attach the image to',
            },
          },
          required: ['project_id', 'prompt'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'attach_image_to_document',
        description: 'Attach an existing image document to a text document.',
        parameters: {
          type: 'object',
          properties: {
            document_id: { type: 'string', description: 'Target document ID' },
            image_id: { type: 'string', description: 'Image document ID' },
            is_primary: { type: 'boolean', description: 'Set as primary image' },
          },
          required: ['document_id', 'image_id'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'list_boards',
        description: 'List Kanban boards in the current project.',
        parameters: {
          type: 'object',
          properties: {
            project_id: { type: 'string', description: 'Project ID' },
          },
          required: ['project_id'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'create_board',
        description: 'Create a new Kanban board in the project. Default columns (e.g. Backlog, Em Progresso, Concluido) are created automatically.',
        parameters: {
          type: 'object',
          properties: {
            project_id: { type: 'string', description: 'Project ID' },
            name: { type: 'string', description: 'Board name' },
            description: { type: 'string', description: 'Optional board description' },
            folder_id: { type: 'string', description: 'Optional folder ID to organize the board' },
          },
          required: ['project_id', 'name'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'list_board_columns',
        description:
          'List columns of a Kanban board together with the documents (cards) inside each column. Returns column IDs, names, and for each column: document id, title, status, and a content preview. Use this to understand what is already on the board before creating or editing content.',
        parameters: {
          type: 'object',
          properties: {
            board_id: { type: 'string', description: 'Board ID' },
          },
          required: ['board_id'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'assign_document_to_board',
        description:
          'Assign a document to a board and optionally to a specific column. Pass board_id and board_column_id to place the card; pass board_id=null to remove the document from any board.',
        parameters: {
          type: 'object',
          properties: {
            document_id: { type: 'string', description: 'Document ID' },
            board_id: {
              type: 'string',
              description: 'Board ID, or null to remove document from board',
            },
            board_column_id: {
              type: 'string',
              description: 'Column ID within the board (optional; use list_board_columns to get IDs)',
            },
            board_position: {
              type: 'integer',
              description: 'Optional position (order) of the card in the column',
            },
          },
          required: ['document_id'],
        },
      },
    },
  ];

  constructor(
    @Inject(DATABASE) private readonly db: any,
    private readonly openRouterService: OpenRouterService,
    private readonly documentsService: DocumentsService,
    private readonly imageGenerationService: ImageGenerationService,
  ) {}

  /**
   * List available chat models filtered by system configuration
   */
  async listModels() {
    try {
      const configs = await this.db
        .select()
        .from(systemConfig)
        .where(
          or(
            eq(systemConfig.key, 'visible_text_models'),
            eq(systemConfig.key, 'ai_models'),
          ),
        );

      let visibleModelIds: string[] = [];
      let defaultModel: string | null = null;

      for (const config of configs) {
        if (config.key === 'visible_text_models') {
          visibleModelIds = config.value || [];
        } else if (config.key === 'ai_models') {
          defaultModel = (config.value as any)?.defaults?.chat ?? null;
        }
      }

      const models = visibleModelIds.map((modelId: string) => ({
        id: modelId,
        name: this.formatModelName(modelId),
      }));

      // If admin didn't set a default or it's not in the visible list, use the first visible model
      const resolvedDefault =
        defaultModel && visibleModelIds.includes(defaultModel)
          ? defaultModel
          : (visibleModelIds[0] ?? null);

      return { models, defaultModel: resolvedDefault };
    } catch (error) {
      this.logger.error('Error fetching visible models', error);
      return { models: [], defaultModel: null };
    }
  }

  /**
   * Convert model ID to human-readable display name
   */
  private formatModelName(modelId: string): string {
    const name = modelId.split('/').pop() || modelId;
    return name.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  }

  /**
   * Upload and process an attachment (image or PDF)
   */
  async uploadAttachment(
    file: any,
    projectId?: string,
    userQuestion?: string,
  ) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    const mimeType = this.getBaseMimeType(file.mimetype);
    const buffer = Buffer.from(await file.toBuffer());
    const filename = file.filename || 'attachment';

    if (!this.isSupportedAttachmentType(mimeType)) {
      throw new BadRequestException(
        'Unsupported file type. Supported formats: images (jpg, png, gif, webp) and PDF',
      );
    }

    if (buffer.length > 10 * 1024 * 1024) {
      throw new BadRequestException('File size exceeds maximum of 10MB');
    }

    if (mimeType === 'application/pdf') {
      const parsed = await pdfParse(buffer);
      const extractedText = (parsed.text || '').trim();
      const content =
        extractedText.length > 0
          ? extractedText
          : 'No extractable text was found in this PDF. It may be an image-based or scanned document.';

      return {
        success: true,
        attachment: {
          type: 'pdf_text',
          content,
          filename,
          extraction_method: 'text',
          page_count: parsed.numpages || 0,
          metadata: {
            char_count: extractedText.length,
            word_count: extractedText ? extractedText.split(/\s+/).length : 0,
            mimeType,
            size: buffer.length,
          },
        },
      };
    }

    const model = await this.getVisionModel(projectId, true);
    const result = await this.analyzeImageBuffer(
      buffer,
      mimeType,
      userQuestion ||
        'Describe this image in detail. What objects, text, or information does it contain?',
      model,
    );

    return {
      success: true,
      attachment: {
        type: 'image',
        content: result.analysis,
        filename,
        model_used: model,
        metadata: {
          size: buffer.length,
          mimeType,
        },
      },
    };
  }

  /**
   * Transcribe audio file to text
   */
  async transcribeAudio(
    audio: any,
    languageHint?: string,
  ): Promise<{
    text: string;
    duration_seconds: number;
    language: string;
    processing_time_ms: number;
  }> {
    if (!audio) {
      throw new BadRequestException('No audio file provided');
    }

    const apiKey = process.env.GROQ_API_KEY ?? '';
    if (!apiKey) {
      throw new BadRequestException('GROQ_API_KEY is not configured');
    }

    const mimeType = this.getBaseMimeType(audio.mimetype);
    const allowedTypes = new Set([
      'audio/webm',
      'audio/mp3',
      'audio/mpeg',
      'audio/wav',
      'audio/m4a',
      'audio/mp4',
      'audio/x-m4a',
      'audio/ogg',
    ]);

    if (!allowedTypes.has(mimeType)) {
      throw new BadRequestException(
        'Unsupported audio format. Use WebM, MP3, WAV, M4A, MP4 or OGG.',
      );
    }

    const buffer = Buffer.from(await audio.toBuffer());
    if (buffer.length === 0) {
      throw new BadRequestException('No audio detected in uploaded file');
    }
    if (buffer.length > 25 * 1024 * 1024) {
      throw new BadRequestException('Audio file exceeds maximum size of 25MB');
    }

    const extensionMap: Record<string, string> = {
      'audio/webm': 'webm',
      'audio/mp3': 'mp3',
      'audio/mpeg': 'mp3',
      'audio/wav': 'wav',
      'audio/m4a': 'm4a',
      'audio/mp4': 'mp4',
      'audio/x-m4a': 'm4a',
      'audio/ogg': 'ogg',
    };

    const startedAt = Date.now();
    const formData = new FormData();
    formData.append(
      'file',
      new Blob([buffer], { type: mimeType }),
      `${audio.filename || 'audio'}.${extensionMap[mimeType] || 'webm'}`,
    );
    formData.append('model', 'whisper-large-v3-turbo');
    formData.append('response_format', 'verbose_json');
    if (languageHint) {
      formData.append('language', languageHint);
    }

    const response = await fetch(
      'https://api.groq.com/openai/v1/audio/transcriptions',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
        body: formData,
      },
    );

    if (!response.ok) {
      const message = await response.text();
      throw new BadRequestException(
        `Transcription request failed: ${message || response.statusText}`,
      );
    }

    const result = (await response.json()) as {
      text?: string;
      duration?: number;
      language?: string;
    };

    return {
      text: (result.text || '').trim(),
      duration_seconds: result.duration || 0,
      language: result.language || languageHint || 'auto',
      processing_time_ms: Date.now() - startedAt,
    };
  }

  /**
   * Handle tool approval response
   */
  async handleToolApproval(
    response: ToolApprovalResponse,
  ): Promise<{ success: boolean; approval_id: string; approved: boolean }> {
    const approval = this.approvals.get(response.approval_id);
    if (!approval) {
      throw new NotFoundException('Approval request not found or expired');
    }

    approval.approved = response.approved;
    this.approvals.set(response.approval_id, approval);
    this.logger.log(
      `Tool approval: ${response.approval_id} = ${response.approved}`,
    );

    return {
      success: true,
      approval_id: response.approval_id,
      approved: response.approved,
    };
  }

  /**
   * Cancel a running tool execution
   */
  async cancelTool(toolCallId: string) {
    const activeTool = this.activeToolCalls.get(toolCallId);
    if (!activeTool) {
      return {
        success: false,
        message: 'Tool execution not found or already completed',
      };
    }

    activeTool.canceled = true;
    this.activeToolCalls.set(toolCallId, activeTool);
    this.logger.log(`Tool cancellation requested: ${toolCallId}`);

    return {
      success: true,
      message: 'Cancellation requested',
    };
  }

  /**
   * Non-streaming chat completion
   */
  async completion(request: ChatCompletionRequest, user: any) {
    const startedAt = Date.now();
    this.logger.log(
      `Chat completion runtime=${request.runtime ?? 'native'} model=${request.model} project=${request.project_id ?? '-'}`,
    );

    // Build messages with attachments
    const messages = this.buildMessages(request);

    // Build system prompt
    const systemPrompt = await this.buildSystemPrompt(request, user);
    if (!messages[0] || messages[0].role !== 'system') {
      messages.unshift({ role: 'system', content: systemPrompt });
    }

    // Call OpenRouter
    const response = await this.openRouterService.chatCompletion(
      messages,
      request.model,
      { temperature: 0.7, maxTokens: 4096 },
    );

    await this.logChatUsage({
      request,
      user,
      model: response.model || request.model,
      provider: 'openrouter',
      usage: response.usage,
      assistantContent: String(response.choices?.[0]?.message?.content || ''),
      toolCalls: [],
      durationMs: Date.now() - startedAt,
    });

    return response;
  }

  /**
   * Streaming chat completion (async generator)
   */
  async *streamCompletion(request: ChatCompletionRequest, user: any) {
    this.logger.log(
      `Chat stream runtime=${request.runtime ?? 'native'} model=${request.model} project=${request.project_id ?? '-'}`,
    );

    yield { type: 'status', message: 'Iniciando agente IA...' };

    try {
      yield* this.runNativeToolAwareStream(request, user);
    } catch (error) {
      this.logger.error('Error streaming completion', error);
      const message = error instanceof Error ? error.message : String(error);
      yield { type: 'error', message };
    }
  }

  /**
   * Analyze an uploaded image using vision model
   */
  async analyzeImage(file: any, prompt: string) {
    if (!file) {
      throw new BadRequestException('No image file provided');
    }

    const mimeType = this.getBaseMimeType(file.mimetype);
    if (!mimeType.startsWith('image/')) {
      throw new BadRequestException('Uploaded file is not an image');
    }

    const buffer = Buffer.from(await file.toBuffer());
    const model = await this.getVisionModel(undefined, false);
    return this.analyzeImageBuffer(
      buffer,
      mimeType,
      prompt || 'Describe this image in detail.',
      model,
    );
  }

  /**
   * Analyze an already uploaded image document
   */
  async analyzeDocumentImage(documentId: string, prompt: string) {
    const [document] = await this.db
      .select()
      .from(documents)
      .where(and(eq(documents.id, documentId), isNull(documents.deletedAt)))
      .limit(1);

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    if (document.mediaType !== 'image' || !document.fileUrl) {
      throw new BadRequestException('Document is not an image');
    }

    const response = await fetch(document.fileUrl);
    if (!response.ok) {
      throw new BadRequestException('Unable to fetch image from storage');
    }

    const mimeType = this.getBaseMimeType(
      response.headers.get('content-type') || this.inferMimeType(document.title),
    );
    const buffer = Buffer.from(await response.arrayBuffer());
    const model = await this.getVisionModel(document.projectId || undefined, false);

    return this.analyzeImageBuffer(
      buffer,
      mimeType,
      prompt || 'Describe this image in detail and extract any visible text.',
      model,
    );
  }

  /**
   * Build messages array with attachments
   */
  private buildMessages(request: ChatCompletionRequest): OpenRouterChatMessage[] {
    const messages: OpenRouterChatMessage[] = [];

    for (const m of request.messages) {
      let msgContent = m.content;

      // Prepend attachments to message content
      if (m.attachments?.length) {
        const attachmentTexts = m.attachments.map(
          (att) =>
            `\n\n**[Attached ${att.type.toUpperCase()}: ${att.filename}]**\n${att.content}\n`,
        );
        msgContent = attachmentTexts.join('') + '\n' + msgContent;
      }

      messages.push({ role: m.role as OpenRouterChatMessage['role'], content: msgContent });
    }

    return messages;
  }

  /**
   * Build system prompt with context
   */
  private async buildSystemPrompt(
    request: ChatCompletionRequest,
    _user: any,
  ): Promise<string> {
    const parts: string[] = [];

    // Base system prompt
    parts.push(`You are a helpful AI assistant for content creation.

CRITICAL FORMATTING RULES:
1. ALWAYS use Markdown formatting in your responses (not HTML)
2. Use ## for headings, **bold**, *italic*, - for lists, \` for code
3. NEVER use HTML tags like <p>, <h1>, <div> in your text responses
4. When editing documents with edit_document tool, use the format the document already has

IMPORTANT: You have access to powerful tools that allow you to directly edit documents, read files, and perform actions.
When a user asks you to make changes to a document, you should ALWAYS use the tools (especially edit_document) to make those changes directly,
rather than just suggesting changes in your response. Taking action is preferred over describing what should be done.

Available actions:
- When editing content: Use edit_document tool immediately
- When reading files: Use read_document tool
- When creating content: Use appropriate tools to create and populate documents

Only provide explanatory text when tools cannot accomplish the task or when the user specifically asks for suggestions.`);

    // Add project context
    if (request.project_id) {
      parts.push(`
CURRENT PROJECT CONTEXT:
- Project ID: ${request.project_id}

IMPORTANT: You are working within this project. When using tools that require project_id (like create_document, generate_image, etc.),
you MUST use project_id="${request.project_id}". Do NOT ask the user for the project ID - you already have it.
`);
    }

    // Board (Kanban) context — user is viewing this board
    if (request.active_board_id) {
      parts.push(`
BOARD CONTEXT:
- The user is currently viewing board ID: ${request.active_board_id}
- When creating or organizing documents in this context, prefer using assign_document_to_board with board_id="${request.active_board_id}" so the document appears on this board.
- Use list_board_columns with board_id="${request.active_board_id}" to get column IDs (e.g. Backlog, Em Progresso, Concluido) before assigning a document to a column.
`);
    }

    // Add current document context
    if (request.current_document && request.use_rag) {
      parts.push(`
Current Document Context:
- ID: ${request.current_document.id}
- Title: ${request.current_document.title}
- Content:
${request.current_document.content}

IMPORTANT: When working with this document:
- To edit text: use edit_document tool with document_id="${request.current_document.id}"
- To generate and attach images: use generate_image tool with attach_to_document_id="${request.current_document.id}"
`);
    }

    if (request.document_ids?.length) {
      const selectedDocuments = await this.db
        .select({
          id: documents.id,
          title: documents.title,
          mediaType: documents.mediaType,
        })
        .from(documents)
        .where(
          and(
            isNull(documents.deletedAt),
            or(...request.document_ids.map((id) => eq(documents.id, id))),
          ),
        )
        .limit(50);

      if (selectedDocuments.length > 0) {
        parts.push(`
Selected Context Documents:
${selectedDocuments
  .map(
    (document: any) =>
      `- ${document.title || 'Sem titulo'} (id=${document.id}, media_type=${document.mediaType})`,
  )
  .join('\n')}
`);
      }
    }

    if (request.folder_ids?.length) {
      const selectedFolders = await this.db
        .select({
          id: folders.id,
          name: folders.name,
        })
        .from(folders)
        .where(
          and(
            isNull(folders.deletedAt),
            or(...request.folder_ids.map((id) => eq(folders.id, id))),
          ),
        )
        .limit(50);

      if (selectedFolders.length > 0) {
        parts.push(`
Selected Context Folders:
${selectedFolders
  .map((folder: any) => `- ${folder.name} (id=${folder.id})`)
  .join('\n')}
`);
      }
    }

    return parts.join('\n');
  }

  private async *runNativeToolAwareStream(
    request: ChatCompletionRequest,
    user: any,
  ) {
    const messages = this.buildMessages(request);
    const systemPrompt = await this.buildSystemPrompt(request, user);
    const startedAt = Date.now();
    const createdDocumentIds = new Set<string>();
    let finalAssistantContent = '';
    let totalPromptTokens = 0;
    let totalCompletionTokens = 0;
    let lastResponseModel = request.model;
    let taskListSnapshot: Record<string, any>[] = [];
    let toolExecutionSnapshot: Record<string, any>[] = [];

    if (!messages[0] || messages[0].role !== 'system') {
      messages.unshift({ role: 'system', content: systemPrompt });
    }

    const maxIterations = 20;

    for (let iteration = 1; iteration <= maxIterations; iteration += 1) {
      yield { type: 'iteration', current: iteration, max: maxIterations };

      const response = await this.openRouterService.chatCompletion(
        messages,
        request.model,
        {
          temperature: 0.4,
          maxTokens: 4096,
          tools: this.toolDefinitions,
        },
      );
      totalPromptTokens += response.usage?.prompt_tokens ?? 0;
      totalCompletionTokens += response.usage?.completion_tokens ?? 0;
      lastResponseModel = response.model || request.model;

      const responseMessage = response.choices?.[0]?.message;
      const assistantContent = responseMessage?.content || '';
      const toolCalls = Array.isArray(responseMessage?.tool_calls)
        ? (responseMessage.tool_calls as any[])
        : [];

      messages.push({
        role: 'assistant',
        content: assistantContent || '',
        tool_calls: toolCalls.length > 0 ? toolCalls : undefined,
      });
      finalAssistantContent = assistantContent || finalAssistantContent;

      if (toolCalls.length === 0) {
        if (assistantContent) {
          yield* this.emitMessageChunks(assistantContent);
        }

        const conversationId = await this.persistConversationState(
          request,
          user,
          {
            content: assistantContent || '',
            toolExecutions: toolExecutionSnapshot,
            taskList: taskListSnapshot,
          },
          Array.from(createdDocumentIds),
        );

        if (conversationId && !request.conversation_id) {
          yield { type: 'conversation_created', conversation_id: conversationId };
        }

        await this.logChatUsage({
          request,
          user,
          model: lastResponseModel,
          provider: 'openrouter',
          usage: {
            prompt_tokens: totalPromptTokens,
            completion_tokens: totalCompletionTokens,
            total_tokens: totalPromptTokens + totalCompletionTokens,
          },
          assistantContent: assistantContent || '',
          toolCalls: toolExecutionSnapshot.map((tool) => tool.tool),
          durationMs: Date.now() - startedAt,
        });

        yield { type: 'done' };
        return;
      }

      const taskList = toolCalls.map((toolCall, index) => {
        const toolName = toolCall?.function?.name || 'unknown_tool';
        const toolArgs = this.normalizeToolArgs(
          request,
          toolName,
          this.safeJsonParse(toolCall?.function?.arguments),
        );
        return {
          id: `task-${iteration}-${index}`,
          description: this.describeTool(toolName, toolArgs),
          tool_name: toolName,
          status: 'pending',
        };
      });
      taskListSnapshot = taskList.map((task) => ({ ...task }));

      yield { type: 'task_list', tasks: taskList };

      for (let index = 0; index < toolCalls.length; index += 1) {
        const toolCall = toolCalls[index];
        const toolName = toolCall?.function?.name || 'unknown_tool';
        const toolCallId = toolCall?.id || randomUUID();
        const taskId = `task-${iteration}-${index}`;
        const toolArgs = this.normalizeToolArgs(
          request,
          toolName,
          this.safeJsonParse(toolCall?.function?.arguments),
        );

        if (
          this.toolRequiresApproval(toolName) &&
          request.autonomous_mode !== true
        ) {
          const approvalId = randomUUID();
          this.approvals.set(approvalId, {
            tool: toolName,
            args: toolArgs,
            createdAt: Date.now(),
          });
          toolExecutionSnapshot = [
            ...toolExecutionSnapshot,
            {
              id: approvalId,
              tool: toolName,
              args: toolArgs,
              status: 'pending',
              timestamp: new Date().toISOString(),
              index: index + 1,
              total: toolCalls.length,
            },
          ];

          yield {
            type: 'tool_approval_request',
            approval_id: approvalId,
            tool: toolName,
            args: toolArgs,
            index: index + 1,
            total: toolCalls.length,
          };

          const approved = await this.waitForApproval(approvalId);
          this.approvals.delete(approvalId);

          if (!approved) {
            taskListSnapshot = taskListSnapshot.map((task) =>
              task.id === taskId ? { ...task, status: 'error' } : task,
            );
            toolExecutionSnapshot = toolExecutionSnapshot.map((tool) =>
              tool.id === approvalId
                ? {
                    ...tool,
                    status: 'error',
                    result: 'Rejected by user',
                  }
                : tool,
            );
            yield { type: 'tool_rejected', tool: toolName };
            yield {
              type: 'status',
              message: 'Operacao cancelada pelo usuario.',
            };
            const conversationId = await this.persistConversationState(
              request,
              user,
              {
                content: finalAssistantContent,
                toolExecutions: toolExecutionSnapshot,
                taskList: taskListSnapshot,
              },
              Array.from(createdDocumentIds),
            );

            if (conversationId && !request.conversation_id) {
              yield {
                type: 'conversation_created',
                conversation_id: conversationId,
              };
            }

            await this.logChatUsage({
              request,
              user,
              model: lastResponseModel,
              provider: 'openrouter',
              usage: {
                prompt_tokens: totalPromptTokens,
                completion_tokens: totalCompletionTokens,
                total_tokens: totalPromptTokens + totalCompletionTokens,
              },
              assistantContent: finalAssistantContent,
              toolCalls: toolExecutionSnapshot.map((tool) => tool.tool),
              durationMs: Date.now() - startedAt,
            });
            yield { type: 'done' };
            return;
          }

          yield { type: 'tool_approved', tool: toolName };
        } else if (this.toolRequiresApproval(toolName)) {
          yield { type: 'tool_auto_approved', tool: toolName };
        }

        yield { type: 'task_update', task_id: taskId, status: 'executing' };
        taskListSnapshot = taskListSnapshot.map((task) =>
          task.id === taskId ? { ...task, status: 'executing' } : task,
        );
        yield {
          type: 'tool_start',
          tool: toolName,
          args: toolArgs,
          index: index + 1,
          total: toolCalls.length,
          tool_call_id: toolCallId,
        };
        this.activeToolCalls.set(toolCallId, {
          tool: toolName,
          canceled: false,
          createdAt: Date.now(),
        });
        const pendingToolIndex = toolExecutionSnapshot.findIndex(
          (tool) => tool.tool === toolName && tool.status === 'pending',
        );
        if (pendingToolIndex >= 0) {
          toolExecutionSnapshot = toolExecutionSnapshot.map((tool, toolIndex) =>
            toolIndex === pendingToolIndex
              ? {
                  ...tool,
                  id: toolCallId,
                  args: toolArgs,
                  status: 'executing',
                  index: index + 1,
                  total: toolCalls.length,
                }
              : tool,
          );
        } else {
          toolExecutionSnapshot = [
            ...toolExecutionSnapshot.filter((tool) => tool.id !== toolCallId),
            {
              id: toolCallId,
              tool: toolName,
              args: toolArgs,
              status: 'executing',
              timestamp: new Date().toISOString(),
              index: index + 1,
              total: toolCalls.length,
            },
          ];
        }

        const toolStartedAt = Date.now();

        try {
          const result = await this.executeTool(
            toolName,
            toolArgs,
            request,
            user,
          );

          if (
            result &&
            typeof result === 'object' &&
            'error' in result &&
            typeof result.error === 'string'
          ) {
            throw new Error(result.error);
          }

          if (this.activeToolCalls.get(toolCallId)?.canceled) {
            throw new Error('Tool execution cancelled by user');
          }

          if (toolName === 'create_document' && result?.id) {
            createdDocumentIds.add(result.id);
          }
          if (toolName === 'generate_image' && result?.image_document_id) {
            createdDocumentIds.add(result.image_document_id);
          }

          yield { type: 'task_update', task_id: taskId, status: 'completed' };
          taskListSnapshot = taskListSnapshot.map((task) =>
            task.id === taskId ? { ...task, status: 'completed' } : task,
          );
          yield {
            type: 'tool_complete',
            tool: toolName,
            args: toolArgs,
            result,
            duration_ms: Date.now() - toolStartedAt,
            index: index + 1,
            total: toolCalls.length,
            tool_call_id: toolCallId,
          };
          toolExecutionSnapshot = toolExecutionSnapshot.map((tool) =>
            tool.id === toolCallId
              ? {
                  ...tool,
                  status: 'completed',
                  result,
                  duration: Date.now() - toolStartedAt,
                }
              : tool,
          );

          messages.push({
            role: 'tool',
            tool_call_id: toolCallId,
            content: JSON.stringify(result),
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          yield { type: 'task_update', task_id: taskId, status: 'error' };
          taskListSnapshot = taskListSnapshot.map((task) =>
            task.id === taskId ? { ...task, status: 'error' } : task,
          );
          yield {
            type: 'tool_error',
            tool: toolName,
            args: toolArgs,
            error: message,
            index: index + 1,
            total: toolCalls.length,
            tool_call_id: toolCallId,
          };
          toolExecutionSnapshot = toolExecutionSnapshot.map((tool) =>
            tool.id === toolCallId
              ? {
                  ...tool,
                  status: 'error',
                  result: message,
                }
              : tool,
          );

          messages.push({
            role: 'tool',
            tool_call_id: toolCallId,
            content: JSON.stringify({ error: message }),
          });
        } finally {
          this.activeToolCalls.delete(toolCallId);
        }
      }
    }

    const conversationId = await this.persistConversationState(
      request,
      user,
      {
        content: finalAssistantContent,
        toolExecutions: toolExecutionSnapshot,
        taskList: taskListSnapshot,
      },
      Array.from(createdDocumentIds),
    );

    if (conversationId && !request.conversation_id) {
      yield { type: 'conversation_created', conversation_id: conversationId };
    }

    await this.logChatUsage({
      request,
      user,
      model: lastResponseModel,
      provider: 'openrouter',
      usage: {
        prompt_tokens: totalPromptTokens,
        completion_tokens: totalCompletionTokens,
        total_tokens: totalPromptTokens + totalCompletionTokens,
      },
      assistantContent: finalAssistantContent,
      toolCalls: toolExecutionSnapshot.map((tool) => tool.tool),
      durationMs: Date.now() - startedAt,
    });

    // Generate a graceful closing message so the user always gets a proper response
    try {
      messages.push({
        role: 'user',
        content:
          'Você atingiu o limite de iterações para esta resposta. Resuma brevemente o que foi feito até agora e pergunte ao usuário se deseja continuar a partir deste ponto.',
      });
      const limitResponse = await this.openRouterService.chatCompletion(
        messages,
        request.model,
        { temperature: 0.5, maxTokens: 2048 },
      );
      const limitContent = String(
        limitResponse.choices?.[0]?.message?.content || '',
      );
      totalPromptTokens += limitResponse.usage?.prompt_tokens ?? 0;
      totalCompletionTokens += limitResponse.usage?.completion_tokens ?? 0;
      if (limitContent) {
        finalAssistantContent = limitContent;
        yield* this.emitMessageChunks(limitContent);
      }
    } catch {
      // If the graceful call fails, fall back to a static message
      const fallback =
        'Atingi o limite de iterações nesta resposta. Posso continuar de onde parei — é só me pedir!';
      finalAssistantContent = fallback;
      yield* this.emitMessageChunks(fallback);
    }

    const limitConversationId = await this.persistConversationState(
      request,
      user,
      {
        content: finalAssistantContent,
        toolExecutions: toolExecutionSnapshot,
        taskList: taskListSnapshot,
      },
      Array.from(createdDocumentIds),
    );

    if (limitConversationId && !request.conversation_id) {
      yield { type: 'conversation_created', conversation_id: limitConversationId };
    }

    await this.logChatUsage({
      request,
      user,
      model: lastResponseModel,
      provider: 'openrouter',
      usage: {
        prompt_tokens: totalPromptTokens,
        completion_tokens: totalCompletionTokens,
        total_tokens: totalPromptTokens + totalCompletionTokens,
      },
      assistantContent: finalAssistantContent,
      toolCalls: toolExecutionSnapshot.map((tool) => tool.tool),
      durationMs: Date.now() - startedAt,
    });

    yield {
      type: 'iteration_limit',
      current: maxIterations,
      max: maxIterations,
      message: 'Limite de iterações atingido.',
    };
    yield { type: 'done' };
  }

  private async *emitMessageChunks(content: string) {
    const chunkSize = 180;
    for (let index = 0; index < content.length; index += chunkSize) {
      yield {
        type: 'message_chunk',
        content: content.slice(index, index + chunkSize),
      };
    }
  }

  private safeJsonParse(value: unknown): Record<string, any> {
    if (!value) {
      return {};
    }

    if (typeof value === 'object') {
      return value as Record<string, any>;
    }

    if (typeof value !== 'string') {
      return {};
    }

    try {
      return JSON.parse(value) as Record<string, any>;
    } catch {
      return {};
    }
  }

  private toolRequiresApproval(toolName: string) {
    return this.toolMutationNames.has(toolName);
  }

  private async waitForApproval(approvalId: string): Promise<boolean> {
    const timeoutMs = 5 * 60 * 1000;
    const pollMs = 250;
    const startedAt = Date.now();

    while (Date.now() - startedAt < timeoutMs) {
      const approval = this.approvals.get(approvalId);
      if (!approval) {
        return false;
      }
      if (typeof approval.approved === 'boolean') {
        return approval.approved;
      }
      await new Promise((resolve) => setTimeout(resolve, pollMs));
    }

    return false;
  }

  private normalizeToolArgs(
    request: ChatCompletionRequest,
    toolName: string,
    rawArgs: Record<string, any>,
  ) {
    const toolArgs = { ...rawArgs };

    if (
      [
        'list_documents',
        'search_documents',
        'create_document',
        'create_folder',
        'list_folders',
        'generate_image',
        'list_boards',
        'create_board',
      ].includes(toolName) &&
      request.project_id &&
      !toolArgs.project_id
    ) {
      toolArgs.project_id = request.project_id;
    }

    if (
      toolName === 'generate_image' &&
      !toolArgs.attach_to_document_id &&
      (request.current_document_id || request.current_document?.id)
    ) {
      toolArgs.attach_to_document_id =
        request.current_document_id || request.current_document?.id;
    }

    if (toolArgs.folder_id === '' || toolArgs.folder_id === 'null') {
      toolArgs.folder_id = null;
    }
    if (
      toolArgs.parent_folder_id === '' ||
      toolArgs.parent_folder_id === 'null'
    ) {
      toolArgs.parent_folder_id = null;
    }

    return toolArgs;
  }

  private describeTool(toolName: string, args: Record<string, any>) {
    switch (toolName) {
      case 'read_document':
        return `Ler documento ${args.document_id}`;
      case 'list_documents':
        return 'Listar documentos do projeto';
      case 'search_documents':
        return `Buscar "${args.query}" nos documentos`;
      case 'create_document':
        return `Criar documento "${args.title || 'Sem titulo'}"`;
      case 'edit_document':
        return `Editar documento ${args.document_id}`;
      case 'rename_document':
        return `Renomear documento para "${args.new_title}"`;
      case 'delete_file':
        return `Arquivar documento ${args.document_id}`;
      case 'list_folders':
        return 'Listar pastas do projeto';
      case 'create_folder':
        return `Criar pasta "${args.name || 'Sem nome'}"`;
      case 'move_file':
        return `Mover documento ${args.document_id}`;
      case 'generate_image':
        return `Gerar imagem para "${(args.prompt || '').slice(0, 60)}"`;
      case 'attach_image_to_document':
        return `Anexar imagem ${args.image_id} ao documento ${args.document_id}`;
      case 'list_boards':
        return 'Listar quadros (boards) do projeto';
      case 'create_board':
        return `Criar quadro "${args.name || 'Sem nome'}"`;
      case 'list_board_columns':
        return `Listar colunas do quadro ${args.board_id}`;
      case 'assign_document_to_board':
        return args.board_id
          ? `Colocar documento ${args.document_id} no quadro ${args.board_id}`
          : `Remover documento ${args.document_id} do quadro`;
      default:
        return `Executar ${toolName}`;
    }
  }

  private async executeTool(
    toolName: string,
    toolArgs: Record<string, any>,
    _request: ChatCompletionRequest,
    user: any,
  ) {
    switch (toolName) {
      case 'read_document': {
        const document = await this.documentsService.findById(toolArgs.document_id);
        return {
          id: document.id,
          title: document.title,
          content: document.content,
          status: document.status,
          media_type: document.mediaType,
          created_at: document.createdAt,
        };
      }

      case 'list_documents': {
        const result = await this.documentsService.list({
          project_id: toolArgs.project_id,
          limit: 100,
          page: 1,
        });
        return {
          documents: result.documents.map((document: any) => ({
            id: document.id,
            title: document.title,
            status: document.status,
            media_type: document.mediaType,
            created_at: document.createdAt,
          })),
          count: result.documents.length,
        };
      }

      case 'search_documents': {
        const rows = await this.db
          .select()
          .from(documents)
          .where(
            and(
              eq(documents.projectId, toolArgs.project_id),
              isNull(documents.deletedAt),
              or(
                ilike(documents.title, `%${toolArgs.query}%`),
                ilike(documents.content, `%${toolArgs.query}%`),
              ),
            ),
          )
          .limit(25);

        return {
          query: toolArgs.query,
          matches: rows.map((document: any) => ({
            id: document.id,
            title: document.title,
            status: document.status,
            media_type: document.mediaType,
            created_at: document.createdAt,
          })),
          count: rows.length,
        };
      }

      case 'create_document': {
        const document = await this.documentsService.create(toolArgs.project_id, {
          title: toolArgs.title,
          content: toolArgs.content || '',
          status: toolArgs.status || 'draft',
          media_type: 'text',
        });

        return {
          id: document.id,
          title: document.title,
          content: document.content,
          status: document.status,
          project_id: document.projectId,
          created_at: document.createdAt,
          message: 'Document created successfully',
        };
      }

      case 'edit_document': {
        const document = await this.documentsService.findById(toolArgs.document_id);
        let content = document.content || '';

        if (typeof toolArgs.content === 'string') {
          if (toolArgs.edit_type === 'append') {
            content = `${content}${content ? '\n\n' : ''}${toolArgs.content}`;
          } else if (toolArgs.edit_type === 'prepend') {
            content = `${toolArgs.content}${content ? '\n\n' : ''}${content}`;
          } else {
            content = toolArgs.content;
          }
        }

        const updated = await this.documentsService.update(toolArgs.document_id, {
          content,
          title: toolArgs.title ?? document.title,
        });

        return {
          id: updated.id,
          title: updated.title,
          content: updated.content,
          status: updated.status,
          message: `Document updated successfully using ${toolArgs.edit_type || 'replace'} mode`,
        };
      }

      case 'rename_document': {
        const updated = await this.documentsService.update(toolArgs.document_id, {
          title: toolArgs.new_title,
        });
        return {
          id: updated.id,
          title: updated.title,
          message: 'Document renamed successfully',
        };
      }

      case 'delete_file': {
        const deleted = await this.documentsService.softDelete(toolArgs.document_id);
        return {
          id: deleted.id,
          deleted_at: deleted.deletedAt,
          message: 'Document archived successfully',
        };
      }

      case 'list_folders': {
        const rows = await this.db
          .select()
          .from(folders)
          .where(
            and(
              eq(folders.projectId, toolArgs.project_id),
              toolArgs.parent_folder_id
                ? eq(folders.parentFolderId, toolArgs.parent_folder_id)
                : isNull(folders.parentFolderId),
              isNull(folders.deletedAt),
            ),
          );

        return {
          folders: rows.map((folder: any) => ({
            id: folder.id,
            name: folder.name,
            parent_folder_id: folder.parentFolderId,
            created_at: folder.createdAt,
          })),
          count: rows.length,
        };
      }

      case 'create_folder': {
        const id = randomUUID();
        await this.db.insert(folders).values({
          id,
          name: toolArgs.name,
          parentFolderId: toolArgs.parent_folder_id || null,
          projectId: toolArgs.project_id,
          createdAt: new Date(),
        });

        return {
          id,
          name: toolArgs.name,
          parent_folder_id: toolArgs.parent_folder_id || null,
          project_id: toolArgs.project_id,
          message: 'Folder created successfully',
        };
      }

      case 'move_file': {
        const moved = await this.documentsService.move(
          toolArgs.document_id,
          toolArgs.folder_id || undefined,
        );
        return {
          id: moved.id,
          title: moved.title,
          folder_id: moved.folderId,
          message: 'Document moved successfully',
        };
      }

      case 'generate_image': {
        const image = await this.imageGenerationService.generate(
          {
            prompt: toolArgs.prompt,
            project_id: toolArgs.project_id,
            aspect_ratio: toolArgs.aspect_ratio || '1:1',
            model: toolArgs.model,
          },
          user?.id || user,
        );

        const result: Record<string, any> = {
          image_url: image.file_url,
          thumbnail_url: image.thumbnail_url,
          image_document_id: image.document_id,
          title: image.title,
          prompt: toolArgs.prompt,
          message: 'Image generated successfully',
        };

        if (toolArgs.attach_to_document_id) {
          const attachment = await this.documentsService.createAttachment(
            toolArgs.attach_to_document_id,
            {
              image_id: image.document_id,
              is_primary: true,
            },
          );
          result.attached_to_document_id = toolArgs.attach_to_document_id;
          result.attachment_id = attachment.id;
        }

        return result;
      }

      case 'attach_image_to_document': {
        const attachment = await this.documentsService.createAttachment(
          toolArgs.document_id,
          {
            image_id: toolArgs.image_id,
            is_primary: toolArgs.is_primary ?? false,
          },
        );

        return {
          attachment_id: attachment.id,
          document_id: attachment.documentId,
          image_id: attachment.imageId,
          message: 'Image attached successfully',
        };
      }

      case 'list_boards': {
        const rows = await this.db
          .select()
          .from(boards)
          .where(
            and(
              eq(boards.projectId, toolArgs.project_id),
              isNull(boards.deletedAt),
            ),
          )
          .orderBy(asc(boards.position), asc(boards.createdAt));

        return {
          boards: rows.map((b: any) => ({
            id: b.id,
            name: b.name,
            description: b.description,
            position: b.position,
            folder_id: b.folderId,
            created_at: b.createdAt,
          })),
          count: rows.length,
        };
      }

      case 'create_board': {
        const id = randomUUID();
        const position = 0;
        await this.db.insert(boards).values({
          id,
          projectId: toolArgs.project_id,
          folderId: toolArgs.folder_id || null,
          name: toolArgs.name,
          description: toolArgs.description || null,
          position,
          createdAt: new Date(),
        });

        const [created] = await this.db
          .select()
          .from(boards)
          .where(eq(boards.id, id))
          .limit(1);

        return {
          id: created.id,
          name: created.name,
          description: created.description,
          project_id: created.projectId,
          folder_id: created.folderId,
          position: created.position,
          message: 'Board created successfully. Default columns (e.g. Backlog, Em Progresso, Concluido) were created.',
        };
      }

      case 'list_board_columns': {
        const rows = await this.db
          .select()
          .from(boardColumns)
          .where(eq(boardColumns.boardId, toolArgs.board_id))
          .orderBy(asc(boardColumns.position), asc(boardColumns.createdAt));

        const cards = await this.db
          .select({
            id: documents.id,
            title: documents.title,
            status: documents.status,
            content: documents.content,
            boardColumnId: documents.boardColumnId,
            boardPosition: documents.boardPosition,
            mediaType: documents.mediaType,
          })
          .from(documents)
          .where(
            and(
              eq(documents.boardId, toolArgs.board_id),
              isNull(documents.deletedAt),
            ),
          )
          .orderBy(asc(documents.boardPosition), asc(documents.createdAt));

        const cardsByColumn = new Map<string, any[]>();
        for (const card of cards) {
          const colId = card.boardColumnId ?? '__unassigned__';
          if (!cardsByColumn.has(colId)) cardsByColumn.set(colId, []);
          cardsByColumn.get(colId)!.push({
            id: card.id,
            title: card.title,
            status: card.status,
            media_type: card.mediaType,
            content_preview: card.content
              ? card.content.slice(0, 300) + (card.content.length > 300 ? '...' : '')
              : null,
            board_position: card.boardPosition,
          });
        }

        return {
          columns: rows.map((c: any) => ({
            id: c.id,
            name: c.name,
            color: c.color,
            position: c.position,
            cards: cardsByColumn.get(c.id) ?? [],
            card_count: (cardsByColumn.get(c.id) ?? []).length,
          })),
          unassigned_cards: cardsByColumn.get('__unassigned__') ?? [],
          total_cards: cards.length,
          count: rows.length,
        };
      }

      case 'assign_document_to_board': {
        const boardId = toolArgs.board_id ?? null;
        const boardColumnId = toolArgs.board_column_id ?? null;
        const boardPosition = toolArgs.board_position ?? null;

        await this.documentsService.update(toolArgs.document_id, {
          folder_id: boardId ? null : undefined,
          board_id: boardId,
          board_column_id: boardColumnId,
          board_position: boardPosition,
        });

        if (!boardId) {
          return {
            document_id: toolArgs.document_id,
            message: 'Document removed from board',
          };
        }

        return {
          document_id: toolArgs.document_id,
          board_id: boardId,
          board_column_id: boardColumnId,
          board_position: boardPosition,
          message: 'Document assigned to board successfully',
        };
      }

      default:
        throw new BadRequestException(`Unsupported tool: ${toolName}`);
    }
  }

  private async persistConversationState(
    request: ChatCompletionRequest,
    user: any,
    assistantMessage: {
      content: string;
      toolExecutions?: Record<string, any>[];
      taskList?: Record<string, any>[];
    },
    createdDocumentIds: string[],
  ): Promise<string | null> {
    const userId = user?.id || user;
    if (!userId) {
      return null;
    }

    const workspaceId = await this.resolveWorkspaceId(request, userId);
    if (!workspaceId) {
      return null;
    }

    const baseMessages = request.messages.map((message) => ({
      role: message.role,
      content: message.content,
    }));

    const hasAssistantPayload =
      Boolean(assistantMessage.content?.trim()) ||
      Boolean(assistantMessage.toolExecutions?.length) ||
      Boolean(assistantMessage.taskList?.length);

    const messagesJson = hasAssistantPayload
      ? [
          ...baseMessages,
          {
            role: 'assistant',
            content: assistantMessage.content || '',
            ...(assistantMessage.toolExecutions?.length
              ? { toolExecutions: assistantMessage.toolExecutions }
              : {}),
            ...(assistantMessage.taskList?.length
              ? { taskList: assistantMessage.taskList }
              : {}),
          },
        ]
      : baseMessages;

    const conversationId = request.conversation_id || randomUUID();
    const now = new Date();
    const [existingConversation] = await this.db
      .select({
        id: chatConversations.id,
        createdDocumentIds: chatConversations.createdDocumentIds,
      })
      .from(chatConversations)
      .where(
        and(
          eq(chatConversations.id, conversationId),
          eq(chatConversations.userId, userId),
        ),
      )
      .limit(1);

    const mergedCreatedDocumentIds = Array.from(
      new Set([
        ...((existingConversation?.createdDocumentIds as string[] | undefined) || []),
        ...createdDocumentIds,
      ]),
    );

    const payload = {
      projectId: request.project_id || null,
      workspaceId,
      title: this.generateConversationTitle(messagesJson),
      messagesJson,
      modelUsed: request.model,
      documentIdsContext: request.document_ids || [],
      folderIdsContext: request.folder_ids || [],
      createdDocumentIds: mergedCreatedDocumentIds,
      messageCount: messagesJson.length,
      lastMessageAt: now,
      updatedAt: now,
    };

    if (existingConversation) {
      await this.db
        .update(chatConversations)
        .set(payload)
        .where(
          and(
            eq(chatConversations.id, conversationId),
            eq(chatConversations.userId, userId),
          ),
        );
      return conversationId;
    }

    await this.db.insert(chatConversations).values({
      id: conversationId,
      userId,
      ...payload,
      createdAt: now,
    });

    return conversationId;
  }

  private async logChatUsage(params: {
    request: ChatCompletionRequest;
    user: any;
    model: string;
    provider: string;
    usage?:
      | {
          prompt_tokens?: number;
          completion_tokens?: number;
          total_tokens?: number;
        }
      | undefined;
    assistantContent?: string;
    toolCalls?: string[];
    durationMs?: number;
  }) {
    const userId = params.user?.id || params.user;
    if (!userId) {
      return;
    }

    const workspaceId = await this.resolveWorkspaceId(params.request, userId);
    if (!workspaceId) {
      return;
    }

    const inputTokens = params.usage?.prompt_tokens ?? 0;
    const outputTokens = params.usage?.completion_tokens ?? 0;
    const totalTokens =
      params.usage?.total_tokens ?? inputTokens + outputTokens;

    try {
      await this.db.insert(aiUsageLog).values({
        id: randomUUID(),
        userId,
        workspaceId,
        projectId: params.request.project_id || null,
        model: params.model,
        provider: params.provider,
        requestType: 'chat',
        inputTokens,
        outputTokens,
        totalTokens,
        inputCost: '0',
        outputCost: '0',
        totalCost: '0',
        promptPreview: this.truncatePreview(
          [...params.request.messages]
            .reverse()
            .find((message) => message.role === 'user')
            ?.content || '',
        ),
        responsePreview: this.truncatePreview(params.assistantContent || ''),
        toolCalls:
          params.toolCalls && params.toolCalls.length > 0
            ? Array.from(new Set(params.toolCalls))
            : null,
        durationMs: params.durationMs ?? null,
        createdAt: new Date(),
      });
    } catch (error) {
      this.logger.warn(`Failed to log chat usage: ${error}`);
    }
  }

  private async resolveWorkspaceId(
    request: ChatCompletionRequest,
    _userId: string,
  ): Promise<string | null> {
    if (request.workspace_id) {
      return request.workspace_id;
    }

    if (request.project_id) {
      const [project] = await this.db
        .select({ workspaceId: projects.workspaceId })
        .from(projects)
        .where(and(eq(projects.id, request.project_id), isNull(projects.deletedAt)))
        .limit(1);

      if (project?.workspaceId) {
        return project.workspaceId;
      }
    }

    return null;
  }

  private generateConversationTitle(
    messages: Array<{ role: string; content: string }>,
  ): string {
    const firstUserMessage = messages.find((message) => message.role === 'user');
    const content = (firstUserMessage?.content || 'Nova conversa')
      .trim()
      .replace(/\s+/g, ' ');

    if (content.length <= 50) {
      return content || 'Nova conversa';
    }

    const truncated = content.slice(0, 50);
    const lastSpace = truncated.lastIndexOf(' ');
    return `${(lastSpace > 20 ? truncated.slice(0, lastSpace) : truncated).trim()}...`;
  }

  private truncatePreview(content: string, maxLength = 1000): string {
    const normalized = content.trim();
    if (normalized.length <= maxLength) {
      return normalized;
    }
    return `${normalized.slice(0, maxLength - 3)}...`;
  }

  private async analyzeImageBuffer(
    buffer: Buffer,
    mimeType: string,
    prompt: string,
    model: string,
  ) {
    const dataUrl = `data:${mimeType};base64,${buffer.toString('base64')}`;
    const response = await this.openRouterService.chatCompletion(
      [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: prompt,
            },
            {
              type: 'image_url',
              image_url: {
                url: dataUrl,
              },
            },
          ] as any,
        } as OpenRouterChatMessage,
      ],
      model,
      { maxTokens: 1024 },
    );

    return {
      success: true,
      analysis: response.choices?.[0]?.message?.content || '',
      model,
      provider: 'openrouter',
      usage: response.usage || undefined,
    };
  }

  private async getVisionModel(
    projectId?: string,
    preferAttachmentModel = false,
  ): Promise<string> {
    const fallbackModel = process.env.DEFAULT_VISION_MODEL || 'openai/gpt-5-nano';

    if (!projectId) {
      return fallbackModel;
    }

    const [project] = await this.db
      .select({ workspaceId: projects.workspaceId })
      .from(projects)
      .where(and(eq(projects.id, projectId), isNull(projects.deletedAt)))
      .limit(1);

    if (!project?.workspaceId) {
      return fallbackModel;
    }

    const [workspace] = await this.db
      .select({
        defaultVisionModel: workspaces.defaultVisionModel,
        attachmentAnalysisModel: workspaces.attachmentAnalysisModel,
      })
      .from(workspaces)
      .where(eq(workspaces.id, project.workspaceId))
      .limit(1);

    if (preferAttachmentModel && workspace?.attachmentAnalysisModel) {
      return workspace.attachmentAnalysisModel;
    }

    return (
      workspace?.defaultVisionModel ||
      workspace?.attachmentAnalysisModel ||
      fallbackModel
    );
  }

  private isSupportedAttachmentType(mimeType: string): boolean {
    return (
      mimeType === 'application/pdf' ||
      mimeType === 'image/jpeg' ||
      mimeType === 'image/png' ||
      mimeType === 'image/gif' ||
      mimeType === 'image/webp' ||
      mimeType === 'image/bmp'
    );
  }

  private getBaseMimeType(mimeType?: string): string {
    return (mimeType || 'application/octet-stream').split(';')[0].trim();
  }

  private inferMimeType(filename?: string | null): string {
    const lower = (filename || '').toLowerCase();
    if (lower.endsWith('.png')) return 'image/png';
    if (lower.endsWith('.gif')) return 'image/gif';
    if (lower.endsWith('.webp')) return 'image/webp';
    if (lower.endsWith('.bmp')) return 'image/bmp';
    return 'image/jpeg';
  }
}
