import {
Bell,
Briefcase,
ChevronDown,
Inbox,
LayoutDashboard,
LogOut,
Menu,
PlusCircle,
User,
X
} from 'lucide-react';
import Image from 'next/image';
import React,{ useEffect,useRef,useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { MOCK_NOTIFICATIONS } from '../../data/mockData';
import { marketplaceStore,useMarketplace } from '../../store/marketplaceStore';
import { Button } from '../ui/Button';

interface CustomerShellProps {
  children: React.ReactNode;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'U';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export const CustomerShell: React.FC<CustomerShellProps> = ({ children }) => {
  const { currentUser, currentPath, unreadNotifsCount } = useMarketplace();
  const [notifsOpen, setNotifsOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  const customerId = currentUser?.id || '';
  const defaultName = currentUser?.name || 'Customer';
  const customerEmail = currentUser?.email || '';

  const [displayName, setDisplayName] = useState(defaultName);
  const [avatarUrl, setAvatarUrl] = useState('');
  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    function handleProfileUpdated() {
      setRefreshTick((v) => v + 1);
    }
    window.addEventListener('prolink:customer-profile-updated', handleProfileUpdated);
    return () => {
      window.removeEventListener('prolink:customer-profile-updated', handleProfileUpdated);
    };
  }, []);

  useEffect(() => {
    if (!customerId) return;
    let active = true;
    const timer = setTimeout(() => {
      const supabase = createClient();
      void supabase
        .from('profiles')
        .select('full_name, avatar_url')
        .eq('id', customerId)
        .maybeSingle()
        .then((profRes) => {
          if (!active || !profRes.data) return;
          setDisplayName(profRes.data.full_name || defaultName);
          setAvatarUrl(profRes.data.avatar_url || '');
        });
    }, 0);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [customerId, defaultName, refreshTick]);

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
      if (event.key === 'Escape') {
        setProfileMenuOpen(false);
      }
    }

    if (profileMenuOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [profileMenuOpen]);

  const initials = getInitials(displayName);

  const navItems = [
    { label: 'Overview', path: '/user/overview', icon: LayoutDashboard },
    { label: 'Post a Job', path: '/user/post-job', icon: PlusCircle, highlight: true },
    { label: 'My Jobs', path: '/user/jobs', icon: Briefcase },
    { label: 'Offers Inbox', path: '/user/jobs/job-102', icon: Inbox },
   ];

  return (
    <div className="min-h-screen flex flex-col bg-white text-[#34453B]">
      {/* Top Navbar */}
      <div role="region" aria-label="Dashboard tools" className="bg-white border-b border-[#DCE8E0] h-16 flex items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
            className="lg:hidden p-1.5 text-[#34453B] hover:text-[#0C2A1B] cursor-pointer"
          >
            <Menu className="w-5 h-5" />
          </button>

          <button
            type="button"
            onClick={() => marketplaceStore.navigate('/user/overview')}
            aria-label="ProLink Dashboard"
            className="flex items-center gap-3 cursor-pointer focus:outline-none"
          >
            <Image
              src="/images/logo.png"
              alt="ProLink"
              width={144}
              height={40}
              priority
              className="h-8 w-auto object-contain"
              style={{ height: 'auto', width: 'auto', maxHeight: '36px' }}
            />
          </button>

          <span className="hidden sm:inline-block px-2 py-0.5 text-[11px] font-semibold text-[#0F6B3E] bg-[#E6F4EA] rounded-full border border-[#CDE9D6]">
            Customer Portal
          </span>
        </div>

        {/* Center / Right Links */}
        <div className="flex items-center gap-3 sm:gap-4">
          <nav className="hidden md:flex items-center gap-5 text-sm font-medium text-[#34453B]">
            <button
              onClick={() => marketplaceStore.navigate('/user/post-job')}
              className="hover:text-[#0F6B3E] transition-colors cursor-pointer"
            >
              Post a Job
            </button>
            <button
              onClick={() => marketplaceStore.navigate('/user/jobs')}
              className="hover:text-[#0F6B3E] transition-colors cursor-pointer"
            >
              My Jobs
            </button>
            <button
              onClick={() => marketplaceStore.addToast('Support & Help', 'Need help with your jobs or offers? Contact support@prolink.pk or call 051-111-776.', 'info')}
              className="hover:text-[#0F6B3E] transition-colors cursor-pointer"
            >
              Help
            </button>
          </nav>

          {/* Notifications Bell */}
          <div className="relative">
            <button
              onClick={() => setNotifsOpen(!notifsOpen)}
              className="relative p-2 text-[#34453B] hover:text-[#0C2A1B] hover:bg-[#F4FAF6] rounded-full cursor-pointer transition-colors"
            >
              <Bell className="w-5 h-5" />
              {unreadNotifsCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#B42318] ring-2 ring-white" />
              )}
            </button>

            {notifsOpen && (
              <div
                onMouseLeave={() => setNotifsOpen(false)}
                className="absolute right-0 top-full mt-2 w-80 bg-white rounded-[10px] border border-[#DCE8E0] shadow-xl p-3 z-50 animate-in fade-in"
              >
                <div className="flex items-center justify-between pb-2 border-b border-[#DCE8E0]">
                  <span className="text-xs font-bold text-[#0C2A1B]">Notifications</span>
                  <span className="text-[11px] text-[#0F6B3E] font-medium cursor-pointer">Mark all as read</span>
                </div>
                <div className="divide-y divide-[#F4FAF6] max-h-64 overflow-y-auto">
                  {MOCK_NOTIFICATIONS.filter(n => n.targetRole === 'customer').slice(0, 4).map((n) => (
                    <div
                      key={n.id}
                      onClick={() => {
                        setNotifsOpen(false);
                        if (n.link) marketplaceStore.navigate(n.link);
                      }}
                      className="py-2.5 px-1 hover:bg-[#F4FAF6] rounded cursor-pointer"
                    >
                      <h5 className="text-xs font-semibold text-[#0C2A1B]">{n.title}</h5>
                      <p className="text-[11px] text-[#6A7B70] line-clamp-2 mt-0.5">{n.message}</p>
                      <span className="text-[10px] text-[#A3B1A8] mt-1 block">{n.time}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Primary Action Button: Post a Job */}
          <Button
            variant="primary"
            size="sm"
            onClick={() => marketplaceStore.navigate('/user/post-job')}
            className="font-semibold shadow-xs"
          >
            <PlusCircle className="w-4 h-4 mr-1.5" />
            Post a Job
          </Button>

          {/* Round Profile Avatar & Dropdown Menu (Matching Admin Dashboard) */}
          <div className="relative" ref={profileMenuRef}>
            <button
              type="button"
              onClick={() => setProfileMenuOpen((v) => !v)}
              aria-expanded={profileMenuOpen}
              aria-haspopup="menu"
              aria-label="Customer profile menu"
              className="flex cursor-pointer items-center gap-2 rounded-full border border-[#DCE8E0] bg-white p-1 pr-2.5 transition hover:border-[#0F6B3E] hover:bg-[#F4FAF6] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F6B3E]"
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
                {displayName.split(' ')[0]}
              </span>
              <ChevronDown
                className={`h-3.5 w-3.5 text-[#6A7B70] transition-transform ${
                  profileMenuOpen ? 'rotate-180' : ''
                }`}
                aria-hidden="true"
              />
            </button>

            {profileMenuOpen && (
              <div
                role="menu"
                aria-label="Customer profile options"
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
                      {customerEmail || 'Customer'}
                    </p>
                  </div>
                </div>

                <div className="py-1">
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setProfileMenuOpen(false);
                      marketplaceStore.navigate('/user/profile');
                    }}
                    className="flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs font-medium text-[#0C2A1B] transition hover:bg-[#F4FAF6]"
                  >
                    <User className="h-4 w-4 text-[#0F6B3E]" aria-hidden="true" />
                    <span>Profile</span>
                  </button>
                </div>

                <div className="border-t border-[#DCE8E0] pt-1">
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setProfileMenuOpen(false);
                      marketplaceStore.setRole('guest');
                    }}
                    className="flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs font-semibold text-[#B42318] transition hover:bg-red-50"
                  >
                    <LogOut className="h-4 w-4" aria-hidden="true" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Layout: Left Sidebar + Workspace Content */}
      <div className="flex-1 flex w-full">
        {/* Left Sidebar (Desktop) */}
        <aside className="hidden lg:block w-64 border-r border-[#DCE8E0] py-6 px-4 space-y-1 shrink-0">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPath === item.path;

            return (
              <button
                key={item.label}
                onClick={() => marketplaceStore.navigate(item.path)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-[8px] text-xs font-medium transition-colors cursor-pointer text-left ${
                  isActive
                    ? 'bg-[#E6F4EA] text-[#0F6B3E] font-semibold'
                    : 'text-[#34453B] hover:bg-[#F4FAF6] hover:text-[#0C2A1B]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-[#0F6B3E]' : 'text-[#6A7B70]'}`} />
                  <span>{item.label}</span>
                </div>
                {item.highlight && (
                  <span className="w-1.5 h-1.5 rounded-full bg-[#0F6B3E]" />
                )}
              </button>
            );
          })}
        </aside>

        {/* Mobile Slide-in Drawer */}
        {mobileSidebarOpen && (
          <div className="fixed inset-0 z-50 lg:hidden flex">
            <div className="fixed inset-0 bg-black/40" onClick={() => setMobileSidebarOpen(false)} />
            <div className="relative w-64 max-w-xs bg-white h-full p-4 space-y-2 z-10 shadow-2xl flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-[#DCE8E0]">
                  <span className="font-bold text-[#0C2A1B]">Customer Menu</span>
                  <button onClick={() => setMobileSidebarOpen(false)}>
                    <X className="w-5 h-5 text-[#6A7B70]" />
                  </button>
                </div>
                <div className="space-y-1">
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = currentPath === item.path;
                    return (
                      <button
                        key={item.label}
                        onClick={() => {
                          setMobileSidebarOpen(false);
                          marketplaceStore.navigate(item.path);
                        }}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-[8px] text-xs font-medium transition-colors ${
                          isActive ? 'bg-[#E6F4EA] text-[#0F6B3E] font-semibold' : 'text-[#34453B]'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Main Content Viewport */}
        <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
};
