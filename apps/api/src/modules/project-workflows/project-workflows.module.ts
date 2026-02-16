import { Module } from '@nestjs/common';
import { ProjectWorkflowsController } from './project-workflows.controller';
import { ProjectWorkflowsService } from './project-workflows.service';
import { DatabaseModule } from '../../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [ProjectWorkflowsController],
  providers: [ProjectWorkflowsService],
  exports: [ProjectWorkflowsService],
})
export class ProjectWorkflowsModule {}
