/**
 * Replicate Module - Image generation via Replicate API
 */

import { Module, Global } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ReplicateService } from "./replicate.service";

@Global()
@Module({
  imports: [ConfigModule],
  providers: [ReplicateService],
  exports: [ReplicateService],
})
export class ReplicateModule {}
