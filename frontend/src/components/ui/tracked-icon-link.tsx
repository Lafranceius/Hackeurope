"use client";

import Link from "next/link";
import { ReactNode } from "react";

type TrackedIconLinkProps = {
  href: string;
  action: string;
  metadata?: Record<string, unknown>;
  className?: string;
  children: ReactNode;
  ariaLabel?: string;
};

const track = async (action: string, metadata?: Record<string, unknown>) => {
  try {
    await fetch("/api/icon-actions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, metadata })
    });
  } catch {
    // Analytics should not block navigation.
  }
};

export const TrackedIconLink = ({ href, action, metadata, className, children, ariaLabel }: TrackedIconLinkProps) => (
  <Link
    href={href}
    className={className}
    aria-label={ariaLabel}
    onClick={() => {
      void track(action, metadata);
    }}
  >
    {children}
  </Link>
);
