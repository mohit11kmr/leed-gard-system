"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    void fetch("/api/client-error", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: error.message, digest: error.digest }),
    });
  }, [error]);
  return (
    <html lang="en">
      <body>
        <main>
          <h1>Application error</h1>
          <button onClick={() => reset()}>Try again</button>
        </main>
      </body>
    </html>
  );
}
