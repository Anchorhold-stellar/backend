import { IsInt, IsNotEmpty, IsString } from 'class-validator';

export class BuildRaiseDisputeDto {
  @IsString()
  @IsNotEmpty()
  callerWallet: string;

  @IsInt()
  escrowId: number;

  @IsInt()
  milestoneIndex: number;

  @IsString()
  @IsNotEmpty()
  evidenceUri: string;
}
