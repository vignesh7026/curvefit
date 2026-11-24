import type { SizeChart } from "@curvefit/shared";

/** Full measurement chart (cm) for a product: bust, waist, hip, plus rise and inseam if set. */
export function SizeChartTable({ chart }: { chart: SizeChart }) {
  const hasRise = chart.bands.some((b) => b.rise);
  const hasInseam = chart.bands.some((b) => b.inseam);
  const range = (r?: { min: number; max: number }) => (r ? `${r.min}–${r.max}` : "–");
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-96 border-collapse text-sm">
        <caption className="mb-2 text-left text-sm text-muted">
          Body measurements in centimetres. {chart.stretchNote}
        </caption>
        <thead>
          <tr className="border-b border-line text-left">
            <th scope="col" className="py-2 pr-3">
              Size
            </th>
            <th scope="col" className="py-2 pr-3">
              UK
            </th>
            <th scope="col" className="py-2 pr-3">
              Bust
            </th>
            <th scope="col" className="py-2 pr-3">
              Waist
            </th>
            <th scope="col" className="py-2 pr-3">
              Hip
            </th>
            {hasRise ? (
              <th scope="col" className="py-2 pr-3">
                Rise
              </th>
            ) : null}
            {hasInseam ? (
              <th scope="col" className="py-2 pr-3">
                Inseam
              </th>
            ) : null}
          </tr>
        </thead>
        <tbody>
          {chart.bands.map((b) => (
            <tr key={b.label} className="border-b border-line">
              <th scope="row" className="py-2 pr-3 text-left font-semibold">
                {b.label}
              </th>
              <td className="py-2 pr-3">{b.uk ?? "–"}</td>
              <td className="py-2 pr-3">{range(b.bust)}</td>
              <td className="py-2 pr-3">{range(b.waist)}</td>
              <td className="py-2 pr-3">{range(b.hip)}</td>
              {hasRise ? <td className="py-2 pr-3">{range(b.rise)}</td> : null}
              {hasInseam ? <td className="py-2 pr-3">{range(b.inseam)}</td> : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
