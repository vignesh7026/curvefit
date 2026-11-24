# CurveFit

D2C high-support activewear for curvier bodies, starting in India. Built from the PRD "Plus-Size Activewear D2C Brand".

```text
apps/web        Next.js (App Router, TypeScript, Tailwind) storefront and staff admin
apps/api        Express (TypeScript) API: size finder, reviews and photos, exchange/returns, tracking, waitlist, fit sessions, staff auth, webhooks
packages/shared size-finder logic, fit-session chart drafting, Zod schemas and types used by both apps
e2e/            Playwright end-to-end and accessibility tests
docs/           launch checklist and the Shopify purchase-tracking pixel
```

## Run it locally

No Docker or MongoDB install needed. Use separate terminals, or run the first two in the background:

```bash
npm install

# 1. Local MongoDB (downloads a mongod binary the first time; data kept in apps/api/.data)
npm run dev:db -w @curvefit/api

# 2. Configure and seed the API (size charts, a staff user, demo reviews)
cp apps/api/.env.example apps/api/.env       # then set MONGODB_URI and two JWT secrets
SEED_ADMIN_EMAIL=you@example.com SEED_ADMIN_PASSWORD='a-long-password' npm run seed -w @curvefit/api -- --demo

# 3. API on http://localhost:4000
npm run dev:api

# 4. Storefront on http://localhost:3000
cp apps/web/.env.example apps/web/.env.local   # set DEMO_CHECKOUT=1 and NEXT_PUBLIC_DEMO_CHECKOUT=1 to try checkout
npm run dev:web
```

Pages: `/` home, `/shop`, `/products/<handle>`, `/cart`, `/about`, `/size-guide`, `/track`, `/exchange`, `/waitlist`; customer accounts `/login`, `/signup`, `/account`, `/account/forgot`, `/account/reset`, `/verify-email`; team `/admin`, `/admin/login`, `/admin/signup`, `/admin/forgot`, `/admin/reset`; and the draft policies `/returns`, `/shipping`, `/terms`, `/privacy`, `/contact`.

Without Shopify credentials the storefront uses a built-in sample catalogue, order lookup and pickup booking use in-memory fakes, messages print to the API console, and review photos are saved to local disk. Checkout is off unless you opt in to the **demo checkout** (`DEMO_CHECKOUT=1`), which takes no payment, creates no order and refuses to run once a real store is connected.

## Checks (same as CI)

```bash
npm run lint && npm run format:check && npm run typecheck && npm test && npm run build
npm run e2e        # starts its own database, API and production web build; uses your Chrome
npm run audit:ci
```

- **110 unit and integration tests** (85 API, 25 shared): size-finder band edges, fit-session chart drafting, the whole account system (sign-up, verification, sessions, resets, deletion, staff invitations, customer and staff separation) against a real MongoDB, exchange and photo handling, rate limits, and the integration adapters against mocked responses.
- **64 end-to-end tests** in a real browser: customer sign-up, email confirmation, login, reset and deletion; staff invitation and sign-in; browse to cart to demo checkout; size finder; reviews with photos; exchanges; fit sessions; mobile layout; a WCAG 2.1 AA scan of every page; and a throttled-4G page-paint budget.

## Accounts and sign-in

**Customers** can shop as guests, or make an account at `/signup` (name, email, password, optional phone). After that:

- They are signed in straight away and get an email link to confirm their address. **Orders only appear once the email is confirmed**, so nobody can read someone else's orders by signing up with their email.
- `/login`, `/account/forgot` and `/account/reset` handle sign-in and recovery. A reset link works once, for one hour, and signs out every other device.
- `/account` shows their orders (looked up in Shopify by email), lets them edit their name and phone, change their password, and **delete the account** with their password.
- Passwords need at least 10 characters; the commonest ones and ones containing the email are refused. They are stored only as bcrypt hashes. Asking for a reset gives the same answer whether or not the email has an account.

**Staff** sign in at `/admin/login`. There is deliberately **no open staff sign-up**: an admin invites a colleague from **Dashboard > Team** (email and role), and the colleague sets their own password with a one-time link (valid 7 days) at `/admin/signup`. The first admin is created with `npm run seed`. Roles are `admin` and `support`, enforced by the API on every route.

How sessions work: a short-lived access token is kept in memory only, and a refresh cookie (httpOnly, SameSite strict) restores the session on reload. Customer and staff tokens are separate: a customer token cannot open any staff route, and the reverse. Sign-in is rate-limited (10 tries per 15 minutes per IP); sign-up and password recovery more tightly.

Emails (verification, reset, invitation) go out through the same WhatsApp and Resend notifier as order updates. In development they print to the API console. Set `WEB_URL` in `apps/api/.env` to the public storefront address so the links point at the right place.

## Design and images

The look comes from a quick study of premium activewear sites: restrained editorial layouts, comparable product specs, plain honest copy and real contact details, instead of template-style gradients and icon cards. Warm neutrals with one clay accent, Newsreader for headlines and Hanken Grotesk for text, square corners, and no invented claims.

**Images:** there is no photography yet, so product pictures are **illustrations drawn in code** (`apps/web/src/components/art/`), shown as front, close-up and colour views. They are a stand-in. **Any product image you add in Shopify replaces the illustration automatically**, with a thumbnail gallery, and each product page says the pictures are illustrations. Real photography of real customers at every size is the single biggest thing that would make the site feel finished, and no code can replace it.

## What is built, against the PRD

| PRD item                                                                                                  | State                                                                                                                                                                                                      |
| --------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Home, collection, product pages, size chart, fit reviews with body tags                                   | Done                                                                                                                                                                                                       |
| Size finder (rules, edge cases, consent, delete option)                                                   | Done; **uses a placeholder chart until real fittings are entered**                                                                                                                                         |
| Fit sessions: record fittings, draft the chart from "good fit" results                                    | Done (admin > Fittings)                                                                                                                                                                                    |
| Cart, and checkout via Shopify's hosted checkout                                                          | Code done; **not run against a real store**. Demo checkout available                                                                                                                                       |
| Payments (Razorpay, UPI, cards, COD, PayPal)                                                              | Set up in Shopify, not in code: step by step in [docs/payments.md](docs/payments.md). The site lists accepted methods from NEXT_PUBLIC_PAYMENT_METHODS. **You still need to install and test the gateway** |
| Customer accounts (sign up, login, verify, reset, orders, delete)                                         | Done                                                                                                                                                                                                       |
| Staff accounts (login, invitation-only sign-up, reset, team management)                                   | Done                                                                                                                                                                                                       |
| Design and images                                                                                         | Premium editorial redesign done; images are code-drawn illustrations until there is photography                                                                                                            |
| Order tracking, one free size exchange, returns portal                                                    | Done; Shopify and courier steps run against fakes or mocks only                                                                                                                                            |
| WhatsApp and email updates                                                                                | Provider code done, mock-tested; **needs real accounts and approved templates**                                                                                                                            |
| Photo reviews                                                                                             | Done: upload, content check, moderation, public display. Local disk in development, S3-compatible storage in production                                                                                    |
| Admin: exchanges, reviews (with photos), fittings, waitlist, restock alerts, size-chart editor, stats     | Done. Products, stock, orders and discounts are managed in Shopify's own admin                                                                                                                             |
| Bundles, waitlist referral codes, restock alerts                                                          | Done (build-a-set implies no discount)                                                                                                                                                                     |
| Analytics (GA4, Meta Pixel)                                                                               | Storefront events fire. **Purchase** comes from the Shopify pixel in `docs/shopify-customer-pixel.js`                                                                                                      |
| Error tracking and alerts                                                                                 | Done: server and browser errors, lost database and failed exchange automation post to a Slack-compatible webhook                                                                                           |
| Uptime monitoring                                                                                         | `/api/health` checks the database; a scheduled GitHub workflow pings your URLs every 15 minutes                                                                                                            |
| Policies                                                                                                  | Fuller drafts of returns, shipping, terms, privacy and contact, each with a visible list of open decisions. **Not lawyer-reviewed**                                                                        |
| Security: validation, rate limits, RBAC, webhook signatures, upload content checks, no card data, consent | Done                                                                                                                                                                                                       |
| Accessibility, performance                                                                                | Automated checks pass; a manual audit and real-device test are still needed                                                                                                                                |

## Connecting the live services

Fill in `apps/api/.env` (and `apps/web/.env.local`), then run the first-contact check:

```bash
npm run check:integrations -w @curvefit/api
npm run check:integrations -w @curvefit/api -- --send-test-email you@example.com
```

It tests MongoDB, the Shopify Admin and Storefront tokens and their scopes, whether your variant names and product handles match what the code expects, Shiprocket login and warehouse address, the WhatsApp number, email sending, photo storage and the alert webhook. Everything is read-only apart from the optional test email and the alert test message. It exits with an error if any configured service fails. The Shopify steps below are what it checks.

### Shopify

1. **Storefront API token** (web): scopes `unauthenticated_read_product_listings`, `unauthenticated_read_product_inventory`, `unauthenticated_write_checkouts`. Set `SHOPIFY_STORE_DOMAIN` and `SHOPIFY_STOREFRONT_TOKEN` in `apps/web/.env.local`.
2. **Admin API token** (api): scopes `read_orders`, `read_products`, `read_inventory`, `write_draft_orders`, `write_orders`. Set `SHOPIFY_STORE_DOMAIN` and `SHOPIFY_ADMIN_TOKEN` in `apps/api/.env`.
3. **Webhooks** to `https://<api-host>/api/webhooks/shopify` for `orders/create` and `orders/fulfilled`; put the signing secret in `SHOPIFY_WEBHOOK_SECRET`.
4. **Catalogue rules**: one option called Size, with variant titles equal to the size labels (`XL` to `6XL`); the product handle must equal the size chart's product id (for example `high-rise-squat-proof-legging`).
5. **Purchase tracking**: paste `docs/shopify-customer-pixel.js` into Shopify's Customer events (instructions are in the file's header).

The Shopify Admin, Shiprocket, WhatsApp, Resend and S3 adapters follow those services' documented APIs and are tested against mocked responses. **None has been run against a live account**, so expect small fixes on first contact. `check:integrations` shows you where.

### Monitoring

- Set `ALERT_WEBHOOK_URL` (a Slack-compatible incoming webhook).
- In the GitHub repository, add secrets `UPTIME_URLS` (one URL per line, including `https://<api-host>/api/health`) and optionally `ALERT_WEBHOOK_URL`. `.github/workflows/uptime.yml` does the rest. For a hard guarantee also add the same URLs to a dedicated uptime service, since GitHub schedules can run late.

### Photo storage

Production needs S3-compatible storage (AWS S3, Cloudflare R2 and similar): set `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_PUBLIC_BASE` (and `S3_ENDPOINT` for R2). Without it, uploads are refused in production because most hosts wipe local disk on deploy.

## Things to know

- **The size chart is a placeholder** (`packages/shared/src/sampleCharts.ts`) until you record fittings and save a drafted chart. Only the numbers need replacing; the process is built.
- **"Squat-proof" is never claimed** unless a product has an `opacityTest` record (lab, method, result). The fit-session tool also counts fittings where the fabric went sheer.
- **Measurements are stored only with consent**, with no name, phone or email attached. A browser keeps a private token that lets the customer delete them (Privacy page).
- **Policies are drafts.** The words that need a business decision are shown on each page, in square brackets and in a "Still to be decided" list. They need your decisions and a lawyer's review before launch.
- **Local seed login** (`admin@curvefit.local`) exists only in your local database. Never seed that in production.
- **Rate limits** are in memory per API instance. Behind several instances or a CDN, move them to a shared store.
- **Uploaded photos are not cleaned up** if a shopper uploads and then abandons the review. Add a periodic cleanup of files no review references once volume matters.

See [docs/launch-checklist.md](docs/launch-checklist.md) for what still needs people, suppliers and accounts.
