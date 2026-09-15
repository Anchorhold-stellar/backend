import { IsInt } from 'class-validator';

export class KeeperPingDto {
  @IsInt()
  escrowId: number;

  @IsInt()
  milestoneIndex: number;
}
