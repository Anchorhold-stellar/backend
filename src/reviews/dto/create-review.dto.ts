import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateReviewDto {
  @ApiProperty({ description: 'Stellar public key of the wallet being reviewed' })
  @IsString()
  @IsNotEmpty()
  revieweeWallet: string;

  @ApiProperty({ description: 'Star rating from 1 (worst) to 5 (best)', minimum: 1, maximum: 5 })
  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @ApiPropertyOptional({ description: 'Optional free-text comment accompanying the rating' })
  @IsOptional()
  @IsString()
  comment?: string;
}
