import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export class ListReviewsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Filter to reviews received by this wallet' })
  @IsOptional()
  @IsString()
  revieweeWallet?: string;

  @ApiPropertyOptional({ description: 'Filter to reviews written by this wallet' })
  @IsOptional()
  @IsString()
  reviewerWallet?: string;
}
