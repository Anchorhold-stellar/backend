import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export class ListDisputesQueryDto extends PaginationQueryDto {
  @IsOptional()
  // class-transformer's @Type(() => Boolean) would coerce the *string*
  // "false" to `true` (any non-empty string is truthy) — parse explicitly,
  // and pass anything that isn't literally "true"/"false" through
  // unchanged so @IsBoolean() rejects it instead of silently treating it
  // as false.
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  resolved?: boolean;
}
