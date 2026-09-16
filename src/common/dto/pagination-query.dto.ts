import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class PaginationQueryDto {
  // Bounded so (page - 1) * limit can never overflow Postgres's 32-bit
  // integer OFFSET -- without an upper bound here, an absurdly large
  // page value (still a valid JS integer, e.g. 1e21) sailed past
  // @IsInt() and produced a raw, unhandled Postgres error ("invalid
  // input syntax for type bigint") surfaced as a 500 instead of a clean
  // 400. 1,000,000 is already far beyond any real pagination UI's reach.
  @ApiPropertyOptional({ default: 1, minimum: 1, maximum: 1_000_000 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1_000_000)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  get offset(): number {
    return ((this.page ?? 1) - 1) * (this.limit ?? 20);
  }
}
