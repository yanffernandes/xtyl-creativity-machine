import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ScheduleModule } from "@nestjs/schedule";
import { RedisCacheModule } from "./common/cache";
import { HealthModule } from "./modules/health/health.module";
import { AuthModule } from "./modules/auth/auth.module";
import { WorkflowsModule } from "./modules/workflows/workflows.module";
import { TasksModule } from "./modules/tasks/tasks.module";
import { WordPressModule } from "./modules/wordpress/wordpress.module";
import { BaseStructureModule } from "./modules/base-structure/base-structure.module";
import { KeywordsModule } from "./modules/keywords/keywords.module";
import { WorkspaceModule } from "./modules/workspace/workspace.module";
import { MetaModule } from "./modules/meta/meta.module";
import { GoogleModule } from "./modules/google/google.module";
import { AdminModule } from "./modules/admin/admin.module";
import { ConnectionsModule } from "./modules/connections/connections.module";
import { EmailModule } from "./modules/email/email.module";
import { BugReportModule } from "./modules/bug-report/bug-report.module";
import { RunsModule } from "./modules/runs/runs.module";
import { OpenRouterModule } from "./modules/openrouter/openrouter.module";
import { ReplicateModule } from "./modules/replicate/replicate.module";
import { AdManagerModule } from "./modules/ad-manager/ad-manager.module";
import { AdSenseModule } from "./modules/adsense/adsense.module";
import { RevenueModule } from "./modules/revenue/revenue.module";
import { SearchConsoleModule } from "./modules/search-console/search-console.module";
import { AnalyticsModule } from "./modules/analytics/analytics.module";
import { AdsModule } from "./modules/ads/ads.module";
import { PageSpeedModule } from "./modules/pagespeed/pagespeed.module";
import { AutomationModule } from "./modules/automation/automation.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ".env",
    }),
    ScheduleModule.forRoot(),
    RedisCacheModule, // Global Redis cache (before feature modules)
    HealthModule,
    AuthModule,
    WorkflowsModule,
    TasksModule,
    WordPressModule,
    BaseStructureModule,
    KeywordsModule,
    WorkspaceModule,
    MetaModule,
    GoogleModule,
    AdminModule,
    ConnectionsModule,
    EmailModule,
    BugReportModule,
    RunsModule,
    OpenRouterModule,
    ReplicateModule,
    AdManagerModule,
    AdSenseModule,
    RevenueModule,
    SearchConsoleModule,
    AnalyticsModule,
    AdsModule,
    PageSpeedModule,
    AutomationModule,
  ],
})
export class AppModule {}
