"use client";

import { useEffect } from "react";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error(error);
  }, [error]);

  return (
    <div className="container-shell py-20">
      <div className="panel p-6">
        <h2 className="text-2xl font-semibold">Something went wrong</h2>
        <p className="mt-2 text-sm text-textMuted">{error.message || "An unexpected error occurred."}</p>
        <button
          onClick={reset}
          className="mt-4 inline-flex h-10 items-center rounded-md bg-brand px-4 text-sm font-semibold text-white"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
