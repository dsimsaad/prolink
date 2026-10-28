"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { HomeNavbar } from "./home-navbar";
import { NavigationAccountProvider } from "./use-navigation-account";
import { TopProgressBar } from "./top-progress-bar";

function DashboardBackTrap({ pathname }: { pathname: string | null }) {
  useEffect(() => {
    if (!pathname) return;

    const isInsideDashboard =
      pathname === "/user" ||
      pathname.startsWith("/user/") ||
      pathname === "/admin" ||
      pathname.startsWith("/admin/");

    if (!isInsideDashboard) return;

    // Push a guard entry on the current dashboard URL so pressing the browser Back arrow
    // stays inside the dashboard instead of popping back to the landing or sign-in page.
    window.history.pushState({ prolinkDashboardGuard: true }, "", window.location.href);

    function handlePopState() {
      const currentPath = window.location.pathname;
      const stillInDashboard =
        currentPath === "/user" ||
        currentPath.startsWith("/user/") ||
        currentPath === "/admin" ||
        currentPath.startsWith("/admin/");

      if (stillInDashboard) {
        window.history.pushState(
          { prolinkDashboardGuard: true },
          "",
          window.location.href,
        );
      }
    }

    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [pathname]);

  return null;
}

export function SiteShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // The marketing navbar belongs strictly to the landing page and public marketing pages
  const isPublicPage =
    pathname === "/" ||
    pathname === "/services" ||
    pathname?.startsWith("/services/") ||
    pathname === "/features" ||
    pathname?.startsWith("/features/") ||
    pathname === "/about" ||
    pathname?.startsWith("/about/") ||
    pathname === "/faqs" ||
    pathname === "/faq" ||
    pathname === "/contact" ||
    pathname === "/contact-us";

  return (
    <NavigationAccountProvider>
      <TopProgressBar />
      <DashboardBackTrap pathname={pathname} />
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
