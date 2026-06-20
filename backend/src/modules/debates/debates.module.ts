import { Module } from '@nestjs/common';
import { DebatesController } from './debates.controller';
import { DebatesService } from './debates.service';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [UsersModule],
  controllers: [DebatesController],
  providers: [DebatesService],
  exports: [DebatesService],
})
export class DebatesModule {}
