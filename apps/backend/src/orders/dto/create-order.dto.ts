import { IsString, IsOptional, MinLength, MaxLength } from "class-validator";
import { IsContactPhone } from "../../common/validators/contact-phone";

export class CreateOrderDto {
  // Optional: parts are picked up in store, so a street address is only
  // useful when a delivery is arranged. Phone and city stay required.
  @IsOptional()
  @IsString()
  @MaxLength(300)
  shippingAddress?: string;

  @IsString()
  @MinLength(2)
  @MaxLength(100)
  shippingCity!: string;

  @IsContactPhone()
  shippingPhone!: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  couponCode?: string;
}
