import { Controller, Get, Post, Patch, Param, Body, UseGuards } from '@nestjs/common';
import { LivesService } from './lives.service';
import { CreateLiveDto } from './dto/create-live.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('lives')
@UseGuards(JwtAuthGuard)
export class LivesController {
  constructor(private readonly livesService: LivesService) {}

  @Get()
  findActive() {
    return this.livesService.findActive();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.livesService.findOne(id);
  }

  @Post('start')
  start(@CurrentUser() user: any, @Body() dto: CreateLiveDto) {
    return this.livesService.start(user.userId, dto);
  }

  @Patch(':id/end')
  end(@Param('id') id: string) {
    return this.livesService.end(id);
  }
}
