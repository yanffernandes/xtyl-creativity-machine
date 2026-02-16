import { Module, forwardRef } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AdSenseController } from "./adsense.controller";
import { AdSenseOAuthService } from "./services/adsense-oauth.service";
import { AdSenseApiService } from "./services/adsense-api.service";
import { ConnectionsModule } from "../connections/connections.module";

@Module({
  imports: [
    ConfigModule,
    forwardRef(() => ConnectionsModule),
    // Uses global RedisCacheModule from app.module.ts
  ],
  controllers: [AdSenseController],
  providers: [AdSenseOAuthService, AdSenseApiService],
  exports: [AdSenseOAuthService, AdSenseApiService],
})
export class AdSenseModule {}
