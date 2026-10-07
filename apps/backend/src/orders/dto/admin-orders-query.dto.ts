import { IsEnum, IsIn, IsOptional } from "class-validator";
import { OrderStatus } from "@truckparts/prisma";
import { AdminListQueryDto } from "../../common/dto/admin-list-query.dto";
import { ORDER_GROUPS, type OrderGroup } from "../order-status";

export class AdminOrdersQueryDto extends AdminListQueryDto {
  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;

  // One of the admin's order tabs (ORDER_GROUPS); ignored when `status` is given.
  @IsOptional()
  @IsIn(Object.keys(ORDER_GROUPS))
  group?: OrderGroup;
}
