import { IsString, MinLength } from "class-validator";
import { IsNewPassword } from "../../common/validators/password";

export class ChangePasswordDto {
  @IsString()
  @MinLength(1)
  currentPassword!: string;

  @IsNewPassword()
  newPassword!: string;
}
