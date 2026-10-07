import { IsEnum, IsIn, IsOptional } from "class-validator";
import { ProductStatus } from "@truckparts/prisma";
import { AdminListQueryDto } from "../../common/dto/admin-list-query.dto";

export class AdminProductsQueryDto extends AdminListQueryDto {
  @IsOptional()
  @IsEnum(ProductStatus)
  status?: ProductStatus;

  // "out": only products with no stock left.
  @IsOptional()
  @IsIn(["out"])
  stock?: "out";

  // "none": only products without any photo (imported, photos still to add).
  @IsOptional()
  @IsIn(["none"])
  photos?: "none";
}
