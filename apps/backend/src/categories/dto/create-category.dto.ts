import { IsString, IsOptional, MinLength, MaxLength } from "class-validator";

export class CreateCategoryDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name!: string;

  // Shown on /fr pages ("Freins" for "Brakes"); falls back to name.
  @IsOptional()
  @IsString()
  @MaxLength(100)
  nameFr?: string;

  @IsOptional()
  @IsString()
  parentId?: string;
}
