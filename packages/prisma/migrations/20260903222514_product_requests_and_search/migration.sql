-- CreateEnum
CREATE TYPE "ProductRequestStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'FULFILLED', 'DECLINED');

-- CreateTable
CREATE TABLE "product_requests" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "partNumber" TEXT,
    "vehicleInfo" TEXT,
    "status" "ProductRequestStatus" NOT NULL DEFAULT 'OPEN',
    "adminNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "product_requests_userId_idx" ON "product_requests"("userId");

-- CreateIndex
CREATE INDEX "product_requests_status_idx" ON "product_requests"("status");

-- AddForeignKey
ALTER TABLE "product_requests" ADD CONSTRAINT "product_requests_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Trigram similarity support for typo-tolerant product search (see
-- products.service.ts's findAll fallback path). pg_trgm ships as a standard
-- contrib extension with postgres:16-alpine, no custom image needed.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS "products_name_trgm_idx" ON "products" USING GIN ("name" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "products_partNumber_trgm_idx" ON "products" USING GIN ("partNumber" gin_trgm_ops);
