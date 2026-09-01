import { IsString, MinLength } from "class-validator";

export class CreateOrderDto {
  @IsString()
  @MinLength(5)
  shippingAddress!: string;

  @IsString()
  @MinLength(2)
  shippingCity!: string;

  @IsString()
  @MinLength(6)
  shippingPhone!: string;
}