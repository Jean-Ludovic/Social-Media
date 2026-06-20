import { Controller, Get, Patch, Param, Body, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  async getMe(@CurrentUser() user: any) {
    const { password: _pw, ...result } = await this.usersService.findById(user.userId) as any;
    return result;
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const { password: _pw, ...result } = await this.usersService.findById(id) as any;
    return result;
  }

  @Patch('me')
  async update(@CurrentUser() user: any, @Body() dto: UpdateUserDto) {
    const { password: _pw, ...result } = await this.usersService.update(user.userId, dto) as any;
    return result;
  }
}
