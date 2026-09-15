import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { LISTING_VERTICALS, ListingVertical } from './create-listing.dto';

export const LISTING_SORT_FIELDS = ['createdAt', 'title'] as const;
export type ListingSortField = (typeof LISTING_SORT_FIELDS)[number];

export const SORT_ORDERS = ['asc', 'desc'] as const;
export type SortOrder = (typeof SORT_ORDERS)[number];

export class ListListingsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: LISTING_VERTICALS })
  @IsOptional()
  @IsIn(LISTING_VERTICALS)
  vertical?: ListingVertical;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  hostWallet?: string;

  @ApiPropertyOptional({ enum: LISTING_SORT_FIELDS, default: 'createdAt' })
  @IsOptional()
  @IsIn(LISTING_SORT_FIELDS)
  sortBy?: ListingSortField = 'createdAt';

  @ApiPropertyOptional({ enum: SORT_ORDERS, default: 'desc' })
  @IsOptional()
  @IsIn(SORT_ORDERS)
  sortOrder?: SortOrder = 'desc';
}
