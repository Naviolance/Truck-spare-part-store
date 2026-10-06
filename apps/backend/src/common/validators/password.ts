import { applyDecorators } from "@nestjs/common";
import { IsString, MaxLength, MinLength, ValidateBy, ValidationOptions, buildMessage } from "class-validator";

// Password policy for every place a password is SET (register, reset,
// change) — one definition so they can't drift apart.
//
// Follows NIST SP 800-63B: length matters, composition rules ("must contain
// a symbol") don't — they push people to "Password1!" and are painful on a
// phone keyboard. So: 10+ characters, no character-class rules, and refuse
// the passwords attackers try first.
const COMMON_PASSWORDS = new Set([
  "1234567890", "0123456789", "12345678910", "1111111111", "0000000000", "1234512345",
  "password12", "password123", "password1!", "passw0rd123", "qwertyuiop", "qwerty1234",
  "qwerty12345", "azertyuiop", "azerty1234", "azerty12345", "motdepasse", "motdepasse1",
  "motdepasse123", "iloveyou12", "abcdefghij", "abcd123456", "admin12345", "administrator",
  "letmein123", "welcome123", "football12", "truckparts", "truckparts1", "truckparts123",
  "cameroun237", "cameroon237", "douala1234", "yaounde123",
]);

function IsNotCommonPassword(options?: ValidationOptions) {
  return ValidateBy(
    {
      name: "isNotCommonPassword",
      validator: {
        validate: (value) => typeof value === "string" && !COMMON_PASSWORDS.has(value.toLowerCase()),
        defaultMessage: buildMessage(() => "This password is too common — please choose another", options),
      },
    },
    options,
  );
}

export function IsNewPassword() {
  return applyDecorators(
    IsString(),
    MinLength(10, { message: "Password must be at least 10 characters" }),
    MaxLength(128),
    IsNotCommonPassword(),
  );
}
