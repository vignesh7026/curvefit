import type { Metadata } from "next";
import Link from "next/link";
import { PolicyPage } from "@/components/PolicyPage";

export const metadata: Metadata = { title: "Returns and exchanges" };

export default function ReturnsPage() {
  return (
    <PolicyPage
      title="Returns and exchanges"
      intro="We want the fit to be right. If it is not, here is what happens."
      decisions={[
        "Return window in days, counted from delivery",
        "Who pays for return pickup, and for orders paid by cash on delivery",
        "Refund timing and how cash-on-delivery refunds are paid (bank or UPI)",
        "Whether worn-once items can be exchanged for fit reasons",
      ]}
      sections={[
        {
          heading: "Free size exchange",
          body: (
            <p>
              Every order gets one free size exchange. Start it on the{" "}
              <Link href="/exchange" className="underline">
                exchange page
              </Link>{" "}
              with your order number and phone number. We collect the original item and ship the new
              size. If the size you want is out of stock, you can ask to be told when it returns.
            </p>
          ),
        },
        {
          heading: "Returns",
          body: (
            <p>
              Unworn items with tags can be returned within [X] days of delivery. Request a return
              on the exchange page and we will arrange pickup. Refunds go back to the original
              payment method; for cash-on-delivery orders we will ask for bank or UPI details.
            </p>
          ),
        },
        {
          heading: "Not eligible",
          body: (
            <p>
              Items that have been washed or worn, are missing their tags, or show signs of use
              cannot be returned. Sports bras and bottoms are hygiene items and must have their
              hygiene liner or seal intact.
            </p>
          ),
        },
        {
          heading: "Faulty or sheer items",
          body: (
            <p>
              If an item arrives damaged, or goes see-through when you move, contact us within [X]
              days and we will replace it or refund it at no cost. We test our fabrics for opacity,
              and we want to hear when one falls short.
            </p>
          ),
        },
        {
          heading: "Track an order",
          body: (
            <p>
              See where an order is on the{" "}
              <Link href="/track" className="underline">
                tracking page
              </Link>
              .
            </p>
          ),
        },
      ]}
    />
  );
}
