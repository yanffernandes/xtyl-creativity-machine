import { Module, forwardRef } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AdManagerController } from "./ad-manager.controller";
import { AdManagerOAuthService } from "./services/ad-manager-oauth.service";
import { AdManagerReportService } from "./services/ad-manager-report.service";
import { AdminModule } from "../admin/admin.module";
import { ConnectionsModule } from "../connections/connections.module";

@Module({
  imports: [
    ConfigModule,
    AdminModule,
    forwardRef(() => ConnectionsModule),
    // Uses global RedisCacheModule from app.module.ts
  ],
  controllers: [AdManagerController],
  providers: [AdManagerOAuthService, AdManagerReportService],
  exports: [AdManagerOAuthService, AdManagerReportService],
})
export class AdManagerModule {}
