import { Transform } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';

export class UpdateProductDto {
  @ValidateIf((_object, value) => value !== undefined)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name?: string;

  @ValidateIf((_object, value) => value !== undefined)
  @Transform(({ value }) =>
    typeof value === 'number' || typeof value === 'string'
      ? String(value).trim()
      : value,
  )
  @IsString()
  @Matches(/^\d+(?:\.\d{1,2})?$/, {
    message: 'price must be a number with up to 2 decimal places.',
  })
  price?: string;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsUrl({
    protocols: ['http', 'https'],
    require_protocol: true,
    require_tld: false,
  })
  @MaxLength(2048)
  imageUrl?: string | null;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(4000)
  description?: string | null;

  @ValidateIf((_object, value) => value !== undefined)
  @Transform(({ value }) =>
    value === null ? null : typeof value === 'string' ? Number(value) : value,
  )
  @IsInt()
  @Min(0)
  stock?: number;

  @IsOptional()
  @Transform(({ value }) =>
    value === null ? null : typeof value === 'string' ? Number(value) : value,
  )
  @IsInt()
  @Min(1)
  categoryId?: number | null;
}
