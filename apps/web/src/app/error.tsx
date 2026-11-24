"use client";

import { useEffect } from "react";
import { reportClientError } from "@/lib/api-extra";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Sent to our API, which logs it and alerts the team. Only the error text and page path are
    // sent: never form contents or measurements.
    reportClientError(error.message, window.location.pathname, error.digest);
  }, [error]);

  return (
    <div role="alert" className="py-12">
      <h1 className="text-3xl">Something went wrong</h1>
      <p className="mt-2 text-muted">
        Please try again. We have been told about the problem. If it keeps happening, let us know.
      </p>
      <button
        onClick={reset}
        className="mt-4 min-h-11 rounded-full bg-brand px-6 text-sm font-semibold text-white"
      >
        Try again
      </button>
    </div>
  );
}
