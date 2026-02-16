import { Module, forwardRef } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { CacheModule } from "@nestjs/cache-manager";
import { GoogleController } from "./google.controller";
import { GoogleOAuthController } from "./google-oauth.controller";
import { GoogleBulkController } from "./google-bulk.controller";
import { GoogleDashboardController } from "./controllers/google-dashboard.controller";
import { GoogleAutomationController } from "./controllers/google-automation.controller";
import { GoogleCampaignService } from "./services/google-campaign.service";
import { GoogleCreditsService } from "./services/google-credits.service";
import { GoogleAiService } from "./services/google-ai.service";
import { GoogleOAuthService } from "./services/google-oauth.service";
import { GoogleAdsApiService } from "./services/google-ads-api.service";
import { BulkOperationService } from "./services/bulk-operation.service";
import { GoogleDashboardService } from "./services/google-dashboard.service";
import { GoogleAutomationService } from "./services/google-automation.service";
import { OpenRouterModule } from "../openrouter/openrouter.module";
import { AdminModule } from "../admin/admin.module";
import { ConnectionsModule } from "../connections/connections.module";

@Module({
  imports: [
    ConfigModule,
    OpenRouterModule,
    AdminModule,
    forwardRef(() => ConnectionsModule),
    // Cache module for dashboard metrics (5 minute TTL)
    CacheModule.register({
      ttl: 5 * 60 * 1000, // 5 minutes in milliseconds
      max: 100, // Maximum number of items in cache
    }),
  ],
  controllers: [
    GoogleController,
    GoogleOAuthController,
    GoogleBulkController,
    GoogleDashboardController,
    GoogleAutomationController,
  ],
  providers: [
    GoogleCampaignService,
    GoogleCreditsService,
    GoogleAiService,
    GoogleOAuthService,
    GoogleAdsApiService,
    BulkOperationService,
    GoogleDashboardService,
    GoogleAutomationService,
  ],
  exports: [
    GoogleCampaignService,
    GoogleCreditsService,
    GoogleAiService,
    GoogleOAuthService,
    GoogleAdsApiService,
    BulkOperationService,
    GoogleDashboardService,
    GoogleAutomationService,
  ],
})
export class GoogleModule {}
