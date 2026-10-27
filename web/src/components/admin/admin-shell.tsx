"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Briefcase,
  CheckSquare,
  ChevronDown,
  FolderTree,
  LayoutDashboard,
  LogOut,
  Menu,
  Radio,
  ScrollText,
  User,
  Users,
  X,
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";

export interface AdminViewerContextValue {
  adminId: string;
  adminName: string;
  adminEmail: string;
  refreshProfile?: () => void;
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

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "A";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export function AdminShell({
  adminId,
  adminName,
  adminEmail,
  children,
}: AdminShellProps) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  const [displayName, setDisplayName] = useState(adminName);
  const [avatarUrl, setAvatarUrl] = useState("");
  const [refreshTick, setRefreshTick] = useState(0);

  const refreshProfile = useCallback(() => {
    setRefreshTick((v) => v + 1);
  }, []);

  useEffect(() => {
    if (!adminId) return;
    let active = true;
    const timer = setTimeout(() => {
      const supabase = createClient();
      void supabase
        .from("profiles")
        .select("full_name, avatar_url")
        .eq("id", adminId)
        .maybeSingle()
        .then((profRes) => {
          if (!active || !profRes.data) return;
          setDisplayName(profRes.data.full_name || adminName);
          setAvatarUrl(profRes.data.avatar_url || "");
        });
    }, 0);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [adminId, adminName, refreshTick]);

  // Close profile dropdown on outside click or Escape key
  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (
        profileMenuRef.current &&
        !profileMenuRef.current.contains(event.target as Node)
      ) {
        setProfileMenuOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setProfileMenuOpen(false);
      }
    }

    if (profileMenuOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [profileMenuOpen]);

  async function handleSignOut() {
    setProfileMenuOpen(false);
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

  const initials = getInitials(displayName);

  return (
    <AdminViewerContext.Provider
      value={{ adminId, adminName: displayName, adminEmail, refreshProfile }}
    >
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
              aria-label="ProLink Admin Portal"
              className="flex items-center gap-3 text-base font-extrabold tracking-tight text-[#0C2A1B] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F6B3E]"
            >
              <Image
                src="/images/logo.png"
                alt="ProLink"
                width={144}
                height={40}
                priority
                className="h-8 w-auto object-contain"
                style={{ height: "auto", width: "auto", maxHeight: "36px" }}
              />
              <span className="rounded-full border border-[#CDE9D6] bg-[#E6F4EA] px-2.5 py-0.5 text-[11px] font-semibold text-[#0F6B3E]">
                Admin Portal
              </span>
            </Link>
          </div>

          {/* Round Profile Avatar & Dropdown Menu */}
          <div className="relative" ref={profileMenuRef}>
            <button
              type="button"
              onClick={() => setProfileMenuOpen((v) => !v)}
              aria-expanded={profileMenuOpen}
              aria-haspopup="menu"
              aria-label="Admin profile menu"
              className="flex items-center gap-2 rounded-full border border-[#DCE8E0] bg-white p-1 pr-2.5 transition hover:border-[#0F6B3E] hover:bg-[#F4FAF6] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F6B3E]"
            >
              <span className="relative inline-flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#0F6B3E] text-xs font-bold text-white">
                {avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={avatarUrl}
                    alt={displayName}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  initials
                )}
                <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-[#2FAE60] ring-2 ring-white" />
              </span>
              <span className="hidden max-w-[140px] truncate text-xs font-semibold text-[#0C2A1B] sm:inline">
                {displayName.split(" ")[0]}
              </span>
              <ChevronDown
                className={`h-3.5 w-3.5 text-[#6A7B70] transition-transform ${
                  profileMenuOpen ? "rotate-180" : ""
                }`}
                aria-hidden="true"
              />
            </button>

            {profileMenuOpen && (
              <div
                role="menu"
                aria-label="Administrator profile options"
                className="absolute right-0 top-full z-50 mt-2 w-60 rounded-xl border border-[#DCE8E0] bg-white p-2 shadow-xl"
              >
                <div className="flex items-center gap-3 border-b border-[#DCE8E0] px-3 py-2.5">
                  <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#0F6B3E] text-xs font-bold text-white">
                    {avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={avatarUrl}
                        alt={displayName}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      initials
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-bold text-[#0C2A1B]">
                      {displayName}
                    </p>
                    <p className="truncate text-[11px] text-[#6A7B70]">
                      {adminEmail || "Administrator"}
                    </p>
                  </div>
                </div>

                <div className="py-1">
                  <Link
                    href="/admin/profile"
                    role="menuitem"
                    onClick={() => setProfileMenuOpen(false)}
                    className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs font-medium text-[#0C2A1B] transition hover:bg-[#F4FAF6]"
                  >
                    <User className="h-4 w-4 text-[#0F6B3E]" aria-hidden="true" />
                    <span>Profile</span>
                  </Link>
                </div>

                <div className="border-t border-[#DCE8E0] pt-1">
                  <button
                    type="button"
                    role="menuitem"
                    onClick={handleSignOut}
                    className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs font-semibold text-[#B42318] transition hover:bg-red-50"
                  >
                    <LogOut className="h-4 w-4" aria-hidden="true" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </header>

        <div className="flex w-full flex-1">
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
