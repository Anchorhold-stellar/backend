import { IsBoolean, IsInt, IsNotEmpty, IsString } from 'class-validator';

export class BuildVoteDisputeDto {
  @IsString()
  @IsNotEmpty()
  jurorWallet: string;

  @IsInt()
  escrowId: number;

  @IsBoolean()
  voteForRenter: boolean;
}
