import type { Metadata } from "next";
import { PolicyPage } from "@/components/PolicyPage";

export const metadata: Metadata = { title: "Shipping" };

export default function ShippingPage() {
  return (
    <PolicyPage
      title="Shipping"
      intro="We ship across India."
      decisions={[
        "Dispatch time after an order is placed",
        "Delivery estimates per region, from the courier's real data",
        "Shipping charges and any free-shipping threshold",
        "Cash-on-delivery fee, and the pincodes where it is available",
      ]}
      sections={[
        {
          heading: "Where we ship",
          body: <p>All serviceable pincodes in India. We do not ship abroad yet.</p>,
        },
        {
          heading: "Dispatch and delivery",
          body: (
            <p>
              Orders are packed within [X] working days. Delivery usually takes [X to Y] days after
              dispatch, depending on where you are. You get a WhatsApp or email message with a
              tracking link when your order ships.
            </p>
          ),
        },
        {
          heading: "Charges",
          body: (
            <p>
              Shipping is [free / ₹X] on orders [above ₹Y]. Cash on delivery adds [₹Z] where it is
              available.
            </p>
          ),
        },
        {
          heading: "Payment methods",
          body: (
            <p>
              UPI, cards, wallets and cash on delivery, taken on our secure checkout. We never see
              or store your card details.
            </p>
          ),
        },
      ]}
    />
  );
}
