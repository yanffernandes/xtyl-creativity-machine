import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { SupabaseModule } from "../../common/supabase/supabase.module";
import { PageSpeedController } from "./pagespeed.controller";
import { PageSpeedService } from "./pagespeed.service";
import { PageSpeedRepository } from "./pagespeed.repository";
import { PageSpeedQuota } from "./pagespeed.quota";
import { PageSpeedJobs } from "./pagespeed.jobs";
import { PageSpeedNotificationsService } from "./pagespeed.notifications.service";

@Module({
  imports: [ConfigModule, SupabaseModule],
  controllers: [PageSpeedController],
  providers: [
    PageSpeedService,
    PageSpeedRepository,
    PageSpeedQuota,
    PageSpeedJobs,
    PageSpeedNotificationsService,
  ],
  exports: [PageSpeedService, PageSpeedNotificationsService],
})
export class PageSpeedModule {}
