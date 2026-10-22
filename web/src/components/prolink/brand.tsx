import Link from "next/link";
import Image from "next/image";

export function Brand({
  className = "",
  variant = "default",
  priority = true,
}: {
  className?: string;
  variant?: "default" | "footer";
  priority?: boolean;
}) {
  if (variant === "footer") {
    return (
      <Link
        href="/"
        className={`brand ${className}`.trim()}
        aria-label="ProLink home"
        style={{ textDecoration: "none" }}
      >
        <Image
          src="/images/logo-white.png"
          alt="ProLink"
          width={150}
          height={42}
          className="h-8 md:h-9 w-auto object-contain"
          style={{
            height: "auto",
            width: "auto",
            maxHeight: "40px",
            filter: "brightness(0) invert(1)",
          }}
        />
      </Link>
    );
  }

  return (
    <Link
      href="/"
      className={`brand ${className}`.trim()}
      aria-label="ProLink home"
      style={{ textDecoration: "none" }}
    >
      <Image
        src="/images/logo.png"
        alt="ProLink"
        width={144}
        height={40}
        priority={priority}
        className="h-8 md:h-9 w-auto object-contain"
        style={{ height: "auto", width: "auto", maxHeight: "38px" }}
      />
    </Link>
  );
}

export function Icon({
  name,
  className = "",
}: {
  name:
    | "shield"
    | "star"
    | "check"
    | "arrow"
    | "search"
    | "pin"
    | "card"
    | "mail"
    | "phone"
    | "clock"
    | "chevron-down"
    | "message";
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
    mail: "M3 7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Zm1 1 8 5 8-5",
    phone:
      "M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z",
    clock: "M12 6v6l4 2 M22 12A10 10 0 1 1 2 12a10 10 0 0 1 20 0Z",
    "chevron-down": "m6 9 6 6 6-6",
    message: "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z",
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
