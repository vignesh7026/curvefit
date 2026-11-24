# Payments: Razorpay, UPI, cash on delivery and PayPal

**Payments are set up inside Shopify, not in this repo's code.** Customers pay on Shopify's hosted checkout (this storefront sends them there from the cart), so card and UPI details never touch our servers. What the code can do is show the right payment methods on the site and keep your order data consistent. This page is the checklist for turning the methods on.

> Written from Razorpay's and Shopify's public documentation (links at the end). Screens and app names change, so check each step against your own Shopify admin.

## What you need to know first

- **Shopify Payments is not available to Indian merchants**, so a third-party gateway is required. Razorpay is the usual choice for India: it covers UPI, cards, net banking and wallets in one integration.
- **Cash on delivery (COD)** is separate from the gateway. The simplest route is Shopify's own manual payment method (no extra approval). Razorpay also has a COD app, but it is on-request.
- **PayPal** is available in Shopify, but PayPal accounts in India are mostly for receiving international payments. Version 1 of the PRD ships to India only, so treat PayPal as optional and check availability for INR on your account before relying on it.
- Do everything in **test mode first**, then switch to live.

## 1. Razorpay (UPI, cards, net banking, wallets)

1. Create a Razorpay account and complete business verification (KYC). Live payments stay off until it is approved.
2. In Shopify admin, open **Settings > Payments**, choose **Add payment methods**, search for **Razorpay** and install the Razorpay app (Razorpay's current Shopify app is its all-in-one payment gateway).
3. Enter your Razorpay **Key ID** and **Key Secret**. Use the **test** keys first.
4. Turn on the methods you want inside the Razorpay app settings (UPI, cards, net banking, wallets).
5. Place a test order through the storefront (see "Test checklist" below).
6. When the test order works end to end, switch the app to **live** keys.

Fees and settlement timing are set by Razorpay: write them down in your pricing sheet before you confirm prices (the PRD's prices are still hypotheses).

## 2. Cash on delivery

Easiest, no approval needed:

1. **Settings > Payments**, scroll to **Manual payment methods**, choose **Cash on Delivery**.
2. Optionally rename it (for example "Cash on delivery") and add instructions.
3. Decide, and write on the shipping page: any COD fee, the pincodes where you offer it, and how COD refunds are paid (bank or UPI), because refunds for COD orders cannot go back to a card.

Razorpay's own COD app is an alternative if you want its COD tools. Razorpay says this one has to be requested from them before you install it.

## 3. PayPal (optional)

1. **Settings > Payments**, find **PayPal** and activate it with a PayPal business account.
2. Check that INR is supported for your account and region, and that you actually want international buyers. If not, skip it.
3. If you do enable it, add it to the storefront's list (next section).

## 4. Keep the site's payment list honest

The storefront shows the accepted methods as plain text labels (no logos, so nothing implies a partnership). They default to `UPI, Cards, Net banking, Wallets, Cash on delivery`. Match them to what you really turned on by setting, in `apps/web/.env.local`:

```
NEXT_PUBLIC_PAYMENT_METHODS=UPI,Cards,Net banking,Wallets,Cash on delivery,PayPal
```

## 5. Test checklist (test mode, then a small live order)

- [ ] A successful UPI payment, and a failed one (the order must not be created)
- [ ] A successful card payment, and a declined card
- [ ] A cash-on-delivery order is created as unpaid and shows as such in Shopify
- [ ] A refund of a prepaid order goes back through the gateway
- [ ] The confirmation WhatsApp or email arrives (`orders/create` webhook)
- [ ] The purchase shows in GA4 and Meta (the Customer Events pixel in `docs/shopify-customer-pixel.js`)
- [ ] A **size exchange** creates the zero-value replacement order. It is created as a Shopify draft order completed with no payment due, so it does not go through the gateway; confirm that on a real order
- [ ] The order total, GST and shipping on checkout match your price list

## 6. What the code cannot check

Shopify's Admin API does not list which payment gateways are switched on, so `npm run check:integrations` cannot verify this. It reminds you, and checks the store currency is INR. The test orders above are the real check.

## Sources

- Razorpay: [how to activate a payment gateway for Shopify](https://razorpay.com/blog/how-to-activate-payment-gateway-for-shopify/)
- Razorpay docs: [Shopify integration steps](https://razorpay.com/docs/payments/payment-gateway/ecommerce-plugins/shopify/integration-steps/?preferred-country=IN)
- Razorpay docs: [Shopify cash on delivery](https://razorpay.com/docs/payments/payment-gateway/ecommerce-plugins/shopify-cod/)
