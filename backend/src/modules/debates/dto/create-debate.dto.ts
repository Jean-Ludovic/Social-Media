import { IsString, IsArray, ArrayMinSize, ArrayMaxSize, IsUUID, IsOptional } from 'class-validator';

export class CreateDebateDto {
  @IsString()
  question: string;

  @IsArray()
  @ArrayMinSize(2)
  @IsString({ each: true })
  sides: string[];

  @IsUUID()
  categoryId: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(5)
  @IsUUID(undefined, { each: true })
  tagIds?: string[];
}
