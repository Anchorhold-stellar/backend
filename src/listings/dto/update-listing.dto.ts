import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';
import { LISTING_VERTICALS, ListingVertical } from './create-listing.dto';

export class UpdateListingDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: LISTING_VERTICALS })
  @IsOptional()
  @IsIn(LISTING_VERTICALS)
  vertical?: ListingVertical;
}
