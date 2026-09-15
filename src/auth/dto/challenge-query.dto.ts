import { IsNotEmpty, IsString } from 'class-validator';

export class ChallengeQueryDto {
  @IsString()
  @IsNotEmpty()
  wallet: string;
}
