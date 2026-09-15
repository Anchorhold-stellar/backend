import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export const LISTING_VERTICALS = ['rental', 'equipment', 'service'] as const;
export type ListingVertical = (typeof LISTING_VERTICALS)[number];

export class CreateListingDto {
  @ApiProperty({ description: 'Stellar public key of the listing host' })
  @IsString()
  @IsNotEmpty()
  hostWallet: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: LISTING_VERTICALS, default: 'rental' })
  @IsOptional()
  @IsIn(LISTING_VERTICALS)
  vertical?: ListingVertical;
}
