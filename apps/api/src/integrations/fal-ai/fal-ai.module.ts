import { Module, Global } from '@nestjs/common';
import { FalAiService } from './fal-ai.service';

@Global()
@Module({
  providers: [FalAiService],
  exports: [FalAiService],
})
export class FalAiModule {}
