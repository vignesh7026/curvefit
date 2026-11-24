"use client";

import Image from "next/image";
import { useState } from "react";
import type { Product } from "@/lib/catalogue";
import { ColourwayRow, Garment, KIND_LABEL } from "./art/Garment";

/**
 * Product pictures: real photos when Shopify has them, otherwise three illustrated views
 * (front, close-up and colours). Thumbnails switch the large picture.
 */
export function ProductGallery({ product }: { product: Product }) {
  const [active, setActive] = useState(0);

  if (product.images.length > 0) {
    const imgs = product.images;
    return (
      <div className="flex flex-col gap-3">
        <div className="relative aspect-[4/5] overflow-hidden bg-sand">
          <Image
            src={imgs[active]?.url ?? imgs[0]!.url}
            alt={imgs[active]?.alt ?? product.title}
            fill
            preload
            sizes="(min-width: 1024px) 50vw, 100vw"
            className="object-cover"
          />
        </div>
        {imgs.length > 1 ? (
          <ul className="grid grid-cols-5 gap-2">
            {imgs.map((im, i) => (
              <li key={im.url}>
                <button
                  onClick={() => setActive(i)}
                  aria-label={`Show picture ${i + 1}`}
                  aria-current={active === i}
                  className={`relative block aspect-square w-full overflow-hidden bg-sand ${active === i ? "ring-2 ring-ink" : ""}`}
                >
                  <Image src={im.url} alt="" fill sizes="96px" className="object-cover" />
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    );
  }

  const { kind, colour } = product.art;
  const views = [
    {
      name: "Front",
      big: (
        <Garment
          kind={kind}
          colour={colour}
          label={`${product.title}, front view, illustration`}
          className="h-full w-full"
        />
      ),
      thumb: <Garment kind={kind} colour={colour} label="" className="h-full w-full" />,
    },
    {
      name: "Detail",
      big: (
        <Garment
          kind={kind}
          colour={colour}
          view="detail"
          label={`${product.title}, close-up of the construction, illustration`}
          className="h-full w-full"
        />
      ),
      thumb: (
        <Garment kind={kind} colour={colour} view="detail" label="" className="h-full w-full" />
      ),
    },
    {
      name: "Colours",
      big: (
        <ColourwayRow
          kind={kind}
          label={`${KIND_LABEL[kind]} shown in four colours, illustration`}
        />
      ),
      thumb: <ColourwayRow kind={kind} label="" />,
    },
  ];

  return (
    <div className="flex flex-col gap-3">
      <div className="aspect-[4/5] overflow-hidden bg-sand">{views[active]?.big}</div>
      <ul className="grid grid-cols-3 gap-2">
        {views.map((v, i) => (
          <li key={v.name}>
            <button
              onClick={() => setActive(i)}
              aria-label={`Show the ${v.name.toLowerCase()} view`}
              aria-current={active === i}
              className={`block aspect-[4/5] w-full overflow-hidden bg-sand ${active === i ? "ring-2 ring-ink" : "opacity-80 hover:opacity-100"}`}
            >
              {v.thumb}
            </button>
          </li>
        ))}
      </ul>
      <p className="text-xs text-muted">
        Illustrations while we finish our photoshoot with real customers at every size.
      </p>
    </div>
  );
}
