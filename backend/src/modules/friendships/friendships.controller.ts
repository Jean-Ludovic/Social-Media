import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Query,
  Body,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { FriendshipsService } from './friendships.service';
import { RequestByEmailDto } from './dto/request-by-email.dto';
import { SearchUsersDto } from './dto/search-users.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('friendships')
@UseGuards(JwtAuthGuard)
export class FriendshipsController {
  constructor(private readonly friendshipsService: FriendshipsService) {}

  @Get()
  getFriends(@CurrentUser() user: { userId: string }) {
    return this.friendshipsService.getFriendsEnriched(user.userId);
  }

  @Get('pending')
  getPending(@CurrentUser() user: { userId: string }) {
    return this.friendshipsService.getPendingEnriched(user.userId);
  }

  @Get('search')
  search(@CurrentUser() user: { userId: string }, @Query() query: SearchUsersDto) {
    return this.friendshipsService.search(user.userId, query.q);
  }

  @Post('request-by-email')
  requestByEmail(@CurrentUser() user: { userId: string }, @Body() dto: RequestByEmailDto) {
    return this.friendshipsService.requestByEmail(user.userId, dto.email);
  }

  @Post('request/:receiverId')
  sendRequest(
    @CurrentUser() user: { userId: string },
    @Param('receiverId', ParseUUIDPipe) receiverId: string,
  ) {
    return this.friendshipsService.sendRequest(user.userId, receiverId);
  }

  @Patch(':id/accept')
  accept(@CurrentUser() user: { userId: string }, @Param('id', ParseUUIDPipe) id: string) {
    return this.friendshipsService.respond(id, user.userId, 'accepted');
  }

  @Patch(':id/reject')
  reject(@CurrentUser() user: { userId: string }, @Param('id', ParseUUIDPipe) id: string) {
    return this.friendshipsService.respond(id, user.userId, 'rejected');
  }
}
