import { IsInt, IsNotEmpty, IsString } from 'class-validator';

export class BuildConfirmMilestoneDto {
  @IsString()
  @IsNotEmpty()
  renterWallet: string;

  @IsInt()
  escrowId: number;

  @IsInt()
  milestoneIndex: number;
}
