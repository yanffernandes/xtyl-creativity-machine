import { Module } from '@nestjs/common';
import { VisualAssetsController } from './visual-assets.controller';
import { VisualAssetsService } from './visual-assets.service';
import { DatabaseModule } from '../../database/database.module';
import { OpenRouterModule } from '../../integrations/openrouter/openrouter.module';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [DatabaseModule, OpenRouterModule, StorageModule],
  controllers: [VisualAssetsController],
  providers: [VisualAssetsService],
  exports: [VisualAssetsService],
})
export class VisualAssetsModule {}
