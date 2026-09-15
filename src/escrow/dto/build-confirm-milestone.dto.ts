import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsString } from 'class-validator';

export class BuildConfirmMilestoneDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  renterWallet: string;

  @ApiProperty()
  @IsInt()
  escrowId: number;

  @ApiProperty()
  @IsInt()
  milestoneIndex: number;
}
