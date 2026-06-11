import { IsString, IsArray, ArrayMinSize } from 'class-validator';

export class CreateDebateDto {
  @IsString()
  question: string;

  @IsArray()
  @ArrayMinSize(2)
  @IsString({ each: true })
  sides: string[];
}
