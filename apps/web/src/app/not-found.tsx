import Link from "next/link";

export default function NotFound() {
  return (
    <div className="py-12">
      <h1 className="text-3xl">Page not found</h1>
      <p className="mt-2 text-muted">We could not find that page.</p>
      <Link href="/shop" className="mt-4 inline-block font-semibold text-brand underline">
        Back to the shop
      </Link>
    </div>
  );
}
