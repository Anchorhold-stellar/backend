import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export const LISTING_VERTICALS = ['rental', 'equipment', 'service'] as const;
export type ListingVertical = (typeof LISTING_VERTICALS)[number];

export class CreateListingDto {
  @IsString()
  @IsNotEmpty()
  hostWallet: string;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsIn(LISTING_VERTICALS)
  vertical?: ListingVertical;
}
