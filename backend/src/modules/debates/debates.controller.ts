import { Controller, Get, Post, Param, Query, ParseUUIDPipe, Body, UseGuards } from '@nestjs/common';
import { DebatesService } from './debates.service';
import { CreateDebateDto } from './dto/create-debate.dto';
import { FindDebatesDto } from './dto/find-debates.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('debates')
@UseGuards(JwtAuthGuard)
export class DebatesController {
  constructor(private readonly debatesService: DebatesService) {}

  @Get()
  findAll(@CurrentUser() user: { userId: string }, @Query() query: FindDebatesDto) {
    return this.debatesService.findAll(user.userId, query);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: { userId: string }) {
    return this.debatesService.findOne(id, user.userId);
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
