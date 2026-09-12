import { IsString, IsEnum, IsNumber, IsOptional, Min, MinLength, MaxLength, IsArray } from "class-validator";
import { ProductCondition } from "@truckparts/prisma";

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
  partNumber?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  imageUrls?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  vehicleIds?: string[];
}
