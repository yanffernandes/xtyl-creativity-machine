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
import { WorkflowsModule } from './modules/workflows/workflows.module';
import { ExecutionsModule } from './modules/executions/executions.module';
import { ImageGenerationModule } from './modules/image-generation/image-generation.module';
import { AdminModule } from './modules/admin/admin.module';
import { MemoriesModule } from './modules/memories/memories.module';
import { VisualAssetsModule } from './modules/visual-assets/visual-assets.module';
import { CopiesModule } from './modules/copies/copies.module';
import { CampaignsModule } from './modules/campaigns/campaigns.module';
import { TemplatesModule } from './modules/templates/templates.module';
import { ModelsModule } from './modules/models/models.module';
import { AiUsageModule } from './modules/ai-usage/ai-usage.module';
import { ActivityModule } from './modules/activity/activity.module';
import { ConversationsModule } from './modules/conversations/conversations.module';
import { PromptsModule } from './modules/prompts/prompts.module';
import { ValidationModule } from './modules/validation/validation.module';
import { SystemModule } from './modules/system/system.module';
import { ProjectWorkflowsModule } from './modules/project-workflows/project-workflows.module';
import { WorkspacesModule } from './modules/workspaces/workspaces.module';
import { QueueUiModule } from './modules/queue-ui/queue-ui.module';
import { ObservabilityModule } from './modules/observability/observability.module';

@Module({
  imports: [
    // Global infrastructure
    DatabaseModule,
    ObservabilityModule,
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST ?? 'localhost',
        port: parseInt(process.env.REDIS_PORT ?? '6379'),
        maxRetriesPerRequest: null,
      },
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
    WorkflowsModule,
    ExecutionsModule,
    ImageGenerationModule,
    TemplatesModule,
    MemoriesModule,
    VisualAssetsModule,
    ModelsModule,

    // Supporting modules
    WorkspacesModule,
    ConversationsModule,
    ProjectWorkflowsModule,
    CopiesModule,
    CampaignsModule,
    AiUsageModule,
    ActivityModule,
    PromptsModule,
    ValidationModule,
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
