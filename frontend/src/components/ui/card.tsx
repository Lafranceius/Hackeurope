import { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

type CardVariant = "default" | "stat" | "feature";

export const Card = ({
  className,
  variant = "default",
  ...props
}: HTMLAttributes<HTMLDivElement> & { variant?: CardVariant }) => (
  <div
    className={cn(
      "panel",
      variant === "stat" && "p-4",
      variant === "feature" && "p-5",
      className
    )}
    {...props}
  />
);
