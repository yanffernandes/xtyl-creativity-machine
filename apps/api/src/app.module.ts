import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { BullModule } from '@nestjs/bullmq';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { DatabaseModule } from './database/database.module';
import { AuthGuard } from './common/guards/auth.guard';

// Integration modules
import { OpenRouterModule } from './integrations/openrouter';
import { FalAiModule } from './integrations/fal-ai';
import { BrevoModule } from './integrations/brevo';

// Feature modules
import { StorageModule } from './modules/storage/storage.module';
import { AuthModule } from './modules/auth/auth.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { DocumentsModule } from './modules/documents/documents.module';
import { ChatModule } from './modules/chat/chat.module';
import { ImageGenerationModule } from './modules/image-generation/image-generation.module';
import { AdminModule } from './modules/admin/admin.module';
import { VisualAssetsModule } from './modules/visual-assets/visual-assets.module';
import { CopiesModule } from './modules/copies/copies.module';
import { CampaignsModule } from './modules/campaigns/campaigns.module';
import { TemplatesModule } from './modules/templates/templates.module';
import { ConversationsModule } from './modules/conversations/conversations.module';
import { PromptsModule } from './modules/prompts/prompts.module';
import { SystemModule } from './modules/system/system.module';
import { WorkspacesModule } from './modules/workspaces/workspaces.module';
import { QueueUiModule } from './modules/queue-ui/queue-ui.module';
import { ObservabilityModule } from './modules/observability/observability.module';

function getRedisConnection() {
  const redisUrl = process.env.REDIS_URL;
  if (redisUrl) {
    const parsedUrl = new URL(redisUrl);
    return {
      host: parsedUrl.hostname,
      port: parseInt(parsedUrl.port || '6379'),
      password: parsedUrl.password || undefined,
      maxRetriesPerRequest: null,
    };
  }

  return {
    host: process.env.REDIS_HOST ?? 'localhost',
    port: parseInt(process.env.REDIS_PORT ?? '6379'),
    password: process.env.REDIS_PASSWORD ?? undefined,
    maxRetriesPerRequest: null,
  };
}

@Module({
  imports: [
    // Global infrastructure
    DatabaseModule,
    ObservabilityModule,
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
    BullModule.forRoot({
      connection: getRedisConnection(),
      defaultJobOptions: {
        removeOnComplete: { count: 100 },
        removeOnFail: { count: 50 },
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
      },
    }),

    // Integration modules
    OpenRouterModule,
    FalAiModule,
    BrevoModule,

    // Core modules
    StorageModule,
    AuthModule,
    ProjectsModule,
    DocumentsModule,
    ChatModule,
    ImageGenerationModule,
    TemplatesModule,
    VisualAssetsModule,

    // Supporting modules
    WorkspacesModule,
    ConversationsModule,
    CopiesModule,
    CampaignsModule,
    PromptsModule,
    SystemModule,

    // Admin & dev tools
    AdminModule,
    QueueUiModule,
  ],
  controllers: [AppController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
