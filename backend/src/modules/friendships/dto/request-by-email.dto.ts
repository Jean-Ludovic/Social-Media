import { IsEmail } from 'class-validator';

export class RequestByEmailDto {
  @IsEmail()
  email: string;
}
