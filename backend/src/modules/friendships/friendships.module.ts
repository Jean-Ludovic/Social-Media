import { Module } from '@nestjs/common';
import { FriendshipsController } from './friendships.controller';
import { FriendshipsService } from './friendships.service';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [UsersModule],
  controllers: [FriendshipsController],
  providers: [FriendshipsService],
  exports: [FriendshipsService],
})
export class FriendshipsModule {}
