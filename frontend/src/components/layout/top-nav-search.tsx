"use client";

import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

const logIconAction = async (action: string, metadata: Record<string, unknown>) => {
  try {
    await fetch("/api/icon-actions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, metadata })
    });
  } catch {
    // Non-blocking analytics call.
  }
};

export const TopNavSearch = () => {
  const router = useRouter();
  const [query, setQuery] = useState("");

  const makeTarget = (search: string) => {
    const base = "/marketplace";
    const clean = search.trim();
    return clean ? `${base}?q=${encodeURIComponent(clean)}` : base;
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const cleanQuery = query.trim();
    await logIconAction("nav.search.icon", { scope: "marketplace", query: cleanQuery || null });
    const target = makeTarget(cleanQuery);
    router.push(target);
  };

  return (
    <form
      onSubmit={onSubmit}
      className="hidden h-10 w-full max-w-[800px] items-center gap-2 rounded-md border border-border bg-mutedSurface px-2.5 shadow-sm md:flex"
      aria-label="Global search"
    >
      <button
        type="submit"
        aria-label="Run search"
        className="inline-flex h-7 w-7 items-center justify-center rounded-md text-textMuted hover:bg-white"
      >
        <Search className="h-4 w-4" />
      </button>
      <input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        className="h-7 w-full border-0 bg-transparent px-0 text-sm"
        placeholder="Search datasets..."
      />
    </form>
  );
};
