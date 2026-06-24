import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { MessagesService } from './messages.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('messages')
@UseGuards(JwtAuthGuard)
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Get('conversations')
  getConversations(@CurrentUser() user: { userId: string }) {
    return this.messagesService.getConversations(user.userId);
  }

  @Get(':userId')
  getConversation(
    @CurrentUser() user: { userId: string },
    @Param('userId', ParseUUIDPipe) partnerId: string,
  ) {
    return this.messagesService.getMessagesWithPartner(user.userId, partnerId);
  }

  @Post(':receiverId')
  send(
    @CurrentUser() user: { userId: string },
    @Param('receiverId', ParseUUIDPipe) receiverId: string,
    @Body() dto: CreateMessageDto,
  ) {
    return this.messagesService.sendToPartner(user.userId, receiverId, dto);
  }

  @Patch(':id/read')
  markAsRead(@CurrentUser() user: { userId: string }, @Param('id', ParseUUIDPipe) id: string) {
    return this.messagesService.markAsRead(id, user.userId);
  }
}
