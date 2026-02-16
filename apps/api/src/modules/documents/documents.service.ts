/**
 * DocumentsService
 *
 * Ported from backend/routers/documents.py and backend/crud.py
 */

import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { eq, and, isNull, like, or, desc, sql } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import { DATABASE } from '../../database/database.module';
import {
  documents,
  documentAttachments,
} from '../../database/drizzle/schema';
import { StorageService } from '../storage/storage.service';
import {
  DocumentCreateDto,
  DocumentUpdateDto,
  DocumentListQueryDto,
  DocumentAttachmentCreateDto,
} from './dto/document.dto';

@Injectable()
export class DocumentsService {
  constructor(
    @Inject(DATABASE) private readonly db: any,
    private readonly storageService: StorageService,
  ) {}

  // ─────────────────────────────────────────────
  // CRUD Operations
  // ─────────────────────────────────────────────

  /**
   * Create a text document
   */
  async create(projectId: string, dto: DocumentCreateDto) {
    const id = randomUUID();

    const [document] = await this.db
      .insert(documents)
      .values({
        id,
        projectId,
        title: dto.title,
        content: dto.content ?? '',
        status: dto.status ?? 'draft',
        mediaType: dto.media_type ?? 'text',
        fileUrl: dto.file_url,
        thumbnailUrl: dto.thumbnail_url,
        generationMetadata: dto.generation_metadata ?? {},
        folderId: dto.folder_id,
        isContext: dto.is_context ?? false,
        isReferenceAsset: dto.is_reference_asset ?? false,
        assetType: dto.asset_type,
        assetMetadata: dto.asset_metadata ?? {},
        tags: dto.tags ?? [],
        campaignId: dto.campaign_id,
        channel: dto.channel,
        createdAt: new Date(),
      })
      .returning();

    return document;
  }

  /**
   * Upload a file document
   */
  async uploadFile(
    projectId: string,
    file: Buffer,
    fileName: string,
    contentType: string,
    isContext = false,
  ) {
    const id = randomUUID();
    const fileKey = `projects/${projectId}/documents/${id}/${fileName}`;

    // Upload to R2
    const fileUrl = await this.storageService.upload(
      fileKey,
      file,
      contentType,
    );

    // Determine media type
    let mediaType = 'text';
    if (contentType.startsWith('image/')) {
      mediaType = 'image';
    } else if (contentType === 'application/pdf') {
      mediaType = 'pdf';
    } else if (contentType.startsWith('video/')) {
      mediaType = 'video';
    }

    const [document] = await this.db
      .insert(documents)
      .values({
        id,
        projectId,
        title: fileName,
        content: '',
        status: 'processing',
        mediaType,
        fileUrl,
        isContext,
        createdAt: new Date(),
      })
      .returning();

    return document;
  }

  /**
   * List documents with filtering and pagination
   */
  async list(query: DocumentListQueryDto) {
    const {
      project_id,
      folder_id,
      media_type,
      status,
      search,
      campaign_id,
      page = 1,
      limit = 20,
    } = query;

    const offset = (page - 1) * limit;

    // Build where conditions
    const conditions: any[] = [isNull(documents.deletedAt)];

    if (project_id) {
      conditions.push(eq(documents.projectId, project_id));
    }

    if (folder_id) {
      conditions.push(eq(documents.folderId, folder_id));
    }

    if (media_type) {
      conditions.push(eq(documents.mediaType, media_type));
    }

    if (status) {
      conditions.push(eq(documents.status, status));
    }

    if (campaign_id) {
      conditions.push(eq(documents.campaignId, campaign_id));
    }

    if (search) {
      conditions.push(
        or(
          like(documents.title, `%${search}%`),
          like(documents.content, `%${search}%`),
        ),
      );
    }

    // Count total
    const [{ count }] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(documents)
      .where(and(...conditions));

    const total = count || 0;

    if (total === 0) {
      return {
        documents: [],
        total: 0,
        page,
        limit,
        has_more: false,
      };
    }

    // Fetch paginated items
    const items = await this.db
      .select()
      .from(documents)
      .where(and(...conditions))
      .orderBy(desc(documents.createdAt))
      .limit(limit)
      .offset(offset);

    const hasMore = offset + items.length < total;

    return {
      documents: items,
      total,
      page,
      limit,
      has_more: hasMore,
    };
  }

  /**
   * Get single document by ID
   */
  async findById(documentId: string) {
    const [document] = await this.db
      .select()
      .from(documents)
      .where(and(eq(documents.id, documentId), isNull(documents.deletedAt)))
      .limit(1);

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    return document;
  }

  /**
   * Update document
   */
  async update(documentId: string, dto: DocumentUpdateDto) {
    const updateData: any = {
      updatedAt: new Date(),
    };

    if (dto.title !== undefined) updateData.title = dto.title;
    if (dto.content !== undefined) updateData.content = dto.content;
    if (dto.status !== undefined) updateData.status = dto.status;
    if (dto.media_type !== undefined) updateData.mediaType = dto.media_type;
    if (dto.file_url !== undefined) updateData.fileUrl = dto.file_url;
    if (dto.thumbnail_url !== undefined)
      updateData.thumbnailUrl = dto.thumbnail_url;
    if (dto.generation_metadata !== undefined)
      updateData.generationMetadata = dto.generation_metadata;
    if (dto.folder_id !== undefined) updateData.folderId = dto.folder_id;
    if (dto.is_context !== undefined) updateData.isContext = dto.is_context;
    if (dto.is_reference_asset !== undefined)
      updateData.isReferenceAsset = dto.is_reference_asset;
    if (dto.asset_type !== undefined) updateData.assetType = dto.asset_type;
    if (dto.asset_metadata !== undefined)
      updateData.assetMetadata = dto.asset_metadata;
    if (dto.tags !== undefined) updateData.tags = dto.tags;
    if (dto.campaign_id !== undefined) updateData.campaignId = dto.campaign_id;
    if (dto.channel !== undefined) updateData.channel = dto.channel;

    const [updated] = await this.db
      .update(documents)
      .set(updateData)
      .where(and(eq(documents.id, documentId), isNull(documents.deletedAt)))
      .returning();

    if (!updated) {
      throw new NotFoundException('Document not found');
    }

    return updated;
  }

  /**
   * Soft delete document
   */
  async softDelete(documentId: string) {
    const [deleted] = await this.db
      .update(documents)
      .set({ deletedAt: new Date() })
      .where(and(eq(documents.id, documentId), isNull(documents.deletedAt)))
      .returning();

    if (!deleted) {
      throw new NotFoundException('Document not found');
    }

    return deleted;
  }

  /**
   * Hard delete document (permanent)
   */
  async hardDelete(documentId: string) {
    const [document] = await this.db
      .select()
      .from(documents)
      .where(eq(documents.id, documentId))
      .limit(1);

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    // Delete from R2 if file exists
    if (document.fileUrl) {
      const key = this.extractObjectKey(document.fileUrl);
      if (key) {
        try {
          await this.storageService.delete(key);
        } catch (error) {
          // Log but don't fail
        }
      }
    }

    if (document.thumbnailUrl) {
      const key = this.extractObjectKey(document.thumbnailUrl);
      if (key) {
        try {
          await this.storageService.delete(key);
        } catch (error) {
          // Log but don't fail
        }
      }
    }

    await this.db.delete(documents).where(eq(documents.id, documentId));

    return true;
  }

  /**
   * Move document to folder
   */
  async move(documentId: string, folderId?: string) {
    const [moved] = await this.db
      .update(documents)
      .set({ folderId, updatedAt: new Date() })
      .where(and(eq(documents.id, documentId), isNull(documents.deletedAt)))
      .returning();

    if (!moved) {
      throw new NotFoundException('Document not found');
    }

    return moved;
  }

  /**
   * Restore soft-deleted document
   */
  async restore(documentId: string) {
    const [restored] = await this.db
      .update(documents)
      .set({ deletedAt: null, updatedAt: new Date() })
      .where(eq(documents.id, documentId))
      .returning();

    if (!restored) {
      throw new NotFoundException('Document not found or not archived');
    }

    return restored;
  }

  // ─────────────────────────────────────────────
  // Public Sharing
  // ─────────────────────────────────────────────

  /**
   * Create share link
   */
  async createShareLink(documentId: string, expiresInDays?: number) {
    const shareToken = randomUUID();
    let shareExpiresAt = null;

    if (expiresInDays) {
      shareExpiresAt = new Date();
      shareExpiresAt.setDate(shareExpiresAt.getDate() + expiresInDays);
    }

    const [document] = await this.db
      .update(documents)
      .set({
        isPublic: true,
        shareToken,
        shareExpiresAt,
        updatedAt: new Date(),
      })
      .where(and(eq(documents.id, documentId), isNull(documents.deletedAt)))
      .returning();

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    return {
      share_token: shareToken,
      share_url: `/documents/shared/${shareToken}`,
      expires_at: shareExpiresAt?.toISOString(),
      is_public: true,
    };
  }

  /**
   * Revoke share link
   */
  async revokeShareLink(documentId: string) {
    const [document] = await this.db
      .update(documents)
      .set({
        isPublic: false,
        shareToken: null,
        shareExpiresAt: null,
        updatedAt: new Date(),
      })
      .where(and(eq(documents.id, documentId), isNull(documents.deletedAt)))
      .returning();

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    return {
      message: 'Share link revoked successfully',
      is_public: false,
    };
  }

  /**
   * Get shared document by token (public, no auth)
   */
  async getSharedDocument(shareToken: string) {
    const [document] = await this.db
      .select()
      .from(documents)
      .where(
        and(
          eq(documents.shareToken, shareToken),
          eq(documents.isPublic, true),
          isNull(documents.deletedAt),
        ),
      )
      .limit(1);

    if (!document) {
      throw new NotFoundException(
        'Shared document not found or link is invalid',
      );
    }

    // Check if expired
    if (document.shareExpiresAt && document.shareExpiresAt < new Date()) {
      throw new BadRequestException('Share link has expired');
    }

    return document;
  }

  // ─────────────────────────────────────────────
  // Attachments
  // ─────────────────────────────────────────────

  /**
   * Get document attachments
   */
  async getAttachments(documentId: string) {
    const attachments = await this.db
      .select()
      .from(documentAttachments)
      .where(eq(documentAttachments.documentId, documentId))
      .orderBy(documentAttachments.attachmentOrder);

    return attachments;
  }

  /**
   * Attach image to document
   */
  async createAttachment(documentId: string, dto: DocumentAttachmentCreateDto) {
    // Verify image exists and is an image
    const [image] = await this.db
      .select()
      .from(documents)
      .where(and(eq(documents.id, dto.image_id), isNull(documents.deletedAt)))
      .limit(1);

    if (!image) {
      throw new NotFoundException('Image not found');
    }

    if (image.mediaType !== 'image') {
      throw new BadRequestException('Attached document must be an image');
    }

    // Check if already attached
    const [existing] = await this.db
      .select()
      .from(documentAttachments)
      .where(
        and(
          eq(documentAttachments.documentId, documentId),
          eq(documentAttachments.imageId, dto.image_id),
        ),
      )
      .limit(1);

    if (existing) {
      throw new ConflictException('Image already attached to this document');
    }

    // If primary, unmark other primary attachments
    if (dto.is_primary) {
      await this.db
        .update(documentAttachments)
        .set({ isPrimary: false })
        .where(
          and(
            eq(documentAttachments.documentId, documentId),
            eq(documentAttachments.isPrimary, true),
          ),
        );
    }

    const [attachment] = await this.db
      .insert(documentAttachments)
      .values({
        id: randomUUID(),
        documentId,
        imageId: dto.image_id,
        isPrimary: dto.is_primary ?? false,
        attachmentOrder: dto.attachment_order ?? 0,
        createdAt: new Date(),
      })
      .returning();

    return attachment;
  }

  /**
   * Delete attachment
   */
  async deleteAttachment(documentId: string, attachmentId: string) {
    const [attachment] = await this.db
      .select()
      .from(documentAttachments)
      .where(
        and(
          eq(documentAttachments.id, attachmentId),
          eq(documentAttachments.documentId, documentId),
        ),
      )
      .limit(1);

    if (!attachment) {
      throw new NotFoundException('Attachment not found');
    }

    await this.db
      .delete(documentAttachments)
      .where(eq(documentAttachments.id, attachmentId));

    return {
      success: true,
      message: 'Image detached from document (still available in library)',
      image_id: attachment.imageId,
    };
  }

  /**
   * Permanently delete attached image
   */
  async deleteAttachmentPermanent(documentId: string, attachmentId: string) {
    const [attachment] = await this.db
      .select()
      .from(documentAttachments)
      .where(
        and(
          eq(documentAttachments.id, attachmentId),
          eq(documentAttachments.documentId, documentId),
        ),
      )
      .limit(1);

    if (!attachment) {
      throw new NotFoundException('Attachment not found');
    }

    // Get the image document
    const [imageDoc] = await this.db
      .select()
      .from(documents)
      .where(eq(documents.id, attachment.imageId))
      .limit(1);

    if (!imageDoc) {
      // Clean up attachment
      await this.db
        .delete(documentAttachments)
        .where(eq(documentAttachments.id, attachmentId));
      return {
        success: true,
        message: 'Attachment removed (image was already deleted)',
        deleted_files: [],
      };
    }

    // Check if image is used as original by another document
    const [dependent] = await this.db
      .select()
      .from(documents)
      .where(
        and(
          eq(documents.originalImageId, imageDoc.id),
          sql`${documents.id} != ${imageDoc.id}`,
        ),
      )
      .limit(1);

    if (dependent) {
      throw new ConflictException(
        'Cannot delete: this image is the original reference for another refined image. Delete the refined image first.',
      );
    }

    // Delete files from storage
    const deletedFiles: string[] = [];

    for (const urlField of ['fileUrl', 'thumbnailUrl'] as const) {
      const url = imageDoc[urlField];
      if (url) {
        const key = this.extractObjectKey(url);
        if (key) {
          try {
            await this.storageService.delete(key);
            deletedFiles.push(key);
          } catch (error) {
            // Log but continue
          }
        }
      }
    }

    // Delete attachment
    await this.db
      .delete(documentAttachments)
      .where(eq(documentAttachments.id, attachmentId));

    // Delete any other attachments pointing to this image
    await this.db
      .delete(documentAttachments)
      .where(eq(documentAttachments.imageId, imageDoc.id));

    // Delete image document
    await this.db.delete(documents).where(eq(documents.id, imageDoc.id));

    return {
      success: true,
      message: 'Image permanently deleted from document and storage',
      deleted_files: deletedFiles,
    };
  }

  // ─────────────────────────────────────────────
  // Version History
  // ─────────────────────────────────────────────

  /**
   * Get version history
   */
  async getVersionHistory(documentId: string) {
    const [document] = await this.db
      .select()
      .from(documents)
      .where(eq(documents.id, documentId))
      .limit(1);

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    const versionHistory = (document.versionHistory as any[]) || [];
    const versions = versionHistory.map((v: any) => ({
      version: v.version || 0,
      title: v.title || '',
      content: v.content || '',
      created_at: new Date(v.created_at || new Date()),
      created_by: v.created_by,
    }));

    return {
      document_id: documentId,
      current_version: document.currentVersion || 1,
      versions,
    };
  }

  /**
   * Restore version
   */
  async restoreVersion(documentId: string, version: number, userId: string) {
    const [document] = await this.db
      .select()
      .from(documents)
      .where(eq(documents.id, documentId))
      .limit(1);

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    const versionHistory = (document.versionHistory as any[]) || [];
    const versionToRestore = versionHistory.find((v) => v.version === version);

    if (!versionToRestore) {
      throw new NotFoundException(
        `Version ${version} not found in history`,
      );
    }

    // Create snapshot of current state
    const currentSnapshot = {
      version: document.currentVersion || 1,
      title: document.title,
      content: document.content,
      created_at: new Date().toISOString(),
      created_by: userId,
    };

    // Add to history and keep last 10
    const newHistory = [...versionHistory, currentSnapshot];
    if (newHistory.length > 10) {
      newHistory.splice(0, newHistory.length - 10);
    }

    // Restore old content
    const [updated] = await this.db
      .update(documents)
      .set({
        title: versionToRestore.title || document.title,
        content: versionToRestore.content || '',
        versionHistory: newHistory,
        currentVersion: (document.currentVersion || 1) + 1,
        updatedAt: new Date(),
      })
      .where(eq(documents.id, documentId))
      .returning();

    return {
      success: true,
      message: `Document restored to version ${version}`,
      current_version: updated.currentVersion,
      restored_from: version,
    };
  }

  // ─────────────────────────────────────────────
  // Project Media
  // ─────────────────────────────────────────────

  /**
   * List project media (images) with pagination
   */
  async listProjectMedia(projectId: string, page = 1, limit = 20) {
    const offset = (page - 1) * limit;

    // Count total
    const [{ count }] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(documents)
      .where(
        and(
          eq(documents.projectId, projectId),
          eq(documents.mediaType, 'image'),
          eq(documents.isReferenceAsset, false),
          isNull(documents.deletedAt),
        ),
      );

    const total = count || 0;

    if (total === 0) {
      return {
        items: [],
        total: 0,
        page,
        limit,
        has_more: false,
      };
    }

    // Fetch items
    const items = await this.db
      .select()
      .from(documents)
      .where(
        and(
          eq(documents.projectId, projectId),
          eq(documents.mediaType, 'image'),
          eq(documents.isReferenceAsset, false),
          isNull(documents.deletedAt),
        ),
      )
      .orderBy(desc(documents.createdAt))
      .limit(limit)
      .offset(offset);

    const hasMore = offset + items.length < total;

    return {
      items,
      total,
      page,
      limit,
      has_more: hasMore,
    };
  }

  // ─────────────────────────────────────────────
  // Helpers
  // ─────────────────────────────────────────────

  private extractObjectKey(url: string): string | null {
    if (!url) return null;

    const publicUrl = process.env.R2_PUBLIC_URL;
    if (publicUrl && url.startsWith(publicUrl)) {
      return url.substring(publicUrl.length).replace(/^\/+/, '');
    }

    // Fallback: extract path from URL
    try {
      const urlObj = new URL(url);
      return urlObj.pathname.replace(/^\/+/, '');
    } catch {
      return null;
    }
  }
}
