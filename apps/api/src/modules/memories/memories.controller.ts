import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { MemoriesService } from './memories.service';
import { AuthGuard } from '../../common/guards/auth.guard';
import { ProjectAccessGuard } from '../../common/guards/project-access.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

interface MemoryCreateDto {
  content: string;
  category?: string;
}

interface MemoryUpdateDto {
  content?: string;
  category?: string;
}

interface MemorySearchDto {
  query: string;
  limit?: number;
  category?: string;
}

interface MemoryExtractDto {
  text: string;
}

@Controller('projects/:projectId/memories')
@UseGuards(AuthGuard, ProjectAccessGuard)
export class MemoriesController {
  constructor(private readonly memoriesService: MemoriesService) {}

  @Get()
  async listMemories(
    @Param('projectId') projectId: string,
    @CurrentUser('id') userId: string,
    @Query('search') search?: string,
    @Query('category') category?: string,
    @Query('limit') limit?: string,
    @Query('page') page?: string,
    @Query('per_page') perPage?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const perPageNum = perPage ? parseInt(perPage, 10) : 20;
    const limitNum = limit ? parseInt(limit, 10) : undefined;

    const { memories, total } = await this.memoriesService.list(
      userId,
      projectId,
      {
        search,
        category,
        limit: limitNum,
        page: pageNum,
        perPage: perPageNum,
      },
    );

    return {
      memories,
      total,
      page: pageNum,
      per_page: perPageNum,
    };
  }

  @Get(':memoryId')
  async getMemory(
    @Param('projectId') projectId: string,
    @Param('memoryId') memoryId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.memoriesService.get(memoryId, userId, projectId);
  }

  @Post()
  async createMemory(
    @Param('projectId') projectId: string,
    @CurrentUser('id') userId: string,
    @Body() data: MemoryCreateDto,
  ) {
    return this.memoriesService.add(userId, projectId, data.content, data.category);
  }

  @Put(':memoryId')
  async updateMemory(
    @Param('projectId') projectId: string,
    @Param('memoryId') memoryId: string,
    @CurrentUser('id') userId: string,
    @Body() data: MemoryUpdateDto,
  ) {
    return this.memoriesService.update(memoryId, userId, projectId, data);
  }

  @Delete(':memoryId')
  async deleteMemory(
    @Param('projectId') projectId: string,
    @Param('memoryId') memoryId: string,
    @CurrentUser('id') userId: string,
  ) {
    await this.memoriesService.delete(memoryId, userId, projectId);
    return { success: true };
  }

  @Post('search')
  async searchMemories(
    @Param('projectId') projectId: string,
    @CurrentUser('id') userId: string,
    @Body() data: MemorySearchDto,
  ) {
    const memories = await this.memoriesService.search(
      data.query,
      userId,
      projectId,
      {
        limit: data.limit,
        category: data.category,
      },
    );

    return {
      memories,
      query: data.query,
    };
  }

  @Post('extract')
  async extractFacts(
    @Param('projectId') projectId: string,
    @CurrentUser('id') userId: string,
    @Body() data: MemoryExtractDto,
  ) {
    const memories = await this.memoriesService.extractFacts(
      data.text,
      projectId,
      userId,
    );

    return {
      memories,
      count: memories.length,
    };
  }
}
