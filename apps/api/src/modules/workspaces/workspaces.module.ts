import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { BrevoModule } from '../../integrations/brevo/brevo.module';
import { WorkspacesController } from './workspaces.controller';
import { WorkspacesService } from './workspaces.service';

@Module({
  imports: [DatabaseModule, BrevoModule],
  controllers: [WorkspacesController],
  providers: [WorkspacesService],
  exports: [WorkspacesService],
})
export class WorkspacesModule {}
