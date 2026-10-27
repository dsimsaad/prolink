"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createContext, useContext, useState, type ReactNode } from "react";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Briefcase,
  CheckSquare,
  FolderTree,
  LayoutDashboard,
  LogOut,
  Menu,
  Radio,
  ScrollText,
  Shield,
  Users,
  X,
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";

export interface AdminViewerContextValue {
  adminId: string;
  adminName: string;
  adminEmail: string;
}

const AdminViewerContext = createContext<AdminViewerContextValue>({
  adminId: "",
  adminName: "Administrator",
  adminEmail: "",
});

export function useAdminViewer(): AdminViewerContextValue {
  return useContext(AdminViewerContext);
}

interface NavItem {
  label: string;
  href: string;
  icon: typeof LayoutDashboard;
  disabled?: boolean;
  badgeText?: string;
}

const NAV_ITEMS: NavItem[] = [
  { label: "Overview", href: "/admin", icon: LayoutDashboard },
  { label: "Applications", href: "/admin/applications", icon: CheckSquare },
  { label: "Users", href: "/admin/users", icon: Users },
  { label: "Categories", href: "/admin/categories", icon: FolderTree },
  { label: "Jobs", href: "/admin/jobs", icon: Briefcase },
  { label: "Disputes", href: "/admin/disputes", icon: AlertTriangle },
  { label: "Reports", href: "/admin/reports", icon: Activity },
  { label: "Audit log", href: "/admin/audit", icon: ScrollText },
  { label: "Analytics", href: "/admin/analytics", icon: BarChart3 },
  {
    label: "Network health",
    href: "/admin/network",
    icon: Radio,
    disabled: true,
    badgeText: "Coming soon",
  },
];

interface AdminShellProps {
  adminId: string;
  adminName: string;
  adminEmail: string;
  children: ReactNode;
}

export function AdminShell({
  adminId,
  adminName,
  adminEmail,
  children,
}: AdminShellProps) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.replace("/sign-in");
  }

  function renderNavList(onSelect?: () => void) {
    return (
      <nav aria-label="Admin navigation" className="space-y-1">
        {NAV_ITEMS.map((item) => {
          const IconComponent = item.icon;
          const isActive =
            item.href === "/admin"
              ? pathname === "/admin"
              : pathname === item.href || pathname.startsWith(`${item.href}/`);

          if (item.disabled) {
            return (
              <div
                key={item.href}
                aria-disabled="true"
                title="Computer Networks module coming soon"
                className="flex cursor-not-allowed items-center justify-between rounded-lg px-3 py-2.5 text-xs font-medium text-[#6A7B70] opacity-70"
              >
                <span className="flex items-center gap-3">
                  <IconComponent className="h-4 w-4 text-[#6A7B70]" aria-hidden="true" />
                  <span>{item.label}</span>
                </span>
                {item.badgeText && (
                  <span className="rounded-full border border-[#DCE8E0] bg-[#F4FAF6] px-2 py-0.5 text-[10px] font-semibold text-[#34453B]">
                    {item.badgeText}
                  </span>
                )}
              </div>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onSelect}
              aria-current={isActive ? "page" : undefined}
              className={`flex items-center justify-between rounded-lg px-3 py-2.5 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F6B3E] ${
                isActive
                  ? "bg-[#E6F4EA] font-semibold text-[#0F6B3E]"
                  : "text-[#34453B] hover:bg-[#F4FAF6] hover:text-[#0C2A1B]"
              }`}
            >
              <span className="flex items-center gap-3">
                <IconComponent
                  className={`h-4 w-4 ${isActive ? "text-[#0F6B3E]" : "text-[#6A7B70]"}`}
                  aria-hidden="true"
                />
                <span>{item.label}</span>
              </span>
            </Link>
          );
        })}
      </nav>
    );
  }

  return (
    <AdminViewerContext.Provider value={{ adminId, adminName, adminEmail }}>
      <div className="min-h-screen flex flex-col bg-[#F8FBF9] text-[#0C2A1B]">
        <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-[#DCE8E0] bg-white px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileMenuOpen((v) => !v)}
              aria-expanded={mobileMenuOpen}
              aria-label={mobileMenuOpen ? "Close admin sidebar" : "Open admin sidebar"}
              className="rounded-lg border border-[#DCE8E0] p-2 text-[#0C2A1B] hover:bg-[#F4FAF6] lg:hidden focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F6B3E]"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>

            <Link
              href="/admin"
              className="flex items-center gap-2.5 text-base font-extrabold tracking-tight text-[#0C2A1B] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F6B3E]"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#0F6B3E] text-white">
                <Shield className="h-4 w-4" aria-hidden="true" />
              </span>
              <span>ProLink</span>
              <span className="rounded-full border border-[#CDE9D6] bg-[#E6F4EA] px-2.5 py-0.5 text-[11px] font-semibold text-[#0F6B3E]">
                Admin Portal
              </span>
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <div className="text-xs font-bold text-[#0C2A1B]">{adminName}</div>
              <div className="text-[11px] text-[#6A7B70]">{adminEmail || "Administrator"}</div>
            </div>
            <Link
              href="/user"
              className="rounded-lg border border-[#DCE8E0] bg-white px-3 py-1.5 text-xs font-semibold text-[#0C2A1B] transition hover:bg-[#F4FAF6] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F6B3E]"
            >
              User Portal
            </Link>
            <button
              type="button"
              onClick={handleSignOut}
              className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-800 transition hover:bg-red-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700"
            >
              <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Sign out</span>
            </button>
          </div>
        </header>

        <div className="mx-auto flex w-full max-w-7xl flex-1">
          <aside className="hidden w-64 shrink-0 border-r border-[#DCE8E0] bg-white px-4 py-6 lg:block">
            {renderNavList()}
          </aside>

          {mobileMenuOpen && (
            <div className="fixed inset-0 z-50 flex lg:hidden">
              <div
                className="fixed inset-0 bg-black/40"
                onClick={() => setMobileMenuOpen(false)}
                aria-hidden="true"
              />
              <div className="relative z-10 flex h-full w-64 max-w-xs flex-col justify-between bg-white p-4 shadow-2xl">
                <div>
                  <div className="mb-4 flex items-center justify-between border-b border-[#DCE8E0] pb-3">
                    <span className="text-sm font-bold text-[#0C2A1B]">Admin Navigation</span>
                    <button
                      type="button"
                      onClick={() => setMobileMenuOpen(false)}
                      aria-label="Close navigation menu"
                      className="rounded-lg p-1 text-[#6A7B70] hover:bg-[#F4FAF6]"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                  {renderNavList(() => setMobileMenuOpen(false))}
                </div>
              </div>
            </div>
          )}

          <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
        </div>
      </div>
    </AdminViewerContext.Provider>
  );
}
