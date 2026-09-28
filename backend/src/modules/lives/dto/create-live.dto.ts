import { Transform } from 'class-transformer';
import { IsString, IsOptional, IsNotEmpty, MaxLength, IsUrl } from 'class-validator';

export class CreateLiveDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title: string;

  @IsOptional()
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  @MaxLength(2048)
  streamUrl?: string;
}
