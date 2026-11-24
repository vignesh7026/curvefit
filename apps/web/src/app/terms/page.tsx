import type { Metadata } from "next";
import { PolicyPage } from "@/components/PolicyPage";

export const metadata: Metadata = { title: "Terms of service" };

export default function TermsPage() {
  return (
    <PolicyPage
      title="Terms of service"
      intro="By using this site or placing an order you agree to these terms."
      decisions={[
        "Registered business name, address and GSTIN",
        "Governing law and the court that handles disputes",
        "Wording on pricing errors and order cancellation",
        "Final lawyer review of the whole page",
      ]}
      sections={[
        {
          heading: "Who we are",
          body: (
            <p>CurveFit is operated by [registered business name], [address], GSTIN [number].</p>
          ),
        },
        {
          heading: "Orders and prices",
          body: (
            <p>
              Prices are in Indian rupees and include GST unless stated. An order is accepted when
              we confirm it by message or email. We may cancel an order if an item is out of stock
              or a price was shown in error, and will refund anything you paid.
            </p>
          ),
        },
        {
          heading: "Sizing and product information",
          body: (
            <p>
              Our size finder and size charts are guides, not guarantees: bodies and preferences
              differ. That is why every order includes a free size exchange. Claims such as
              &ldquo;squat-proof&rdquo; are shown only on products that have a laboratory result,
              which we publish on the product page.
            </p>
          ),
        },
        {
          heading: "Reviews and photos",
          body: (
            <p>
              Reviews are checked before they appear. By submitting a review or photo you give us
              permission to show it on this site. We may remove anything that is abusive, unrelated,
              or shows other people without their consent.
            </p>
          ),
        },
        {
          heading: "Returns, shipping and privacy",
          body: <p>Our returns, shipping and privacy pages form part of these terms.</p>,
        },
        {
          heading: "Disputes",
          body: (
            <p>
              These terms are governed by the laws of India. Courts at [city] have jurisdiction.
            </p>
          ),
        },
      ]}
    />
  );
}
