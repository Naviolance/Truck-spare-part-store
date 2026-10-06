// Business facts used across the site (contact buttons, footer, structured
// data). One place to update when the client's details change.

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
export const SITE_NAME = "TruckParts";

// International format WITHOUT "+" or spaces, e.g. 237654321100 — that's
// what wa.me links require. Set NEXT_PUBLIC_WHATSAPP_NUMBER in production.
// The fallback is the business number: Cameroon (237) + 654 43 26 41.
const WHATSAPP_NUMBER = (process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "237654432641").replace(/\D/g, "");

export const SOCIAL = {
  whatsapp: WHATSAPP_NUMBER ? `https://wa.me/${WHATSAPP_NUMBER}` : null,
  facebook: "https://www.facebook.com/share/1EshbUKGr6/",
  tiktok: "https://www.tiktok.com/@doudou.business.a",
  // Instagram: add the URL here when the client sends it.
  instagram: null as string | null,
};

// Cameroonian numbers read as "+237 654 43 26 41"; anything else as "+<digits>".
export const WHATSAPP_DISPLAY = WHATSAPP_NUMBER
  ? /^237\d{9}$/.test(WHATSAPP_NUMBER)
    ? WHATSAPP_NUMBER.replace(/^237(\d{3})(\d{2})(\d{2})(\d{2})$/, "+237 $1 $2 $3 $4")
    : `+${WHATSAPP_NUMBER}`
  : null;

// A WhatsApp chat link with a pre-filled message, e.g. about one product.
export function whatsappLink(message: string): string | null {
  return SOCIAL.whatsapp ? `${SOCIAL.whatsapp}?text=${encodeURIComponent(message)}` : null;
}

export const CREDIT = {
  name: "JPFW Web Services",
  url: "https://jpfw-webservices.vercel.app/en",
};
