import { IsEnum, IsOptional } from "class-validator";
import { ProductRequestStatus } from "@truckparts/prisma";
import { AdminListQueryDto } from "../../common/dto/admin-list-query.dto";

export class AdminRequestsQueryDto extends AdminListQueryDto {
  @IsOptional()
  @IsEnum(ProductRequestStatus)
  status?: ProductRequestStatus;
}
