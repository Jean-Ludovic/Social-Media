import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common';
import { MessagesService } from './messages.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('messages')
@UseGuards(JwtAuthGuard)
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Get('conversations')
  getConversations(@CurrentUser() user: any) {
    return this.messagesService.getConversations(user.userId);
  }

  @Get(':userId')
  getConversation(@CurrentUser() user: any, @Param('userId') partnerId: string) {
    return this.messagesService.getConversation(user.userId, partnerId);
  }

  @Post(':receiverId')
  send(
    @CurrentUser() user: any,
    @Param('receiverId') receiverId: string,
    @Body() dto: CreateMessageDto,
  ) {
    return this.messagesService.send(user.userId, receiverId, dto);
  }
}
