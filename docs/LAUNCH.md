# Launch runbook

The steps to take TruckParts from "works locally" to "live for customers", in order.
Each step says how to check it worked.

## 1. Hosting decisions

| Part | Host | Note |
|---|---|---|
| Frontend | Vercel | **Hobby plan is non-commercial only.** A store selling for real needs Vercel Pro (~$20/month) or the Next.js app hosted on Railway next to the backend. |
| Backend | Railway | One instance is enough at launch. |
| Database | Neon (Postgres) | Check the plan's point-in-time restore window — that *is* your backup. |
| Images | Backblaze B2 | Images are cached for a year by browsers, so egress stays low. |
| Email | Resend (SMTP) | **Verify a sending domain**, or emails only reach the account owner. |

## 2. Fresh production database

Never reuse the demo database, and never run the seed against production (its accounts' passwords are public).

```bash
DATABASE_URL=<production url> pnpm prisma:deploy   # applies every migration
```

Check: the backend starts, and `GET /health/ready` returns `{"database":"ok"}`.

## 3. Environment variables

All variables are documented in `.env.example`. Production-specific values:

**Backend (Railway)**
- `NODE_ENV=production`, `JWT_SECRET` (long random), `FRONTEND_URL=https://<domain>`, `BACKEND_PUBLIC_URL`
- `DEMO_ACCOUNT_EMAILS=` — **set it to empty**, or the default demo admin applies
- `INTERNAL_API_KEY` — `openssl rand -hex 32`, same value on the frontend
- `TRUST_PROXY` — start with `2` (see step 4)
- `ADMIN_NOTIFICATION_EMAIL` — where new-order / part-request alerts go
- `MINIO_*` (B2), `MAIL_*` (Resend), `SENTRY_DSN`
- `PAYMENT_PROVIDER` — leave empty for cash only until the payment provider is ready

**Frontend (Vercel)**
- `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SITE_URL=https://<domain>` (no trailing slash)
- `INTERNAL_API_KEY` (same as backend)
- `NEXT_PUBLIC_WHATSAPP_NUMBER` — digits only with country code, e.g. `237654321100`
- `NEXT_PUBLIC_UMAMI_WEBSITE_ID`, `NEXT_PUBLIC_UMAMI_DOMAINS=<domain>`
- `NEXT_PUBLIC_SENTRY_DSN` (+ `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN` for readable stack traces)
- `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` (step 6)
- **Remove** `NEXT_PUBLIC_DEMO_EMAIL` / `NEXT_PUBLIC_DEMO_PASSWORD`

## 4. Rate limiting: tune `TRUST_PROXY`

Open `https://<domain>/api/backend/health` from your phone on mobile data. `clientIp` must be **your phone's public IP** (compare with any "what is my IP" site).

- Shows a private/proxy IP → increase `TRUST_PROXY` by 1, redeploy, check again.
- Shows an IP you didn't expect from a header you control → decrease it.

Wrong value = either everyone shares one rate-limit bucket, or clients can fake their IP.

## 5. The admin account

1. Register the owner's account on the live site (they choose their own password).
2. `DATABASE_URL=<production url> pnpm admin:promote owner@example.com`
3. They log out and back in. Password changes: Admin → Account.

If the production database had test data: `pnpm launch:reset --keep owner@example.com` (dry run), then add `--yes` (and `--wipe-catalog` to remove demo products). Back up first.

## 6. Search engines

1. Google Search Console → add the domain → "HTML tag" method → put the `content` value in `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` → redeploy → Verify.
2. Submit `https://<domain>/sitemap.xml`.
3. Check `https://<domain>/robots.txt` allows `/` (preview deployments block everything on purpose).
4. Spot-check a product with Google's Rich Results Test — it should find **Product** and **BreadcrumbList**.
5. Google Business Profile (free): the single biggest local-search lever. Needs the real address and hours.

## 7. Monitoring

- **Sentry**: create two projects (backend Node, frontend Next.js), set the DSNs, then trigger an error and check it arrives.
- **Uptime**: point a free monitor (e.g. UptimeRobot) at `https://<backend>/health/ready`.
- **Umami**: create the website in Umami Cloud (free tier) and set the ID. Custom events: `search`, `search_no_results`, `whatsapp_click`, `part_request_submitted`, `add_to_cart`, `checkout_started`, `order_placed`.

## 8. Smoke test on the live site

- `/` redirects to `/fr` (or `/en` for an English browser); switch language keeps the page
- search a part number with dashes removed → finds it
- an out-of-stock product shows the badge and the request form
- submit a part request as a guest → admin email arrives with a WhatsApp link
- register → add to cart → checkout (cash) → admin email arrives; order appears in admin
- admin: mark cash paid → customer gets the email; status dropdown only offers valid next steps
- WhatsApp buttons open a chat with the right number

## 9. Backups and rollback

- **Database**: Neon point-in-time restore. Know the window and how to restore a branch *before* you need it.
- **Code**: Vercel and Railway both keep previous deployments — "Redeploy"/"Rollback" to the last good one.
- **Migrations** are additive (new columns/indexes); rolling back code doesn't require rolling back the database.
