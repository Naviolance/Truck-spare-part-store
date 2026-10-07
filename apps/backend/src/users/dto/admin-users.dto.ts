import { Transform } from "class-transformer";
import { IsEmail, IsEnum, IsIn, IsOptional, IsString, MaxLength, MinLength } from "class-validator";
import { UserRole } from "@truckparts/prisma";
import { AdminListQueryDto } from "../../common/dto/admin-list-query.dto";
import { IsNewPassword } from "../../common/validators/password";

export class AdminUsersQueryDto extends AdminListQueryDto {
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  // "yes": only customers who agreed to receive offers.
  @IsOptional()
  @IsIn(["yes"])
  optIn?: "yes";
}

// An account the admin creates for someone (e.g. a second admin). They get a
// temporary password and change it from their account page.
export class AdminCreateUserDto {
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsEmail({}, { message: "Please provide a valid email address" })
  email!: string;

  @IsNewPassword()
  password!: string;

  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  firstName!: string;

  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  lastName!: string;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
}

export class AdminSetRoleDto {
  @IsEnum(UserRole)
  role!: UserRole;
}
