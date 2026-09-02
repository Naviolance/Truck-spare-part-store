import { IsString, Matches, MaxLength, MinLength } from "class-validator";

export class ResetPasswordDto {
  @IsString()
  token!: string;

  @IsString()
  @MinLength(10, { message: "Password must be at least 10 characters" })
  @MaxLength(128)
  @Matches(/(?=.*[a-z])/, { message: "Password must contain a lowercase letter" })
  @Matches(/(?=.*[A-Z])/, { message: "Password must contain an uppercase letter" })
  @Matches(/(?=.*\d)/, { message: "Password must contain a number" })
  @Matches(/(?=.*[^A-Za-z0-9])/, { message: "Password must contain a symbol" })
  newPassword!: string;
}
