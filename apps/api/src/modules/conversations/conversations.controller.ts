import {
  Controller,
  Post,
  Param,
  Query,
} from '@nestjs/common';
import { ConversationsService } from './conversations.service';
import { CurrentUser } from '../../common/decorators';

@Controller('conversations')
export class ConversationsController {
  constructor(private readonly conversationsService: ConversationsService) {}

  @Post(':conversationId/add-document')
  async addCreatedDocument(
    @CurrentUser('id') userId: string,
    @Param('conversationId') conversationId: string,
    @Query('document_id') documentId: string,
  ) {
    return this.conversationsService.addCreatedDocument(
      userId,
      conversationId,
      documentId,
    );
  }
}
