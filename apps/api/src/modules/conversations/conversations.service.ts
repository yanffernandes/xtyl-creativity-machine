import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { eq, and, desc } from 'drizzle-orm';
import { DATABASE } from '../../database/database.module';
import { chatConversations } from '../../database/drizzle/schema';

@Injectable()
export class ConversationsService {
  constructor(@Inject(DATABASE) private readonly db: any) {}

  async listConversations(
    userId: string,
    projectId?: string,
    limit = 50,
    offset = 0,
  ) {
    const conditions = [eq(chatConversations.userId, userId)];

    if (projectId) {
      conditions.push(eq(chatConversations.projectId, projectId));
    }

    const conversations = await this.db
      .select()
      .from(chatConversations)
      .where(and(...conditions))
      .orderBy(desc(chatConversations.lastMessageAt))
      .limit(limit)
      .offset(offset);

    return {
      conversations,
      total: conversations.length,
    };
  }

  async getConversation(userId: string, conversationId: string) {
    const conversation = await this.db
      .select()
      .from(chatConversations)
      .where(
        and(
          eq(chatConversations.id, conversationId),
          eq(chatConversations.userId, userId),
        ),
      )
      .limit(1);

    if (!conversation || conversation.length === 0) {
      throw new NotFoundException('Conversation not found');
    }

    return conversation[0];
  }

  async deleteConversation(userId: string, conversationId: string) {
    const result = await this.db
      .delete(chatConversations)
      .where(
        and(
          eq(chatConversations.id, conversationId),
          eq(chatConversations.userId, userId),
        ),
      );

    if (!result.rowCount || result.rowCount === 0) {
      throw new NotFoundException('Conversation not found');
    }
  }
}
