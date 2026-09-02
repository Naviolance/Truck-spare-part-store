# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

TruckParts — single-vendor e-commerce store for truck spare parts. Next.js storefront + NestJS REST
API, PostgreSQL via Prisma. Fully local-first: everything runs via Docker, no cloud accounts needed
for development. Prices are in **XAF (Central African CFA franc)**, a zero-decimal currency — always
format/round as whole numbers, never cents.

## Commands

First-time setup (see [README.md](README.md) for the full walkthrough):
```bash
cp .env.example .env
docker compose up -d          # Postgres, MinIO, Mailhog, Adminer
pnpm install
pnpm prisma:generate
pnpm prisma:migrate
pnpm prisma:seed
```

Run the apps (each in its own terminal — no combined dev script exists):
```bash
pnpm dev:backend     # NestJS, http://localhost:4000
pnpm dev:frontend    # Next.js, http://localhost:3000
```

Backend (`apps/backend`):
```bash
pnpm --filter backend lint
pnpm --filter backend test                 # jest
pnpm --filter backend test -- <pattern>    # single test file/name
pnpm --filter backend build                # nest build
```

Frontend (`apps/frontend`):
```bash
pnpm --filter frontend lint    # next lint
pnpm --filter frontend build   # next build (also type-checks)
```
Note: running `tsc --noEmit` directly via `npx` in `apps/frontend` fails with a `--ignoreDeprecations`
error from a version mismatch between the global `npx` tsc and the project's pinned one — use
`pnpm --filter frontend build` to type-check instead.

Prisma (`packages/prisma`):
```bash
pnpm prisma:generate
pnpm prisma:migrate    # prompts for a migration name
pnpm prisma:studio     # DB GUI at generated local URL
pnpm prisma:seed
```

Docker infra:
```bash
pnpm docker:up
pnpm docker:down
docker compose ps      # check health
```
Postgres is mapped to **host port 5433** (not the default 5432) — see `POSTGRES_PORT` / `DATABASE_URL`
in `.env`.

Local service URLs: backend `http://localhost:4000` (health at `/health`), frontend
`http://localhost:3000`, Adminer `http://localhost:8080`, MinIO console `http://localhost:9001`,
Mailhog `http://localhost:8025`, Prisma Studio via `pnpm prisma:studio`.

Seeded test accounts: `admin@truckparts.local` / `admin123` (admin), `customer@truckparts.local` /
`customer123` (customer). Seed password hashes are placeholders for local testing only.

## Architecture

Monorepo via pnpm workspaces (`apps/*`, `packages/*`):
- `apps/backend` — NestJS REST API, one module per domain (`auth`, `products`, `categories`, `brands`,
  `vehicles`, `cart`, `orders`, `payments`, `reviews`, `uploads`, `users`, `admin`).
- `apps/frontend` — Next.js App Router storefront + admin panel under `src/app/admin/*`.
- `packages/prisma` — shared Prisma schema, migrations, seed script (`@truckparts/prisma`).

**Auth**: JWT access token kept in memory on the frontend (`lib/api.ts` — not localStorage), paired
with an httpOnly refresh cookie handled via `credentials: "include"`. `AuthContext.tsx` calls
`/auth/refresh` once on mount to restore the session (this is why a hard page reload briefly shows
logged-out state before the refresh call resolves — not a bug). Backend guards: `JwtAuthGuard`
(applied at controller level) + `RolesGuard`/`@Roles()` for admin-only routes, `@CurrentUser()`
decorator to pull the authenticated user out of the request.

**Orders → Payments flow**: checkout is two steps, not one. `POST /orders` creates the order as
`PAYMENT_PENDING` and atomically decrements product stock (reserving it) inside a transaction —
`orders.service.ts`. `POST /orders/:id/pay` then calls `payments.service.ts`, which talks to **Notch
Pay** and returns a hosted `checkoutUrl` the frontend redirects to. Order state only becomes final via
the `POST /payments/webhooks/notchpay` webhook: `payment.complete` → `confirmPayment()` (marks
`PAID`), `payment.failed` → `failPayment()` (marks `PAYMENT_FAILED` and restores the reserved stock).
Webhook signature verification is HMAC-SHA256 over the **raw** request body (`main.ts` stashes
`req.rawBody` in the `json()` middleware's `verify` callback specifically for this — don't remove it).
`OrdersModule` and `PaymentsModule` import each other via `forwardRef()`. Test the webhook flow
locally with `./webhook-check.sh <order-number> [payment.complete|payment.failed]` (reads the signing
secret from `.env`, don't hardcode it in scripts).

**Money formatting**: use `formatMoney()` from `apps/frontend/src/lib/money.ts` for every price
display — it handles the XAF whole-number formatting. Don't hand-roll `$`/`toFixed(2)` formatting.

**Prisma**: single `PrismaService` (`common/prisma/`) injected everywhere; no per-module clients.
Core models: `User`, `Product`/`ProductImage`/`ProductCompatibility`, `Vehicle` (for Find-My-Part
compatibility search), `Cart`/`CartItem`, `Order`/`OrderItem`, `Payment`, `Review`, `Category`,
`Brand`. `OrderStatus` and `PaymentStatus` enums drive the checkout/payment state machine described
above.

**File uploads**: images go through the backend's uploads module to MinIO (S3-compatible); the
backend proxies file serving (see `/uploads/file/...` routes) rather than exposing MinIO directly, so
CORS/CSP stay same-origin from the frontend's perspective.
