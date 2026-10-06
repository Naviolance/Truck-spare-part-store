import { IsString } from "class-validator";
import { IsNewPassword } from "../../common/validators/password";

export class ResetPasswordDto {
  @IsString()
  token!: string;

  @IsNewPassword()
  newPassword!: string;
}
