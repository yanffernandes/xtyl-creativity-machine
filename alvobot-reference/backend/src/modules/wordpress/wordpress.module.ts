import { Module } from "@nestjs/common";
import { HttpModule } from "@nestjs/axios";
import { WordPressController } from "./wordpress.controller";
import { WordPressService } from "./wordpress.service";
import { SupabaseService } from "../../common/supabase/supabase.service";

@Module({
  imports: [
    HttpModule.register({
      timeout: 10000, // 10 seconds
      maxRedirects: 3,
    }),
  ],
  controllers: [WordPressController],
  providers: [WordPressService, SupabaseService],
  exports: [WordPressService],
})
export class WordPressModule {}
