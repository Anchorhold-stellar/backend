import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export const ESCROW_STATUSES = [
  'created',
  'active',
  'disputed',
  'completed',
  'cancelled',
] as const;
export type EscrowStatus = (typeof ESCROW_STATUSES)[number];

export class ListEscrowsQueryDto extends PaginationQueryDto {
  @IsString()
  @IsNotEmpty()
  wallet: string;

  @IsOptional()
  @IsIn(ESCROW_STATUSES)
  status?: EscrowStatus;
}
