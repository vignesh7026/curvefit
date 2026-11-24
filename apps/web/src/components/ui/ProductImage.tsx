import Image from "next/image";
import type { Product } from "@/lib/catalogue";
import { Garment, type GarmentView } from "../art/Garment";

/** The product's first real photo if it has one, otherwise its illustration. */
export function ProductImage({
  product,
  view = "front",
  priority = false,
  sizes = "(min-width: 768px) 25vw, 50vw",
}: {
  product: Product;
  view?: GarmentView;
  priority?: boolean;
  sizes?: string;
}) {
  const photo = product.images[0];
  if (photo) {
    return (
      <Image
        src={photo.url}
        alt={photo.alt}
        fill
        preload={priority}
        sizes={sizes}
        className="object-cover"
      />
    );
  }
  return (
    <Garment
      kind={product.art.kind}
      colour={product.art.colour}
      view={view}
      label={`${product.title}, illustration`}
      className="absolute inset-0 h-full w-full"
    />
  );
}
