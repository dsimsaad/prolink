import type { Metadata } from "next";
import { Figtree, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { SiteShell } from "@/components/prolink/site-shell";
import { siteConfig } from "@/config/site";

const figtree = Figtree({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-figtree",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["500", "600"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

const defaultTitle = `${siteConfig.name} | Hire local professionals in ${siteConfig.city}`;
const defaultDescription = `Post a household job in ${siteConfig.city}, compare itemised offers from local electricians, plumbers, AC technicians, and painters, and keep your phone number private until you accept an offer.`;

export const metadata: Metadata = {
  title: defaultTitle,
  description: defaultDescription,
  openGraph: {
    title: defaultTitle,
    description: defaultDescription,
    siteName: siteConfig.name,
    locale: "en_PK",
    type: "website",
  },
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
    <html lang="en" className={`${figtree.variable} ${jetbrainsMono.variable}`}>
      <head>
        <link rel="icon" href="/green-circular-logo.png?v=4" type="image/png" sizes="any" />
        <link rel="icon" href="/Green%20Circular%20P%20Logo-2.png?v=4" type="image/png" sizes="any" />
        <link rel="icon" href="/favicon.ico?v=4" sizes="any" />
        <link rel="shortcut icon" href="/green-circular-logo.png?v=4" type="image/png" />
        <link rel="apple-touch-icon" href="/apple-icon.png?v=4" />
      </head>
      <body>
        <SiteShell>{children}</SiteShell>
      </body>
    </html>
  );
}
