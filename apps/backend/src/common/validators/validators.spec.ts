import { plainToInstance } from "class-transformer";
import { validateSync } from "class-validator";
import { IsNewPassword } from "./password";
import { IsContactPhone, phoneDigits } from "./contact-phone";

class PasswordDto {
  @IsNewPassword()
  password!: string;
}

class PhoneDto {
  @IsContactPhone()
  phone!: string;
}

const passwordErrors = (password: string) => validateSync(plainToInstance(PasswordDto, { password }));
const phoneErrors = (phone: string) => validateSync(plainToInstance(PhoneDto, { phone }));

describe("IsNewPassword", () => {
  it("accepts a long passphrase without symbols or capitals (no composition rules)", () => {
    expect(passwordErrors("camion rouge douala")).toHaveLength(0);
  });

  it("rejects passwords shorter than 10 characters", () => {
    expect(passwordErrors("Sh0rt!")).not.toHaveLength(0);
  });

  it("rejects common passwords, case-insensitively", () => {
    expect(passwordErrors("MotDePasse123")).not.toHaveLength(0);
    expect(passwordErrors("AZERTYUIOP")).not.toHaveLength(0);
  });
});

describe("IsContactPhone", () => {
  it.each(["6 54 32 11 00", "+237 654-321-100", "(237) 654321100", "654321100"])("accepts %s", (phone) => {
    expect(phoneErrors(phone)).toHaveLength(0);
  });

  it.each(["12345", "call me maybe", "+237 654 321 100 999 999", "654<script>"])("rejects %s", (phone) => {
    expect(phoneErrors(phone)).not.toHaveLength(0);
  });

  it("extracts digits for wa.me links", () => {
    expect(phoneDigits("+237 654-321-100")).toBe("237654321100");
  });
});
