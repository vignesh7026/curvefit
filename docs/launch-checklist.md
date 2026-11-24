# Launch checklist

The software in this repo covers the engineering side of the PRD. Everything below needs people, suppliers, accounts or decisions, so it cannot be finished by writing code. Where a tool already exists for a step, it is named.

## Week 0: pre-build checks (from the PRD)

- [ ] **Payment gateway.** Confirm a gateway on your Shopify plan supports UPI, cards and cash on delivery in India, and write down the fees. If it does not, switch to the custom-checkout fallback before building more UI.
- [ ] **Reverse pickup.** Confirm Shiprocket (or the chosen aggregator) supports reverse pickup for exchanges, and its cost per pickup. The adapter assumes Shiprocket's "create return order" API.
- [ ] **Manufacturer minimums.** Get the minimum order quantity per size and colour.
- [ ] **Opacity and stretch test.** Pick the test method and a lab. Until a product has a lab result, the site shows no "squat-proof" claim.

## Phase 0: validate (weeks 1 to 2)

- [ ] Customer interviews and a 20-person survey with the target customer.
- [ ] Choose the sourcing route: contract manufacturer (Tirupur or Bengaluru) or on-demand.
- [ ] Decide the budget for the first production batch (open question in the PRD).
- [ ] Decide whether this is the only line or part of a broader brand (open question in the PRD).

## Phases 1 and 2: design and sample (weeks 3 to 12)

- [ ] Brand identity, tech packs, product photography with real customers at every size.
- [ ] Fabric swatches, lab opacity and stretch tests, samples.
- [ ] **Fit sessions** with 15 to 20 customers per size band. The tool is built: sign in at `/login`, open **Admin > Fittings**, record each person (size tried, their measurements, how it fitted, squat test), then **Draft from fittings** and **Save as the live chart**. A size needs at least 3 "good fit" entries before it gets a suggestion. Review the draft: it is a starting point, not a decision.
- [ ] Add rise and inseam ranges to each size chart (edit in Admin > Tools).
- [ ] Add each product's lab result as an `opacityTest` in the catalogue so the badge appears.

## Store and accounts

- [ ] Create the Shopify store and products; follow "Connecting the live services" in the README (variant names and handles matter).
- [ ] Set up payments, shipping rates and GST on Shopify; check the GST invoice format.
- [ ] Fill in `apps/api/.env` and `apps/web/.env.local`, then run **`npm run check:integrations -w @curvefit/api`** until nothing fails. It tells you which token, scope, name or address is wrong.
- [ ] WhatsApp Business: register the number and get these message templates approved by Meta: `otp`, `order_confirmed`, `order_shipped`, `exchange_requested`, `pickup_booked`, `back_in_stock`, `waitlist_welcome`. Wording and variable order must match `apps/api/src/services/notifier.ts`. The check cannot see approval status.
- [ ] Email: verify a sending domain with Resend (or swap the provider in `notifier.ts`). Run the check with `--send-test-email`.
- [ ] Photo storage: create an S3-compatible bucket (AWS S3 or Cloudflare R2) with public read for the `review-photos/` path, and set the `S3_*` variables.
- [ ] Hosting: web on Vercel, API on a host that runs a long-lived server (Render, Railway or a small VPS), MongoDB Atlas in the Mumbai region with backups on. HTTPS everywhere. Set `PUBLIC_API_URL` and `CORS_ORIGINS`.
- [ ] Create the first admin in production with a strong password (`npm run seed`), then remove the seed variables. Invite everyone else from Dashboard > Team: there is no public staff sign-up. Never seed the demo reviews or the local login.
- [ ] **Monitoring:** create a Slack-compatible incoming webhook and set `ALERT_WEBHOOK_URL`; add the repository secrets `UPTIME_URLS` and `ALERT_WEBHOOK_URL` so `.github/workflows/uptime.yml` can alert you; optionally add the same URLs to a dedicated uptime service.
- [ ] **Analytics:** create the GA4 property and Meta Pixel; set `NEXT_PUBLIC_GA_ID` and `NEXT_PUBLIC_META_PIXEL_ID`; paste `docs/shopify-customer-pixel.js` into Shopify's Customer events and test a purchase in GA4 DebugView and Meta Test Events.
- [ ] Set `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_SUPPORT_EMAIL`, `NEXT_PUBLIC_SUPPORT_WHATSAPP`.
- [ ] **Payments:** follow [payments.md](payments.md): Razorpay (KYC, install in Shopify, test keys, then live), cash on delivery, optional PayPal. Then set `NEXT_PUBLIC_PAYMENT_METHODS` to match and run the payment test checklist in that file.
- [ ] **Photography:** a photoshoot with real customers at every size. Upload the pictures to the products in Shopify and they replace the illustrations automatically. Put the home page picture in `apps/web/src/components/art/HeroArt.tsx`.
- [ ] **Accounts:** set `WEB_URL` on the API so emailed links (verify, reset, invite) point at the live storefront. Check email sending with `--send-test-email`, because account verification depends on it.
- [ ] **Claims check:** read every line of site copy against what is true on launch day. The site promises separate patterns per size band, a published opacity result on every legging, and one free exchange per order. Change anything that is not true yet.
- [ ] Make sure `DEMO_CHECKOUT` and `NEXT_PUBLIC_DEMO_CHECKOUT` are **not** set in production.

## Compliance (get a lawyer to check)

Each draft page lists its own open decisions under "Still to be decided". Settle them, replace the `[bracketed]` text, remove the draft banner (`PolicyPage`), then have a lawyer review:

- [ ] `/returns`: return window, who pays for pickup, refund timing, cash-on-delivery refunds.
- [ ] `/shipping`: dispatch time, delivery estimates, charges, cash-on-delivery fee and pincodes.
- [ ] `/terms`: registered business name, address, GSTIN, governing law and courts.
- [ ] `/privacy`: data fiduciary and grievance contact, retention periods, list of providers, review under India's DPDP Act. The consent and deletion flow for measurements exists; the legal wording and retention periods do not.
- [ ] Product labelling and claims ("squat-proof", "high support") backed by test results.
- [ ] Waitlist, referral and restock messaging: confirm the email and WhatsApp consent wording.

## Phase 4: pre-launch (weeks 13 to 14)

- [ ] Waitlist page is live (`/waitlist`); share referral links.
- [ ] Seed with plus-size creators.
- [ ] Small first production batch received and counted per size.
- [ ] Place real test orders end to end: pay, ship, track, exchange, return. Do it first in the payment gateway's test mode, then with real money. This is the first time Shopify, Shiprocket and WhatsApp run for real.
- [ ] Manual accessibility check with a screen reader on the quiz and checkout, and a test on a real mid-range phone over 4G (automated checks already pass).
- [ ] Security pass by a second person: secrets, access to the admin, backups, who has the Shopify tokens.
- [ ] Decide how long review photos and unused uploads are kept; add a cleanup job if volume grows.

## Phase 5: launch and learn

How to measure the PRD's 90-day targets with what is built:

| Target                                                 | Where to read it                                                                                                         |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------ |
| Return rate under 20 to 25%                            | Admin overview (exchange and return requests) against orders in Shopify. Returns made outside the portal are not counted |
| Repeat purchase over 40% in 12 months                  | Shopify customer reports                                                                                                 |
| Size-quiz completion over 40% of product-page visitors | GA4 funnel: `view_item`, `quiz_start`, `quiz_complete`, `size_recommended`                                               |
| Conversion 2% or higher                                | GA4 or Shopify; `add_to_cart`, `begin_checkout`, `purchase` (needs the Shopify pixel)                                    |
| Opacity or fit complaints under 3% of orders           | Review fit tags, return reasons and exchange requests; needs someone to tally them                                       |
| Exchange rate for quiz users against others            | Admin overview: requests from size-finder users and from everyone else, divided by their orders                          |

After launch: tune the size chart by recording more fittings and reading the logged recommendations, watch sell-through in 4XL to 6XL before reordering, and use restock alerts to protect core sizes.
