-- DropIndex
DROP INDEX "products_name_trgm_idx";

-- DropIndex
DROP INDEX "products_partNumber_trgm_idx";

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "descriptionFr" TEXT;
