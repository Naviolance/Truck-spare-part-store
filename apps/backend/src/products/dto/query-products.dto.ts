import { IsOptional, IsString, IsEnum, IsNumber, IsInt, IsIn, IsBoolean, Min, Max, MaxLength } from "class-validator";
import { Transform, Type } from "class-transformer";
import { ProductCondition } from "@truckparts/prisma";

export class QueryProductsDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsString()
  brandId?: string;

  @IsOptional()
  @IsEnum(ProductCondition)
  condition?: ProductCondition;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minPrice?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxPrice?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(60)
  limit?: number;

  // Find My Part / vehicle landing pages: products compatible with a truck.
  @IsOptional()
  @IsString()
  manufacturer?: string;

  @IsOptional()
  @IsString()
  model?: string;

  @IsOptional()
  @IsString()
  vehicleId?: string;

  @IsOptional()
  @IsIn(["newest", "price_asc", "price_desc"])
  sort?: "newest" | "price_asc" | "price_desc";

  // Out-of-stock parts are listed by default (sorted last); ?inStock=true hides them.
  @IsOptional()
  @Transform(({ value }) => value === true || value === "true")
  @IsBoolean()
  inStock?: boolean;
}
