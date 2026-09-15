import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsString } from 'class-validator';

export class BuildCancelEscrowDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  renterWallet: string;

  @ApiProperty({ description: 'Only escrows still in `created` status can be cancelled' })
  @IsInt()
  escrowId: number;
}
