import { IsIn, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { LISTING_VERTICALS, ListingVertical } from './create-listing.dto';

export class ListListingsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsIn(LISTING_VERTICALS)
  vertical?: ListingVertical;

  @IsOptional()
  @IsString()
  hostWallet?: string;
}
