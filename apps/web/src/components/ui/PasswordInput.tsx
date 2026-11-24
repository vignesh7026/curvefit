"use client";

import { useState, type InputHTMLAttributes } from "react";

/** The shortest password we accept; keep in step with the API (PASSWORD_MIN). */
const MIN = 10;

/**
 * Password field with a show/hide toggle. With `showHint`, tells people how long a new password
 * needs to be, in plain words, instead of a coloured strength bar that guesses.
 */
export function PasswordInput({
  label,
  id,
  showHint = false,
  value,
  ...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  label: string;
  id: string;
  showHint?: boolean;
}) {
  const [shown, setShown] = useState(false);
  const length = typeof value === "string" ? value.length : 0;
  const hint = showHint
    ? length === 0
      ? `At least ${MIN} characters. A few words in a row work well.`
      : length < MIN
        ? `${MIN - length} more character${MIN - length === 1 ? "" : "s"} to go.`
        : "Long enough."
    : undefined;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={shown ? "text" : "password"}
          value={value}
          aria-describedby={hint ? `${id}-hint` : undefined}
          className="min-h-12 w-full border border-line bg-card py-2 pl-3.5 pr-16 transition-colors hover:border-ink/50 focus:border-ink"
          {...props}
        />
        <button
          type="button"
          onClick={() => setShown((s) => !s)}
          aria-pressed={shown}
          className="absolute inset-y-0 right-0 px-3.5 text-xs font-semibold uppercase tracking-wider text-muted hover:text-ink"
        >
          {shown ? "Hide" : "Show"}
          <span className="sr-only"> password</span>
        </button>
      </div>
      {hint ? (
        <p id={`${id}-hint`} aria-live="polite" className="text-xs text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
