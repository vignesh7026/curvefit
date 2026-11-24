import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Contact" };

/** Contact details come from environment variables so they are never invented in code. */
export default function ContactPage() {
  const email = process.env.NEXT_PUBLIC_SUPPORT_EMAIL;
  const whatsapp = process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP;
  return (
    <div className="max-w-2xl">
      <h1 className="mb-3 text-3xl">Contact us</h1>
      <p className="text-muted">Questions about fit, an order or a return? We are happy to help.</p>
      <ul className="mt-6 flex flex-col gap-3">
        {email ? (
          <li>
            Email:{" "}
            <a href={`mailto:${email}`} className="font-semibold text-brand underline">
              {email}
            </a>
          </li>
        ) : null}
        {whatsapp ? (
          <li>
            WhatsApp:{" "}
            <a
              href={`https://wa.me/${whatsapp.replace(/\D/g, "")}`}
              className="font-semibold text-brand underline"
            >
              {whatsapp}
            </a>
          </li>
        ) : null}
        {!email && !whatsapp ? (
          <li className="text-muted">
            Contact details will appear here once they are set (NEXT_PUBLIC_SUPPORT_EMAIL and
            NEXT_PUBLIC_SUPPORT_WHATSAPP).
          </li>
        ) : null}
        <li>
          Need to change a size? Use the{" "}
          <Link href="/exchange" className="font-semibold text-brand underline">
            exchange page
          </Link>{" "}
          or{" "}
          <Link href="/track" className="font-semibold text-brand underline">
            track an order
          </Link>
          .
        </li>
      </ul>
    </div>
  );
}
