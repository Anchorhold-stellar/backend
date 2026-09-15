import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsNotEmpty, IsString } from 'class-validator';

export class BuildVoteDisputeDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  jurorWallet: string;

  @ApiProperty()
  @IsInt()
  escrowId: number;

  @ApiProperty()
  @IsInt()
  milestoneIndex: number;

  @ApiProperty()
  @IsBoolean()
  voteForRenter: boolean;
}
