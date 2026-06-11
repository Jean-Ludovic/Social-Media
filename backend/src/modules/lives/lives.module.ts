import { Module } from '@nestjs/common';
import { LivesController } from './lives.controller';
import { LivesService } from './lives.service';

@Module({
  controllers: [LivesController],
  providers: [LivesService],
  exports: [LivesService],
})
export class LivesModule {}
