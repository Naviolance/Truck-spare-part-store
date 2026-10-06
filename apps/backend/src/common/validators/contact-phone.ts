import { applyDecorators } from "@nestjs/common";
import { Transform } from "class-transformer";
import { IsString, Matches, MaxLength } from "class-validator";

// A phone number a human can call or WhatsApp: digits with optional +,
// spaces, dashes, dots and brackets; 6-15 digits in total (E.164 max is 15).
// Lenient on format on purpose — customers type "6 54 32 11 00",
// "+237 654-321-100", "(237) 654321100"; the admin just needs to reach them.
export function IsContactPhone() {
  return applyDecorators(
    Transform(({ value }) => (typeof value === "string" ? value.trim() : value)),
    IsString(),
    MaxLength(30),
    Matches(/^\+?[\d\s().-]+$/, { message: "Please enter a valid phone number" }),
    Matches(/^(\D*\d){6,15}\D*$/, { message: "A phone number has 6 to 15 digits" }),
  );
}

// "+237 654-321-100" -> "237654321100", for wa.me links.
export function phoneDigits(phone: string): string {
  return phone.replace(/\D/g, "");
}
