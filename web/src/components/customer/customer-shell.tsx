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
  Bell,
  Briefcase,
  ChevronDown,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  PlusCircle,
  Shield,
  Sparkles,
  User,
  X,
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import type { ProfessionalState } from "@/utils/professional";

export interface CustomerViewerContextValue {
  customerId: string;
  customerName: string;
  customerEmail: string;
  role: "user" | "admin";
  professionalState: ProfessionalState;
  reviewNote: string | null;
  unreadNotifications: number;
  refreshHeaderCounts: () => void;
}

const CustomerViewerContext = createContext<CustomerViewerContextValue>({
  customerId: "",
  customerName: "Customer",
  customerEmail: "",
  role: "user",
  professionalState: "none",
  reviewNote: null,
  unreadNotifications: 0,
  refreshHeaderCounts: () => {},
});

export function useCustomerViewer(): CustomerViewerContextValue {
  return useContext(CustomerViewerContext);
}

interface CustomerShellProps {
  customerId: string;
  customerName: string;
  customerEmail: string;
  role: "user" | "admin";
  professionalState: ProfessionalState;
  reviewNote: string | null;
  initialUnreadNotifications: number;
  children: ReactNode;
}

interface NavItem {
  label: string;
  href: string;
  icon: typeof LayoutDashboard;
  exact?: boolean;
  showUnreadBadge?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { label: "Overview", href: "/dashboard", icon: LayoutDashboard, exact: true },
  { label: "Post a job", href: "/dashboard/jobs/new", icon: PlusCircle, exact: true },
  { label: "My jobs", href: "/dashboard/jobs", icon: Briefcase },
  {
    label: "Notifications",
    href: "/dashboard/notifications",
    icon: Bell,
    showUnreadBadge: true,
  },
  { label: "Messages", href: "/dashboard/messages", icon: MessageSquare },
];

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "U";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function SidebarProCta({
  state,
  reviewNote,
  onNavigate,
}: {
  state: ProfessionalState;
  reviewNote: string | null;
  onNavigate?: () => void;
}) {
  if (state === "suspended" || state === "approved") {
    return null;
  }

  if (state === "pending") {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-3.5 text-xs text-amber-950">
        <p className="font-bold text-amber-900">Application under review</p>
        <p className="mt-1 text-[11px] leading-relaxed text-amber-800">
          Your professional application is being reviewed by an administrator.
        </p>
        <Link
          href="/become-professional/submitted"
          onClick={onNavigate}
          className="mt-2.5 inline-flex items-center font-semibold text-[#0F6B3E] underline-offset-2 hover:underline"
        >
          View application status →
        </Link>
      </div>
    );
  }

  if (state === "rejected") {
    return (
      <div className="rounded-xl border border-amber-300 bg-amber-50 p-3.5 text-xs text-amber-950">
        <p className="font-bold text-amber-900">Application rejected</p>
        <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-amber-800">
          {reviewNote
            ? `Note: "${reviewNote}"`
            : "Review the feedback on your application and submit updated details."}
        </p>
        <Link
          href="/become-professional"
          onClick={onNavigate}
          className="mt-2.5 inline-flex items-center font-semibold text-[#0F6B3E] underline-offset-2 hover:underline"
        >
          View note and reapply →
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[#DCE8E0] bg-[#F4FAF6] p-3.5 text-xs text-[#0C2A1B]">
      <p className="font-bold text-[#0C2A1B]">Earn with your skills</p>
      <p className="mt-1 text-[11px] leading-relaxed text-[#34453B]">
        Apply as a local professional in Lahore and send quotes on customer jobs.
      </p>
      <Link
        href="/become-professional"
        onClick={onNavigate}
        className="mt-2.5 inline-flex w-full items-center justify-center rounded-lg bg-[#0F6B3E] px-3 py-2 text-xs font-semibold !text-white text-white transition hover:bg-[#0A4D2B] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F6B3E]"
      >
        <span className="!text-white text-white">Apply as a professional</span>
      </Link>
    </div>
  );
}

export function CustomerShell({
  customerId,
  customerName,
  customerEmail,
  role,
  professionalState,
  reviewNote,
  initialUnreadNotifications,
  children,
}: CustomerShellProps) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  const [displayName, setDisplayName] = useState(customerName);
  const [unreadCount, setUnreadCount] = useState(initialUnreadNotifications);
  const [refreshTick, setRefreshTick] = useState(0);

  const refreshHeaderCounts = useCallback(() => {
    setRefreshTick((v) => v + 1);
  }, []);

  useEffect(() => {
    if (!customerId) return;
    let active = true;
    const supabase = createClient();

    const loadHeaderData = async () => {
      const [profileRes, notifRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("full_name")
          .eq("id", customerId)
          .maybeSingle(),
        supabase
          .from("notifications")
          .select("id", { count: "exact", head: true })
          .eq("user_id", customerId)
          .is("read_at", null),
      ]);

      if (!active) return;
      if (profileRes.data?.full_name) {
        setDisplayName(profileRes.data.full_name);
      }
      if (typeof notifRes.count === "number") {
        setUnreadCount(notifRes.count);
      }
    };

    void loadHeaderData();

    // Subscribe to live notification inserts and read_at updates for this customer
    const channel = supabase
      .channel(`customer-notifications-${customerId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${customerId}`,
        },
        () => {
          void loadHeaderData();
        }
      )
      .subscribe();

    return () => {
      active = false;
      void supabase.removeChannel(channel);
    };
  }, [customerId, refreshTick]);

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
    window.location.replace("/");
  }

  function isItemActive(item: NavItem): boolean {
    if (item.exact) {
      return pathname === item.href;
    }
    if (item.href === "/dashboard/jobs") {
      return (
        pathname === "/dashboard/jobs" ||
        (pathname.startsWith("/dashboard/jobs/") &&
          pathname !== "/dashboard/jobs/new")
      );
    }
    return pathname === item.href || pathname.startsWith(`${item.href}/`);
  }

  function renderNavList(onSelect?: () => void) {
    return (
      <nav aria-label="Customer dashboard navigation" className="space-y-1">
        {NAV_ITEMS.map((item) => {
          const IconComponent = item.icon;
          const active = isItemActive(item);

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onSelect}
              aria-current={active ? "page" : undefined}
              className={`flex items-center justify-between rounded-xl px-3 py-2.5 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F6B3E] ${
                active
                  ? "bg-[#E6F4EA] font-semibold text-[#0F6B3E] shadow-2xs"
                  : "text-[#34453B] hover:bg-[#F4FAF6] hover:text-[#0C2A1B]"
              }`}
            >
              <span className="flex items-center gap-3">
                <IconComponent
                  className={`h-4 w-4 ${active ? "text-[#0F6B3E]" : "text-[#6A7B70]"}`}
                  aria-hidden="true"
                />
                <span>{item.label}</span>
              </span>
              {item.showUnreadBadge && unreadCount > 0 && (
                <span
                  aria-label={`${unreadCount} unread notifications`}
                  className="inline-flex min-w-5 items-center justify-center rounded-full bg-[#0F6B3E] px-1.5 py-0.5 text-[10px] font-bold text-white"
                >
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
    );
  }

  const initials = getInitials(displayName);

  return (
    <CustomerViewerContext.Provider
      value={{
        customerId,
        customerName: displayName,
        customerEmail,
        role,
        professionalState,
        reviewNote,
        unreadNotifications: unreadCount,
        refreshHeaderCounts,
      }}
    >
      <div className="min-h-screen flex flex-col bg-[#F8FBF9] text-[#0C2A1B] pb-16 lg:pb-0">
        <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-[#DCE8E0] bg-white/95 backdrop-blur-md px-4 sm:px-6 lg:px-8 shadow-2xs">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileMenuOpen((v) => !v)}
              aria-expanded={mobileMenuOpen}
              aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
              className="rounded-lg border border-[#DCE8E0] p-2 text-[#0C2A1B] hover:bg-[#F4FAF6] lg:hidden focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F6B3E]"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>

            <Link
              href="/dashboard"
              aria-label="ProLink Customer Dashboard"
              className="flex items-center gap-3 text-base font-extrabold tracking-tight text-[#0C2A1B] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F6B3E]"
            >
              <Image
                src="/images/logo.png"
                alt="ProLink"
                width={140}
                height={38}
                className="h-8 w-auto object-contain"
                priority
              />
              <span className="hidden sm:inline-flex items-center rounded-md border border-[#DCE8E0] bg-[#F4FAF6] px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-[#0F6B3E]">
                Customer
              </span>
            </Link>
          </div>

          <div className="flex items-center gap-2.5 sm:gap-3">
            <Link
              href="/dashboard/jobs/new"
              className="hidden sm:inline-flex items-center gap-1.5 rounded-xl bg-[#0F6B3E] px-3.5 py-2 text-xs font-semibold !text-white text-white shadow-2xs transition hover:bg-[#0A4D2B] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F6B3E]"
            >
              <PlusCircle className="h-3.5 w-3.5 !text-white text-white" aria-hidden="true" />
              <span className="!text-white text-white">Post a job</span>
            </Link>

            <Link
              href="/dashboard/notifications"
              aria-label={
                unreadCount > 0
                  ? `Notifications (${unreadCount} unread)`
                  : "Notifications"
              }
              className="relative inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[#DCE8E0] bg-white text-[#34453B] transition hover:bg-[#F4FAF6] hover:text-[#0C2A1B] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F6B3E]"
            >
              <Bell className="h-4 w-4" aria-hidden="true" />
              {unreadCount > 0 && (
                <span className="absolute -right-1 -top-1 inline-flex min-w-4 items-center justify-center rounded-full bg-[#0F6B3E] px-1 text-[10px] font-bold !text-white text-white">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </Link>

            <div className="relative" ref={profileMenuRef}>
              <button
                type="button"
                onClick={() => setProfileMenuOpen((v) => !v)}
                aria-expanded={profileMenuOpen}
                aria-haspopup="menu"
                aria-label="Open customer account menu"
                className="flex items-center gap-2.5 rounded-full border border-[#DCE8E0] bg-white py-1 pl-1.5 pr-3 text-xs font-semibold text-[#0C2A1B] shadow-2xs transition hover:border-[#0F6B3E]/40 hover:bg-[#F4FAF6] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F6B3E]"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#0F6B3E] text-[11px] font-bold !text-white text-white">
                  {initials}
                </span>
                <span className="hidden max-w-[140px] truncate sm:inline-block">
                  {displayName}
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
                  aria-label="Account options"
                  className="absolute right-0 mt-2 w-60 rounded-2xl border border-[#DCE8E0] bg-white p-1.5 shadow-xl z-50"
                >
                  <div className="border-b border-[#DCE8E0] px-3 py-2.5">
                    <p className="truncate text-xs font-bold text-[#0C2A1B]">
                      {displayName}
                    </p>
                    {customerEmail && (
                      <p className="mt-0.5 truncate text-[11px] text-[#6A7B70]">
                        {customerEmail}
                      </p>
                    )}
                  </div>

                  <div className="py-1">
                    <Link
                      href="/dashboard/profile"
                      role="menuitem"
                      onClick={() => setProfileMenuOpen(false)}
                      className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-[#34453B] transition hover:bg-[#F4FAF6] hover:text-[#0C2A1B]"
                    >
                      <User className="h-4 w-4 text-[#0F6B3E]" aria-hidden="true" />
                      <span>Profile & settings</span>
                    </Link>

                    {role === "admin" && (
                      <Link
                        href="/admin"
                        role="menuitem"
                        onClick={() => setProfileMenuOpen(false)}
                        className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-[#34453B] transition hover:bg-[#F4FAF6] hover:text-[#0C2A1B]"
                      >
                        <Shield className="h-4 w-4 text-[#0F6B3E]" aria-hidden="true" />
                        <span>Admin portal</span>
                      </Link>
                    )}
                  </div>

                  <div className="border-t border-[#DCE8E0] pt-1">
                    <button
                      type="button"
                      role="menuitem"
                      onClick={handleSignOut}
                      className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs font-semibold text-red-700 transition hover:bg-red-50"
                    >
                      <LogOut className="h-4 w-4 text-red-600" aria-hidden="true" />
                      <span>Sign out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="flex flex-1">
          <aside className="hidden w-64 shrink-0 border-r border-[#DCE8E0] bg-white lg:flex lg:flex-col lg:justify-between lg:p-4">
            <div className="space-y-6">
              {renderNavList()}
            </div>
            {professionalState !== "approved" && professionalState !== "suspended" && (
              <div className="mt-6 pt-4 border-t border-[#DCE8E0]">
                <SidebarProCta state={professionalState} reviewNote={reviewNote} />
              </div>
            )}
          </aside>

          {mobileMenuOpen && (
            <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
              <div
                className="fixed inset-0 bg-black/40"
                onClick={() => setMobileMenuOpen(false)}
              />
              <div className="fixed inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col justify-between bg-white p-4 shadow-xl">
                <div>
                  <div className="mb-4 flex items-center justify-between border-b border-[#DCE8E0] pb-3">
                    <span className="text-sm font-bold text-[#0C2A1B]">
                      Customer Menu
                    </span>
                    <button
                      type="button"
                      onClick={() => setMobileMenuOpen(false)}
                      aria-label="Close navigation menu"
                      className="rounded-lg p-1.5 text-[#6A7B70] hover:bg-[#F4FAF6]"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  {renderNavList(() => setMobileMenuOpen(false))}
                </div>
                {professionalState !== "approved" && professionalState !== "suspended" && (
                  <div className="mt-6 border-t border-[#DCE8E0] pt-4">
                    <SidebarProCta
                      state={professionalState}
                      reviewNote={reviewNote}
                      onNavigate={() => setMobileMenuOpen(false)}
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          <main className="flex-1 min-w-0 px-4 py-6 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-6xl">{children}</div>
          </main>
        </div>

        {/* Mobile bottom tab bar */}
        <nav
          aria-label="Mobile quick navigation"
          className="fixed bottom-0 inset-x-0 z-30 flex items-center justify-around border-t border-[#DCE8E0] bg-white/95 backdrop-blur-md px-2 py-1.5 lg:hidden"
        >
          {NAV_ITEMS.slice(0, 5).map((item) => {
            const IconComponent = item.icon;
            const active = isItemActive(item);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`relative flex flex-col items-center gap-0.5 rounded-lg px-2.5 py-1 text-[10px] font-semibold transition ${
                  active ? "text-[#0F6B3E]" : "text-[#6A7B70] hover:text-[#0C2A1B]"
                }`}
              >
                <IconComponent className="h-4 w-4" aria-hidden="true" />
                <span>{item.label}</span>
                {item.showUnreadBadge && unreadCount > 0 && (
                  <span className="absolute right-1.5 top-0.5 h-2 w-2 rounded-full bg-[#0F6B3E]" />
                )}
              </Link>
            );
          })}
        </nav>
      </div>
    </CustomerViewerContext.Provider>
  );
}
