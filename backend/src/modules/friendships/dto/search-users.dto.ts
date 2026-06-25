import { IsString, MinLength } from 'class-validator';

export class SearchUsersDto {
  @IsString()
  @MinLength(2)
  q: string;
}
