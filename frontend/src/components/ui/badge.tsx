import { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

type Variant = "default" | "success" | "warning" | "danger" | "info";

const styles: Record<Variant, string> = {
  default: "border border-border bg-altSurface text-textSecondary",
  success: "border border-[#ccead6] bg-success-soft text-success",
  warning: "border border-[#f3d8ba] bg-warning-soft text-warning",
  danger: "border border-[#f3cecc] bg-danger-soft text-danger",
  info: "border border-[#cfddff] bg-brandSoft text-brand"
};

export const Badge = ({
  className,
  children,
  variant = "default"
}: HTMLAttributes<HTMLSpanElement> & { variant?: Variant }) => (
  <span className={cn("inline-flex h-6 items-center rounded-full px-2.5 text-xs font-medium", styles[variant], className)}>
    {children}
  </span>
);
