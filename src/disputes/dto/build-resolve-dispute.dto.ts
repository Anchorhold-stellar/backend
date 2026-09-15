import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsString } from 'class-validator';

export class BuildResolveDisputeDto {
  /**
   * resolve_dispute is permissionless at the contract-auth layer (anyone
   * can submit once voting is complete), but every Stellar transaction
   * still needs a fee-paying source account. This wallet pays the fee and
   * is not passed to the contract as an auth argument.
   */
  @ApiProperty({
    description:
      'Fee-paying source account only -- resolve_dispute itself is permissionless',
  })
  @IsString()
  @IsNotEmpty()
  callerWallet: string;

  @ApiProperty()
  @IsInt()
  escrowId: number;
}
