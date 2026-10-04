import React, { useState } from 'react';
import { useMarketplace, marketplaceStore } from '../../store/marketplaceStore';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';
import {
  LayoutDashboard,
  PlusCircle,
  Briefcase,
  Inbox,
  MessageSquare,
  Bookmark,
  CreditCard,
  Star,
  MapPin,
  HelpCircle,
  Settings,
  Bell,
  LogOut,
  ChevronDown,
  Menu,
  X
} from 'lucide-react';
import { MOCK_NOTIFICATIONS } from '../../data/mockData';

interface CustomerShellProps {
  children: React.ReactNode;
}

export const CustomerShell: React.FC<CustomerShellProps> = ({ children }) => {
  const { currentUser, currentPath, unreadNotifsCount } = useMarketplace();
  const [notifsOpen, setNotifsOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const customer = currentUser || {
    name: 'Mustafa Hashmi',
    email: 'mustafa.hashmi@gmail.com',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    city: 'Islamabad',
    area: 'F-7/2'
  };

  const navItems = [
    { label: 'Overview', path: '/customer/overview', icon: LayoutDashboard },
    { label: 'Post a Job', path: '/customer/post-job', icon: PlusCircle, highlight: true },
    { label: 'My Jobs', path: '/customer/jobs', icon: Briefcase },
    { label: 'Offers Inbox', path: '/customer/jobs/job-102', icon: Inbox },
    { label: 'Messages', path: '/customer/messages', icon: MessageSquare },
    { label: 'Saved Professionals', path: '/customer/saved', icon: Bookmark },
    { label: 'Payments & Escrow', path: '/customer/payments', icon: CreditCard },
    { label: 'My Reviews', path: '/customer/reviews', icon: Star },
    { label: 'Saved Addresses', path: '/customer/addresses', icon: MapPin },
    { label: 'Help & Disputes', path: '/customer/help', icon: HelpCircle },
    { label: 'Account Settings', path: '/customer/settings', icon: Settings }
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
            onClick={() => marketplaceStore.navigate('/')}
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

          <span className="hidden sm:inline-block px-2 py-0.5 text-[11px] font-semibold text-[#0F6B3E] bg-[#E6F4EA] rounded-full border border-[#CDE9D6]">
            Customer Portal
          </span>
        </div>

        {/* Center / Right Links */}
        <div className="flex items-center gap-3 sm:gap-4">
          <nav className="hidden md:flex items-center gap-5 text-sm font-medium text-[#34453B]">
            <button
              onClick={() => marketplaceStore.navigate('/search', { q: 'All Services', city: customer.city })}
              className="hover:text-[#0F6B3E] transition-colors cursor-pointer"
            >
              Find Professionals
            </button>
            <button
              onClick={() => marketplaceStore.navigate('/customer/jobs')}
              className="hover:text-[#0F6B3E] transition-colors cursor-pointer"
            >
              My Jobs
            </button>
            <button
              onClick={() => marketplaceStore.navigate('/customer/messages')}
              className="hover:text-[#0F6B3E] transition-colors cursor-pointer"
            >
              Messages
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
                  {MOCK_NOTIFICATIONS.slice(0, 4).map((n) => (
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
            onClick={() => marketplaceStore.navigate('/customer/post-job')}
            className="font-semibold shadow-xs"
          >
            <PlusCircle className="w-4 h-4 mr-1.5" />
            Post a Job
          </Button>

          {/* Customer Avatar & Menu */}
          <div className="relative">
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center gap-2 p-1 hover:bg-[#F4FAF6] rounded-full cursor-pointer focus:outline-none"
            >
              <Avatar
                src={customer.avatar}
                name={customer.name}
                size="sm"
                isOnline={true}
              />
              <span className="hidden xl:inline text-xs font-semibold text-[#0C2A1B]">
                {customer.name.split(' ')[0]}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-[#6A7B70] hidden xl:inline" />
            </button>

            {userMenuOpen && (
              <div
                onMouseLeave={() => setUserMenuOpen(false)}
                className="absolute right-0 top-full mt-2 w-56 bg-white rounded-[10px] border border-[#DCE8E0] shadow-xl p-2 z-50 animate-in fade-in"
              >
                <div className="px-3 py-2 border-b border-[#DCE8E0]">
                  <p className="text-xs font-bold text-[#0C2A1B]">{customer.name}</p>
                  <p className="text-[11px] text-[#6A7B70] truncate">{customer.email}</p>
                  <span className="text-[10px] text-[#0F6B3E] font-medium mt-1 block">
                    📍 {customer.area}, {customer.city}
                  </span>
                </div>
                <div className="py-1">
                  <button
                    onClick={() => {
                      setUserMenuOpen(false);
                      marketplaceStore.navigate('/customer/overview');
                    }}
                    className="w-full text-left px-3 py-1.5 text-xs text-[#0C2A1B] hover:bg-[#F4FAF6] rounded flex items-center gap-2 cursor-pointer"
                  >
                    <LayoutDashboard className="w-3.5 h-3.5 text-[#6A7B70]" />
                    <span>Portal Overview</span>
                  </button>
                  <button
                    onClick={() => {
                      setUserMenuOpen(false);
                      marketplaceStore.navigate('/customer/settings');
                    }}
                    className="w-full text-left px-3 py-1.5 text-xs text-[#0C2A1B] hover:bg-[#F4FAF6] rounded flex items-center gap-2 cursor-pointer"
                  >
                    <Settings className="w-3.5 h-3.5 text-[#6A7B70]" />
                    <span>Settings</span>
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

      {/* Main Layout: Left Sidebar + Workspace Content */}
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
