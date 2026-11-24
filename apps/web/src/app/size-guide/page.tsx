import type { Metadata } from "next";
import Link from "next/link";
import type { SizeChart } from "@curvefit/shared";
import { SizeChartTable } from "@/components/SizeChartTable";
import { API } from "@/lib/api";

export const metadata: Metadata = { title: "Size guide" };

async function getChart(id: string): Promise<SizeChart | null> {
  try {
    const res = await fetch(`${API}/size/${id}`, { next: { revalidate: 30 } });
    return res.ok ? ((await res.json()) as { data: SizeChart }).data : null;
  } catch {
    return null;
  }
}

export default async function SizeGuide() {
  const [bottoms, tops] = await Promise.all([
    getChart("high-rise-squat-proof-legging"),
    getChart("high-impact-sports-bra"),
  ]);
  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl">Size guide</h1>
        <p className="mt-2 max-w-xl text-muted">
          Measure over light clothing, standing relaxed. Bust: fullest part. Waist: narrowest part.
          Hip: fullest part. If you are between sizes, the finder on each product page shows both.
          Or skip the tape and use it on a{" "}
          <Link href="/shop" className="underline">
            product page
          </Link>
          .
        </p>
      </div>
      {bottoms ? (
        <section aria-labelledby="g-bottoms">
          <h2 id="g-bottoms" className="mb-3 text-xl font-semibold">
            Leggings and shorts
          </h2>
          <SizeChartTable chart={bottoms} />
        </section>
      ) : null}
      {tops ? (
        <section aria-labelledby="g-tops">
          <h2 id="g-tops" className="mb-3 text-xl font-semibold">
            Bras and tops
          </h2>
          <SizeChartTable chart={tops} />
        </section>
      ) : null}
      {!bottoms && !tops ? (
        <p className="text-muted">The size guide is not available right now.</p>
      ) : null}
    </div>
  );
}
