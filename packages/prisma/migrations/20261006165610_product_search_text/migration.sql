-- Product search at catalog scale.
--
-- Before: every search word was matched against 7 columns across 4 tables
-- (name, descriptions, brand, category, trucks, part numbers) joined by OR.
-- No index can serve that, so each search read every product: ~0.8 s at
-- 100k products. After: one column, "searchText", holds all of it and one
-- trigram index answers `LIKE '%word%'` — ~2-12 ms at 100k products.
--
-- "searchText" is maintained HERE, by triggers, never by application code,
-- so it can't go stale whatever writes the data (admin form, bulk import,
-- scripts, a brand rename touching thousands of products).
--
--   products            BEFORE INSERT/UPDATE of a searched column -> recompute that row
--   product_compatibility  AFTER INSERT/UPDATE/DELETE              -> recompute the product
--   brands / categories / vehicles  AFTER rename                   -> recompute their products
--
-- Other triggers ask for a recompute with `SET "searchText" = ''`: the
-- products trigger fires on that column too and overwrites it.
--
-- Renaming or dropping one of the columns read in product_search_text()
-- breaks writes to products until the function is updated (the DB tests in
-- apps/backend catch it).

-- Accent-insensitive search ("pompe a eau" finds "Pompe à eau"). Ships with
-- PostgreSQL (contrib), available on every managed host.
CREATE EXTENSION IF NOT EXISTS unaccent;

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "searchText" TEXT NOT NULL DEFAULT '';

-- Everything a product can be found by, lower-case and accent-free. Part and
-- cross-reference numbers appear twice: as typed ("A 006 420 05 20") and
-- with punctuation removed ("a0064200520"), matching how the query side
-- normalises a typed part number.
CREATE OR REPLACE FUNCTION product_search_text(p products) RETURNS text
LANGUAGE sql STABLE AS $$
  SELECT lower(unaccent(concat_ws(' ',
    p.name,
    p.description,
    p."descriptionFr",
    p."partNumber",
    regexp_replace(lower(coalesce(p."partNumber", '')), '[^a-z0-9]', '', 'g'),
    array_to_string(p."crossReference", ' '),
    (SELECT string_agg(regexp_replace(lower(r), '[^a-z0-9]', '', 'g'), ' ') FROM unnest(p."crossReference") r),
    (SELECT b.name FROM brands b WHERE b.id = p."brandId"),
    (SELECT concat_ws(' ', c.name, c."nameFr") FROM categories c WHERE c.id = p."categoryId"),
    (SELECT string_agg(v.manufacturer || ' ' || v.model, ' ')
       FROM product_compatibility pc JOIN vehicles v ON v.id = pc."vehicleId"
      WHERE pc."productId" = p.id)
  )))
$$;

CREATE OR REPLACE FUNCTION products_set_search_text() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  NEW."searchText" := product_search_text(NEW);
  RETURN NEW;
END $$;

-- Only the searched columns: a stock change at checkout or a searchHits
-- increment doesn't pay for a recompute.
CREATE TRIGGER products_search_text
  BEFORE INSERT OR UPDATE OF name, description, "descriptionFr", "partNumber", "crossReference", "brandId", "categoryId", "searchText"
  ON products FOR EACH ROW EXECUTE FUNCTION products_set_search_text();

CREATE OR REPLACE FUNCTION compatibility_refresh_search_text() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP IN ('UPDATE', 'DELETE') THEN
    UPDATE products SET "searchText" = '' WHERE id = OLD."productId";
  END IF;
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    UPDATE products SET "searchText" = '' WHERE id = NEW."productId";
  END IF;
  RETURN NULL;
END $$;

CREATE TRIGGER product_compatibility_search_text
  AFTER INSERT OR UPDATE OR DELETE ON product_compatibility
  FOR EACH ROW EXECUTE FUNCTION compatibility_refresh_search_text();

CREATE OR REPLACE FUNCTION brand_refresh_search_text() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  UPDATE products SET "searchText" = '' WHERE "brandId" = NEW.id;
  RETURN NULL;
END $$;

CREATE TRIGGER brands_search_text
  AFTER UPDATE OF name ON brands
  FOR EACH ROW WHEN (OLD.name IS DISTINCT FROM NEW.name)
  EXECUTE FUNCTION brand_refresh_search_text();

CREATE OR REPLACE FUNCTION category_refresh_search_text() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  UPDATE products SET "searchText" = '' WHERE "categoryId" = NEW.id;
  RETURN NULL;
END $$;

CREATE TRIGGER categories_search_text
  AFTER UPDATE OF name, "nameFr" ON categories
  FOR EACH ROW WHEN (OLD.name IS DISTINCT FROM NEW.name OR OLD."nameFr" IS DISTINCT FROM NEW."nameFr")
  EXECUTE FUNCTION category_refresh_search_text();

CREATE OR REPLACE FUNCTION vehicle_refresh_search_text() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  UPDATE products SET "searchText" = ''
   WHERE id IN (SELECT "productId" FROM product_compatibility WHERE "vehicleId" = NEW.id);
  RETURN NULL;
END $$;

CREATE TRIGGER vehicles_search_text
  AFTER UPDATE OF manufacturer, model ON vehicles
  FOR EACH ROW WHEN (OLD.manufacturer IS DISTINCT FROM NEW.manufacturer OR OLD.model IS DISTINCT FROM NEW.model)
  EXECUTE FUNCTION vehicle_refresh_search_text();

-- Backfill existing products (doesn't touch "updatedAt", so the sitemap's
-- lastModified dates stay true), then index — faster than indexing first.
UPDATE products SET "searchText" = '';

-- CreateIndex
CREATE INDEX "products_search_text_trgm_idx" ON "products" USING GIN ("searchText" gin_trgm_ops);
