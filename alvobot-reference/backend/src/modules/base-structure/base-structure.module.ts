import { Module } from "@nestjs/common";
import { HttpModule } from "@nestjs/axios";
import { ConfigModule } from "@nestjs/config";
import { BaseStructureController } from "./base-structure.controller";
import { BaseStructureService } from "./base-structure.service";
import { AiService } from "./services/ai.service";
import { PromptsService } from "./services/prompts.service";
import { WordPressService } from "./services/wordpress.service";
import { OpenRouterModule } from "../openrouter/openrouter.module";

@Module({
  imports: [
    ConfigModule,
    HttpModule.register({
      timeout: 30000,
      maxRedirects: 3,
    }),
    OpenRouterModule,
  ],
  controllers: [BaseStructureController],
  providers: [
    BaseStructureService,
    AiService,
    PromptsService,
    WordPressService,
  ],
  exports: [BaseStructureService],
})
export class BaseStructureModule {}
