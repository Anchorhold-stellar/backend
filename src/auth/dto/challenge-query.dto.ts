import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class ChallengeQueryDto {
  @ApiProperty({ description: 'Stellar public key to issue a challenge nonce for' })
  @IsString()
  @IsNotEmpty()
  wallet: string;
}
