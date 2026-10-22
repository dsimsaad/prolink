"use client";

import { HomeNavbar } from './home-navbar';
import { NavigationAccountProvider } from './use-navigation-account';

export function SiteShell({ children }: { children: React.ReactNode }) {
  return (
    <NavigationAccountProvider>
      <a className="skip-link" href="#page-content">Skip to content</a>
      <HomeNavbar />
      <div id="page-content" tabIndex={-1}>{children}</div>
    </NavigationAccountProvider>
  );
}
