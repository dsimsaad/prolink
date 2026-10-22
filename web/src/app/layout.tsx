import type { Metadata } from "next";
import "./globals.css";
import { SiteShell } from "@/components/prolink/site-shell";

export const metadata: Metadata = {
  title: "ProLink — Hire Trusted Professionals, Fast",
  description:
    "Post your job, compare verified local offers, and hire trusted professionals across Pakistan.",
  icons: {
    icon: [
      { url: "/icon.png?v=2", type: "image/png", sizes: "512x512" },
      { url: "/favicon.ico?v=2", sizes: "any" },
    ],
    apple: [{ url: "/apple-icon.png?v=2", sizes: "180x180", type: "image/png" }],
    shortcut: "/favicon.ico?v=2",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body><SiteShell>{children}</SiteShell></body>
    </html>
  );
}
