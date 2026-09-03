import { IsString, IsOptional, MinLength } from "class-validator";

export class CreateProductRequestDto {
  @IsString()
  @MinLength(10)
  description!: string;

  @IsOptional()
  @IsString()
  partNumber?: string;

  @IsOptional()
  @IsString()
  vehicleInfo?: string;
}
