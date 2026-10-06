import { IsBoolean, IsEmail, IsOptional, IsString, MaxLength, MinLength } from "class-validator";
import { Transform } from "class-transformer";
import { IsContactPhone } from "../../common/validators/contact-phone";

const trim = ({ value }: { value: unknown }) => (typeof value === "string" ? value.trim() : value);

// Open to guests. A phone number is required for everyone: the whole point
// of a request is that the store calls or WhatsApps the customer back.
export class CreateProductRequestDto {
  @Transform(trim)
  @IsString()
  @MinLength(10, { message: "Please describe the part in a bit more detail (at least 10 characters)" })
  @MaxLength(2000)
  description!: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(64)
  partNumber?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(200)
  vehicleInfo?: string;

  // Optional when logged in (taken from the account), required for guests —
  // enforced in the service, which knows which one the caller is.
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(100)
  contactName?: string;

  @IsContactPhone()
  contactPhone!: string;

  @IsOptional()
  @Transform(trim)
  @IsEmail({}, { message: "Please enter a valid email address" })
  contactEmail?: string;

  @IsOptional()
  @IsBoolean()
  contactViaWhatsApp?: boolean;

  // Honeypot: a field hidden from humans with CSS. Bots fill every input, so
  // a non-empty value means "bot" — answered like a success, stored nowhere.
  @IsOptional()
  @IsString()
  website?: string;
}
