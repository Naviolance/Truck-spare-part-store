import { Prisma } from "@truckparts/prisma";

// One catalog query shared by the product listing, search, Find My Part and
// the category/brand/vehicle landing pages — so a filter, a ranking rule or
// the out-of-stock behaviour is defined once.
//
// Raw SQL (via Prisma.sql, so every value is a bound parameter — no SQL
// injection) because Prisma's query API can't express two things we need:
// ordering in-stock before out-of-stock, and matching part numbers with
// punctuation/spaces stripped ("1234-567" == "1234 567" == "1234567").

export type ListingFilters = {
  search?: string;
  categoryId?: string;
  brandId?: string;
  condition?: string;
  minPrice?: number;
  maxPrice?: number;
  manufacturer?: string;
  model?: string;
  vehicleId?: string;
  inStockOnly?: boolean;
  sort?: "newest" | "price_asc" | "price_desc";
};

const MAX_SEARCH_WORDS = 6;

// Lower-case, keep only letters/digits — how part numbers are compared.
export function normalizePartNumber(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

// %, _ and \ are LIKE wildcards; a search for "%" must not match everything.
function likeContains(value: string): string {
  return `%${value.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
}

export function searchWords(search: string | undefined): string[] {
  return (search ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, MAX_SEARCH_WORDS);
}

// Filters that apply whatever the search mode (exact or typo-tolerant).
function baseConditions(f: ListingFilters): Prisma.Sql[] {
  const c: Prisma.Sql[] = [Prisma.sql`p.status = 'PUBLISHED'::"ProductStatus"`];
  if (f.inStockOnly) c.push(Prisma.sql`p.quantity > 0`);
  if (f.categoryId) c.push(Prisma.sql`p."categoryId" = ${f.categoryId}`);
  if (f.brandId) c.push(Prisma.sql`p."brandId" = ${f.brandId}`);
  if (f.condition) c.push(Prisma.sql`p.condition = ${f.condition}::"ProductCondition"`);
  if (f.minPrice !== undefined) c.push(Prisma.sql`p.price >= ${f.minPrice}`);
  if (f.maxPrice !== undefined) c.push(Prisma.sql`p.price <= ${f.maxPrice}`);

  // Vehicle compatibility: the most specific filter given wins.
  if (f.vehicleId) {
    c.push(Prisma.sql`EXISTS (SELECT 1 FROM product_compatibility pc WHERE pc."productId" = p.id AND pc."vehicleId" = ${f.vehicleId})`);
  } else if (f.manufacturer || f.model) {
    const v: Prisma.Sql[] = [];
    if (f.manufacturer) v.push(Prisma.sql`v.manufacturer = ${f.manufacturer}`);
    if (f.model) v.push(Prisma.sql`v.model = ${f.model}`);
    c.push(Prisma.sql`EXISTS (
      SELECT 1 FROM product_compatibility pc JOIN vehicles v ON v.id = pc."vehicleId"
      WHERE pc."productId" = p.id AND ${Prisma.join(v, " AND ")})`);
  }
  return c;
}

// Every word must match SOMEWHERE: name, either description, brand,
// category, a compatible truck's make/model, or (normalised) the part number
// or any cross-reference number.
function wordCondition(word: string): Prisma.Sql {
  const like = likeContains(word);
  const normalized = normalizePartNumber(word);
  const partNumberMatch = normalized
    ? Prisma.sql`
      OR regexp_replace(lower(coalesce(p."partNumber", '')), '[^a-z0-9]', '', 'g') LIKE ${likeContains(normalized)}
      OR EXISTS (SELECT 1 FROM unnest(p."crossReference") ref
                 WHERE regexp_replace(lower(ref), '[^a-z0-9]', '', 'g') LIKE ${likeContains(normalized)})`
    : Prisma.empty;

  return Prisma.sql`(
    p.name ILIKE ${like}
    OR p.description ILIKE ${like}
    OR p."descriptionFr" ILIKE ${like}
    OR b.name ILIKE ${like}
    OR c.name ILIKE ${like}
    ${partNumberMatch}
    OR EXISTS (SELECT 1 FROM product_compatibility pc JOIN vehicles v ON v.id = pc."vehicleId"
               WHERE pc."productId" = p.id AND (v.manufacturer ILIKE ${like} OR v.model ILIKE ${like}))
  )`;
}

// Exact part/cross-reference number first, then name starts with the term,
// then name contains it, then everything else that matched.
function relevance(search: string): Prisma.Sql {
  const normalized = normalizePartNumber(search);
  return Prisma.sql`CASE
    WHEN ${normalized} <> '' AND (
      regexp_replace(lower(coalesce(p."partNumber", '')), '[^a-z0-9]', '', 'g') = ${normalized}
      OR EXISTS (SELECT 1 FROM unnest(p."crossReference") ref WHERE regexp_replace(lower(ref), '[^a-z0-9]', '', 'g') = ${normalized})
    ) THEN 0
    WHEN p.name ILIKE ${`${search.replace(/[\\%_]/g, (ch) => `\\${ch}`)}%`} THEN 1
    WHEN p.name ILIKE ${likeContains(search)} THEN 2
    ELSE 3 END`;
}

function orderBy(f: ListingFilters, mode: "exact" | "fuzzy"): Prisma.Sql {
  // In stock first, always: a sold-out part stays findable (and can be
  // requested) but never pushes available parts off the first page.
  const inStockFirst = Prisma.sql`(p.quantity > 0) DESC`;
  const search = f.search?.trim();
  if (mode === "fuzzy" && search) {
    return Prisma.sql`${inStockFirst}, (${fuzzyScore(search)}) DESC`;
  }
  if (f.sort === "price_asc") return Prisma.sql`${inStockFirst}, p.price ASC, p."createdAt" DESC`;
  if (f.sort === "price_desc") return Prisma.sql`${inStockFirst}, p.price DESC, p."createdAt" DESC`;
  if (search) return Prisma.sql`${inStockFirst}, ${relevance(search)}, p."createdAt" DESC`;
  return Prisma.sql`${inStockFirst}, p."createdAt" DESC`;
}

// Typo fallback, word by word like the exact search: every word must be
// CLOSE to a word in the name, brand or part number ("bosh brke" -> "Bosch
// Brake"). Scoring the whole phrase at once fails as soon as two words are
// misspelled. word_similarity (not similarity) compares against the
// best-matching part of a multi-word name. 0.35 measured on real names:
// "brke" vs "Bosch Brake" = 0.40, vs "Bosch Engine Part" = 0.20.
const FUZZY_THRESHOLD = 0.35;

function fuzzyWordCondition(word: string): Prisma.Sql {
  return Prisma.sql`(
    word_similarity(${word}, p.name) > ${FUZZY_THRESHOLD}
    OR word_similarity(${word}, coalesce(b.name, '')) > ${FUZZY_THRESHOLD}
    OR word_similarity(${word}, coalesce(p."partNumber", '')) > ${FUZZY_THRESHOLD}
  )`;
}

function fuzzyScore(search: string): Prisma.Sql {
  const terms = searchWords(search).map(
    (w) => Prisma.sql`GREATEST(word_similarity(${w}, p.name), word_similarity(${w}, coalesce(b.name, '')), word_similarity(${w}, coalesce(p."partNumber", '')))`,
  );
  return Prisma.join(terms, " + ");
}

export function buildListingQuery(f: ListingFilters, mode: "exact" | "fuzzy", page: number, limit: number) {
  const conditions = baseConditions(f);
  const search = f.search?.trim();
  if (search) {
    if (mode === "exact") conditions.push(...searchWords(search).map(wordCondition));
    else conditions.push(...searchWords(search).map(fuzzyWordCondition));
  }

  const from = Prisma.sql`
    FROM products p
    LEFT JOIN brands b ON b.id = p."brandId"
    JOIN categories c ON c.id = p."categoryId"
    WHERE ${Prisma.join(conditions, " AND ")}`;

  return {
    ids: Prisma.sql`SELECT p.id ${from} ORDER BY ${orderBy(f, mode)} LIMIT ${limit} OFFSET ${(page - 1) * limit}`,
    count: Prisma.sql`SELECT count(*)::int AS total ${from}`,
  };
}
