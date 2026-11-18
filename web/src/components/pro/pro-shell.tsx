"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
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
  AlertTriangle,
  BarChart3,
  Bell,
  Briefcase,
  ChevronDown,
  Compass,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  Star,
  User,
  Wrench,
  X,
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import type { ProfessionalAvailability } from "@/lib/pro/types";

export interface ProViewerContextValue {
  professionalId: string;
  professionalName: string;
  professionalEmail: string;
  availability: ProfessionalAvailability;
  unreadNotifications: number;
  setAvailabilityState: (next: ProfessionalAvailability) => void;
  refreshHeaderCounts: () => void;
}

const ProViewerContext = createContext<ProViewerContextValue>({
  professionalId: "",
  professionalName: "Professional",
  professionalEmail: "",
  availability: "available",
  unreadNotifications: 0,
  setAvailabilityState: () => {},
  refreshHeaderCounts: () => {},
});

export function useProViewer(): ProViewerContextValue {
  return useContext(ProViewerContext);
}

interface ProShellProps {
  professionalId: string;
  professionalName: string;
  professionalEmail: string;
  initialAvailability: ProfessionalAvailability;
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
  { label: "Overview", href: "/pro", icon: LayoutDashboard, exact: true },
  { label: "Opportunities", href: "/pro/opportunities", icon: Compass },
  { label: "My offers", href: "/pro/offers", icon: FileText },
  { label: "My jobs", href: "/pro/jobs", icon: Briefcase },
  { label: "Reviews", href: "/pro/reviews", icon: Star },
  { label: "Performance", href: "/pro/performance", icon: BarChart3 },
  {
    label: "Notifications",
    href: "/pro/notifications",
    icon: Bell,
    showUnreadBadge: true,
  },
  { label: "Messages", href: "/pro/messages", icon: MessageSquare },
];

const MOBILE_BOTTOM_ITEMS: NavItem[] = [
  { label: "Overview", href: "/pro", icon: LayoutDashboard, exact: true },
  { label: "Opportunities", href: "/pro/opportunities", icon: Compass },
  { label: "Offers", href: "/pro/offers", icon: FileText },
  { label: "My jobs", href: "/pro/jobs", icon: Briefcase },
  { label: "Profile", href: "/pro/profile", icon: User },
];

const AVAILABILITY_OPTIONS: {
  value: ProfessionalAvailability;
  label: string;
  dotColor: string;
}[] = [
  { value: "available", label: "Available", dotColor: "bg-emerald-500" },
  { value: "busy", label: "Busy", dotColor: "bg-amber-500" },
  { value: "offline", label: "Offline", dotColor: "bg-stone-400" },
];

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "P";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export function ProShell({
  professionalId,
  professionalName,
  professionalEmail,
  initialAvailability,
  initialUnreadNotifications,
  children,
}: ProShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  const [displayName, setDisplayName] = useState(professionalName);
  const [availability, setAvailability] =
    useState<ProfessionalAvailability>(initialAvailability);
  const [savingAvailability, setSavingAvailability] = useState(false);
  const [availabilityError, setAvailabilityError] = useState<string | null>(
    null
  );
  const [unreadCount, setUnreadCount] = useState(initialUnreadNotifications);
  const [refreshTick, setRefreshTick] = useState(0);

  const refreshHeaderCounts = useCallback(() => {
    setRefreshTick((v) => v + 1);
  }, []);

  useEffect(() => {
    if (!professionalId) return;
    let active = true;
    const supabase = createClient();

    const loadHeaderData = async () => {
      const [profileRes, proRes, notifRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("full_name")
          .eq("id", professionalId)
          .maybeSingle(),
        supabase
          .from("professional_profiles")
          .select("availability")
          .eq("profile_id", professionalId)
          .maybeSingle(),
        supabase
          .from("notifications")
          .select("id", { count: "exact", head: true })
          .eq("user_id", professionalId)
          .is("read_at", null),
      ]);

      if (!active) return;
      if (profileRes.data?.full_name) {
        setDisplayName(String(profileRes.data.full_name));
      }
      if (proRes.data?.availability) {
        const raw = String(proRes.data.availability);
        if (raw === "available" || raw === "busy" || raw === "offline") {
          setAvailability(raw);
        }
      }
      if (typeof notifRes.count === "number") {
        setUnreadCount(notifRes.count);
      }
    };

    void loadHeaderData();

    const channel = supabase
      .channel(`pro-notifications-${professionalId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${professionalId}`,
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
  }, [professionalId, refreshTick]);

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

  async function handleAvailabilityChange(next: ProfessionalAvailability) {
    if (next === availability || savingAvailability) return;
    const prev = availability;
    setAvailability(next);
    setAvailabilityError(null);
    setSavingAvailability(true);

    const supabase = createClient();
    const { error } = await supabase
      .from("professional_profiles")
      .update({ availability: next })
      .eq("profile_id", professionalId);

    setSavingAvailability(false);
    if (error) {
      setAvailability(prev);
      setAvailabilityError("Could not update availability.");
      return;
    }
    router.refresh();
  }

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
    return pathname === item.href || pathname.startsWith(`${item.href}/`);
  }

  function renderAvailabilityBox() {
    return (
      <div className="rounded-xl border border-[#B9DEC8] bg-[#F0F9F3] p-3 text-xs">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#0A4D2B]">
            Work availability
          </span>
          {savingAvailability && (
            <span className="text-[10px] font-medium text-[#0F6B3E]">
              Saving...
            </span>
          )}
        </div>

        <div
          role="group"
          aria-label="Work availability status"
          className="mt-2 grid grid-cols-3 gap-1 rounded-lg border border-[#DCE8E0] bg-white p-1"
        >
          {AVAILABILITY_OPTIONS.map((opt) => {
            const selected = availability === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                disabled={savingAvailability}
                onClick={() => void handleAvailabilityChange(opt.value)}
                aria-pressed={selected}
                className={`flex items-center justify-center gap-1 rounded-md px-1.5 py-1.5 text-[11px] font-semibold transition ${
                  selected
                    ? "bg-[#0F6B3E] !text-white text-white shadow-2xs"
                    : "text-[#34453B] hover:bg-[#F4FAF6]"
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    selected ? "bg-white" : opt.dotColor
                  }`}
                  aria-hidden="true"
                />
                <span className={selected ? "!text-white text-white" : ""}>
                  {opt.label}
                </span>
              </button>
            );
          })}
        </div>

        {(availability === "busy" || availability === "offline") && (
          <div
            role="status"
            className="mt-2 flex items-start gap-1.5 rounded-lg border border-amber-200 bg-amber-50 p-2 text-[11px] leading-snug text-amber-900"
          >
            <AlertTriangle
              className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-700"
              aria-hidden="true"
            />
            <span>
              While {availability}, you will not be matched or notified when new
              customer jobs are posted.
            </span>
          </div>
        )}

        {availabilityError && (
          <p className="mt-1.5 text-[11px] font-medium text-red-700">
            {availabilityError}
          </p>
        )}
      </div>
    );
  }

  function renderNavList(onSelect?: () => void) {
    return (
      <nav aria-label="Professional dashboard navigation" className="space-y-1">
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
                  ? "border-l-4 border-[#0F6B3E] bg-[#E6F4EA] font-semibold text-[#0A4D2B] shadow-2xs"
                  : "text-[#34453B] hover:bg-[#F4FAF6] hover:text-[#0C2A1B]"
              }`}
            >
              <span className="flex items-center gap-3">
                <IconComponent
                  className={`h-4 w-4 ${
                    active ? "text-[#0F6B3E]" : "text-[#6A7B70]"
                  }`}
                  aria-hidden="true"
                />
                <span>{item.label}</span>
              </span>
              {item.showUnreadBadge && unreadCount > 0 && (
                <span
                  aria-label={`${unreadCount} unread notifications`}
                  className="inline-flex min-w-5 items-center justify-center rounded-full bg-[#0F6B3E] px-1.5 py-0.5 text-[10px] font-bold !text-white text-white"
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
    <ProViewerContext.Provider
      value={{
        professionalId,
        professionalName: displayName,
        professionalEmail,
        availability,
        unreadNotifications: unreadCount,
        setAvailabilityState: setAvailability,
        refreshHeaderCounts,
      }}
    >
      <div className="min-h-screen flex flex-col bg-[#F5FAF7] text-[#0C2A1B] pb-16 lg:pb-0">
        {/* Top Header with Professional Mode Accent */}
        <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b-2 border-[#0F6B3E]/25 bg-white/95 backdrop-blur-md px-4 sm:px-6 lg:px-8 shadow-2xs">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileMenuOpen((v) => !v)}
              aria-expanded={mobileMenuOpen}
              aria-label={
                mobileMenuOpen
                  ? "Close navigation menu"
                  : "Open navigation menu"
              }
              className="rounded-lg border border-[#DCE8E0] p-2 text-[#0C2A1B] hover:bg-[#F4FAF6] lg:hidden focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F6B3E]"
            >
              {mobileMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </button>

            <Link
              href="/pro"
              aria-label="ProLink Professional Workspace"
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
              <span className="hidden sm:inline-flex items-center gap-1.5 rounded-md border border-[#0F6B3E]/30 bg-[#0A4D2B] px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider !text-white text-white">
                <Wrench className="h-3 w-3 !text-white text-white" aria-hidden="true" />
                <span className="!text-white text-white">Professional · Work</span>
              </span>
            </Link>
            <div role="group" aria-label="Workspace mode switch" className="hidden sm:inline-flex items-center rounded-xl border border-[#CDE9D6] bg-[#F4FAF6] p-1 text-sm font-bold shadow-sm">
              <Link href="/dashboard" className="rounded-lg px-3.5 py-1.5 text-[#34453B] transition hover:text-[#0C2A1B]">Hire</Link>
              <Link href="/pro" aria-current="page" className="rounded-lg bg-[#0F6B3E] px-3.5 py-1.5 !text-white text-white shadow-2xs">Work</Link>
            </div>
          </div>

          <div className="flex items-center gap-2.5 sm:gap-3">
            <Link
              href="/pro/opportunities"
              className="hidden md:inline-flex items-center gap-1.5 rounded-xl bg-[#0F6B3E] px-3.5 py-2 text-xs font-semibold !text-white text-white shadow-2xs transition hover:bg-[#0A4D2B] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F6B3E]"
            >
              <Compass
                className="h-3.5 w-3.5 !text-white text-white"
                aria-hidden="true"
              />
              <span className="!text-white text-white">Find opportunities</span>
            </Link>

            <Link
              href="/pro/notifications"
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
                aria-label="Open professional account menu"
                className="flex items-center gap-2 rounded-full border border-[#DCE8E0] bg-white p-1 pr-2.5 text-xs font-semibold text-[#0C2A1B] shadow-2xs transition hover:border-[#0F6B3E]/40 hover:bg-[#F4FAF6] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F6B3E]"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#0A4D2B] text-[11px] font-bold !text-white text-white">
                  {initials}
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
                    {professionalEmail && (
                      <p className="mt-0.5 truncate text-[11px] text-[#6A7B70]">
                        {professionalEmail}
                      </p>
                    )}
                  </div>

                  <div className="py-1">
                    <Link
                      href="/pro/profile"
                      role="menuitem"
                      onClick={() => setProfileMenuOpen(false)}
                      className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-[#34453B] transition hover:bg-[#F4FAF6] hover:text-[#0C2A1B]"
                    >
                      <User
                        className="h-4 w-4 text-[#0F6B3E]"
                        aria-hidden="true"
                      />
                      <span>Professional profile</span>
                    </Link>

                  </div>

                  <div className="border-t border-[#DCE8E0] pt-1">
                    <button
                      type="button"
                      role="menuitem"
                      onClick={handleSignOut}
                      className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs font-semibold text-red-700 transition hover:bg-red-50"
                    >
                      <LogOut
                        className="h-4 w-4 text-red-600"
                        aria-hidden="true"
                      />
                      <span>Sign out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="flex flex-1">
          {/* Desktop Sidebar with subtle green accent */}
          <aside className="hidden w-68 shrink-0 border-r border-[#CDE9D6] bg-white lg:flex lg:flex-col lg:justify-between lg:p-4">
            <div className="space-y-4">
              {/* Compact Availability Toggle */}
              {renderAvailabilityBox()}

              {renderNavList()}
            </div>

          </aside>

          {/* Mobile Drawer */}
          {mobileMenuOpen && (
            <div
              className="fixed inset-0 z-50 lg:hidden"
              role="dialog"
              aria-modal="true"
            >
              <div
                className="fixed inset-0 bg-black/40"
                onClick={() => setMobileMenuOpen(false)}
              />
              <div className="fixed inset-y-0 left-0 flex w-76 max-w-[85vw] flex-col justify-between overflow-y-auto bg-white p-4 shadow-xl">
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-[#DCE8E0] pb-3">
                    <span className="text-sm font-bold text-[#0C2A1B]">
                      Professional Menu
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

                  {renderAvailabilityBox()}

                  {renderNavList(() => setMobileMenuOpen(false))}
                </div>
              </div>
            </div>
          )}

          <main className="flex-1 min-w-0 px-4 py-6 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-6xl">{children}</div>
          </main>
        </div>

        {/* Mobile Bottom Tab Bar */}
        <nav
          aria-label="Mobile professional quick navigation"
          className="fixed bottom-0 inset-x-0 z-30 flex items-center justify-around border-t border-[#DCE8E0] bg-white/95 backdrop-blur-md px-2 py-1.5 lg:hidden"
        >
          {MOBILE_BOTTOM_ITEMS.map((item) => {
            const IconComponent = item.icon;
            const active = isItemActive(item);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`relative flex flex-col items-center gap-0.5 rounded-lg px-2.5 py-1 text-[10px] font-semibold transition ${
                  active
                    ? "text-[#0F6B3E]"
                    : "text-[#6A7B70] hover:text-[#0C2A1B]"
                }`}
              >
                <IconComponent className="h-4 w-4" aria-hidden="true" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </ProViewerContext.Provider>
  );
}
