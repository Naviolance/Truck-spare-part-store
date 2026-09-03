import { IsEnum, IsOptional, IsString } from "class-validator";
import { ProductRequestStatus } from "@truckparts/prisma";

export class UpdateProductRequestDto {
  @IsOptional()
  @IsEnum(ProductRequestStatus)
  status?: ProductRequestStatus;

  @IsOptional()
  @IsString()
  adminNote?: string;
}
