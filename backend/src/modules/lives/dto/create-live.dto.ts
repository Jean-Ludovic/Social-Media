import { IsString } from 'class-validator';

export class CreateLiveDto {
  @IsString()
  title: string;
}
