import { Module } from "@nestjs/common";
import { RevenueController } from "./revenue.controller";
import { RevenueService } from "./revenue.service";
import { AdManagerModule } from "../ad-manager/ad-manager.module";
import { AdSenseModule } from "../adsense/adsense.module";

@Module({
  // Uses global RedisCacheModule from app.module.ts
  imports: [AdManagerModule, AdSenseModule],
  controllers: [RevenueController],
  providers: [RevenueService],
  exports: [RevenueService],
})
export class RevenueModule {}
