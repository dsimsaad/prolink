import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "ProLink — Hire Trusted Professionals, Fast",
  description:
    "Post your job, compare verified local offers, and hire trusted professionals across Pakistan.",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.png", type: "image/png", sizes: "512x512" },
    ],
    apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
  },
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
