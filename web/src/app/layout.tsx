import type { Metadata } from "next";
import "./globals.css";
import { SiteShell } from "@/components/prolink/site-shell";

export const metadata: Metadata = {
  title: "ProLink — Hire Trusted Professionals, Fast",
  description:
    "Post your job, compare verified local offers, and hire trusted professionals across Pakistan.",
  icons: {
    icon: [
      { url: "/green-circular-logo.png?v=4", type: "image/png" },
      { url: "/Green%20Circular%20P%20Logo-2.png?v=4", type: "image/png" },
      { url: "/icon.png?v=4", type: "image/png", sizes: "512x512" },
      { url: "/favicon.ico?v=4", sizes: "any" },
    ],
    apple: [{ url: "/apple-icon.png?v=4", sizes: "180x180", type: "image/png" }],
    shortcut: "/green-circular-logo.png?v=4",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/green-circular-logo.png?v=4" type="image/png" sizes="any" />
        <link rel="icon" href="/Green%20Circular%20P%20Logo-2.png?v=4" type="image/png" sizes="any" />
        <link rel="icon" href="/favicon.ico?v=4" sizes="any" />
        <link rel="shortcut icon" href="/green-circular-logo.png?v=4" type="image/png" />
        <link rel="apple-touch-icon" href="/apple-icon.png?v=4" />
      </head>
      <body><SiteShell>{children}</SiteShell></body>
    </html>
  );
}
