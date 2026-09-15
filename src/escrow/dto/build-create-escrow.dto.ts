import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsString } from 'class-validator';

export class BuildCreateEscrowDto {
  @ApiProperty({ description: 'Fee-paying source account for the transaction' })
  @IsString()
  @IsNotEmpty()
  renterWallet: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  hostWallet: string;

  @ApiProperty({ description: 'Stellar asset contract address held in escrow' })
  @IsString()
  @IsNotEmpty()
  assetAddress: string;

  @ApiProperty({ type: [Object], description: 'Milestone definitions passed to the contract as-is' })
  @IsArray()
  milestones: unknown[];
}
