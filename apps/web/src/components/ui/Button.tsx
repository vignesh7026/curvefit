import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "quiet" | "light";

const styles: Record<Variant, string> = {
  primary: "bg-ink text-bone hover:bg-plum disabled:hover:bg-ink",
  secondary:
    "border border-ink text-ink hover:bg-ink hover:text-bone disabled:hover:bg-transparent disabled:hover:text-ink",
  /** For dark backgrounds. */
  light: "border border-bone text-bone hover:bg-bone hover:text-ink",
  quiet: "text-ink underline underline-offset-4 hover:text-clay",
};

/** Square-cornered, quietly confident. Pass `className` for width and spacing. */
export function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      {...props}
      className={`inline-flex min-h-12 items-center justify-center px-7 text-sm font-semibold tracking-wide transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-45 ${styles[variant]} ${className}`}
    />
  );
}

/** A link that looks like a button, for navigation rather than actions. */
export const buttonClass = (variant: Variant = "primary", extra = "") =>
  `inline-flex min-h-12 items-center justify-center px-7 text-sm font-semibold tracking-wide transition-colors duration-200 ${styles[variant]} ${extra}`;
