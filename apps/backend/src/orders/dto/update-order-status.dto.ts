import { IsEnum } from "class-validator";
import { OrderStatus } from "@truckparts/prisma";

export class UpdateOrderStatusDto {
  @IsEnum(OrderStatus)
  status!: OrderStatus;
}