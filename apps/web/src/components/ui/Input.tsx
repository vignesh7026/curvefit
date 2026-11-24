import type { InputHTMLAttributes } from "react";

/** Labelled input: every field gets a visible label (WCAG 2.1 AA). */
export function Input({
  label,
  hint,
  id,
  className = "",
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string; id: string }) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <input
        id={id}
        aria-describedby={hint ? `${id}-hint` : undefined}
        className="min-h-12 border border-line bg-card px-3.5 py-2 transition-colors placeholder:text-muted/70 hover:border-ink/50 focus:border-ink"
        {...props}
      />
      {hint ? (
        <p id={`${id}-hint`} className="text-xs text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
