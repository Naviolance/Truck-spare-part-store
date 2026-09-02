import { IsString, IsOptional, MinLength, MaxLength } from "class-validator";

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  firstName?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  lastName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @IsOptional()
  @IsString()
  @MinLength(5)
  defaultShippingAddress?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  defaultShippingCity?: string;

  @IsOptional()
  @IsString()
  @MinLength(6)
  defaultShippingPhone?: string;
}