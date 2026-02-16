import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { CopiesService } from './copies.service';
import { CurrentUser } from '../../common/decorators';

interface CreateCopyDto {
  title: string;
  content: string;
  tags?: string[];
}

interface UpdateCopyDto {
  title?: string;
  content?: string;
  tags?: string[];
}

@Controller('workspaces/:workspaceId/copies')
export class CopiesController {
  constructor(private readonly copiesService: CopiesService) {}

  @Get()
  async listCopies(
    @CurrentUser('id') userId: string,
    @Param('workspaceId') workspaceId: string,
    @Query('search') search?: string,
    @Query('tags') tags?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const parsedLimit = limit ? parseInt(limit, 10) : 50;
    const parsedOffset = offset ? parseInt(offset, 10) : 0;
    const parsedTags = tags ? tags.split(',') : undefined;

    return this.copiesService.listCopies(
      userId,
      workspaceId,
      search,
      parsedTags,
      parsedLimit,
      parsedOffset,
    );
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createCopy(
    @CurrentUser('id') userId: string,
    @Param('workspaceId') workspaceId: string,
    @Body() dto: CreateCopyDto,
  ) {
    return this.copiesService.createCopy(userId, workspaceId, dto);
  }

  @Put(':copyId')
  async updateCopy(
    @CurrentUser('id') userId: string,
    @Param('workspaceId') workspaceId: string,
    @Param('copyId') copyId: string,
    @Body() dto: UpdateCopyDto,
  ) {
    return this.copiesService.updateCopy(userId, workspaceId, copyId, dto);
  }

  @Delete(':copyId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteCopy(
    @CurrentUser('id') userId: string,
    @Param('workspaceId') workspaceId: string,
    @Param('copyId') copyId: string,
  ) {
    await this.copiesService.deleteCopy(userId, workspaceId, copyId);
  }
}
