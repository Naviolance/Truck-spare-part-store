import { IsIn, IsInt, IsString, MaxLength, Min, ValidateIf } from "class-validator";
import { Type } from "class-transformer";

// Every WhatsApp button on the storefront (the `source` prop of
// WhatsAppButton, plus the floating button and the request form). Anything
// else is rejected, so nobody can fill the table with made-up labels.
export const WHATSAPP_SOURCES = [
  "product",
  "product_out_of_stock",
  "footer",
  "footer_icon",
  "floating",
  "order",
  "about",
  "find_my_part_photo",
  "request_form",
] as const;

export class InsightEventDto {
  @IsIn(["search", "whatsapp"])
  type!: "search" | "whatsapp";

  @ValidateIf((e: InsightEventDto) => e.type === "search")
  @IsString()
  @MaxLength(200)
  term?: string;

  @ValidateIf((e: InsightEventDto) => e.type === "search")
  @Type(() => Number)
  @IsInt()
  @Min(0)
  results?: number;

  @ValidateIf((e: InsightEventDto) => e.type === "whatsapp")
  @IsIn(WHATSAPP_SOURCES)
  source?: (typeof WHATSAPP_SOURCES)[number];
}
