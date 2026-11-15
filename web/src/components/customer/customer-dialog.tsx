"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { Clock, X } from "lucide-react";
import type { JobStatus } from "@/lib/customer/types";

interface CustomerDialogProps {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
}

export function CustomerDialog({
  open,
  title,
  description,
  onClose,
  children,
}: CustomerDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleCancel = (event: Event) => {
      event.preventDefault();
      onClose();
    };

    dialog.addEventListener("cancel", handleCancel);
    return () => {
      dialog.removeEventListener("cancel", handleCancel);
    };
  }, [onClose]);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="customer-dialog-title"
      className="fixed inset-0 m-auto max-h-[min(85vh,44rem)] w-[calc(100%-2rem)] max-w-lg overflow-y-auto rounded-2xl border border-[#DCE8E0] bg-white p-0 text-[#0C2A1B] shadow-2xl backdrop:bg-black/50"
    >
      <div className="flex items-start justify-between border-b border-[#DCE8E0] px-6 py-4">
        <div>
          <h2 id="customer-dialog-title" className="text-base font-bold text-[#0C2A1B]">
            {title}
          </h2>
          {description && (
            <p className="mt-1 text-xs text-[#6A7B70]">{description}</p>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close dialog"
          className="rounded-lg p-1.5 text-[#6A7B70] transition hover:bg-[#F4FAF6] hover:text-[#0C2A1B] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F6B3E]"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="p-6">{children}</div>
    </dialog>
  );
}

export function JobStatusBadge({ status }: { status: JobStatus | string }) {
  const styles: Record<string, string> = {
    Draft: "border-slate-300 bg-slate-100 text-slate-700",
    Open: "border-emerald-200 bg-emerald-50 text-[#0F6B3E]",
    "Offers received": "border-teal-200 bg-teal-50 text-teal-800",
    Assigned: "border-blue-200 bg-blue-50 text-blue-800",
    "In progress": "border-amber-200 bg-amber-50 text-amber-800",
    Completed: "border-emerald-300 bg-[#E6F4EA] text-[#0A4D2B]",
    Cancelled: "border-stone-300 bg-stone-100 text-stone-600",
    Expired: "border-stone-300 bg-stone-100 text-stone-600",
    Disputed: "border-red-200 bg-red-50 text-red-800",
  };

  const badgeStyle = styles[status] ?? "border-[#DCE8E0] bg-[#F4FAF6] text-[#34453B]";

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${badgeStyle}`}
    >
      {status}
    </span>
  );
}

export function WakingServerBanner({ visible }: { visible: boolean }) {
  if (!visible) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex items-center gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-medium text-amber-900"
    >
      <Clock className="h-4 w-4 shrink-0 animate-spin text-amber-700" aria-hidden="true" />
      <span>
        Server is waking up, this can take up to a minute on the first request. Please hold on...
      </span>
    </div>
  );
}
