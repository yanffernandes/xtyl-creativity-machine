import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { OpenRouterModule } from '../../integrations/openrouter';
import { ImageGenerationModule } from '../image-generation/image-generation.module';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';

@Module({
  imports: [DatabaseModule, OpenRouterModule, ImageGenerationModule],
  controllers: [ProjectsController],
  providers: [ProjectsService],
  exports: [ProjectsService],
})
export class ProjectsModule {}
