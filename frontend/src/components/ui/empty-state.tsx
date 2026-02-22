import Link from "next/link";

import { Button } from "@/components/ui/button";

export const EmptyState = ({
  title,
  description,
  ctaHref,
  ctaLabel
}: {
  title: string;
  description: string;
  ctaHref?: string;
  ctaLabel?: string;
}) => (
  <div className="empty-state">
    <h3 className="text-[22px] leading-7 font-semibold">{title}</h3>
    <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-textMuted">{description}</p>
    {ctaHref && ctaLabel ? (
      <Link href={ctaHref} className="mt-4 inline-block">
        <Button size="lg">{ctaLabel}</Button>
      </Link>
    ) : null}
  </div>
);
