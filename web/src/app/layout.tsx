import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "ProLink — Hire Trusted Professionals, Fast",
  description:
    "Post your job, compare verified local offers, and hire trusted professionals across Pakistan.",
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
