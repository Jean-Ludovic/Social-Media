import { IsString } from 'class-validator';

export class CreateFriendshipDto {
  @IsString()
  receiverId: string;
}
