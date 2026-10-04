import React, { useState } from 'react';
import { useMarketplace, marketplaceStore } from '../../store/marketplaceStore';
import { Input } from '../../components/ui/Input';
import { PasswordInput } from '../../components/ui/PasswordInput';
import { Button } from '../../components/ui/Button';
import { ShieldCheck, Star, CheckCircle, ArrowRight } from 'lucide-react';

export const SignInPage: React.FC = () => {
  const [identifier, setIdentifier] = useState('mustafa.hashmi@gmail.com');
  const [password, setPassword] = useState('SecurePass123!');
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleDemoFill = (role: 'customer' | 'professional' | 'admin') => {
    if (role === 'customer') {
      setIdentifier('mustafa.hashmi@gmail.com');
      setPassword('Customer2026!');
    } else if (role === 'professional') {
      setIdentifier('tariq.m.services@gmail.com');
      setPassword('Electrician2026!');
    } else if (role === 'admin') {
      setIdentifier('admin@prolink.pk');
      setPassword('HQAdmin2026!');
    }
    setError('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim() || !password.trim()) {
      setError('Please provide your registered email/phone and password.');
      return;
    }
    setLoading(true);
    setError('');

    setTimeout(() => {
      setLoading(false);
      if (identifier.includes('admin')) {
        marketplaceStore.setRole('admin');
        marketplaceStore.navigate('/admin/overview');
      } else if (identifier.includes('tariq') || identifier.includes('pro')) {
        marketplaceStore.setRole('professional');
        marketplaceStore.navigate('/pro/overview');
      } else {
        marketplaceStore.setRole('customer');
        marketplaceStore.navigate('/customer/overview');
      }
      marketplaceStore.addToast('Welcome back!', 'Signed in successfully to ProLink.', 'success');
    }, 600);
  };

  return (
    <div className="min-h-screen bg-white flex">
      {/* Left Column: Form on Pure White */}
      <div className="flex-1 flex flex-col justify-between p-6 sm:p-12 lg:p-16 max-w-xl mx-auto w-full">
        {/* Brand header */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => marketplaceStore.navigate('/')}
            className="flex items-center gap-2 cursor-pointer focus:outline-none"
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
          <span className="text-xs text-[#6A7B70]">
            Don't have an account?{' '}
            <button
              onClick={() => marketplaceStore.navigate('/join')}
              className="text-[#0F6B3E] font-semibold hover:underline cursor-pointer"
            >
              Join ProLink
            </button>
          </span>
        </div>

        {/* Sign in content */}
        <div className="my-auto py-8 space-y-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#0C2A1B] tracking-tight">
              Sign in to your account
            </h1>
            <p className="text-sm text-[#6A7B70] mt-1.5">
              Access your jobs, verify real-time offers, or manage your service business.
            </p>
          </div>

          {/* Demo Credentials Helper Chips */}
          <div className="p-3 bg-[#F4FAF6] border border-[#DCE8E0] rounded-[8px] space-y-2">
            <span className="text-[11px] font-semibold text-[#6A7B70] uppercase tracking-wider block">
              Quick Demo Fill
            </span>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => handleDemoFill('customer')}
                className="px-2.5 py-1 text-xs font-semibold bg-white border border-[#DCE8E0] rounded-[6px] hover:border-[#0F6B3E] hover:text-[#0F6B3E] transition-colors cursor-pointer"
              >
                👤 Customer (Mustafa)
              </button>
              <button
                type="button"
                onClick={() => handleDemoFill('professional')}
                className="px-2.5 py-1 text-xs font-semibold bg-white border border-[#DCE8E0] rounded-[6px] hover:border-[#0F6B3E] hover:text-[#0F6B3E] transition-colors cursor-pointer"
              >
                ⚡ Professional (Tariq)
              </button>
              <button
                type="button"
                onClick={() => handleDemoFill('admin')}
                className="px-2.5 py-1 text-xs font-semibold bg-white border border-[#DCE8E0] rounded-[6px] hover:border-[#0F6B3E] hover:text-[#0F6B3E] transition-colors cursor-pointer"
              >
                🛡️ Super Admin
              </button>
            </div>
          </div>

          {/* Social OAuth Buttons */}
          <div className="grid grid-cols-3 gap-2.5">
            <button
              type="button"
              onClick={() => handleDemoFill('customer')}
              className="h-10 px-3 bg-white border border-[#DCE8E0] rounded-[8px] hover:bg-[#F4FAF6] text-xs font-semibold text-[#0C2A1B] flex items-center justify-center gap-2 cursor-pointer transition-colors"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.15z"/>
                <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.26v3.15C3.27 21.36 7.35 24 12 24z"/>
                <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.26C.46 8.16 0 9.94 0 12s.46 3.84 1.26 5.42l4.02-3.15z"/>
                <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.35 0 3.27 2.64 1.26 6.58l4.02 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
              </svg>
              <span>Google</span>
            </button>
            <button
              type="button"
              onClick={() => handleDemoFill('customer')}
              className="h-10 px-3 bg-white border border-[#DCE8E0] rounded-[8px] hover:bg-[#F4FAF6] text-xs font-semibold text-[#0C2A1B] flex items-center justify-center gap-2 cursor-pointer transition-colors"
            >
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.37c.62-.75 1.04-1.8 0.93-2.85-.9.04-2 .6-2.65 1.35-.56.64-1.06 1.7-0.92 2.73 1.01.08 2.02-.48 2.64-1.23z"/>
              </svg>
              <span>Apple</span>
            </button>
            <button
              type="button"
              onClick={() => handleDemoFill('customer')}
              className="h-10 px-3 bg-white border border-[#DCE8E0] rounded-[8px] hover:bg-[#F4FAF6] text-xs font-semibold text-[#0C2A1B] flex items-center justify-center gap-2 cursor-pointer transition-colors"
            >
              <span className="text-blue-600 font-bold text-sm">f</span>
              <span>Facebook</span>
            </button>
          </div>

          <div className="relative flex items-center justify-center">
            <div className="border-t border-[#DCE8E0] w-full" />
            <span className="bg-white px-3 text-xs text-[#A3B1A8] uppercase tracking-wider relative">
              Or with email / phone
            </span>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-[#FEF2F2] border border-[#FECACA] rounded-[8px] text-xs text-[#B42318] font-medium">
                {error}
              </div>
            )}

            <Input
              label="Email or Mobile Phone (+92)"
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="e.g. name@example.com or 03001234567"
              required
            />

            <PasswordInput
              label="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
            />

            <div className="flex items-center justify-between text-xs">
              <label className="flex items-center gap-2 text-[#34453B] cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-[#DCE8E0] text-[#0F6B3E] focus:ring-[#0F6B3E]"
                />
                <span>Remember me for 30 days</span>
              </label>

              <button
                type="button"
                onClick={() => marketplaceStore.navigate('/forgot-password')}
                className="text-[#0F6B3E] font-medium hover:underline cursor-pointer"
              >
                Forgot password?
              </button>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={loading}
              className="w-full font-bold text-sm"
            >
              Sign In
            </Button>
          </form>
        </div>

        {/* Footer */}
        <div className="pt-6 border-t border-[#DCE8E0] text-xs text-[#A3B1A8] flex justify-between">
          <span>Protected by ProLink Escrow & Trust</span>
          <button
            onClick={() => marketplaceStore.navigate('/admin/login')}
            className="hover:underline text-[#6A7B70]"
          >
            Staff Admin Login →
          </button>
        </div>
      </div>

      {/* Right Column: Visual Testimonial Panel */}
      <div className="hidden lg:flex flex-1 relative bg-[#0C2A1B] text-white p-12 flex-col justify-between overflow-hidden">
        <img
          src="/src/assets/images/hero_craftsman_pro_1791024679723.jpg"
          alt="ProLink craftsman"
          referrerPolicy="no-referrer"
          className="absolute inset-0 w-full h-full object-cover opacity-25 mix-blend-luminosity"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0C2A1B] via-[#0C2A1B]/70 to-transparent" />

        <div className="relative z-10 flex justify-between items-center">
          <span className="px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-xs font-semibold text-[#CDE9D6] border border-white/10">
            Pakistan's #1 Service Marketplace
          </span>
          <div className="flex items-center gap-1 text-[#E8A317]">
            <Star className="w-4 h-4 fill-[#E8A317]" />
            <span className="text-xs font-bold text-white">4.92 / 5</span>
            <span className="text-[11px] text-[#A3B1A8]">(18,400+ reviews)</span>
          </div>
        </div>

        <div className="relative z-10 max-w-lg space-y-6">
          <blockquote className="text-2xl font-bold leading-snug tracking-tight text-white">
            "ProLink changed how our family handles home maintenance in Islamabad. Instead of hunting through phone contacts, we posted an inverter fault and received 3 verified quotes in 15 minutes."
          </blockquote>

          <div className="flex items-center gap-3">
            <img
              src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80"
              alt="Mustafa"
              referrerPolicy="no-referrer"
              className="w-12 h-12 rounded-full border-2 border-[#2FAE60] object-cover"
            />
            <div>
              <div className="font-bold text-sm text-white">Mustafa Hashmi</div>
              <div className="text-xs text-[#CDE9D6]">Homeowner · Sector F-7, Islamabad</div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 pt-4 border-t border-white/10 text-xs">
            <div>
              <div className="text-xl font-bold text-white tabular-nums">2,400+</div>
              <div className="text-[#A3B1A8] mt-0.5">Verified Pros</div>
            </div>
            <div>
              <div className="text-xl font-bold text-white tabular-nums">14 mins</div>
              <div className="text-[#A3B1A8] mt-0.5">Avg First Offer</div>
            </div>
            <div>
              <div className="text-xl font-bold text-white tabular-nums">PKR 0</div>
              <div className="text-[#A3B1A8] mt-0.5">Inspection Scams</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
