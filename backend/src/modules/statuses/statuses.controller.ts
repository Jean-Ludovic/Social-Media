import { Controller, Get, Post, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { StatusesService } from './statuses.service';
import { CreateStatusDto } from './dto/create-status.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('statuses')
@UseGuards(JwtAuthGuard)
export class StatusesController {
  constructor(private readonly statusesService: StatusesService) {}

  @Get()
  findActive() {
    return this.statusesService.findActive();
  }

  @Post()
  create(@CurrentUser() user: any, @Body() dto: CreateStatusDto) {
    return this.statusesService.create(user.userId, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.statusesService.remove(id);
  }
}
