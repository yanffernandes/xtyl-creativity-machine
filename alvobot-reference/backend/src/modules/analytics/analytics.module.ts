import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AnalyticsController } from "./analytics.controller";
import { AnalyticsOAuthService } from "./services/analytics-oauth.service";
import { AnalyticsReportService } from "./services/analytics-report.service";
import { AdminModule } from "../admin/admin.module";

@Module({
  imports: [ConfigModule, AdminModule],
  controllers: [AnalyticsController],
  providers: [AnalyticsOAuthService, AnalyticsReportService],
  exports: [AnalyticsOAuthService, AnalyticsReportService],
})
export class AnalyticsModule {}
