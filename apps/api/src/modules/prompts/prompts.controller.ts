import { Controller, Post, Body } from '@nestjs/common';
import { PromptsService } from './prompts.service';
import { CurrentUser } from '../../common/decorators';

interface EnrichPromptDto {
  prompt: string;
  project_id: string;
}

@Controller('prompts')
export class PromptsController {
  constructor(private readonly promptsService: PromptsService) {}

  @Post('enrich')
  async enrichPrompt(
    @CurrentUser('id') userId: string,
    @Body() dto: EnrichPromptDto,
  ) {
    return this.promptsService.enrichPrompt(
      dto.prompt,
      dto.project_id,
      userId,
    );
  }
}
