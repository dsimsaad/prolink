"use client";

import { usePathname } from "next/navigation";
import { HomeNavbar } from "./home-navbar";
import { NavigationAccountProvider } from "./use-navigation-account";

export function SiteShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthPage =
    pathname === "/sign-in" ||
    pathname === "/sign-up" ||
    pathname?.startsWith("/sign-in/") ||
    pathname?.startsWith("/sign-up/");

  return (
    <NavigationAccountProvider>
      <a className="skip-link" href="#page-content">
        Skip to content
      </a>
      {!isAuthPage && <HomeNavbar />}
      <div id="page-content" tabIndex={-1}>
        {children}
      </div>
    </NavigationAccountProvider>
  );
}
