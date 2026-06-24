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

  @Get('host/:hostId')
  findByHost(@Param('hostId', ParseUUIDPipe) hostId: string) {
    return this.livesService.findByHost(hostId);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.livesService.findOne(id);
  }

  @Post('start')
  start(@CurrentUser() user: { userId: string }, @Body() dto: CreateLiveDto) {
    return this.livesService.start(user.userId, dto);
  }

  @Patch(':id/end')
  end(@CurrentUser() user: { userId: string }, @Param('id', ParseUUIDPipe) id: string) {
    return this.livesService.end(id, user.userId);
  }
}
