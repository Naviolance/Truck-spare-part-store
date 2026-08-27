# TruckParts

E-commerce website for selling truck spare parts — single-vendor online store.

Built with Next.js, NestJS, PostgreSQL, and Prisma. Fully local-first: everything runs on your
machine via Docker, no cloud accounts required for development.

## Stack

- **Frontend:** Next.js + TypeScript + Tailwind
- **Backend:** NestJS + TypeScript (REST API)
- **Database:** PostgreSQL
- **ORM:** Prisma
- **Object storage (local):** MinIO (S3-compatible)
- **Mail testing (local):** Mailhog
- **DB GUI:** Adminer

## Prerequisites

- Node.js 20+ (LTS)
- Docker Desktop (with WSL2 backend on Windows)
- pnpm (`npm install -g pnpm`)

## First-time setup

1. **Copy the environment file:**
   ```bash
   cp .env.example .env
   ```

2. **Start the local infrastructure (Postgres, MinIO, Mailhog, Adminer):**
   ```bash
   docker compose up -d
   ```
   Check everything is healthy:
   ```bash
   docker compose ps
   ```

3. **Install dependencies:**
   ```bash
   pnpm install
   ```

4. **Generate the Prisma client and run the first migration:**
   ```bash
   pnpm prisma:generate
   pnpm prisma:migrate
   ```
   When prompted for a migration name, use something like `init`.

5. **Seed the database with test data:**
   ```bash
   pnpm prisma:seed
   ```

6. **Run the backend and frontend** (in two separate terminals):
   ```bash
   pnpm dev:backend
   pnpm dev:frontend
   ```

## Verify everything works

- Backend health check: http://localhost:4000/health
- Backend products API: http://localhost:4000/products
- Frontend: http://localhost:3000
- Database GUI (Adminer): http://localhost:8080
  — System: PostgreSQL, Server: `postgres`, Username/Password/Database: see your `.env`
- Prisma Studio (alternative DB GUI): `pnpm prisma:studio`
- MinIO console: http://localhost:9001
- Mailhog (view test emails): http://localhost:8025

## Seeded test accounts

| Role     | Email                      | Password       |
|----------|-----------------------------|----------------|
| Admin    | admin@truckparts.local      | admin123       |
| Customer | customer@truckparts.local   | customer123    |

> Note: seed password hashes are placeholders for local testing only — the real auth module
> will use bcrypt, not the seed script's simple hash.

## Project structure

```
apps/
  backend/    NestJS API
  frontend/   Next.js storefront
packages/
  prisma/          Database schema, migrations, seed script
  shared-types/     Types shared between frontend and backend
docker-compose.yml  Local infrastructure (Postgres, MinIO, Mailhog, Adminer)
```

## Scope (V1)

Single-vendor store — no multi-vendor, commission, or subscription logic. See project notes for
full functional scope (catalog, vehicle compatibility / Find My Part, cart & checkout, orders,
payments, reviews, admin panel).
