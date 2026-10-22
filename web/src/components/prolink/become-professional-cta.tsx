import Link from "next/link";
import { Icon } from "./brand";
import type { ProfessionalState } from "@/utils/professional";

interface BecomeProfessionalCtaProps {
  state: ProfessionalState;
  variant: "navbar" | "landing-section" | "menu-item" | "mobile";
  reviewNote?: string | null;
  className?: string;
  onClick?: () => void;
}

export function getCtaConfig(state: ProfessionalState): {
  href: string;
  label: string;
} {
  switch (state) {
    case "logged_out":
      return {
        href: "/sign-up?next=/become-professional",
        label: "Become a professional",
      };
    case "none":
      return {
        href: "/become-professional",
        label: "Become a professional",
      };
    case "pending":
      return {
        href: "/become-professional",
        label: "Application under review",
      };
    case "approved":
      return {
        href: "/become-professional",
        label: "Verified professional",
      };
    case "rejected":
      return {
        href: "/become-professional",
        label: "Update and reapply",
      };
    case "suspended":
      return {
        href: "/become-professional",
        label: "Account on hold",
      };
  }
}

export function BecomeProfessionalCta({
  state,
  variant,
  reviewNote,
  className = "",
  onClick,
}: BecomeProfessionalCtaProps) {
  const { href, label } = getCtaConfig(state);

  if (variant === "navbar") {
    // Style adjustments depending on status for visual feedback
    const isApproved = state === "approved";
    const isPending = state === "pending";
    const isAlert = state === "rejected" || state === "suspended";

    return (
      <Link
        href={href}
        className={`button outline small ${
          isApproved
            ? "border-emerald-600 text-emerald-800 hover:bg-emerald-50"
            : isAlert
              ? "border-amber-500 text-amber-800 hover:bg-amber-50"
              : isPending
                ? "border-blue-400 text-blue-800 hover:bg-blue-50"
                : ""
        } ${className}`.trim()}
        onClick={onClick}
      >
        {isApproved && <Icon name="check" className="w-3.5 h-3.5 inline mr-1 text-emerald-600" />}
        {label}
      </Link>
    );
  }

  if (variant === "mobile") {
    return (
      <Link
        href={href}
        className={`button outline small ${className}`.trim()}
        style={{ alignSelf: "flex-start", marginTop: "4px" }}
        onClick={onClick}
      >
        {label}
      </Link>
    );
  }

  if (variant === "menu-item") {
    return (
      <Link
        href={href}
        className={`dropdown-item block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 ${className}`.trim()}
        role="menuitem"
        onClick={onClick}
      >
        {label}
      </Link>
    );
  }

  if (variant === "landing-section") {
    // Landing section above the footer:
    // Show for logged_out, none, and rejected; hide for pending, approved, suspended.
    if (state === "pending" || state === "approved" || state === "suspended") {
      return null;
    }

    const isRejected = state === "rejected";

    return (
      <section className={`container pro-cta ${className}`.trim()}>
        <div>
          <span className="eyebrow">
            {isRejected ? "Action Required" : "For Skilled Professionals"}
          </span>
          <h2>
            {isRejected
              ? "Update your professional application"
              : "Grow your work with ProLink"}
          </h2>
          <p>
            {isRejected
              ? reviewNote
                ? `Feedback from administrator: "${reviewNote}". Update your skills and coverage areas to reapply.`
                : "Your previous application was not approved. Update your profile details to reapply."
              : "Create a professional profile and get matched with local customers who need your skills."}
          </p>
        </div>
        <Link href={href} className="button outline" onClick={onClick}>
          {label} <Icon name="arrow" />
        </Link>
      </section>
    );
  }

  return null;
}
