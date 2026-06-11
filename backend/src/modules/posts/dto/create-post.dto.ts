import { IsString, IsOptional, IsEnum } from 'class-validator';
import { PostType } from '../entities/post.entity';

export class CreatePostDto {
  @IsString()
  content: string;

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsOptional()
  @IsEnum(['post', 'debate'])
  type?: PostType;
}
