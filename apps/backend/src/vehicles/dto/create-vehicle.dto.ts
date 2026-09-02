import { IsString, IsInt, IsOptional, Min, MinLength } from "class-validator";

export class CreateVehicleDto {
  @IsString()
  @MinLength(2)
  manufacturer!: string;

  @IsString()
  @MinLength(1)
  model!: string;

  @IsInt()
  @Min(1980)
  yearStart!: number;

  @IsOptional()
  @IsInt()
  @Min(1980)
  yearEnd?: number;

  @IsOptional()
  @IsString()
  engine?: string;
}