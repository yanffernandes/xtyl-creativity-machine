import { Injectable, Inject } from '@nestjs/common';
import { and, lte, gte } from 'drizzle-orm';
import { DATABASE } from '../../database/database.module';
import { systemMessages } from '../../database/drizzle/schema';

@Injectable()
export class SystemService {
  constructor(@Inject(DATABASE) private readonly db: any) {}

  async getActiveMessages() {
    const now = new Date();

    // Get all active system messages
    const messages = await this.db
      .select({
        id: systemMessages.id,
        type: systemMessages.type,
        title: systemMessages.title,
        content: systemMessages.content,
        priority: systemMessages.priority,
        dismissible: systemMessages.dismissible,
        startsAt: systemMessages.startsAt,
        endsAt: systemMessages.endsAt,
      })
      .from(systemMessages)
      .where(
        and(
          // Message must have started (or no start time)
          lte(systemMessages.startsAt, now),
          // Message must not have ended (or no end time)
          gte(systemMessages.endsAt, now),
        ),
      )
      .orderBy(systemMessages.priority);

    return {
      messages: messages || [],
    };
  }

  async getSystemStatus() {
    // Simple status check
    return {
      status: 'operational',
      timestamp: new Date().toISOString(),
      services: {
        database: true,
        api: true,
      },
    };
  }
}
