import { Controller, Get, Patch, Param, ParseUUIDPipe, Body, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { sanitizeUser } from './utils/sanitize-user';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  async getMe(@CurrentUser() user: { userId: string }) {
    return sanitizeUser(await this.usersService.findById(user.userId));
  }

  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return sanitizeUser(await this.usersService.findById(id));
  }

  @Patch('me')
  async update(@CurrentUser() user: { userId: string }, @Body() dto: UpdateUserDto) {
    return sanitizeUser(await this.usersService.update(user.userId, dto));
  }
}
