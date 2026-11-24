"use client";

interface Props {
  sizes: Array<{ label: string; available: boolean }>;
  value: string | null;
  onChange: (size: string) => void;
  recommended?: string | null;
}

export function SizeSelector({ sizes, value, onChange, recommended }: Props) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-medium">Size</legend>
      <div className="flex flex-wrap gap-2">
        {sizes.map((s) => {
          const selected = value === s.label;
          return (
            <label
              key={s.label}
              className={`relative flex min-h-11 min-w-14 cursor-pointer items-center justify-center rounded-sm border px-3 text-sm ${
                selected ? "border-ink bg-ink text-bone" : "border-line bg-card"
              } ${s.available ? "" : "cursor-not-allowed opacity-40 line-through"}`}
            >
              <input
                type="radio"
                name="size"
                value={s.label}
                checked={selected}
                disabled={!s.available}
                onChange={() => onChange(s.label)}
                className="sr-only"
              />
              {s.label}
              {recommended === s.label ? (
                <span className="absolute -top-2 right-1 rounded bg-ink px-1 text-[10px] text-paper">
                  Your size
                </span>
              ) : null}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
