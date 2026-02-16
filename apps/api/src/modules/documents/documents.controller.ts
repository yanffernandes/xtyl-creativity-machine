/**
 * DocumentsController
 *
 * Ported from backend/routers/documents.py
 *
 * 18 endpoints as per T060 spec
 */

import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  BadRequestException,
} from '@nestjs/common';
import { FastifyRequest } from 'fastify';
import { ProjectAccessGuard } from '../../common/guards/project-access.guard';
import { DocumentAccessGuard } from '../../common/guards/document-access.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { DocumentsService } from './documents.service';
import {
  DocumentCreateDto,
  DocumentUpdateDto,
  DocumentListQueryDto,
  DocumentMoveDto,
  DocumentShareDto,
  DocumentAttachmentCreateDto,
} from './dto/document.dto';

@Controller('documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  // ─────────────────────────────────────────────
  // 1. Upload file (multipart/form-data)
  // ─────────────────────────────────────────────
  // Note: Requires @fastify/multipart to be registered in main.ts
  // TODO: Register multipart in bootstrap: app.register(multipartPlugin)

  @Post('upload')
  async uploadDocument(
    @Req() request: FastifyRequest,
  ) {
    // Handle multipart form data with Fastify
    // This requires @fastify/multipart to be installed and registered
    const data = await (request as any).file();

    if (!data) {
      throw new BadRequestException('No file uploaded');
    }

    const buffer = await data.toBuffer();
    const projectId = (data.fields as any)?.project_id?.value;
    const isContext = (data.fields as any)?.is_context?.value === 'true';

    if (!projectId) {
      throw new BadRequestException('project_id is required');
    }

    const document = await this.documentsService.uploadFile(
      projectId,
      buffer,
      data.filename,
      data.mimetype,
      isContext,
    );

    return {
      id: document.id,
      status: document.status,
      is_context: document.isContext,
      message: 'Document uploaded and processing started',
    };
  }

  // ─────────────────────────────────────────────
  // 2. List documents with filtering
  // ─────────────────────────────────────────────

  @Get()
  async listDocuments(@Query() query: DocumentListQueryDto) {
    return this.documentsService.list(query);
  }

  // ─────────────────────────────────────────────
  // 3. Create text document
  // ─────────────────────────────────────────────

  @Post()
  @UseGuards(ProjectAccessGuard)
  async createDocument(
    @Body('project_id') projectId: string,
    @Body() dto: DocumentCreateDto,
  ) {
    return this.documentsService.create(projectId, dto);
  }

  // ─────────────────────────────────────────────
  // 4. Get single document
  // ─────────────────────────────────────────────

  @Get(':documentId')
  @UseGuards(DocumentAccessGuard)
  async getDocument(@Param('documentId') documentId: string) {
    return this.documentsService.findById(documentId);
  }

  // ─────────────────────────────────────────────
  // 5. Update document
  // ─────────────────────────────────────────────

  @Put(':documentId')
  @UseGuards(DocumentAccessGuard)
  async updateDocument(
    @Param('documentId') documentId: string,
    @Body() dto: DocumentUpdateDto,
  ) {
    return this.documentsService.update(documentId, dto);
  }

  // ─────────────────────────────────────────────
  // 6. Delete document (soft/hard)
  // ─────────────────────────────────────────────

  @Delete(':documentId')
  @UseGuards(DocumentAccessGuard)
  async deleteDocument(
    @Param('documentId') documentId: string,
    @Query('hard_delete') hardDelete: string,
  ) {
    const isHardDelete = hardDelete === 'true';

    if (isHardDelete) {
      await this.documentsService.hardDelete(documentId);
      return { message: 'Document permanently deleted' };
    } else {
      const deleted = await this.documentsService.softDelete(documentId);
      return {
        message: 'Document archived successfully',
        id: deleted.id,
        deleted_at: deleted.deletedAt,
      };
    }
  }

  // ─────────────────────────────────────────────
  // 7. Move document to folder
  // ─────────────────────────────────────────────

  @Post(':documentId/move')
  @UseGuards(DocumentAccessGuard)
  async moveDocument(
    @Param('documentId') documentId: string,
    @Body() dto: DocumentMoveDto,
  ) {
    const moved = await this.documentsService.move(documentId, dto.folder_id);
    return {
      id: moved.id,
      title: moved.title,
      folder_id: moved.folderId,
      message: 'Document moved successfully',
    };
  }

  // ─────────────────────────────────────────────
  // 8. Restore soft-deleted document
  // ─────────────────────────────────────────────

  @Post(':documentId/restore')
  async restoreDocument(@Param('documentId') documentId: string) {
    const restored = await this.documentsService.restore(documentId);
    return {
      id: restored.id,
      title: restored.title,
      message: 'Document restored successfully',
    };
  }

  // ─────────────────────────────────────────────
  // 9. Export document (stub for now)
  // ─────────────────────────────────────────────

  @Get(':documentId/export/:format')
  @UseGuards(DocumentAccessGuard)
  async exportDocument(
    @Param('documentId') documentId: string,
    @Param('format') format: string,
  ) {
    // Stub implementation - export functionality to be implemented later
    const document = await this.documentsService.findById(documentId);

    if (document.mediaType !== 'text') {
      throw new Error('Only text documents can be exported');
    }

    // TODO: Implement actual export logic (PDF, DOCX, MD)
    return {
      message: `Export to ${format} not yet implemented`,
      document_id: documentId,
      format,
    };
  }

  // ─────────────────────────────────────────────
  // 10. Create share link
  // ─────────────────────────────────────────────

  @Post(':documentId/share')
  @UseGuards(DocumentAccessGuard)
  async createShareLink(
    @Param('documentId') documentId: string,
    @Body() dto: DocumentShareDto,
  ) {
    return this.documentsService.createShareLink(
      documentId,
      dto.expires_in_days,
    );
  }

  // ─────────────────────────────────────────────
  // 11. Revoke share link
  // ─────────────────────────────────────────────

  @Delete(':documentId/share')
  @UseGuards(DocumentAccessGuard)
  async revokeShareLink(@Param('documentId') documentId: string) {
    return this.documentsService.revokeShareLink(documentId);
  }

  // ─────────────────────────────────────────────
  // 12. Get shared document (public)
  // ─────────────────────────────────────────────

  @Public()
  @Get('shared/:shareToken')
  async getSharedDocument(@Param('shareToken') shareToken: string) {
    const document = await this.documentsService.getSharedDocument(shareToken);

    return {
      id: document.id,
      title: document.title,
      content: document.content,
      media_type: document.mediaType,
      file_url: document.fileUrl,
      thumbnail_url: document.thumbnailUrl,
      created_at: document.createdAt,
      updated_at: document.updatedAt,
      is_shared: true,
      read_only: true,
    };
  }

  // ─────────────────────────────────────────────
  // 13. List attachments
  // ─────────────────────────────────────────────

  @Get(':documentId/attachments')
  @UseGuards(DocumentAccessGuard)
  async getAttachments(@Param('documentId') documentId: string) {
    return this.documentsService.getAttachments(documentId);
  }

  // ─────────────────────────────────────────────
  // 14. Upload attachment
  // ─────────────────────────────────────────────

  @Post(':documentId/attachments')
  @UseGuards(DocumentAccessGuard)
  async attachImage(
    @Param('documentId') documentId: string,
    @Body() dto: DocumentAttachmentCreateDto,
  ) {
    return this.documentsService.createAttachment(documentId, dto);
  }

  // ─────────────────────────────────────────────
  // 15. Delete attachment
  // ─────────────────────────────────────────────

  @Delete(':documentId/attachments/:attachmentId')
  @UseGuards(DocumentAccessGuard)
  async deleteAttachment(
    @Param('documentId') documentId: string,
    @Param('attachmentId') attachmentId: string,
  ) {
    return this.documentsService.deleteAttachment(documentId, attachmentId);
  }

  // ─────────────────────────────────────────────
  // 16. Get version history
  // ─────────────────────────────────────────────

  @Get(':documentId/versions')
  @UseGuards(DocumentAccessGuard)
  async getVersionHistory(@Param('documentId') documentId: string) {
    return this.documentsService.getVersionHistory(documentId);
  }

  // ─────────────────────────────────────────────
  // 17. Restore version
  // ─────────────────────────────────────────────

  @Post(':documentId/versions/:versionId/restore')
  @UseGuards(DocumentAccessGuard)
  async restoreVersion(
    @Param('documentId') documentId: string,
    @Param('versionId') versionId: string,
    @CurrentUser('id') userId: string,
  ) {
    const version = parseInt(versionId, 10);
    return this.documentsService.restoreVersion(documentId, version, userId);
  }

  // ─────────────────────────────────────────────
  // 18. List project media
  // ─────────────────────────────────────────────

  @Get('project/:projectId/media')
  @UseGuards(ProjectAccessGuard)
  async listProjectMedia(
    @Param('projectId') projectId: string,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 20;

    return this.documentsService.listProjectMedia(projectId, pageNum, limitNum);
  }

  // ─────────────────────────────────────────────
  // Additional: Delete attachment permanently
  // ─────────────────────────────────────────────

  @Delete(':documentId/attachments/:attachmentId/permanent')
  @UseGuards(DocumentAccessGuard)
  async deleteAttachmentPermanent(
    @Param('documentId') documentId: string,
    @Param('attachmentId') attachmentId: string,
  ) {
    return this.documentsService.deleteAttachmentPermanent(
      documentId,
      attachmentId,
    );
  }
}
