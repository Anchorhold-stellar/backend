import { IsNotEmpty, IsNumber, IsPositive, IsString } from 'class-validator';

export class RegisterJurorDto {
  @IsString()
  @IsNotEmpty()
  wallet: string;

  @IsNumber()
  @IsPositive()
  stakeAmount: number;
}
