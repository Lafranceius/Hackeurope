import { ButtonHTMLAttributes, forwardRef } from "react";

import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
};

const variantStyles: Record<Variant, string> = {
  primary:
    "border border-transparent bg-brand text-white shadow-sm hover:bg-brandStrong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/25",
  secondary:
    "border border-border bg-white text-textPrimary hover:bg-mutedSurface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/20",
  ghost:
    "border border-transparent bg-transparent text-textSecondary hover:bg-mutedSurface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/20",
  danger:
    "border border-transparent bg-danger text-white hover:bg-[#9e1b12] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger/25"
};

const sizeStyles: Record<Size, string> = {
  sm: "h-8 px-3 text-xs font-medium",
  md: "h-10 px-4 text-sm font-semibold",
  lg: "h-11 px-5 text-sm font-semibold"
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = "primary", size = "md", fullWidth, ...props },
  ref
) {
  return (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-md whitespace-nowrap disabled:cursor-not-allowed disabled:opacity-60",
        variantStyles[variant],
        sizeStyles[size],
        fullWidth && "w-full",
        className
      )}
      {...props}
    />
  );
});
