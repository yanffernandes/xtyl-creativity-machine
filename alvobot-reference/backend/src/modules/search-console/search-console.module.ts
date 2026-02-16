import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { SearchConsoleController } from "./search-console.controller";
import { SearchConsoleOAuthService } from "./services/search-console-oauth.service";
import { SupabaseModule } from "../../common/supabase/supabase.module";
import { SearchConsoleService } from "./search-console.service";
import { SearchConsoleAnalyticsService } from "./search-console-analytics.service";
import { SearchConsoleRepository } from "./search-console.repository";
import { SearchConsoleQuota } from "./search-console.quota";
import { SearchConsoleLogger } from "./search-console.logger";
import { SearchConsoleJobs } from "./search-console.jobs";
import { AdminModule } from "../admin/admin.module";
import { SitemapService } from "./sitemap.service";
import { IndexingStatsService } from "./indexing-stats.service";

@Module({
  imports: [ConfigModule, SupabaseModule, AdminModule],
  controllers: [SearchConsoleController],
  providers: [
    SearchConsoleOAuthService,
    SearchConsoleService,
    SearchConsoleAnalyticsService,
    SearchConsoleRepository,
    SearchConsoleQuota,
    SearchConsoleLogger,
    SearchConsoleJobs,
    SitemapService,
    IndexingStatsService,
  ],
  exports: [
    SearchConsoleOAuthService,
    SearchConsoleService,
    SearchConsoleAnalyticsService,
    SitemapService,
    IndexingStatsService,
  ],
})
export class SearchConsoleModule {}
