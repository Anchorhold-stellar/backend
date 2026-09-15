import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsString } from 'class-validator';

export class BuildRaiseDisputeDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  callerWallet: string;

  @ApiProperty()
  @IsInt()
  escrowId: number;

  @ApiProperty()
  @IsInt()
  milestoneIndex: number;

  @ApiProperty({ description: 'IPFS/Arweave URI pointing to supporting evidence' })
  @IsString()
  @IsNotEmpty()
  evidenceUri: string;
}
