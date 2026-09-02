import { IsString, IsEnum, IsNumber, IsOptional, IsInt, IsDateString, Min, MinLength, MaxLength } from "class-validator";
import { CouponType } from "@truckparts/prisma";

export class CreateCouponDto {
  @IsString()
  @MinLength(3)
  @MaxLength(30)
  code!: string;

  @IsEnum(CouponType)
  type!: CouponType;

  @IsNumber()
  @Min(0)
  value!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  minOrderTotal?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  maxUses?: number;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}
