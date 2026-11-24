import Link from "next/link";
import { type Product, formatINR } from "@/lib/catalogue";
import { ProductImage } from "./ProductImage";

export function ProductCard({
  product,
  priority = false,
}: {
  product: Product;
  priority?: boolean;
}) {
  const soldOut = product.sizes.length > 0 && product.sizes.every((s) => !s.available);
  return (
    <Link href={`/products/${product.handle}`} className="group flex flex-col gap-3">
      <div className="relative aspect-[4/5] overflow-hidden bg-sand">
        <div className="absolute inset-0 transition-transform duration-500 ease-out group-hover:scale-[1.03]">
          <ProductImage product={product} priority={priority} />
        </div>
        {product.support ? (
          <span className="absolute left-3 top-3 bg-bone/90 px-2 py-1 text-[11px] font-semibold uppercase tracking-wider">
            {product.support}
          </span>
        ) : null}
        {soldOut ? (
          <span className="absolute bottom-3 left-3 bg-ink px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-bone">
            Sold out
          </span>
        ) : null}
      </div>
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-lg leading-snug group-hover:underline">{product.title}</h3>
        <p className="shrink-0 text-sm text-muted">{formatINR(product.price)}</p>
      </div>
    </Link>
  );
}
