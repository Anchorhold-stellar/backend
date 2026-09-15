import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsPositive, IsString } from 'class-validator';

export class RegisterJurorDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  wallet: string;

  @ApiProperty()
  @IsNumber()
  @IsPositive()
  stakeAmount: number;
}
