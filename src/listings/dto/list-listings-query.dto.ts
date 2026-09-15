import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { LISTING_VERTICALS, ListingVertical } from './create-listing.dto';

export class ListListingsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: LISTING_VERTICALS })
  @IsOptional()
  @IsIn(LISTING_VERTICALS)
  vertical?: ListingVertical;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  hostWallet?: string;
}
