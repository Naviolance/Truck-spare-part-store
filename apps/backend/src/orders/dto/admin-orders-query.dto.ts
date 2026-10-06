import { IsEnum, IsOptional } from "class-validator";
import { OrderStatus } from "@truckparts/prisma";
import { AdminListQueryDto } from "../../common/dto/admin-list-query.dto";

export class AdminOrdersQueryDto extends AdminListQueryDto {
  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;
}
