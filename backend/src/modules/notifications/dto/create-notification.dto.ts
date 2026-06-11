import { IsString, IsOptional, IsEnum } from 'class-validator';
import { NotificationType } from '../entities/notification.entity';

export class CreateNotificationDto {
  @IsString()
  userId: string;

  @IsEnum(['friend_request', 'message', 'like', 'comment', 'debate', 'live'])
  type: NotificationType;

  @IsString()
  message: string;

  @IsOptional()
  @IsString()
  relatedId?: string;
}
