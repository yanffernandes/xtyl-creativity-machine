import {
  Injectable,
  Inject,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { eq, and, ilike, or, desc } from 'drizzle-orm';
import { DATABASE } from '../../database/database.module';
import {
  copyLibraryItems,
  workspaceUsers,
} from '../../database/drizzle/schema';

@Injectable()
export class CopiesService {
  constructor(@Inject(DATABASE) private readonly db: any) {}

  private async verifyWorkspaceAccess(userId: string, workspaceId: string) {
    const membership = await this.db
      .select()
      .from(workspaceUsers)
      .where(
        and(
          eq(workspaceUsers.workspaceId, workspaceId),
          eq(workspaceUsers.userId, userId),
        ),
      )
      .limit(1);

    if (!membership || membership.length === 0) {
      throw new ForbiddenException('Access denied to this workspace');
    }
  }

  async listCopies(
    userId: string,
    workspaceId: string,
    search?: string,
    tags?: string[],
    limit = 50,
    offset = 0,
  ) {
    await this.verifyWorkspaceAccess(userId, workspaceId);

    const conditions = [eq(copyLibraryItems.workspaceId, workspaceId)];

    // Add search filter
    if (search) {
      conditions.push(
        or(
          ilike(copyLibraryItems.title, `%${search}%`),
          ilike(copyLibraryItems.content, `%${search}%`),
        )!,
      );
    }

    // Note: Tag filtering with array overlap would require raw SQL in Drizzle
    // For now, we'll fetch all and filter in memory if tags are specified
    let copies = await this.db
      .select()
      .from(copyLibraryItems)
      .where(and(...conditions))
      .orderBy(desc(copyLibraryItems.updatedAt))
      .limit(limit)
      .offset(offset);

    // Filter by tags in memory if specified
    if (tags && tags.length > 0) {
      copies = copies.filter((copy: any) => {
        const copyTags = copy.tags || [];
        return tags.some((tag) => copyTags.includes(tag));
      });
    }

    return {
      items: copies,
      total: copies.length,
    };
  }

  async createCopy(
    userId: string,
    workspaceId: string,
    dto: { title: string; content: string; tags?: string[] },
  ) {
    await this.verifyWorkspaceAccess(userId, workspaceId);

    // Validate input
    if (dto.title.length > 255) {
      throw new BadRequestException('Title must be 255 characters or less');
    }
    if (dto.content.length > 10000) {
      throw new BadRequestException('Content must be 10000 characters or less');
    }
    if (dto.tags && dto.tags.length > 20) {
      throw new BadRequestException('Maximum 20 tags allowed');
    }

    const result = await this.db
      .insert(copyLibraryItems)
      .values({
        workspaceId,
        title: dto.title,
        content: dto.content,
        tags: dto.tags || [],
        createdBy: userId,
      })
      .returning();

    return result[0];
  }

  async updateCopy(
    userId: string,
    workspaceId: string,
    copyId: string,
    dto: { title?: string; content?: string; tags?: string[] },
  ) {
    await this.verifyWorkspaceAccess(userId, workspaceId);

    // Check if copy exists
    const existing = await this.db
      .select()
      .from(copyLibraryItems)
      .where(
        and(
          eq(copyLibraryItems.id, copyId),
          eq(copyLibraryItems.workspaceId, workspaceId),
        ),
      )
      .limit(1);

    if (!existing || existing.length === 0) {
      throw new NotFoundException('Copy not found');
    }

    // Validate input
    if (dto.title && dto.title.length > 255) {
      throw new BadRequestException('Title must be 255 characters or less');
    }
    if (dto.content && dto.content.length > 10000) {
      throw new BadRequestException('Content must be 10000 characters or less');
    }
    if (dto.tags && dto.tags.length > 20) {
      throw new BadRequestException('Maximum 20 tags allowed');
    }

    const updateData: any = {
      updatedAt: new Date(),
    };

    if (dto.title !== undefined) updateData.title = dto.title;
    if (dto.content !== undefined) updateData.content = dto.content;
    if (dto.tags !== undefined) updateData.tags = dto.tags;

    const result = await this.db
      .update(copyLibraryItems)
      .set(updateData)
      .where(
        and(
          eq(copyLibraryItems.id, copyId),
          eq(copyLibraryItems.workspaceId, workspaceId),
        ),
      )
      .returning();

    return result[0];
  }

  async deleteCopy(userId: string, workspaceId: string, copyId: string) {
    await this.verifyWorkspaceAccess(userId, workspaceId);

    const result = await this.db
      .delete(copyLibraryItems)
      .where(
        and(
          eq(copyLibraryItems.id, copyId),
          eq(copyLibraryItems.workspaceId, workspaceId),
        ),
      );

    if (!result.rowCount || result.rowCount === 0) {
      throw new NotFoundException('Copy not found');
    }
  }
}
