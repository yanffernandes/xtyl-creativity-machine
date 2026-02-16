import {
  Controller,
  Get,
  Post,
  Body,
  Req,
  Res,
} from '@nestjs/common';
import { FastifyReply, FastifyRequest } from 'fastify';
import { ChatService } from './chat.service';
import { CurrentUser } from '../../common/decorators';

interface ChatMessage {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  attachments?: Array<{
    type: string;
    content: string;
    filename: string;
    metadata?: Record<string, unknown>;
  }>;
}

interface CurrentDocument {
  id: string;
  title: string;
  content: string;
}

interface ChatCompletionRequest {
  messages: ChatMessage[];
  model: string;
  project_id?: string;
  use_rag?: boolean;
  current_document?: CurrentDocument;
  current_document_id?: string;
  document_ids?: string[];
  folder_ids?: string[];
  autonomous_mode?: boolean;
}

interface ToolApprovalResponse {
  approval_id: string;
  approved: boolean;
}

interface ToolCancelRequest {
  tool_call_id: string;
}

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get('models')
  async getAvailableModels() {
    return this.chatService.listModels();
  }

  @Post('upload-attachment')
  async uploadAttachment(
    @Req() req: FastifyRequest,
  ) {
    const data = await (req as any).file();
    const body = data?.fields as Record<string, any>;
    const projectId = body?.project_id?.value as string | undefined;
    const userQuestion = body?.user_question?.value as string | undefined;
    return this.chatService.uploadAttachment(data, projectId, userQuestion);
  }

  @Post('transcribe')
  async transcribeAudio(
    @Req() req: FastifyRequest,
  ) {
    const data = await (req as any).file();
    const body = data?.fields as Record<string, any>;
    const languageHint = body?.language_hint?.value as string | undefined;
    return this.chatService.transcribeAudio(data, languageHint);
  }

  @Post('tool-approval')
  async respondToToolApproval(
    @Body() response: ToolApprovalResponse,
  ) {
    return this.chatService.handleToolApproval(response);
  }

  @Post('tool-cancel')
  async cancelToolExecution(
    @Body() request: ToolCancelRequest,
  ) {
    return this.chatService.cancelTool(request.tool_call_id);
  }

  @Post('completion')
  async generateChatCompletion(
    @Body() request: ChatCompletionRequest,
    @CurrentUser() user: any,
  ) {
    return this.chatService.completion(request, user);
  }

  @Post('completion-stream')
  async generateChatCompletionStream(
    @Body() request: ChatCompletionRequest,
    @CurrentUser() user: any,
    @Res() reply: FastifyReply,
  ) {
    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });

    try {
      for await (const chunk of this.chatService.streamCompletion(
        request,
        user,
      )) {
        reply.raw.write(`data: ${JSON.stringify(chunk)}\n\n`);
      }
      reply.raw.write('data: [DONE]\n\n');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      reply.raw.write(
        `data: ${JSON.stringify({ type: 'error', message })}\n\n`,
      );
    } finally {
      reply.raw.end();
    }
  }

  @Post('analyze-image')
  async analyzeImage(
    @Req() req: FastifyRequest,
  ) {
    const data = await (req as any).file();
    const body = data?.fields as Record<string, any>;
    const prompt = (body?.prompt?.value as string) || 'Descreva esta imagem em detalhes.';
    return this.chatService.analyzeImage(data, prompt);
  }

  @Post('analyze-document-image')
  async analyzeDocumentImage(
    @Body('document_id') documentId: string,
    @Body('prompt')
    prompt = 'Descreva esta imagem em detalhes e extraia qualquer texto visível.',
  ) {
    return this.chatService.analyzeDocumentImage(documentId, prompt);
  }
}
