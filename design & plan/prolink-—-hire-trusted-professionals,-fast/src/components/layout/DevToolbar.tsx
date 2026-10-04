import React, { useState } from 'react';
import { UserRole } from '../../types';
import { useMarketplace, marketplaceStore } from '../../store/marketplaceStore';
import { Wrench, ChevronDown, ChevronUp, RotateCcw, Zap, Eye, CheckCircle2 } from 'lucide-react';

export const DevToolbar: React.FC = () => {
  const { currentRole, currentPath } = useMarketplace();
  const [collapsed, setCollapsed] = useState(false);
  const [hidden, setHidden] = useState(false);

  if (hidden) {
    return (
      <button
        onClick={() => setHidden(false)}
        className="fixed bottom-3 left-3 z-50 p-2 bg-[#0C2A1B] text-white rounded-full shadow-lg border border-[#0F6B3E] hover:bg-[#0F6B3E] cursor-pointer"
        title="Open Dev Toolbar"
      >
        <Wrench className="w-4 h-4 text-[#2FAE60]" />
      </button>
    );
  }

  const roles: { role: UserRole; label: string; badge: string }[] = [
    { role: 'guest', label: 'Guest', badge: 'Public' },
    { role: 'customer', label: 'Customer', badge: 'Mustafa' },
    { role: 'professional', label: 'Pro', badge: 'Tariq (4.94★)' },
    { role: 'admin', label: 'Admin', badge: 'HQ' }
  ];

  return (
    <div className="fixed bottom-3 left-3 z-50 bg-[#0C2A1B] text-white rounded-[10px] border border-[#0F6B3E]/60 shadow-xl text-xs max-w-sm w-[340px] overflow-hidden select-none font-sans">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-[#081F13] border-b border-[#0F6B3E]/40">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#2FAE60] animate-pulse" />
          <span className="font-bold tracking-tight text-white flex items-center gap-1.5">
            <span>Dev Toolbar</span>
            <span className="text-[10px] bg-[#0F6B3E] text-[#CDE9D6] px-1.5 py-0.2 rounded font-mono">
              PROTOTYPE
            </span>
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1 text-[#A3B1A8] hover:text-white rounded cursor-pointer"
            title={collapsed ? 'Expand' : 'Collapse'}
          >
            {collapsed ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={() => setHidden(true)}
            className="p-1 text-[#A3B1A8] hover:text-white rounded cursor-pointer text-[10px]"
            title="Hide Toolbar"
          >
            ✕
          </button>
        </div>
      </div>

      {!collapsed && (
        <div className="p-3 space-y-2.5">
          {/* Active Role Selector */}
          <div>
            <div className="text-[10px] uppercase font-semibold text-[#A3B1A8] tracking-wider mb-1.5 flex justify-between">
              <span>Switch Role</span>
              <span className="text-[#2FAE60] font-mono capitalize">{currentRole} mode</span>
            </div>
            <div className="grid grid-cols-4 gap-1">
              {roles.map((r) => {
                const isActive = currentRole === r.role;
                return (
                  <button
                    key={r.role}
                    onClick={() => marketplaceStore.setRole(r.role)}
                    className={`py-1.5 px-2 rounded-[6px] text-center font-medium transition-colors cursor-pointer border ${
                      isActive
                        ? 'bg-[#0F6B3E] text-white border-[#2FAE60] font-semibold'
                        : 'bg-[#0C2A1B] text-[#CDE9D6] border-white/10 hover:bg-white/10'
                    }`}
                  >
                    <div className="text-xs leading-none">{r.label}</div>
                    <div className="text-[9px] opacity-75 mt-0.5 truncate">{r.badge}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quick Scenario Shortcuts */}
          <div className="pt-1 border-t border-white/10 space-y-1">
            <div className="text-[10px] uppercase font-semibold text-[#A3B1A8] tracking-wider">
              Quick Test Jumps
            </div>
            <div className="grid grid-cols-2 gap-1 text-[11px]">
              <button
                onClick={() => {
                  marketplaceStore.setRole('customer');
                  marketplaceStore.navigate('/customer/jobs/job-102');
                }}
                className="py-1 px-2 text-left bg-white/5 hover:bg-white/10 rounded border border-white/5 text-[#CDE9D6] flex items-center justify-between cursor-pointer"
              >
                <span>Compare Offers</span>
                <Eye className="w-3 h-3 text-[#2FAE60]" />
              </button>
              <button
                onClick={() => {
                  marketplaceStore.setRole('professional');
                  marketplaceStore.navigate('/pro/feed/job-103');
                }}
                className="py-1 px-2 text-left bg-white/5 hover:bg-white/10 rounded border border-white/5 text-[#CDE9D6] flex items-center justify-between cursor-pointer"
              >
                <span>Compose Offer</span>
                <Zap className="w-3 h-3 text-[#E8A317]" />
              </button>
              <button
                onClick={() => {
                  marketplaceStore.setRole('customer');
                  marketplaceStore.navigate('/customer/jobs/job-101');
                }}
                className="py-1 px-2 text-left bg-white/5 hover:bg-white/10 rounded border border-white/5 text-[#CDE9D6] flex items-center justify-between cursor-pointer"
              >
                <span>Active Job GPS</span>
                <span className="text-[9px] font-mono text-[#2FAE60]">LIVE</span>
              </button>
              <button
                onClick={() => {
                  marketplaceStore.setRole('admin');
                  marketplaceStore.navigate('/admin/verification');
                }}
                className="py-1 px-2 text-left bg-white/5 hover:bg-white/10 rounded border border-white/5 text-[#CDE9D6] flex items-center justify-between cursor-pointer"
              >
                <span>Verify Pro Queue</span>
                <CheckCircle2 className="w-3 h-3 text-[#2FAE60]" />
              </button>
            </div>
          </div>

          {/* Reset Demo Data */}
          <div className="pt-1.5 border-t border-white/10 flex items-center justify-between">
            <span className="text-[10px] text-[#A3B1A8] font-mono truncate">
              {currentPath}
            </span>
            <button
              onClick={() => marketplaceStore.resetAllData()}
              className="inline-flex items-center gap-1 text-[11px] text-[#A3B1A8] hover:text-[#FEF2F2] cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset Data</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
