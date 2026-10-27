"use client";

import { usePathname } from "next/navigation";
import { HomeNavbar } from "./home-navbar";
import { NavigationAccountProvider } from "./use-navigation-account";

export function SiteShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // The marketing navbar belongs strictly to the landing page and public marketing pages
  const isPublicPage =
    pathname === "/" ||
    pathname === "/services" ||
    pathname?.startsWith("/services/") ||
    pathname === "/faqs" ||
    pathname === "/faq" ||
    pathname === "/contact" ||
    pathname === "/contact-us";

  return (
    <NavigationAccountProvider>
      <a className="skip-link" href="#page-content">
        Skip to content
      </a>
      {isPublicPage && <HomeNavbar />}
      <div id="page-content" tabIndex={-1}>
        {children}
      </div>
    </NavigationAccountProvider>
  );
}
