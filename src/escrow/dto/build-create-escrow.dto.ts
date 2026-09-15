import { IsArray, IsNotEmpty, IsString } from 'class-validator';

export class BuildCreateEscrowDto {
  @IsString()
  @IsNotEmpty()
  renterWallet: string;

  @IsString()
  @IsNotEmpty()
  hostWallet: string;

  @IsString()
  @IsNotEmpty()
  assetAddress: string;

  @IsArray()
  milestones: unknown[];
}
