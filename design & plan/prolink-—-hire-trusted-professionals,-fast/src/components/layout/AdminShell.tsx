import React, { useState } from 'react';
import { useMarketplace, marketplaceStore } from '../../store/marketplaceStore';
import { Avatar } from '../ui/Avatar';
import {
  LayoutDashboard,
  Users,
  ShieldCheck,
  Briefcase,
  Cpu,
  CreditCard,
  AlertTriangle,
  FolderTree,
  FileText,
  BarChart3,
  UserCog,
  ScrollText,
  Settings,
  Bell,
  Search,
  LogOut,
  ChevronDown,
  Menu,
  X
} from 'lucide-react';
import { MOCK_NOTIFICATIONS } from '../../data/mockData';

interface AdminShellProps {
  children: React.ReactNode;
}

export const AdminShell: React.FC<AdminShellProps> = ({ children }) => {
  const { currentPath, unreadNotifsCount } = useMarketplace();
  const [notifsOpen, setNotifsOpen] = useState(false);
  const [adminMenuOpen, setAdminMenuOpen] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [globalSearch, setGlobalSearch] = useState('');

  const sidebarGroups = [
    {
      group: 'Core Operations',
      items: [
        { label: 'Overview', path: '/admin/overview', icon: LayoutDashboard },
        { label: 'Users Management', path: '/admin/users', icon: Users },
        { label: 'Verification Queue', path: '/admin/verification', icon: ShieldCheck, badge: '3 Pending' },
        { label: 'Jobs & Offers Monitor', path: '/admin/jobs', icon: Briefcase },
        { label: 'Matching & AI Engine', path: '/admin/matching', icon: Cpu }
      ]
    },
    {
      group: 'Governance & Finance',
      items: [
        { label: 'Payments & Escrow', path: '/admin/payments', icon: CreditCard },
        { label: 'Disputes & Claims', path: '/admin/disputes', icon: AlertTriangle },
        { label: 'Service Catalog', path: '/admin/catalog', icon: FolderTree },
        { label: 'Content & Policies', path: '/admin/content', icon: FileText }
      ]
    },
    {
      group: 'Platform & Intelligence',
      items: [
        { label: 'Analytics & Cohorts', path: '/admin/analytics', icon: BarChart3 },
        { label: 'Staff Roles (RBAC)', path: '/admin/staff', icon: UserCog },
        { label: 'Audit Trail Logs', path: '/admin/audit', icon: ScrollText },
        { label: 'System Settings', path: '/admin/settings', icon: Settings }
      ]
    }
  ];

  return (
    <div className="min-h-screen flex bg-[#F4FAF6] text-[#34453B]">
      {/* Deep Forest Slim Sidebar (Desktop) */}
      <aside className="hidden lg:flex flex-col w-64 bg-[#0C2A1B] text-white select-none shrink-0 border-r border-[#0F6B3E]/40">
        {/* Brand Header */}
        <div className="h-16 flex items-center gap-2.5 px-6 border-b border-[#0F6B3E]/40">
          <div className="w-8 h-8 rounded-[8px] bg-[#0F6B3E] flex items-center justify-center text-white shadow-2xs font-bold text-lg">
            <svg viewBox="0 0 32 32" className="w-5 h-5 fill-current">
              <path d="M10 8h7a5 5 0 0 1 5 5c0 2.76-2.24 5-5 5h-4v6h-3V8zm3 3v4h4a2 2 0 0 0 0-4h-4z" />
              <circle cx="20" cy="19" r="3.5" fill="#2FAE60" />
            </svg>
          </div>
          <div>
            <div className="text-base font-bold tracking-tight text-white flex items-center gap-1.5">
              <span>ProLink</span>
              <span className="text-[10px] bg-[#2FAE60] text-[#0C2A1B] px-1 rounded font-bold">ADMIN</span>
            </div>
            <div className="text-[10px] text-[#A3B1A8] font-mono">HQ Console · v2.4</div>
          </div>
        </div>

        {/* Grouped Nav Items */}
        <div className="flex-1 overflow-y-auto py-5 px-3 space-y-6">
          {sidebarGroups.map((grp) => (
            <div key={grp.group} className="space-y-1">
              <div className="px-3 text-[10px] font-bold uppercase tracking-wider text-[#A3B1A8]/80 mb-1.5">
                {grp.group}
              </div>
              {grp.items.map((item) => {
                const Icon = item.icon;
                const isActive = currentPath === item.path;

                return (
                  <button
                    key={item.label}
                    onClick={() => marketplaceStore.navigate(item.path)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-[8px] text-xs font-medium transition-colors cursor-pointer text-left ${
                      isActive
                        ? 'bg-[#0F6B3E] text-white font-semibold'
                        : 'text-[#CDE9D6] hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#2FAE60]' : 'text-[#A3B1A8]'}`} />
                      <span className="truncate">{item.label}</span>
                    </div>
                    {item.badge && (
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 bg-[#C77D0A] text-white rounded-full">
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* Bottom User info */}
        <div className="p-3 border-t border-[#0F6B3E]/40 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#2FAE60]" />
            <span className="text-xs text-white/90 font-medium">Production Live</span>
          </div>
          <button
            onClick={() => marketplaceStore.setRole('guest')}
            className="text-[11px] text-[#A3B1A8] hover:text-white cursor-pointer"
          >
            Exit Console
          </button>
        </div>
      </aside>

      {/* Main Content Column */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar with search box, environment badge, alerts bell, avatar */}
        <header className="h-16 bg-white border-b border-[#DCE8E0] px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4 sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
              className="lg:hidden p-1.5 text-[#34453B] hover:text-[#0C2A1B] cursor-pointer"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Global Search Bar */}
            <div className="relative max-w-sm hidden sm:block">
              <input
                type="text"
                value={globalSearch}
                onChange={(e) => setGlobalSearch(e.target.value)}
                placeholder="Search jobs, user ID, CNIC, transactions..."
                className="w-72 lg:w-80 h-9 pl-9 pr-3 text-xs bg-[#F4FAF6] border border-[#DCE8E0] rounded-[8px] focus:outline-none focus:ring-1 focus:ring-[#0F6B3E]"
              />
              <Search className="w-3.5 h-3.5 text-[#6A7B70] absolute left-3 top-2.5 pointer-events-none" />
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Environment Badge */}
            <span className="px-2.5 py-1 text-[11px] font-semibold text-[#0F6B3E] bg-[#E6F4EA] rounded-full border border-[#CDE9D6]">
              HQ Islamabad Central · 99.98% SLA
            </span>

            {/* Alerts Bell */}
            <div className="relative">
              <button
                onClick={() => setNotifsOpen(!notifsOpen)}
                className="p-2 text-[#34453B] hover:text-[#0C2A1B] hover:bg-[#F4FAF6] rounded-full cursor-pointer relative"
              >
                <Bell className="w-5 h-5" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#B42318] ring-2 ring-white" />
              </button>

              {notifsOpen && (
                <div
                  onMouseLeave={() => setNotifsOpen(false)}
                  className="absolute right-0 top-full mt-2 w-80 bg-white rounded-[10px] border border-[#DCE8E0] shadow-xl p-3 z-50 animate-in fade-in"
                >
                  <div className="flex items-center justify-between pb-2 border-b border-[#DCE8E0]">
                    <span className="text-xs font-bold text-[#0C2A1B]">Admin System Alerts</span>
                    <span className="text-[10px] text-[#0F6B3E] font-medium cursor-pointer">Acknowledge All</span>
                  </div>
                  <div className="divide-y divide-[#F4FAF6] max-h-64 overflow-y-auto">
                    {MOCK_NOTIFICATIONS.filter(n => n.targetRole === 'admin').map((n) => (
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

            {/* Admin Avatar */}
            <div className="relative">
              <button
                onClick={() => setAdminMenuOpen(!adminMenuOpen)}
                className="flex items-center gap-2 p-1 hover:bg-[#F4FAF6] rounded-full cursor-pointer focus:outline-none"
              >
                <Avatar
                  name="Super Admin"
                  size="sm"
                  isOnline={true}
                />
                <span className="hidden md:inline text-xs font-semibold text-[#0C2A1B]">
                  HQ Admin
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-[#6A7B70] hidden md:inline" />
              </button>

              {adminMenuOpen && (
                <div
                  onMouseLeave={() => setAdminMenuOpen(false)}
                  className="absolute right-0 top-full mt-2 w-48 bg-white rounded-[10px] border border-[#DCE8E0] shadow-xl p-2 z-50 animate-in fade-in"
                >
                  <div className="px-3 py-1.5 border-b border-[#DCE8E0]">
                    <p className="text-xs font-bold text-[#0C2A1B]">Super Admin</p>
                    <p className="text-[10px] text-[#6A7B70]">admin@prolink.pk</p>
                  </div>
                  <div className="pt-1">
                    <button
                      onClick={() => {
                        setAdminMenuOpen(false);
                        marketplaceStore.setRole('guest');
                      }}
                      className="w-full text-left px-3 py-1.5 text-xs text-[#B42318] hover:bg-[#FEF2F2] rounded flex items-center gap-2 cursor-pointer font-medium"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Log Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Mobile Sidebar */}
        {mobileSidebarOpen && (
          <div className="fixed inset-0 z-50 lg:hidden flex">
            <div className="fixed inset-0 bg-black/50" onClick={() => setMobileSidebarOpen(false)} />
            <div className="relative w-64 max-w-xs bg-[#0C2A1B] text-white h-full p-4 space-y-4 z-10 shadow-2xl overflow-y-auto">
              <div className="flex items-center justify-between pb-3 border-b border-[#0F6B3E]/40">
                <span className="font-bold text-white">Admin Console</span>
                <button onClick={() => setMobileSidebarOpen(false)}>
                  <X className="w-5 h-5 text-white/80" />
                </button>
              </div>
              <div className="space-y-4">
                {sidebarGroups.map((grp) => (
                  <div key={grp.group} className="space-y-1">
                    <div className="text-[10px] font-bold uppercase text-[#A3B1A8]">{grp.group}</div>
                    {grp.items.map((item) => (
                      <button
                        key={item.label}
                        onClick={() => {
                          setMobileSidebarOpen(false);
                          marketplaceStore.navigate(item.path);
                        }}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded text-xs ${
                          currentPath === item.path ? 'bg-[#0F6B3E] text-white font-semibold' : 'text-[#CDE9D6]'
                        }`}
                      >
                        <item.icon className="w-4 h-4" />
                        <span>{item.label}</span>
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Main Content Body */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
};
