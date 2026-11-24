import type { Metadata } from "next";
import { DeleteMeasurements } from "@/components/DeleteMeasurements";
import { PolicyPage } from "@/components/PolicyPage";

export const metadata: Metadata = { title: "Privacy" };

export default function PrivacyPage() {
  return (
    <PolicyPage
      title="Privacy"
      intro="What we collect, why, and how you stay in control of it."
      decisions={[
        "Named data fiduciary / grievance contact and their details",
        "How long order, waitlist and review data is kept",
        "Which service providers are listed (hosting, messaging, courier, analytics)",
        "Final review against India's Digital Personal Data Protection Act by a lawyer",
      ]}
      sections={[
        {
          heading: "Your body measurements",
          body: (
            <>
              <p>
                The size finder works without saving anything. Only if you tick the box do we store
                your height, bust, waist and hip with the size we recommended, so we can improve our
                size charts. They are not linked to your name, phone or email. You can delete them
                any time below.
              </p>
              <DeleteMeasurements />
            </>
          ),
        },
        {
          heading: "Orders, exchanges and returns",
          body: (
            <p>
              We use your name, address, phone number and email to deliver your order, send updates,
              and run exchanges and returns. Payments are handled by our checkout provider, so we
              never see your card details. Exchange codes are sent to the phone number on the order.
            </p>
          ),
        },
        {
          heading: "Reviews and photos",
          body: (
            <p>
              A review shows your size, height, hip measurement and any photos you add, never your
              name. Photos are public once approved. Ask us to remove a review or photo any time.
            </p>
          ),
        },
        {
          heading: "Waitlist and restock alerts",
          body: (
            <p>
              If you join the waitlist or ask for a restock alert we use your email only for that,
              and you can ask us to remove you at any time.
            </p>
          ),
        },
        {
          heading: "Analytics",
          body: (
            <p>
              We use Google Analytics and Meta Pixel to see how the site is used and which ads work.
              We never send your measurements or contact details to them.
            </p>
          ),
        },
        {
          heading: "Your rights",
          body: (
            <p>
              You can ask to see, correct or delete the information we hold about you, and to
              withdraw consent for messages. Use the details on our contact page.
            </p>
          ),
        },
      ]}
    />
  );
}
