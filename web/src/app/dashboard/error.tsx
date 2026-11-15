"use client";

import { AlertTriangle } from "lucide-react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div
      role="alert"
      className="rounded-2xl border border-red-200 bg-white p-6 text-center shadow-2xs sm:p-8"
    >
      <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-red-50 text-red-600">
        <AlertTriangle className="h-5 w-5" aria-hidden="true" />
      </div>
      <h1 className="mt-3 text-base font-bold text-[#0C2A1B]">
        Unable to load this dashboard view
      </h1>
      <p className="mx-auto mt-1 max-w-md text-xs text-[#6A7B70]">
        {error.message || "An unexpected error occurred while loading your data."}
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-4 inline-flex items-center rounded-xl bg-[#0F6B3E] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#0A4D2B]"
      >
        Try again
      </button>
    </div>
  );
}
