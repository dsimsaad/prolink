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

export function getCtaConfig(
  state: ProfessionalState,
  variant?: "navbar" | "landing-section" | "menu-item" | "mobile"
): {
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
        label:
          variant === "menu-item" || variant === "mobile"
            ? "Application pending"
            : "Application under review",
      };
    case "approved":
      return {
        href: "/become-professional",
        label:
          variant === "menu-item" || variant === "mobile"
            ? "Professional active"
            : "Verified professional",
      };
    case "rejected":
      return {
        href: "/become-professional",
        label:
          variant === "navbar"
            ? "Reapply as professional"
            : variant === "menu-item"
              ? "View application"
              : "Update and reapply",
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
  const { href, label } = getCtaConfig(state, variant);

  if (variant === "navbar") {
    // For pending, approved, or suspended: DO NOT show a prominent primary CTA button in the navbar.
    if (state === "pending" || state === "approved" || state === "suspended") {
      return null;
    }

    const isRejected = state === "rejected";

    return (
      <Link
        href={href}
        className={`button outline small ${
          isRejected ? "border-amber-500 text-amber-800 hover:bg-amber-50" : ""
        } ${className}`.trim()}
        onClick={onClick}
      >
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
        className={className.trim()}
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
