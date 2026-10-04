import Link from "next/link";

export function Brand() {
  return (
    <Link href="/" className="brand" aria-label="ProLink home">
      <span className="brand-mark">
        <svg viewBox="0 0 32 32" aria-hidden="true">
          <path
            d="M10 8h7a5 5 0 0 1 5 5c0 2.76-2.24 5-5 5h-4v6h-3V8zm3 3v4h4a2 2 0 0 0 0-4h-4z"
            fill="currentColor"
          />
          <circle cx="20" cy="19" r="3.5" fill="#2FAE60" />
        </svg>
      </span>
      <span>ProLink</span>
    </Link>
  );
}

export function Icon({
  name,
  className = "",
}: {
  name: "shield" | "star" | "check" | "arrow" | "search" | "pin" | "card";
  className?: string;
}) {
  const paths = {
    shield: "M12 3 3 7v5c0 5 9 9 9 9s9-4 9-9V7l-9-4Z M8 12l3 3 5-6",
    star: "m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9L12 3Z",
    check: "M20 11v1a8 8 0 1 1-5-7 M8 11l4 4 9-10",
    arrow: "M4 12h16 M14 6l6 6-6 6",
    search: "M21 21l-5-5 M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0",
    pin: "M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z M15 10a3 3 0 1 1-6 0 3 3 0 0 1 6 0",
    card: "M3 5h18v14H3V5Z M3 10h18 M7 15h3",
  };
  return (
    <svg
      className={`icon ${className}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[name]} />
    </svg>
  );
}
