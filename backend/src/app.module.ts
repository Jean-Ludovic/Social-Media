import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { PostsModule } from './modules/posts/posts.module';
import { DebatesModule } from './modules/debates/debates.module';
import { FriendshipsModule } from './modules/friendships/friendships.module';
import { MessagesModule } from './modules/messages/messages.module';
import { StatusesModule } from './modules/statuses/statuses.module';
import { LivesModule } from './modules/lives/lives.module';
import { NotificationsModule } from './modules/notifications/notifications.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    UsersModule,
    PostsModule,
    DebatesModule,
    FriendshipsModule,
    MessagesModule,
    StatusesModule,
    LivesModule,
    NotificationsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
