import { IsInt, IsNotEmpty, IsString } from 'class-validator';

export class BuildCancelEscrowDto {
  @IsString()
  @IsNotEmpty()
  renterWallet: string;

  @IsInt()
  escrowId: number;
}
