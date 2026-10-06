# Hosting: decision pending

**Status: parked.** The client hasn't bought a domain or hosting yet. Decide and deploy once
the money is in hand, then follow [LAUNCH.md](LAUNCH.md).

Prices checked 2026-10-06 at ~582 XAF per US$1. Both platforms bill a card monthly in USD,
with no yearly discount, so add a few % for card/FX fees. Re-check prices before buying.

## Don't buy a shared "hosting plan"

cPanel/shared hosting (LWS, Hostinger, OVH Web...) is built for PHP/WordPress and **can't run
this store**. It needs an always-on Node.js server, PostgreSQL, and S3-compatible storage
for images.

## The options

| Option | What runs where | Per month | Per year (XAF) | Who maintains it |
|---|---|---|---|---|
| **A. Railway only** (recommended if low maintenance matters) | Frontend + backend + Postgres on Railway, region EU West (Amsterdam) | $5 plan incl. $5 usage; realistic **$10–15** | **~70,000–105,000** | Railway |
| **B. One VPS** (cheapest) | Everything in Docker on one server (e.g. Hetzner) | ~€5, fixed | **~40,000** | Us: updates, backups, security |
| ~~Vercel Pro + Railway~~ | Rejected: paying two platforms | $25+ | ~175,000+ | — |

Vercel Pro alone is $20/month (~140,000 XAF/year) and still needs somewhere to run the
backend and database, which is why it was dropped.

**Trade-off of A vs Vercel:** Vercel serves pages from many locations worldwide; Railway serves
from one region. Putting the free Cloudflare plan in front recovers most of that, and also
caches product images.

## Costs on top, either way

| Item | Cost |
|---|---|
| Domain (`.com`; `.cm` costs more) | ~6,000–9,000 XAF/year |
| Images: Backblaze B2 (or MinIO on the VPS in option B) | ~0–600 XAF/month at this size |
| Email: Resend | Free up to 3,000 emails/month |
| Cloudflare | Free plan |

## When deploying

- Accounts are created under the developer's name (decided); agree a handover with the client.
- Code changes needed: essentially none. The Next.js app runs as a normal server (`next start`).
  `robots.ts` only blocks crawlers when `VERCEL_ENV=preview`, so it's fine off Vercel.
- Update the hosting rows of `LAUNCH.md` §1 and the README to the chosen option.
