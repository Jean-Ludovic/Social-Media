import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common';
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
  findOne(@Param('id') id: string) {
    return this.debatesService.findOne(id);
  }

  @Post()
  create(@CurrentUser() user: any, @Body() dto: CreateDebateDto) {
    return this.debatesService.create(user.userId, dto);
  }

  @Post(':id/vote/:sideId')
  vote(
    @Param('id') id: string,
    @Param('sideId') sideId: string,
    @CurrentUser() user: any,
  ) {
    return this.debatesService.vote(id, sideId, user.userId);
  }
}
