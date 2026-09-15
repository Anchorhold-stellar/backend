import { IsIn, IsOptional, IsString } from 'class-validator';
import { LISTING_VERTICALS, ListingVertical } from './create-listing.dto';

export class UpdateListingDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsIn(LISTING_VERTICALS)
  vertical?: ListingVertical;
}
