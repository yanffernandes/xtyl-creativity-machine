import { Module } from "@nestjs/common";
import { HttpModule } from "@nestjs/axios";
import { KeywordsController } from "./keywords.controller";
import { KeywordsService } from "./keywords.service";
import { SupabaseService } from "../../common/supabase/supabase.service";
import { OpenRouterModule } from "../openrouter/openrouter.module";

@Module({
  imports: [HttpModule, OpenRouterModule],
  controllers: [KeywordsController],
  providers: [KeywordsService, SupabaseService],
  exports: [KeywordsService],
})
export class KeywordsModule {}
