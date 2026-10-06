import { IsString, IsEnum, IsNumber, IsOptional, Min, MinLength, MaxLength, IsArray, ArrayMaxSize } from "class-validator";
import { Transform } from "class-transformer";
import { ProductCondition, ProductStatus } from "@truckparts/prisma";

export class CreateProductDto {
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  name!: string;

  @IsString()
  @MinLength(10)
  description!: string;

  @IsOptional()
  @IsString()
  @MinLength(10)
  descriptionFr?: string;

  // XAF is zero-decimal, so 1 is the smallest real, non-free price — @Min(0)
  // would let a product be published and actually sold for free.
  @IsNumber()
  @Min(1)
  price!: number;

  @IsNumber()
  @Min(0)
  quantity!: number;

  @IsEnum(ProductCondition)
  condition!: ProductCondition;

  @IsOptional()
  @IsString()
  conditionNotes?: string;

  @IsString()
  categoryId!: string;

  @IsOptional()
  @IsString()
  brandId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  partNumber?: string;

  // Other numbers the same part is sold under (OEM refs, competitor
  // equivalents). Searchable, with spaces/dashes ignored.
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @IsString({ each: true })
  @MaxLength(64, { each: true })
  @Transform(({ value }) =>
    Array.isArray(value) ? value.map((v) => String(v).trim()).filter(Boolean) : value,
  )
  crossReference?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  imageUrls?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  vehicleIds?: string[];

  // Lets the post-style creation flow save as a draft instead of publishing
  // immediately - defaults to PUBLISHED in the service so the older
  // /admin/products/new form keeps its existing behavior untouched.
  @IsOptional()
  @IsEnum(ProductStatus)
  status?: ProductStatus;
}
