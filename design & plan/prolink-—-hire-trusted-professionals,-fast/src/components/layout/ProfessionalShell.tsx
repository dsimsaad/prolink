import React, { useState } from 'react';
import { useMarketplace, marketplaceStore } from '../../store/marketplaceStore';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';
import {
  LayoutDashboard,
  Compass,
  FileCheck,
  Hammer,
  Calendar,
  MessageSquare,
  DollarSign,
  Star,
  User as UserIcon,
  TrendingUp,
  ShieldCheck,
  GraduationCap,
  Settings,
  Bell,
  LogOut,
  ChevronDown,
  Menu,
  X,
  Power
} from 'lucide-react';
import { MOCK_NOTIFICATIONS } from '../../data/mockData';

interface ProfessionalShellProps {
  children: React.ReactNode;
}

export const ProfessionalShell: React.FC<ProfessionalShellProps> = ({ children }) => {
  const { currentUser, currentPath, unreadNotifsCount } = useMarketplace();
  const [notifsOpen, setNotifsOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(true);

  const pro = currentUser || {
    name: 'Tariq Mehmood',
    email: 'tariq.m.services@gmail.com',
    avatar: '/src/assets/images/pro_electrician_headshot_1791024696030.jpg',
    city: 'Islamabad',
    area: 'G-9/1',
    category: 'Electrical',
    rating: 4.94,
    level: 'top_rated'
  };

  const navItems = [
    { label: 'Overview', path: '/pro/overview', icon: LayoutDashboard },
    { label: 'Job Feed', path: '/pro/feed', icon: Compass, badge: '4 New' },
    { label: 'Job Details & Offer', path: '/pro/feed/job-103', icon: Hammer },
    { label: 'My Offers', path: '/pro/offers', icon: FileCheck },
    { label: 'Active Jobs', path: '/pro/active', icon: Hammer, highlight: true },
    { label: 'Schedule & Calendar', path: '/pro/schedule', icon: Calendar },
    { label: 'Client Messages', path: '/pro/messages', icon: MessageSquare },
    { label: 'Earnings & Payouts', path: '/pro/earnings', icon: DollarSign },
    { label: 'Client Reviews', path: '/pro/reviews', icon: Star },
    { label: 'Professional Profile', path: '/pro/profile', icon: UserIcon },
    { label: 'Marketplace Performance', path: '/pro/performance', icon: TrendingUp },
    { label: 'Verification & Badges', path: '/pro/verification', icon: ShieldCheck },
    { label: 'ProLink Academy', path: '/pro/academy', icon: GraduationCap },
    { label: 'Settings', path: '/pro/settings', icon: Settings }
  ];

  return (
    <div className="min-h-screen flex flex-col bg-white text-[#34453B]">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-white border-b border-[#DCE8E0] h-16 flex items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
            className="lg:hidden p-1.5 text-[#34453B] hover:text-[#0C2A1B] cursor-pointer"
          >
            <Menu className="w-5 h-5" />
          </button>

          <button
            onClick={() => marketplaceStore.navigate('/pro/overview')}
            className="flex items-center gap-2.5 cursor-pointer text-left focus:outline-none"
          >
            <div className="w-8 h-8 rounded-[8px] bg-[#0F6B3E] flex items-center justify-center text-white shadow-2xs font-bold text-lg">
              <svg viewBox="0 0 32 32" className="w-5 h-5 fill-current">
                <path d="M10 8h7a5 5 0 0 1 5 5c0 2.76-2.24 5-5 5h-4v6h-3V8zm3 3v4h4a2 2 0 0 0 0-4h-4z" />
                <circle cx="20" cy="19" r="3.5" fill="#2FAE60" />
              </svg>
            </div>
            <span className="text-xl font-bold tracking-tight text-[#0C2A1B]">
              ProLink
            </span>
          </button>

          <span className="hidden sm:inline-block px-2.5 py-0.5 text-[11px] font-semibold text-[#0F6B3E] bg-[#E6F4EA] rounded-full border border-[#CDE9D6]">
            Pro Console · {pro.category || 'General'}
          </span>
        </div>

        {/* Center / Right Links */}
        <div className="flex items-center gap-3 sm:gap-4">
          {/* Online / Away Toggle */}
          <div className="flex items-center gap-2 bg-[#F4FAF6] border border-[#DCE8E0] px-2.5 py-1 rounded-full">
            <span
              className={`w-2 h-2 rounded-full ${
                isOnline ? 'bg-[#2FAE60] animate-pulse' : 'bg-[#A3B1A8]'
              }`}
            />
            <span className="text-xs font-semibold text-[#0C2A1B]">
              {isOnline ? 'Available' : 'Away'}
            </span>
            <button
              onClick={() => {
                const next = !isOnline;
                setIsOnline(next);
                marketplaceStore.addToast(
                  next ? 'You are now online' : 'You are now away',
                  next ? 'You will receive immediate alerts for nearby urgent jobs.' : 'New job matches paused.',
                  'info'
                );
              }}
              className="text-[#6A7B70] hover:text-[#0C2A1B] cursor-pointer ml-1"
              title="Toggle availability"
            >
              <Power className="w-3.5 h-3.5" />
            </button>
          </div>

          <nav className="hidden md:flex items-center gap-5 text-sm font-medium text-[#34453B]">
            <button
              onClick={() => marketplaceStore.navigate('/pro/feed')}
              className="hover:text-[#0F6B3E] transition-colors cursor-pointer"
            >
              Jobs
            </button>
            <button
              onClick={() => marketplaceStore.navigate('/pro/offers')}
              className="hover:text-[#0F6B3E] transition-colors cursor-pointer"
            >
              My Offers
            </button>
            <button
              onClick={() => marketplaceStore.navigate('/pro/earnings')}
              className="hover:text-[#0F6B3E] transition-colors cursor-pointer"
            >
              Earnings
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
                  <span className="text-xs font-bold text-[#0C2A1B]">Pro Notifications</span>
                  <span className="text-[11px] text-[#0F6B3E] font-medium cursor-pointer">Mark read</span>
                </div>
                <div className="divide-y divide-[#F4FAF6] max-h-64 overflow-y-auto">
                  {MOCK_NOTIFICATIONS.filter(n => n.targetRole === 'professional').map((n) => (
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

          {/* Primary Action Button: Browse Jobs (NO "Post a Job") */}
          <Button
            variant="primary"
            size="sm"
            onClick={() => marketplaceStore.navigate('/pro/feed')}
            className="font-semibold shadow-xs"
          >
            <Compass className="w-4 h-4 mr-1.5" />
            Browse Jobs
          </Button>

          {/* Pro Avatar & Menu */}
          <div className="relative">
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center gap-2 p-1 hover:bg-[#F4FAF6] rounded-full cursor-pointer focus:outline-none"
            >
              <Avatar
                src={pro.avatar}
                name={pro.name}
                size="sm"
                isOnline={isOnline}
                isVerified={true}
              />
              <span className="hidden xl:inline text-xs font-semibold text-[#0C2A1B]">
                {pro.name.split(' ')[0]}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-[#6A7B70] hidden xl:inline" />
            </button>

            {userMenuOpen && (
              <div
                onMouseLeave={() => setUserMenuOpen(false)}
                className="absolute right-0 top-full mt-2 w-56 bg-white rounded-[10px] border border-[#DCE8E0] shadow-xl p-2 z-50 animate-in fade-in"
              >
                <div className="px-3 py-2 border-b border-[#DCE8E0]">
                  <p className="text-xs font-bold text-[#0C2A1B]">{pro.name}</p>
                  <p className="text-[11px] text-[#6A7B70] truncate">{pro.email}</p>
                  <span className="text-[10px] text-[#0F6B3E] font-medium mt-1 block">
                    ⭐ {pro.rating || '4.9'} Rating · Top Rated
                  </span>
                </div>
                <div className="py-1">
                  <button
                    onClick={() => {
                      setUserMenuOpen(false);
                      marketplaceStore.navigate('/pro/overview');
                    }}
                    className="w-full text-left px-3 py-1.5 text-xs text-[#0C2A1B] hover:bg-[#F4FAF6] rounded flex items-center gap-2 cursor-pointer"
                  >
                    <LayoutDashboard className="w-3.5 h-3.5 text-[#6A7B70]" />
                    <span>Pro Dashboard</span>
                  </button>
                  <button
                    onClick={() => {
                      setUserMenuOpen(false);
                      marketplaceStore.navigate('/pro/profile');
                    }}
                    className="w-full text-left px-3 py-1.5 text-xs text-[#0C2A1B] hover:bg-[#F4FAF6] rounded flex items-center gap-2 cursor-pointer"
                  >
                    <UserIcon className="w-3.5 h-3.5 text-[#6A7B70]" />
                    <span>My Profile & Skills</span>
                  </button>
                </div>
                <div className="pt-1 border-t border-[#DCE8E0]">
                  <button
                    onClick={() => {
                      setUserMenuOpen(false);
                      marketplaceStore.setRole('guest');
                    }}
                    className="w-full text-left px-3 py-1.5 text-xs text-[#B42318] hover:bg-[#FEF2F2] rounded flex items-center gap-2 cursor-pointer font-medium"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Layout: Left Sidebar + Pro Viewport */}
      <div className="flex-1 flex max-w-7xl w-full mx-auto">
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
                {item.badge && (
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 bg-[#0F6B3E] text-white rounded-full">
                    {item.badge}
                  </span>
                )}
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
                  <span className="font-bold text-[#0C2A1B]">Pro Menu</span>
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
