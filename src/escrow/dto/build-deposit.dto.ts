import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsString } from 'class-validator';

export class BuildDepositDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  renterWallet: string;

  @ApiProperty()
  @IsInt()
  escrowId: number;
}
