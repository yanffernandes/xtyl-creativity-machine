import { Module, forwardRef } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ConnectionsController } from "./connections.controller";
import { ConnectionsService } from "./connections.service";
import { NotificationsController } from "./notifications.controller";
import { NotificationsService } from "./notifications.service";
import { ConnectionsCronService } from "./connections.cron";
import { CircuitBreakerService } from "./circuit-breaker.service";
import { GoogleModule } from "../google/google.module";
import { AdManagerModule } from "../ad-manager/ad-manager.module";
import { AdSenseModule } from "../adsense/adsense.module";
import { AnalyticsModule } from "../analytics/analytics.module";
import { SearchConsoleModule } from "../search-console/search-console.module";
import { MetaModule } from "../meta/meta.module";

@Module({
  imports: [
    ConfigModule,
    forwardRef(() => GoogleModule),
    forwardRef(() => AdManagerModule),
    forwardRef(() => AdSenseModule),
    forwardRef(() => AnalyticsModule),
    forwardRef(() => SearchConsoleModule),
    forwardRef(() => MetaModule),
  ],
  controllers: [ConnectionsController, NotificationsController],
  providers: [
    ConnectionsService,
    NotificationsService,
    ConnectionsCronService,
    CircuitBreakerService,
  ],
  exports: [ConnectionsService, NotificationsService, CircuitBreakerService],
})
export class ConnectionsModule {}
