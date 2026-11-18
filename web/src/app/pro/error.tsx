"use client";

import Link from "next/link";
import { AlertCircle, RefreshCw } from "lucide-react";

export default function ProfessionalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="rounded-2xl border border-red-200 bg-white p-8 text-center shadow-2xs">
      <AlertCircle
        className="mx-auto h-10 w-10 text-red-600"
        aria-hidden="true"
      />
      <h1 className="mt-3 text-lg font-extrabold text-[#0C2A1B]">
        Could not load professional workspace
      </h1>
      <p className="mx-auto mt-1.5 max-w-md text-xs text-[#6A7B70]">
        {error.message ||
          "An unexpected error occurred while loading this page."}
      </p>
      <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="inline-flex items-center gap-1.5 rounded-xl bg-[#0F6B3E] px-4 py-2 text-xs font-semibold !text-white text-white hover:bg-[#0A4D2B]"
        >
          <RefreshCw className="h-3.5 w-3.5 !text-white text-white" aria-hidden="true" />
          <span className="!text-white text-white">Try again</span>
        </button>
        <Link
          href="/pro"
          className="inline-flex items-center rounded-xl border border-[#DCE8E0] bg-white px-4 py-2 text-xs font-semibold text-[#0C2A1B] hover:bg-[#F4FAF6]"
        >
          Back to overview
        </Link>
      </div>
    </div>
  );
}
