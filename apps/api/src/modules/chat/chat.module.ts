import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { DatabaseModule } from '../../database/database.module';
import { OpenRouterModule } from '../../integrations/openrouter/openrouter.module';
import { StorageModule } from '../storage/storage.module';
import { DocumentsModule } from '../documents/documents.module';
import { ImageGenerationModule } from '../image-generation/image-generation.module';

@Module({
  imports: [
    DatabaseModule,
    OpenRouterModule,
    StorageModule,
    DocumentsModule,
    ImageGenerationModule,
  ],
  controllers: [ChatController],
  providers: [ChatService],
  exports: [ChatService],
})
export class ChatModule {}
