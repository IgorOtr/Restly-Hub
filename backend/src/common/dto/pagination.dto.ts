import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class PaginationQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize = 20;
}

export interface Paginated<T> {
  data: T[];
  meta: { page: number; pageSize: number; total: number; totalPages: number };
}

export function paginate<T>(
  data: T[],
  total: number,
  { page, pageSize }: PaginationQueryDto,
): Paginated<T> {
  return {
    data,
    meta: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
  };
}

export const skipTake = ({ page, pageSize }: PaginationQueryDto) => ({
  skip: (page - 1) * pageSize,
  take: pageSize,
});
