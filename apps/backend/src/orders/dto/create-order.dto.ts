import { IsString, IsOptional, MinLength, MaxLength } from "class-validator";
import { IsContactPhone } from "../../common/validators/contact-phone";

export class CreateOrderDto {
  @IsString()
  @MinLength(5)
  @MaxLength(300)
  shippingAddress!: string;

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
