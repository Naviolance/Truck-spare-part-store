import { getBrands, getCategories, getTruckCatalog, productCount } from "@/lib/landing";
import { SITE_NAME, SITE_URL, SOCIAL } from "@/lib/site";

// /llms.txt — a plain-text map of the store for AI assistants and answer
// engines (the emerging llms.txt convention): what this site is, what it
// sells, and which pages answer which questions. Generated from live data.
export const revalidate = 3600;

export async function GET() {
  const [categories, brands, trucks] = await Promise.all([getCategories(), getBrands(), getTruckCatalog()]);
  const lines = [
    `# ${SITE_NAME}`,
    "",
    "> Truck spare parts store in Cameroon: new, used and reconditioned parts with vehicle compatibility for each part. Prices in FCFA (XAF). Order online and pay in cash at pickup, or ask on WhatsApp. Site in French (/fr) and English (/en).",
    "",
    "## Find parts",
    `- [All parts](${SITE_URL}/fr/products): searchable catalogue (name, part number, cross-reference, truck model)`,
    `- [Find My Part](${SITE_URL}/fr/find-my-part): parts that fit a given truck make, model and year`,
    `- [Request a part](${SITE_URL}/fr/find-my-part): if a part isn't listed, customers can request it with a phone number`,
    ...(SOCIAL.whatsapp ? [`- [WhatsApp](${SOCIAL.whatsapp}): ask about availability, price or fit`] : []),
    "",
    "## Parts by truck",
    ...(trucks ?? [])
      .filter((m) => m.products > 0)
      .map((m) => `- [${m.manufacturer}](${SITE_URL}/fr/trucks/${m.slug}): ${m.models.filter((x) => x.products > 0).map((x) => x.model).join(", ")}`),
    "",
    "## Parts by category",
    ...(categories ?? []).filter((c) => productCount(c) > 0).map((c) => `- [${c.nameFr || c.name}](${SITE_URL}/fr/categories/${c.slug})`),
    "",
    "## Parts by brand",
    ...(brands ?? []).filter((b) => productCount(b) > 0).map((b) => `- [${b.name}](${SITE_URL}/fr/brands/${b.slug})`),
    "",
    "## About",
    `- [About ${SITE_NAME}](${SITE_URL}/fr/about): how buying works, condition grading, pickup`,
    `- [Privacy](${SITE_URL}/fr/privacy)`,
    "",
  ];
  return new Response(lines.join("\n"), { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
