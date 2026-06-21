import { IsString, IsOptional, IsEnum } from 'class-validator';
import { PostType } from '@prisma/client';

export class CreatePostDto {
  @IsString()
  content: string;

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsOptional()
  @IsEnum(PostType)
  type?: PostType;
}
