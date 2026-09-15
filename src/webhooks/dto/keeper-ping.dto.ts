import { ApiProperty } from '@nestjs/swagger';
import { IsInt } from 'class-validator';

export class KeeperPingDto {
  @ApiProperty()
  @IsInt()
  escrowId: number;

  @ApiProperty()
  @IsInt()
  milestoneIndex: number;
}
