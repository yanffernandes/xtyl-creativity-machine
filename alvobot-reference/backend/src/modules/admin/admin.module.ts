import { Module } from "@nestjs/common";
import { AdminController } from "./admin.controller";
import { AdminService } from "./admin.service";
import { SupabaseModule } from "../../common/supabase/supabase.module";
import { OpenRouterModule } from "../openrouter/openrouter.module";

@Module({
  imports: [SupabaseModule, OpenRouterModule],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
