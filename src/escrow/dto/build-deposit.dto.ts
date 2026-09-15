import { IsInt, IsNotEmpty, IsString } from 'class-validator';

export class BuildDepositDto {
  @IsString()
  @IsNotEmpty()
  renterWallet: string;

  @IsInt()
  escrowId: number;
}
