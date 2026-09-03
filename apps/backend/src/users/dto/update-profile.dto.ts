import { IsString, IsOptional, MinLength, MaxLength, ValidateIf } from "class-validator";

// These are all optional profile fields being edited, not a fresh signup —
// an empty string means "leave this blank," which must always be allowed.
// ValidateIf skips the length check specifically for "", while still
// catching a genuinely-too-short non-empty value (e.g. a 1-character city).
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
  @ValidateIf((o) => o.defaultShippingAddress !== "")
  @MinLength(5)
  defaultShippingAddress?: string;

  @IsOptional()
  @IsString()
  @ValidateIf((o) => o.defaultShippingCity !== "")
  @MinLength(2)
  defaultShippingCity?: string;

  @IsOptional()
  @IsString()
  @ValidateIf((o) => o.defaultShippingPhone !== "")
  @MinLength(6)
  defaultShippingPhone?: string;
}