import React, { useState } from 'react';
import { marketplaceStore } from '../../store/marketplaceStore';
import { Input } from '../../components/ui/Input';
import { PasswordInput } from '../../components/ui/PasswordInput';
import { OtpInput } from '../../components/ui/PhoneInput';
import { Button } from '../../components/ui/Button';
import { ShieldCheck, Lock, KeyRound, Server } from 'lucide-react';

export const AdminSignInPage: React.FC = () => {
  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState('admin@prolink.pk');
  const [password, setPassword] = useState('HQAdmin2026!');
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleStep1 = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please provide admin credentials.');
      return;
    }
    setLoading(true);
    setError('');

    setTimeout(() => {
      setLoading(false);
      setStep(2);
      marketplaceStore.addToast('2FA Initiated', 'Hardware token requested for admin@prolink.pk', 'info');
    }, 450);
  };

  const handleStep2 = (e: React.FormEvent) => {
    e.preventDefault();
    if (twoFactorCode.length < 6) {
      setError('Please enter the 6-digit Authenticator code.');
      return;
    }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      marketplaceStore.setRole('admin');
      marketplaceStore.navigate('/admin/overview');
      marketplaceStore.addToast('Admin Session Initialized', 'Authenticated to Islamabad HQ Console.', 'success');
    }, 500);
  };

  return (
    <div className="min-h-screen bg-[#0C2A1B] text-white flex flex-col justify-between p-6 sm:p-12 relative overflow-hidden select-none">
      {/* Background Subtle Grid Texture */}
      <div className="absolute inset-0 bg-grid-subtle opacity-20 pointer-events-none" />

      {/* Top Bar */}
      <div className="flex items-center justify-between relative z-10 max-w-4xl mx-auto w-full">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-[8px] bg-[#0F6B3E] flex items-center justify-center text-white shadow-2xs font-bold text-lg">
            <svg viewBox="0 0 32 32" className="w-5 h-5 fill-current">
              <path d="M10 8h7a5 5 0 0 1 5 5c0 2.76-2.24 5-5 5h-4v6h-3V8zm3 3v4h4a2 2 0 0 0 0-4h-4z" />
              <circle cx="20" cy="19" r="3.5" fill="#2FAE60" />
            </svg>
          </div>
          <span className="text-xl font-bold tracking-tight text-white">
            ProLink HQ Console
          </span>
        </div>

        <button
          onClick={() => marketplaceStore.navigate('/')}
          className="text-xs text-[#CDE9D6] hover:text-white underline cursor-pointer"
        >
          Return to Marketplace Home →
        </button>
      </div>

      {/* Center Console Box */}
      <div className="relative z-10 my-auto max-w-md w-full mx-auto bg-white text-[#0C2A1B] rounded-[10px] border border-[#DCE8E0] shadow-2xl p-6 sm:p-8 space-y-6">
        <div className="flex items-center gap-3 pb-3 border-b border-[#DCE8E0]">
          <div className="w-10 h-10 rounded-[8px] bg-[#E6F4EA] flex items-center justify-center text-[#0F6B3E]">
            {step === 1 ? <Lock className="w-5 h-5" /> : <KeyRound className="w-5 h-5" />}
          </div>
          <div>
            <h1 className="text-lg font-bold text-[#0C2A1B]">
              {step === 1 ? 'Internal Staff Authentication' : 'Two-Factor Authentication'}
            </h1>
            <p className="text-xs text-[#6A7B70]">
              {step === 1 ? 'Authorized operations personnel only' : 'Enter Google Authenticator / YubiKey code'}
            </p>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-[#FEF2F2] border border-[#FECACA] rounded-[8px] text-xs text-[#B42318] font-medium">
            {error}
          </div>
        )}

        {step === 1 ? (
          <form onSubmit={handleStep1} className="space-y-4">
            <Input
              label="Staff Corporate Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@prolink.pk"
              required
            />

            <PasswordInput
              label="Console Master Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              required
            />

            <div className="p-2.5 bg-[#F4FAF6] border border-[#DCE8E0] rounded-[6px] text-[11px] text-[#6A7B70] flex items-center gap-2">
              <Server className="w-4 h-4 text-[#0F6B3E] shrink-0" />
              <span>Restricted to ProLink HQ Virtual Private Network. All actions are cryptographically signed.</span>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={loading}
              className="w-full font-bold"
            >
              Verify Credentials & Proceed →
            </Button>
          </form>
        ) : (
          <form onSubmit={handleStep2} className="space-y-5">
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-[#0C2A1B]">
                6-Digit Time-based One-Time Password (TOTP)
              </label>
              <OtpInput
                value={twoFactorCode}
                onChange={setTwoFactorCode}
                onComplete={() => {}}
                resendSeconds={60}
              />
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="md"
                onClick={() => setStep(1)}
              >
                Back
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="md"
                loading={loading}
                className="flex-1 font-bold"
              >
                Enter HQ Console
              </Button>
            </div>
          </form>
        )}
      </div>

      {/* Footer */}
      <div className="relative z-10 max-w-4xl mx-auto w-full flex justify-between text-xs text-[#A3B1A8] pt-4 border-t border-white/10">
        <span>Security Tier 1 · Zero Trust Network</span>
        <span>Islamabad Data Center: Active</span>
      </div>
    </div>
  );
};
