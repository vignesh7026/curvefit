const DEFAULT = "UPI,Cards,Net banking,Wallets,Cash on delivery";

/**
 * The payment methods the store accepts, as plain labels. Which ones really work is decided in
 * Shopify's Settings > Payments (see docs/payments.md); keep this list in step with it by setting
 * NEXT_PUBLIC_PAYMENT_METHODS, for example "UPI,Cards,Net banking,Wallets,Cash on delivery,PayPal".
 * Names only: no logos, so nothing here implies a partnership we have not set up.
 */
export function PaymentMethods({ className = "" }: { className?: string }) {
  const methods = (process.env.NEXT_PUBLIC_PAYMENT_METHODS || DEFAULT)
    .split(",")
    .map((m) => m.trim())
    .filter(Boolean);
  return (
    <div className={className}>
      <p className="sr-only">Payment methods we accept</p>
      <ul className="flex flex-wrap gap-2">
        {methods.map((m) => (
          <li key={m} className="border border-line px-2.5 py-1 text-xs font-medium text-muted">
            {m}
          </li>
        ))}
      </ul>
      <p className="mt-2 text-xs text-muted">
        Paid on our secure checkout. We never see or store your card details.
      </p>
    </div>
  );
}
