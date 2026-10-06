import { parse } from "csv-parse/sync";
import { ProductCondition, ProductStatus } from "@truckparts/prisma";

// Turns an uploaded spreadsheet (CSV, as saved by Excel/LibreOffice/Google
// Sheets) into validated product rows — pure, no database, so every rule is
// unit-testable. product-import.service.ts decides what each row DOES
// (create / update) and writes it.
//
// Built for how the file is actually produced in Cameroon: French Excel saves
// CSV with ";" separators and, unless "CSV UTF-8" is picked, in Windows-1252
// (accents break if read as UTF-8). Headers can be English or French, prices
// can be "12 500 FCFA", conditions can be "Neuf"/"Occasion".

export const MAX_IMPORT_ROWS = 5000;
// Several values in one cell (cross references, compatible trucks) are
// separated by "|" — never "," or ";", which are the CSV separators.
export const MULTI_VALUE_SEPARATOR = "|";

export type VehicleRef = {
  manufacturer: string;
  model: string;
  yearStart: number;
  yearEnd: number | null;
  engine: string | null;
};

export type ImportRow = {
  line: number; // line in the file (header = 1), shown to the admin
  name: string;
  // null = cell empty: a new product falls back to its name, an updated one
  // keeps its current text (same for descriptionFr, crossReference, vehicles).
  description: string | null;
  descriptionFr: string | null;
  category: string;
  brand: string | null;
  partNumber: string | null;
  crossReference: string[];
  condition: ProductCondition;
  conditionNotes: string | null;
  price: number;
  quantity: number;
  vehicles: VehicleRef[];
  status: ProductStatus | null; // null = keep existing / service default
};

export type ImportIssue = { line: number; field?: string; message: string };

export type ParseResult = {
  rows: ImportRow[];
  errors: ImportIssue[]; // any error blocks the whole import
  warnings: ImportIssue[]; // imported anyway, but the admin should know
};

type Field = keyof Omit<ImportRow, "line">;

// Header aliases, compared after normalising (lower case, no accents, no
// spaces/punctuation): "Catégorie", "categorie" and "CATEGORY" all match.
const HEADER_ALIASES: Record<Field, string[]> = {
  name: ["name", "nom", "designation", "piece", "produit", "product"],
  description: ["description", "descriptionen", "descriptionenglish"],
  descriptionFr: ["descriptionfr", "descriptionfrancais", "descriptionfrench"],
  category: ["category", "categorie"],
  brand: ["brand", "marque", "fabricant"],
  partNumber: ["partnumber", "reference", "ref", "numerodepiece", "numeropiece", "refpiece", "sku"],
  crossReference: ["crossreference", "crossreferences", "equivalences", "equivalence", "autresreferences", "otherpartnumbers"],
  condition: ["condition", "etat"],
  conditionNotes: ["conditionnotes", "remarques", "remarquesetat", "notes"],
  price: ["price", "prix", "prixfcfa", "pricexaf", "prixxaf"],
  quantity: ["quantity", "quantite", "qte", "stock"],
  vehicles: ["vehicles", "vehicules", "camions", "trucks", "compatibilite", "compatibility"],
  status: ["status", "statut"],
};
const REQUIRED: Field[] = ["name", "category", "condition", "price", "quantity"];

const CONDITIONS: Record<string, ProductCondition> = {
  new: ProductCondition.NEW,
  neuf: ProductCondition.NEW,
  neuve: ProductCondition.NEW,
  used: ProductCondition.USED,
  occasion: ProductCondition.USED,
  usage: ProductCondition.USED,
  usagee: ProductCondition.USED,
  reconditioned: ProductCondition.RECONDITIONED,
  reconditionne: ProductCondition.RECONDITIONED,
  reconditionnee: ProductCondition.RECONDITIONED,
  refurbished: ProductCondition.RECONDITIONED,
  renove: ProductCondition.RECONDITIONED,
};

const STATUSES: Record<string, ProductStatus> = {
  published: ProductStatus.PUBLISHED,
  publie: ProductStatus.PUBLISHED,
  enligne: ProductStatus.PUBLISHED,
  online: ProductStatus.PUBLISHED,
  draft: ProductStatus.DRAFT,
  brouillon: ProductStatus.DRAFT,
  hidden: ProductStatus.DRAFT,
  cache: ProductStatus.DRAFT,
};

export function normalizeKey(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // strip accents
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

// UTF-8 if the bytes are valid UTF-8 (with or without BOM), otherwise
// Windows-1252 — what Excel's plain "CSV" export uses on French Windows.
export function decodeCsv(buffer: Buffer): string {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(buffer).replace(/^\uFEFF/, "");
  } catch {
    return new TextDecoder("windows-1252").decode(buffer);
  }
}

// The separator that appears most in the header line.
export function detectDelimiter(text: string): ";" | "," | "\t" {
  const header = text.split(/\r?\n/, 1)[0] ?? "";
  const counts = { ";": header.split(";").length, ",": header.split(",").length, "\t": header.split("\t").length };
  return (Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0] as ";" | "," | "\t");
}

// XAF has no decimals. Accepts "12500", "12 500", "12.500", "12,500",
// "12 500 FCFA", "12500,00". Returns null when it isn't a whole amount.
export function parsePrice(raw: string): number | null {
  let value = raw.replace(/fcfa|xaf|cfa|f\b/gi, "").trim();
  value = value.replace(/[.,]0{1,2}$/, ""); // "12500,00" -> "12500"
  if (/[.,]\d{1,2}$/.test(value)) return null; // real decimals: not a valid XAF price
  const digits = value.replace(/[\s\u00a0\u202f.,']/g, "");
  if (!/^\d{1,12}$/.test(digits)) return null;
  return Number(digits);
}

// "Mercedes-Benz / Actros / 2012-2024 / OM471" — make, model, years
// ("2012-2024", "2012+", "2012"), optional engine.
export function parseVehicle(raw: string): VehicleRef | string {
  const parts = raw.split("/").map((p) => p.trim());
  const [manufacturer, model, years, ...engine] = parts;
  if (!manufacturer || !model || !years) {
    return `"${raw}" should look like "Make / Model / 2012-2024" (engine optional)`;
  }
  const m = years.match(/^(\d{4})\s*(?:[-–]\s*(\d{4})|\+)?$/);
  if (!m) return `"${years}" isn't a year range (use 2012-2024, 2012+ or 2012)`;
  const yearStart = Number(m[1]);
  const yearEnd = m[2] ? Number(m[2]) : null;
  if (yearEnd !== null && yearEnd < yearStart) return `"${years}": the end year is before the start year`;
  return { manufacturer, model, yearStart, yearEnd, engine: engine.join(" / ").trim() || null };
}

function splitMulti(raw: string): string[] {
  return Array.from(new Set(raw.split(MULTI_VALUE_SEPARATOR).map((v) => v.trim()).filter(Boolean)));
}

export function parseProductCsv(buffer: Buffer): ParseResult {
  const errors: ImportIssue[] = [];
  const warnings: ImportIssue[] = [];
  const text = decodeCsv(buffer);

  let records: string[][];
  try {
    records = parse(text, {
      delimiter: detectDelimiter(text),
      relax_column_count: true,
      skip_empty_lines: true,
      trim: true,
      bom: true,
    });
  } catch (err) {
    return { rows: [], errors: [{ line: 0, message: `The file couldn't be read as CSV: ${(err as Error).message}` }], warnings };
  }

  if (records.length < 2) {
    return { rows: [], errors: [{ line: 0, message: "The file has no product rows (the first line must be the column titles)." }], warnings };
  }
  if (records.length - 1 > MAX_IMPORT_ROWS) {
    return { rows: [], errors: [{ line: 0, message: `Too many rows (${records.length - 1}). Split the file into parts of at most ${MAX_IMPORT_ROWS}.` }], warnings };
  }

  // Map each column to a field.
  const columns = new Map<number, Field>();
  records[0].forEach((title, index) => {
    const key = normalizeKey(title);
    const field = (Object.keys(HEADER_ALIASES) as Field[]).find((f) => HEADER_ALIASES[f].includes(key));
    if (field && ![...columns.values()].includes(field)) columns.set(index, field);
    else if (title && !field) warnings.push({ line: 1, message: `Column "${title}" isn't recognised and will be ignored` });
  });
  const missing = REQUIRED.filter((f) => ![...columns.values()].includes(f));
  if (missing.length) {
    return { rows: [], errors: [{ line: 1, message: `Missing required column(s): ${missing.join(", ")}. Download the template to see the expected columns.` }], warnings };
  }

  const rows: ImportRow[] = [];
  const seenKeys = new Map<string, number>();

  records.slice(1).forEach((record, i) => {
    const line = i + 2;
    const cell = (field: Field) => {
      for (const [index, f] of columns) if (f === field) return (record[index] ?? "").trim();
      return "";
    };
    if (record.every((v) => !v.trim())) return; // blank line
    const rowErrors: ImportIssue[] = [];
    const fail = (field: Field, message: string) => rowErrors.push({ line, field, message });

    const name = cell("name");
    if (name.length < 3 || name.length > 200) fail("name", "Name must be 3 to 200 characters");

    const category = cell("category");
    if (!category) fail("category", "Category is required");
    else if (category.length > 100) fail("category", "Category name is too long (max 100)");

    const brand = cell("brand") || null;
    if (brand && brand.length > 100) fail("brand", "Brand name is too long (max 100)");

    const conditionRaw = cell("condition");
    const condition = CONDITIONS[normalizeKey(conditionRaw)];
    if (!condition) fail("condition", `Condition "${conditionRaw}" must be New/Neuf, Used/Occasion or Reconditioned/Reconditionné`);

    const priceRaw = cell("price");
    const price = parsePrice(priceRaw);
    if (price === null || price < 1) fail("price", `Price "${priceRaw}" must be a whole amount in FCFA, at least 1`);

    const quantityRaw = cell("quantity");
    const quantity = /^\d{1,7}$/.test(quantityRaw.replace(/\s/g, "")) ? Number(quantityRaw.replace(/\s/g, "")) : NaN;
    if (Number.isNaN(quantity)) fail("quantity", `Quantity "${quantityRaw}" must be a whole number (0 or more)`);

    const partNumber = cell("partNumber") || null;
    if (partNumber && partNumber.length > 64) fail("partNumber", "Part number is too long (max 64)");

    const crossReference = splitMulti(cell("crossReference"));
    if (crossReference.length > 30) fail("crossReference", "At most 30 other part numbers");
    if (crossReference.some((r) => r.length > 64)) fail("crossReference", "Each other part number must be at most 64 characters");

    const vehicles: VehicleRef[] = [];
    for (const raw of splitMulti(cell("vehicles"))) {
      const parsed = parseVehicle(raw);
      if (typeof parsed === "string") fail("vehicles", parsed);
      else vehicles.push(parsed);
    }

    const statusRaw = cell("status");
    const status = statusRaw ? STATUSES[normalizeKey(statusRaw)] : null;
    if (statusRaw && !status) fail("status", `Status "${statusRaw}" must be Published/Publié or Draft/Brouillon`);

    const conditionNotes = cell("conditionNotes") || null;
    if (conditionNotes && conditionNotes.length > 1000) fail("conditionNotes", "Condition notes are too long (max 1000)");
    const description = cell("description") || null;
    const descriptionFr = cell("descriptionFr") || null;
    if ((description?.length ?? 0) > 5000 || (descriptionFr?.length ?? 0) > 5000) fail("description", "Description is too long (max 5000)");

    // Same part number + brand twice in one file: the second would overwrite the first.
    if (partNumber) {
      const key = `${normalizeKey(partNumber)}|${normalizeKey(brand ?? "")}`;
      const first = seenKeys.get(key);
      if (first) fail("partNumber", `Same part number and brand as line ${first}`);
      else seenKeys.set(key, line);
    }

    if (rowErrors.length) {
      errors.push(...rowErrors);
      return;
    }

    if (condition === ProductCondition.USED && !conditionNotes) {
      warnings.push({ line, field: "conditionNotes", message: "Used part without condition notes — customers trust listings that describe the wear." });
    }

    rows.push({
      line,
      name,
      description,
      descriptionFr,
      category,
      brand,
      partNumber,
      crossReference,
      condition: condition!,
      conditionNotes,
      price: price!,
      quantity,
      vehicles,
      status,
    });
  });

  if (rows.length === 0 && errors.length === 0) {
    errors.push({ line: 0, message: "The file has no product rows." });
  }
  return { rows, errors, warnings };
}

// The template the admin downloads: the exact columns, one example row per
// condition, using every feature (multiple trucks, cross references).
export const IMPORT_TEMPLATE_CSV = [
  "name;category;brand;partNumber;crossReference;condition;conditionNotes;price;quantity;vehicles;description;descriptionFr;status",
  'Plaquettes de frein avant;Brakes;Bosch;0 986 494 155;A0064200520|29087;NEW;;45000;12;Mercedes-Benz / Actros / 2012-2024 / OM471|Mercedes-Benz / Axor / 2005-2013;Front brake pads for Mercedes heavy trucks.;Plaquettes de frein avant pour poids lourds Mercedes.;Published',
  'Filtre à huile;Filters;Mann;W 962/2;LF3970;NEW;;8500;40;Volvo / FH16 / 2015+;Engine oil filter.;Filtre à huile moteur.;Published',
  'Démarreur 24V;Electrical;Prestolite;M93R3001SE;;USED;Tested, minor wear on housing;120000;1;Scania / R-Series / 2013-2023 / DC13;Used 24V starter motor, bench tested.;Démarreur 24V d\'occasion, testé au banc.;Draft',
].join("\r\n");
