import { IsString, IsOptional } from 'class-validator';

export class CreateLiveDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  streamUrl?: string;
}
