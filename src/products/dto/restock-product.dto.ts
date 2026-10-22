import { Transform } from 'class-transformer';
import { IsInt, Max, Min } from 'class-validator';

export class RestockProductDto {
  @Transform(({ value }) =>
    typeof value === 'string' ? Number(value.trim()) : value,
  )
  @IsInt()
  @Min(1)
  @Max(1_000_000)
  quantity!: number;
}
