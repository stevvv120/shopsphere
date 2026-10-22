import { ArrayMaxSize, ArrayUnique, IsArray, IsInt, Min } from 'class-validator';

export class SyncFavoritesDto {
  @IsArray()
  @ArrayMaxSize(1000)
  @ArrayUnique()
  @IsInt({ each: true })
  @Min(1, { each: true })
  productIds!: number[];
}
