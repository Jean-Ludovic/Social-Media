import { Controller, Get, Post, Patch, Param, Body, UseGuards } from '@nestjs/common';
import { FriendshipsService } from './friendships.service';
import { RequestByEmailDto } from './dto/request-by-email.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('friendships')
@UseGuards(JwtAuthGuard)
export class FriendshipsController {
  constructor(private readonly friendshipsService: FriendshipsService) {}

  @Get()
  getFriends(@CurrentUser() user: any) {
    return this.friendshipsService.getFriendsEnriched(user.userId);
  }

  @Get('pending')
  getPending(@CurrentUser() user: any) {
    return this.friendshipsService.getPendingEnriched(user.userId);
  }

  @Post('request-by-email')
  requestByEmail(@CurrentUser() user: any, @Body() dto: RequestByEmailDto) {
    return this.friendshipsService.requestByEmail(user.userId, dto.email);
  }

  @Post('request/:receiverId')
  sendRequest(@CurrentUser() user: any, @Param('receiverId') receiverId: string) {
    return this.friendshipsService.sendRequest(user.userId, receiverId);
  }

  @Patch(':id/accept')
  accept(@Param('id') id: string) {
    return this.friendshipsService.respond(id, 'accepted');
  }

  @Patch(':id/reject')
  reject(@Param('id') id: string) {
    return this.friendshipsService.respond(id, 'rejected');
  }
}
