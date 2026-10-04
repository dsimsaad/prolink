import React, { useState, useEffect } from 'react';
import { useMarketplace, marketplaceStore } from '../../store/marketplaceStore';
import { CATEGORIES } from '../../data/mockData';
import { Button } from '../ui/Button';
import {
  Search,
  ChevronDown,
  X,
  Globe,
  DollarSign,
  ShieldCheck,
  Menu
} from 'lucide-react';

interface GuestShellProps {
  children: React.ReactNode;
}

export const GuestShell: React.FC<GuestShellProps> = ({ children }) => {
  const { currentPath } = useMarketplace();
  const [showAnnouncement, setShowAnnouncement] = useState(true);
  const [scrolled, setScrolled] = useState(false);
  const [megaMenuOpen, setMegaMenuOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [headerSearch, setHeaderSearch] = useState('');

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 120);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!headerSearch.trim()) return;
    marketplaceStore.navigate(`/search`, { q: headerSearch, city: 'All Cities' });
  };

  return (
    <div className="min-h-screen flex flex-col bg-white text-[#34453B]">
      {/* 1. Announcement Bar */}
      {showAnnouncement && (
        <div className="bg-[#E6F4EA] border-b border-[#CDE9D6] px-4 py-2 text-xs text-[#0F6B3E] font-medium flex items-center justify-between">
          <div className="flex-1 text-center">
            <span>✨ Zero commission on your first 3 jobs posted this month in Islamabad, Lahore & Karachi.</span>
            <button
              onClick={() => marketplaceStore.navigate('/customer/post-job')}
              className="ml-2 underline font-semibold cursor-pointer hover:text-[#0B5632]"
            >
              Post a Job Now
            </button>
          </div>
          <button
            onClick={() => setShowAnnouncement(false)}
            className="text-[#0F6B3E] hover:text-[#084626] p-1 cursor-pointer"
            aria-label="Dismiss announcement"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 2. Top Navbar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#DCE8E0] transition-shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Brand Logo & Wordmark */}
          <div className="flex items-center gap-6">
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

            {/* Header Search (appears after scroll or always visible on larger viewports) */}
            <form
              onSubmit={handleSearchSubmit}
              className={`hidden md:flex items-center relative max-w-xs transition-opacity duration-200 ${
                scrolled || currentPath !== '/' ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
              }`}
            >
              <input
                type="text"
                value={headerSearch}
                onChange={(e) => setHeaderSearch(e.target.value)}
                placeholder="Search plumbing, AC, paint..."
                className="w-64 h-9 pl-8 pr-3 text-xs bg-[#F4FAF6] border border-[#DCE8E0] rounded-[8px] focus:outline-none focus:ring-1 focus:ring-[#0F6B3E]"
              />
              <Search className="w-3.5 h-3.5 text-[#6A7B70] absolute left-2.5 pointer-events-none" />
            </form>
          </div>

          {/* Navigation Links */}
          <nav className="hidden lg:flex items-center gap-6 text-sm font-medium text-[#34453B]">
            <button
              onClick={() => marketplaceStore.navigate('/search', { q: 'All Services', city: 'Islamabad' })}
              className="hover:text-[#0F6B3E] transition-colors cursor-pointer"
            >
              Find Professionals
            </button>

            <button
              onClick={() => marketplaceStore.navigate('/business')}
              className="hover:text-[#0F6B3E] transition-colors cursor-pointer"
            >
              ProLink for Business
            </button>

            {/* Explore Mega-Menu Toggle */}
            <div className="relative">
              <button
                onClick={() => setMegaMenuOpen(!megaMenuOpen)}
                className="inline-flex items-center gap-1 hover:text-[#0F6B3E] transition-colors cursor-pointer"
              >
                <span>Explore</span>
                <ChevronDown className="w-3.5 h-3.5 text-[#6A7B70]" />
              </button>

              {megaMenuOpen && (
                <div
                  onMouseLeave={() => setMegaMenuOpen(false)}
                  className="absolute left-0 top-full mt-2 w-72 bg-white rounded-[10px] border border-[#DCE8E0] shadow-lg p-3 z-50 animate-in fade-in"
                >
                  <div className="text-[11px] font-semibold text-[#6A7B70] uppercase px-2 py-1">
                    Featured Categories
                  </div>
                  <div className="space-y-0.5 mt-1">
                    {CATEGORIES.slice(0, 6).map((c) => (
                      <button
                        key={c.id}
                        onClick={() => {
                          setMegaMenuOpen(false);
                          marketplaceStore.navigate(`/search`, { category: c.name, city: 'Islamabad' });
                        }}
                        className="w-full text-left px-2.5 py-1.5 text-xs text-[#0C2A1B] hover:bg-[#F4FAF6] hover:text-[#0F6B3E] rounded-[6px] transition-colors flex items-center justify-between cursor-pointer"
                      >
                        <span>{c.name}</span>
                        <span className="text-[10px] text-[#A3B1A8]">from PKR {c.startingPricePKR}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={() => marketplaceStore.navigate('/join', { role: 'pro' })}
              className="text-[#0F6B3E] hover:text-[#0B5632] font-semibold transition-colors cursor-pointer"
            >
              Become a Professional
            </button>
          </nav>

          {/* Action CTAs: Sign In, Join, Post a Job */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => marketplaceStore.navigate('/sign-in')}
              className="text-xs font-semibold text-[#0C2A1B] hover:text-[#0F6B3E] px-3 py-2 cursor-pointer transition-colors"
            >
              Sign In
            </button>

            <button
              onClick={() => marketplaceStore.navigate('/join')}
              className="hidden sm:inline-flex h-9 px-3.5 items-center text-xs font-semibold text-[#0F6B3E] border border-[#0F6B3E] rounded-[8px] hover:bg-[#E6F4EA] transition-colors cursor-pointer"
            >
              Join
            </button>

            <Button
              variant="primary"
              size="sm"
              onClick={() => marketplaceStore.navigate('/customer/post-job')}
              className="shadow-xs font-semibold"
            >
              Post a Job
            </Button>

            {/* Mobile hamburger menu */}
            <button
              onClick={() => setMobileNavOpen(!mobileNavOpen)}
              className="lg:hidden p-2 text-[#34453B] hover:text-[#0C2A1B] cursor-pointer"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 3. Sticky Category Sub-Nav (Horizontally scrollable) */}
        <div className="bg-[#F4FAF6] border-t border-[#DCE8E0] overflow-x-auto no-scrollbar py-2">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center gap-6 text-xs font-medium text-[#34453B] whitespace-nowrap min-w-max">
            {CATEGORIES.map((c) => (
              <button
                key={c.id}
                onClick={() => marketplaceStore.navigate('/search', { category: c.name, city: 'Islamabad' })}
                className="hover:text-[#0F6B3E] transition-colors cursor-pointer py-1 border-b-2 border-transparent hover:border-[#0F6B3E]"
              >
                {c.name}
              </button>
            ))}
            <button
              onClick={() => marketplaceStore.navigate('/categories')}
              className="text-[#0F6B3E] font-semibold hover:underline cursor-pointer"
            >
              More Categories →
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1">
        {children}
      </main>

      {/* 4. Rich Footer (Deep Forest #0C2A1B) */}
      <footer className="bg-[#0C2A1B] text-white pt-14 pb-8 border-t border-[#0F6B3E]/30 select-none">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          {/* Top row: 5 Columns */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8 text-xs">
            {/* Col 1: Categories */}
            <div className="space-y-3">
              <h4 className="font-bold text-white uppercase tracking-wider text-[11px]">Popular Services</h4>
              <ul className="space-y-2 text-[#A3B1A8]">
                {CATEGORIES.slice(0, 6).map((c) => (
                  <li key={c.id}>
                    <button
                      onClick={() => marketplaceStore.navigate('/search', { category: c.name })}
                      className="hover:text-white transition-colors cursor-pointer text-left"
                    >
                      {c.name}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Col 2: About ProLink */}
            <div className="space-y-3">
              <h4 className="font-bold text-white uppercase tracking-wider text-[11px]">About ProLink</h4>
              <ul className="space-y-2 text-[#A3B1A8]">
                {['Careers', 'Press & News', 'Partnerships', 'Privacy Policy', 'Terms of Service', 'Intellectual Property'].map((item) => (
                  <li key={item}>
                    <button
                      onClick={() => marketplaceStore.navigate(`/${item.toLowerCase().replace(/\s+/g, '-')}`)}
                      className="hover:text-white transition-colors cursor-pointer text-left"
                    >
                      {item}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Col 3: Support */}
            <div className="space-y-3">
              <h4 className="font-bold text-white uppercase tracking-wider text-[11px]">Support & Trust</h4>
              <ul className="space-y-2 text-[#A3B1A8]">
                {['Help Center', 'Trust & Safety', 'Dispute Resolution', 'Quality Guarantee', 'ProLink Fees & Escrow', 'Contact Us'].map((item) => (
                  <li key={item}>
                    <button
                      onClick={() => marketplaceStore.navigate(`/${item.toLowerCase().replace(/\s+/g, '-')}`)}
                      className="hover:text-white transition-colors cursor-pointer text-left"
                    >
                      {item}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Col 4: Community & Pros */}
            <div className="space-y-3">
              <h4 className="font-bold text-white uppercase tracking-wider text-[11px]">For Professionals</h4>
              <ul className="space-y-2 text-[#A3B1A8]">
                {['Become a Pro', 'Pro Academy & TEVTA', 'Verification Guidelines', 'Earnings & Payouts', 'Pro Stories', 'Community Standards'].map((item) => (
                  <li key={item}>
                    <button
                      onClick={() => marketplaceStore.navigate(`/${item.toLowerCase().replace(/\s+/g, '-')}`)}
                      className="hover:text-white transition-colors cursor-pointer text-left"
                    >
                      {item}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Col 5: Major Cities in Pakistan */}
            <div className="space-y-3">
              <h4 className="font-bold text-white uppercase tracking-wider text-[11px]">Active Hubs</h4>
              <ul className="space-y-2 text-[#A3B1A8]">
                {['Islamabad (F, G, I Sectors)', 'Lahore (DHA, Gulberg, Cantt)', 'Karachi (Clifton, DHA, PECHS)', 'Rawalpindi (Bahria, Cantt)', 'Peshawar & Faisalabad (Soon)'].map((city) => (
                  <li key={city}>
                    <button
                      onClick={() => marketplaceStore.navigate('/search', { city: city.split(' ')[0] })}
                      className="hover:text-white transition-colors cursor-pointer text-left"
                    >
                      {city}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Bottom Bar: Copyright, Language, Currency */}
          <div className="pt-8 border-t border-[#0F6B3E]/40 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#A3B1A8]">
            <div className="flex items-center gap-3">
              <span className="font-bold text-white text-base tracking-tight">ProLink</span>
              <span>© 2026 ProLink Technologies Pakistan (Pvt) Ltd. All rights reserved.</span>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5 text-white/90">
                <Globe className="w-3.5 h-3.5 text-[#2FAE60]" />
                <span>English (Pakistan)</span>
              </div>
              <div className="flex items-center gap-1.5 text-white/90">
                <DollarSign className="w-3.5 h-3.5 text-[#2FAE60]" />
                <span className="font-mono">PKR (Rs)</span>
              </div>
              <button
                onClick={() => marketplaceStore.navigate('/admin/login')}
                className="text-[11px] text-[#A3B1A8] hover:text-white underline cursor-pointer"
              >
                Staff Portal
              </button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};
