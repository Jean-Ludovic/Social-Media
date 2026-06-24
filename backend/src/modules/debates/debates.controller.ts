import { Controller, Get, Post, Param, ParseUUIDPipe, Body, UseGuards } from '@nestjs/common';
import { DebatesService } from './debates.service';
import { CreateDebateDto } from './dto/create-debate.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('debates')
@UseGuards(JwtAuthGuard)
export class DebatesController {
  constructor(private readonly debatesService: DebatesService) {}

  @Get()
  findAll() {
    return this.debatesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.debatesService.findOne(id);
  }

  @Post()
  create(@CurrentUser() user: { userId: string }, @Body() dto: CreateDebateDto) {
    return this.debatesService.create(user.userId, dto);
  }

  @Post(':id/vote/:sideId')
  vote(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('sideId', ParseUUIDPipe) sideId: string,
    @CurrentUser() user: { userId: string },
  ) {
    return this.debatesService.vote(id, sideId, user.userId);
  }
}
