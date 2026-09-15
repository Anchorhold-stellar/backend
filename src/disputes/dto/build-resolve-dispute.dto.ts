import { IsInt, IsNotEmpty, IsString } from 'class-validator';

export class BuildResolveDisputeDto {
  /**
   * resolve_dispute is permissionless at the contract-auth layer (anyone
   * can submit once voting is complete), but every Stellar transaction
   * still needs a fee-paying source account. This wallet pays the fee and
   * is not passed to the contract as an auth argument.
   */
  @IsString()
  @IsNotEmpty()
  callerWallet: string;

  @IsInt()
  escrowId: number;
}
