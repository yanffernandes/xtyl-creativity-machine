import { Injectable, Inject, BadRequestException, Logger } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DATABASE } from '../../database/database.module';
import {
  OpenRouterService,
  ChatMessage as OpenRouterChatMessage,
} from '../../integrations/openrouter/openrouter.service';
import { systemConfig } from '../../database/drizzle/schema';

interface ChatCompletionRequest {
  messages: Array<{
    role: string;
    content: string;
    attachments?: Array<{
      type: string;
      content: string;
      filename: string;
      metadata?: Record<string, unknown>;
    }>;
  }>;
  model: string;
  project_id?: string;
  use_rag?: boolean;
  current_document?: {
    id: string;
    title: string;
    content: string;
  };
  current_document_id?: string;
  document_ids?: string[];
  folder_ids?: string[];
  autonomous_mode?: boolean;
}

interface ToolApprovalResponse {
  approval_id: string;
  approved: boolean;
}

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    @Inject(DATABASE) private readonly db: any,
    private readonly openRouterService: OpenRouterService,
  ) {}

  /**
   * List available chat models filtered by system configuration
   */
  async listModels() {
    try {
      // Get visible models from system config
      const [config] = await this.db
        .select()
        .from(systemConfig)
        .where(eq(systemConfig.key, 'visible_text_models'))
        .limit(1);

      const visibleModelIds = config?.value || [];

      // Format models for display
      return visibleModelIds.map((modelId: string) => ({
        id: modelId,
        name: this.formatModelName(modelId),
      }));
    } catch (error) {
      this.logger.error('Error fetching visible models', error);
      return [];
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
    _projectId?: string,
    _userQuestion?: string,
  ) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    // Check file type
    const supportedTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf',
    ];

    if (!supportedTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        'Unsupported file type. Supported formats: images (jpg, png, gif, webp) and PDF',
      );
    }

    // TODO: Implement actual attachment processing
    // For now, return a stub response
    return {
      success: true,
      attachment: {
        type: file.mimetype.startsWith('image/') ? 'image' : 'pdf_text',
        content: 'Attachment processed (stub)',
        filename: file.originalname,
        metadata: {
          size: file.size,
          mimeType: file.mimetype,
        },
      },
    };
  }

  /**
   * Transcribe audio file to text
   */
  async transcribeAudio(
    audio: any,
    _languageHint?: string,
  ): Promise<{ text: string }> {
    if (!audio) {
      throw new BadRequestException('No audio file provided');
    }

    // TODO: Implement audio transcription via OpenRouter
    // For now, return a stub response
    return {
      text: 'Audio transcription not yet implemented',
    };
  }

  /**
   * Handle tool approval response
   */
  async handleToolApproval(
    response: ToolApprovalResponse,
  ): Promise<{ success: boolean; approval_id: string; approved: boolean }> {
    // TODO: Implement Redis-based approval storage
    this.logger.log(`Tool approval: ${response.approval_id} = ${response.approved}`);

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
    // TODO: Implement tool cancellation
    this.logger.log(`Tool cancellation requested: ${toolCallId}`);

    return {
      success: false,
      message: 'Tool execution not found or already completed',
    };
  }

  /**
   * Non-streaming chat completion
   */
  async completion(request: ChatCompletionRequest, user: any) {
    // Build messages with attachments
    const messages = this.buildMessages(request);

    // Build system prompt
    const systemPrompt = this.buildSystemPrompt(request, user);
    if (!messages[0] || messages[0].role !== 'system') {
      messages.unshift({ role: 'system', content: systemPrompt });
    }

    // Call OpenRouter
    const response = await this.openRouterService.chatCompletion(
      messages,
      request.model,
      { temperature: 0.7, maxTokens: 4096 },
    );

    // TODO: Save conversation to database
    // TODO: Log AI usage

    return response;
  }

  /**
   * Streaming chat completion (async generator)
   */
  async *streamCompletion(request: ChatCompletionRequest, user: any) {
    yield { type: 'status', message: 'Iniciando agente IA...' };

    // Build messages
    const messages = this.buildMessages(request);

    // Build system prompt
    const systemPrompt = this.buildSystemPrompt(request, user);
    if (!messages[0] || messages[0].role !== 'system') {
      messages.unshift({ role: 'system', content: systemPrompt });
    }

    // Stream from OpenRouter
    try {
      const stream = this.openRouterService.streamChatCompletion(
        messages,
        request.model,
        { temperature: 0.7, maxTokens: 4096 },
      );

      for await (const chunk of stream) {
        if (chunk.choices?.[0]?.delta?.content) {
          yield {
            type: 'message_chunk',
            content: chunk.choices[0].delta.content,
          };
        }
      }

      yield { type: 'done' };
    } catch (error) {
      this.logger.error('Error streaming completion', error);
      const message = error instanceof Error ? error.message : String(error);
      yield { type: 'error', message };
    }
  }

  /**
   * Analyze an uploaded image using vision model
   */
  async analyzeImage(file: any, _prompt: string) {
    if (!file) {
      throw new BadRequestException('No image file provided');
    }

    // TODO: Implement vision analysis
    return {
      success: true,
      analysis: 'Image analysis not yet implemented',
    };
  }

  /**
   * Analyze an already uploaded image document
   */
  async analyzeDocumentImage(_documentId: string, _prompt: string) {
    // TODO: Implement document image analysis
    return {
      success: true,
      analysis: 'Document image analysis not yet implemented',
    };
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
  private buildSystemPrompt(
    request: ChatCompletionRequest,
    _user: any,
  ): string {
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

    return parts.join('\n');
  }
}
