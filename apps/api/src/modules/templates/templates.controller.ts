import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { TemplatesService } from './templates.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

interface TemplateVariable {
  key: string;
  label: string;
  type: string;
  required?: boolean;
  defaultValue?: string;
  placeholder?: string;
}

interface CreateTemplateDto {
  name: string;
  description?: string;
  category: string;
  icon?: string;
  prompt: string;
  variables?: TemplateVariable[];
  initialMessage?: string;
  expertName?: string;
  estimatedOutputs?: string;
  tags?: string[];
}

interface UpdateTemplateDto {
  name?: string;
  description?: string;
  category?: string;
  icon?: string;
  prompt?: string;
  variables?: TemplateVariable[];
  initialMessage?: string;
  expertName?: string;
  estimatedOutputs?: string;
  tags?: string[];
}

interface StartChatFromTemplateDto {
  template_id: string;
  variables: Record<string, string>;
  project_id?: string;
  title?: string;
}

@Controller('templates')
export class TemplatesController {
  constructor(private readonly templatesService: TemplatesService) {}

  @Get()
  async listTemplates(
    @Query('category') category?: string,
    @Query('search') search?: string,
    @Query('is_featured') isFeatured?: string,
    @Query('include_system') includeSystem?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @CurrentUser('id') userId?: string,
  ) {
    return this.templatesService.listTemplates({
      category,
      search,
      isFeatured: isFeatured === 'true',
      includeSystem: includeSystem !== 'false',
      limit: limit ? parseInt(limit, 10) : 50,
      offset: offset ? parseInt(offset, 10) : 0,
      userId,
    });
  }

  @Get('categories')
  async listCategories(@CurrentUser('id') userId?: string) {
    return this.templatesService.listCategories(userId);
  }

  @Get('system')
  async listSystemTemplates(
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.templatesService.listSystemTemplates({
      limit: limit ? parseInt(limit, 10) : 50,
      offset: offset ? parseInt(offset, 10) : 0,
    });
  }

  @Get('featured')
  async listFeaturedTemplates(
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.templatesService.listFeaturedTemplates({
      limit: limit ? parseInt(limit, 10) : 50,
      offset: offset ? parseInt(offset, 10) : 0,
    });
  }

  @Get(':templateId')
  async getTemplate(
    @Param('templateId') templateId: string,
    @CurrentUser('id') userId?: string,
  ) {
    return this.templatesService.getTemplate(templateId, userId);
  }

  @Post()
  async createTemplate(
    @Body() dto: CreateTemplateDto,
    @CurrentUser('id') userId?: string,
  ) {
    return this.templatesService.createTemplate(dto, userId);
  }

  @Put(':templateId')
  async updateTemplate(
    @Param('templateId') templateId: string,
    @Body() dto: UpdateTemplateDto,
    @CurrentUser('id') userId?: string,
  ) {
    return this.templatesService.updateTemplate(templateId, dto, userId);
  }

  @Delete(':templateId')
  async deleteTemplate(
    @Param('templateId') templateId: string,
    @CurrentUser('id') userId?: string,
  ) {
    return this.templatesService.deleteTemplate(templateId, userId);
  }

  @Post('start-chat')
  async startChatFromTemplate(
    @Body() dto: StartChatFromTemplateDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.templatesService.startChatFromTemplate(dto, userId);
  }
}
