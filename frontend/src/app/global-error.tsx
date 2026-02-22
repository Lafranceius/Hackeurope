"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body>
        <main style={{ padding: 24, fontFamily: "Inter, ui-sans-serif, system-ui" }}>
          <h1 style={{ fontSize: 28, marginBottom: 8 }}>Application Error</h1>
          <p style={{ marginBottom: 12 }}>{error.message || "Unexpected global error."}</p>
          <button onClick={reset} style={{ padding: "8px 14px" }}>
            Reload
          </button>
        </main>
      </body>
    </html>
  );
}
