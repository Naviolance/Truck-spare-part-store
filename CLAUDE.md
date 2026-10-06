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
pnpm --filter backend test:db              # real-Postgres tests (order transitions, races)
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
pnpm prisma:migrate    # prompts for a migration name (interactive)
pnpm prisma:deploy     # apply pending migrations (production / CI / non-interactive)
pnpm prisma:studio     # DB GUI at generated local URL
pnpm prisma:seed       # local only — never against production
```

Launch / operations:
```bash
pnpm admin:promote <email>                       # make a registered account an admin
pnpm launch:reset --keep <email> [--wipe-catalog]  # dry run; add --yes to delete test data
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

**Demo mode**: accounts listed in `DEMO_ACCOUNT_EMAILS` (default `admin@truckparts.local`; empty in
`.env.example` for local dev) get a `demo: true` claim in their JWT (`AuthService.signAccessToken`),
surfaced as `request.user.isDemo` by `jwt.strategy.ts`. The global `DemoReadOnlyInterceptor`
(`common/interceptors/`) rejects any non-GET/HEAD/OPTIONS request from them with 403 — it's an
interceptor, not a global guard, because global guards run before `JwtAuthGuard` sets
`request.user`. `forgotPassword` silently ignores demo emails. The frontend only uses `isDemo`
(from `/auth/refresh` and `/users/me`) to show a banner in `app/admin/layout.tsx`. New routes are
covered automatically; don't add per-controller demo checks.

**Orders → Payments flow**: `POST /orders` creates the order as `PAYMENT_PENDING` and atomically
reserves stock (conditional `UPDATE ... WHERE quantity >= n` in a transaction — `orders.service.ts`).
Every later status change goes through `OrdersService.transition()`, which enforces the state machine in
`orders/order-status.ts` (who may move an order where, and what that does to stock/coupons) with a
conditional `UPDATE ... WHERE status = <current>` so concurrent callers can't double-restock. Never
update `Order.status` directly. Only the "system" actor (payments, cash confirmation, expiry) can mark
an order `PAID`; the admin dropdown only shows `nextStatuses` the backend returns.

Payments are provider-agnostic: `payments/providers/payment-provider.ts` is the adapter interface,
`PaymentGatewayService` picks the adapter from `PAYMENT_PROVIDER` (unset = cash only; Notch Pay is the
reference adapter). `orders/order-payments.service.ts` owns attempts: one `Payment` row per attempt with a
unique `reference` (`<orderNumber>-<n>`), so `POST /orders/:id/pay` can be retried; results (webhook at
`POST /payments/webhooks/:provider` or `reconcilePending()` polling) are applied idempotently and the
payment SUCCEEDED + order PAID commit in one transaction. Webhook signatures are verified over the
**raw** body (`main.ts` stashes `req.rawBody` — don't remove it). `OrderExpiryService` (cron, every
5 min) expires unpaid orders after `ORDER_PAYMENT_TTL_MINUTES` / `CASH_PICKUP_TTL_HOURS` and releases
their stock. To add a provider: one adapter file + one `case` in `PaymentGatewayService`.

**Errors shown to users**: throw with a code — `new BadRequestException(apiError("NOT_ENOUGH_STOCK", "English
message", params?))` (`common/errors.ts`); `AllExceptionsFilter` gives every error `{ statusCode, code, message,
params? }`. Frontend: `readApiError(res)` + `useApiError()` translate `code` from `messages/*.json`
"ApiErrors" (French users never see the English `message`). A new code needs an entry in `ERROR_CODES` and in
both message files — `common/errors.spec.ts` fails otherwise.

**Money formatting**: use `formatMoney()` from `apps/frontend/src/lib/money.ts` for every price
display (backend emails: `formatXaf()` in `common/utils/money.ts`). Don't hand-roll `$`/`toFixed(2)`.

**i18n / URLs**: public pages live under `app/[locale]/` (`/fr/...`, `/en/...`, French default; next-intl
routing in `i18n/routing.ts`, middleware redirects `/`). Use `Link`/`useRouter` from `@/i18n/navigation`,
never `next/link`, in public pages. Every user-facing string is in `messages/{en,fr}.json` (add both).
The admin (`app/admin`, English, noindex) has its own root layout; both share `components/AppShell.tsx`.
Don't call `setRequestLocale` in `app/not-found.tsx` (it's rendered inside every page's tree).

**Bulk import**: `products/import/` — `product-import.parser.ts` is pure (decode UTF-8/Windows-1252,
detect `;`/`,`, EN/FR headers, row validation; unit-tested); `product-import.service.ts` plans
(`preview`, writes nothing) and `commit`s in one transaction, re-validating the file. Rows match
existing products by normalized part number + brand (update) else create. Admin UI:
`app/admin/import/page.tsx`. Excel files must be saved as CSV (xlsx is rejected on purpose).

**Catalog & SEO**: one listing query (`products/product-listing.ts`) serves `/products`, search, Find My
Part and the category/brand/truck landing pages — out-of-stock products stay listed (sorted last).
Public pages are server-rendered via `CatalogView` and `lib/server-api.ts` (`serverFetch`, sends
`INTERNAL_API_KEY`, ISR caching). Each indexable page sets its own `alternates` via `lib/seo.ts`
(canonical + hreflang); private pages are noindex. JSON-LD helpers are in `lib/seo.ts`.
Sitemaps: `/sitemap.xml` is an index (route handler) over `/sitemaps/pages.xml` and
`/sitemaps/products-<n>.xml` (20k products each) — built per request in `lib/sitemap.ts`, so a growing
catalog needs no redeploy.

**Search**: matches `products."searchText"` — one lower-case, accent-free string (name, descriptions,
brand, category EN/FR, trucks, part/cross-reference numbers) with a GIN trigram index. It is written
**only by database triggers** (migration `*_product_search_text`): never set it from code, and if you
rename a column that feeds it, update `product_search_text()` in a new migration (the DB tests in
`products/search-text.db.spec.ts` catch drift). It's `@ignore`d in `schema.prisma`, so it isn't in Prisma
Client; the `@@index` there is what stops Prisma migrations dropping the index. Measured at 100k
products: ~10–40 ms per search (was ~0.8 s scanning every row).

**Admin lists** (products, orders, requests, reviews) are paginated server-side: `AdminListQueryDto`
(`page`, `limit` ≤ 100, `search`) + `paginate()` in `common/`, `useAdminList` + `ListControls` on the
frontend. Don't return unbounded `findMany` lists from admin endpoints; vehicles and coupons are the
deliberate exceptions (small by nature).

**Rate limiting**: `UserThrottlerGuard` buckets by verified user id, else client IP (needs correct
`TRUST_PROXY`; check `/health`'s `clientIp`), and skips requests carrying `INTERNAL_API_KEY`.

**Prisma**: single `PrismaService` (`common/prisma/`) injected everywhere; no per-module clients.
Core models: `User`, `Product`/`ProductImage`/`ProductCompatibility`, `Vehicle` (for Find-My-Part
compatibility search), `Cart`/`CartItem`, `Order`/`OrderItem`, `Payment`, `Review`, `Category`,
`Brand`. `OrderStatus` and `PaymentStatus` enums drive the checkout/payment state machine described
above.

**File uploads**: images go through the backend's uploads module to MinIO (S3-compatible); the
backend proxies file serving (see `/uploads/file/...` routes) rather than exposing MinIO directly, so
CORS/CSP stay same-origin from the frontend's perspective.
