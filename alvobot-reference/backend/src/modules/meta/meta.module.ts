import { Module, forwardRef } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";

// Controllers
import { MetaController } from "./meta.controller";
import { CampaignController } from "./campaign.controller";
import { TargetingController } from "./targeting.controller";
import { CreativeController } from "./creative.controller";
import { MetaDashboardController } from "./controllers/meta-dashboard.controller";

// Services
import { MetaService } from "./meta.service";
import { CampaignService } from "./services/campaign.service";
import { CreditsService } from "./services/credits.service";
import { AiCreativeService } from "./services/ai-creative.service";
import { TargetingService } from "./services/targeting.service";
import { CreativeLibraryService } from "./services/creative-library.service";
import { MetaDashboardService } from "./services/meta-dashboard.service";
import { PromptComposerService } from "./services/prompt-composer.service";
import { NicheDetectorService } from "./services/niche-detector.service";
import { CreativeSessionService } from "./services/creative-session.service";

// Jobs
import { PendingGenerationJob } from "./jobs/pending-generation.job";

// External modules for AI integration
import { OpenRouterModule } from "../openrouter/openrouter.module";
import { ReplicateModule } from "../replicate/replicate.module";
import { AdminModule } from "../admin/admin.module";
import { ConnectionsModule } from "../connections/connections.module";

@Module({
  imports: [
    ConfigModule,
    OpenRouterModule,
    ReplicateModule,
    AdminModule,
    forwardRef(() => ConnectionsModule),
  ],
  controllers: [
    MetaController, // OAuth and connections
    CampaignController, // Campaign templates, AI generation, publishing
    TargetingController, // Countries and languages for targeting
    CreativeController, // AI creative generation (images + text)
    MetaDashboardController, // Dashboard for unified ads management
  ],
  providers: [
    MetaService, // OAuth, pages, connections
    CampaignService, // Campaign template management, publishing
    CreditsService, // Credits tracking and consumption
    AiCreativeService, // AI-powered creative generation (OpenAI)
    TargetingService, // Countries and languages targeting
    CreativeLibraryService, // Creative library CRUD operations
    MetaDashboardService, // Dashboard service for unified ads
    PromptComposerService, // Concept-based prompt composition (Andromeda)
    NicheDetectorService, // Niche detection from article content
    CreativeSessionService, // Session management for SSE streaming generation
    PendingGenerationJob, // Cron job for processing pending image generations
  ],
  exports: [
    MetaService,
    CampaignService,
    CreditsService,
    AiCreativeService,
    TargetingService,
    CreativeLibraryService,
    MetaDashboardService,
    PromptComposerService,
    NicheDetectorService,
  ],
})
export class MetaModule {}
