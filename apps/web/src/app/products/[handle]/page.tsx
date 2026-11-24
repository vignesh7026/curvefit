import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { SizeChart } from "@curvefit/shared";
import { PaymentMethods } from "@/components/PaymentMethods";
import { ProductGallery } from "@/components/ProductGallery";
import { ProductPurchase } from "@/components/ProductPurchase";
import { ReviewsSection } from "@/components/ReviewsSection";
import { SizeChartTable } from "@/components/SizeChartTable";
import { ViewItemTracker } from "@/components/ViewItemTracker";
import { API, type ReviewView } from "@/lib/api";
import { formatINR, getProduct } from "@/lib/catalogue";

type Params = Promise<{ handle: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const product = await getProduct((await params).handle);
  return product ? { title: product.title, description: product.description } : {};
}

/** Reviews and charts are optional: the page must still render if the API is down. */
async function getJson<T>(path: string, fallback: T, revalidate: number | false): Promise<T> {
  try {
    // Reviews are never cached so a newly approved review shows at once; charts for 30 s.
    const res = await fetch(
      `${API}${path}`,
      revalidate === false ? { cache: "no-store" } : { next: { revalidate } },
    );
    if (!res.ok) return fallback;
    return ((await res.json()) as { data: T }).data;
  } catch {
    return fallback;
  }
}

function Accordion({
  title,
  children,
  open = false,
}: {
  title: string;
  children: React.ReactNode;
  open?: boolean;
}) {
  return (
    <details className="group border-b border-line py-4" open={open}>
      <summary className="flex cursor-pointer list-none items-center justify-between font-display text-xl">
        {title}
        <span
          aria-hidden
          className="text-2xl leading-none transition-transform group-open:rotate-45"
        >
          +
        </span>
      </summary>
      <div className="mt-3 flex flex-col gap-2 text-sm text-muted">{children}</div>
    </details>
  );
}

export default async function ProductPage({ params }: { params: Params }) {
  const { handle } = await params;
  const product = await getProduct(handle);
  if (!product) notFound();
  const id = encodeURIComponent(handle);
  const [reviews, chart] = await Promise.all([
    getJson<ReviewView[]>(`/reviews/${id}`, [], false),
    getJson<SizeChart | null>(`/size/${id}`, null, 30),
  ]);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.title,
    description: product.description,
    offers: {
      "@type": "Offer",
      priceCurrency: "INR",
      price: product.price,
      availability: product.sizes.some((s) => s.available)
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
    },
  };

  return (
    <div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ViewItemTracker handle={product.handle} price={product.price} />

      <nav aria-label="Breadcrumb" className="mb-8 text-sm text-muted">
        <Link href="/shop" className="hover:underline">
          Shop
        </Link>
        <span aria-hidden> / </span>
        <span aria-current="page">{product.title}</span>
      </nav>

      <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16">
        <div className="lg:sticky lg:top-28 lg:self-start">
          <ProductGallery product={product} />
        </div>

        <div className="flex flex-col gap-8">
          <div>
            {product.support ? <p className="eyebrow">{product.support}</p> : null}
            <h1 className="mt-3 text-4xl md:text-5xl">{product.title}</h1>
            <p className="mt-3 text-xl">{formatINR(product.price)}</p>
            <p className="mt-4 text-muted">{product.description}</p>

            {/* The opacity result appears only when a lab result exists for this product. */}
            {product.opacityTest ? (
              <p className="mt-5 border border-line bg-card p-4 text-sm">
                <strong>Opacity tested:</strong> {product.opacityTest.result} (
                {product.opacityTest.method}, {product.opacityTest.lab})
              </p>
            ) : null}

            {product.specs.length > 0 ? (
              <dl className="mt-6 grid grid-cols-[7rem_1fr] gap-x-4 gap-y-2 border-t border-line pt-5 text-sm">
                {product.specs.map((s) => (
                  <div key={s.label} className="contents">
                    <dt className="text-muted">{s.label}</dt>
                    <dd>{s.value}</dd>
                  </div>
                ))}
              </dl>
            ) : null}
          </div>

          <ProductPurchase product={product} />

          <PaymentMethods />

          <div className="border-t border-line">
            <Accordion title="Fit and sizing" open>
              <p>
                Not sure which size? Use the finder above, or see the{" "}
                <Link href="/size-guide" className="link text-ink">
                  full size guide
                </Link>
                . If you are between two sizes we will tell you which way the fabric gives.
              </p>
            </Accordion>
            <Accordion title="Free size exchange">
              <p>
                Every order includes one free size exchange. If it does not fit, tell us on the{" "}
                <Link href="/exchange" className="link text-ink">
                  exchange page
                </Link>{" "}
                and we collect it and send the new size.
              </p>
            </Accordion>
            <Accordion title="Shipping">
              <p>
                We ship across India. Delivery details are on the{" "}
                <Link href="/shipping" className="link text-ink">
                  shipping page
                </Link>
                .
              </p>
            </Accordion>
          </div>
        </div>
      </div>

      {chart ? (
        <section className="mt-20" aria-labelledby="size-chart">
          <h2 id="size-chart" className="mb-5 text-3xl">
            Size chart
          </h2>
          <SizeChartTable chart={chart} />
        </section>
      ) : null}

      <div className="mt-20">
        <ReviewsSection
          productId={product.handle}
          sizes={product.sizes.map((s) => s.label)}
          initial={reviews}
        />
      </div>
    </div>
  );
}
