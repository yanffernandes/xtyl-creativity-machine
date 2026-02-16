/**
 * Ads Module
 * Unified ads search module combining Google and Meta ad platforms
 */

import { Module } from "@nestjs/common";
import { AdsController } from "./ads.controller";
import { AdsService } from "./ads.service";
import { AdsNormalizerService } from "./services/ads-normalizer.service";
import { AdsAggregatorService } from "./services/ads-aggregator.service";
import { AlvobotCampaignService } from "./services/alvobot-campaign.service";
import { GoogleModule } from "../google/google.module";
import { MetaModule } from "../meta/meta.module";

@Module({
  imports: [GoogleModule, MetaModule],
  controllers: [AdsController],
  providers: [
    AdsService,
    AdsNormalizerService,
    AdsAggregatorService,
    AlvobotCampaignService,
  ],
  exports: [
    AdsService,
    AdsNormalizerService,
    AdsAggregatorService,
    AlvobotCampaignService,
  ],
})
export class AdsModule {}
