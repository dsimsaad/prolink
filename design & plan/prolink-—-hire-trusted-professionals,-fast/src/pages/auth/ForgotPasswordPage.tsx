import React, { useState } from 'react';
import { marketplaceStore } from '../../store/marketplaceStore';
import { Input } from '../../components/ui/Input';
import { PasswordInput } from '../../components/ui/PasswordInput';
import { OtpInput } from '../../components/ui/PhoneInput';
import { Button } from '../../components/ui/Button';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';

export const ForgotPasswordPage: React.FC = () => {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [identifier, setIdentifier] = useState('mustafa.hashmi@gmail.com');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSendCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier) return;
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setStep(2);
    }, 400);
  };

  const handleVerifyOtp = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setStep(3);
    }, 400);
  };

  const handleResetPassword = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setStep(4);
      marketplaceStore.addToast('Password updated!', 'You can now sign in with your new password.', 'success');
    }, 500);
  };

  return (
    <div className="min-h-screen bg-white flex flex-col justify-between p-6 sm:p-12 max-w-lg mx-auto w-full">
      <div className="flex items-center justify-between">
        <button
          onClick={() => marketplaceStore.navigate('/sign-in')}
          className="flex items-center gap-1.5 text-xs text-[#6A7B70] hover:text-[#0C2A1B] cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Sign in</span>
        </button>
        <span className="text-xs text-[#A3B1A8]">Account Recovery</span>
      </div>

      <div className="my-auto py-8">
        {step === 1 && (
          <form onSubmit={handleSendCode} className="space-y-5">
            <div>
              <h1 className="text-2xl font-bold text-[#0C2A1B]">Reset your password</h1>
              <p className="text-xs text-[#6A7B70] mt-1">
                Enter your registered email address or Pakistani mobile number to receive a verification code.
              </p>
            </div>

            <Input
              label="Email or Mobile (+92)"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="e.g. name@example.com or 03001234567"
              required
            />

            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={loading}
              className="w-full font-bold"
            >
              Send Recovery Code →
            </Button>
          </form>
        )}

        {step === 2 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-2xl font-bold text-[#0C2A1B]">Enter verification code</h2>
              <p className="text-xs text-[#6A7B70] mt-1">
                We sent a 6-digit recovery code to <strong>{identifier}</strong>.
              </p>
            </div>

            <OtpInput
              value={otp}
              onChange={setOtp}
              onComplete={handleVerifyOtp}
            />

            <Button
              variant="primary"
              size="lg"
              loading={loading}
              disabled={otp.length < 6}
              onClick={handleVerifyOtp}
              className="w-full font-bold"
            >
              Verify Code
            </Button>
          </div>
        )}

        {step === 3 && (
          <form onSubmit={handleResetPassword} className="space-y-5">
            <div>
              <h2 className="text-2xl font-bold text-[#0C2A1B]">Set new password</h2>
              <p className="text-xs text-[#6A7B70] mt-1">
                Choose a strong password with at least 8 characters.
              </p>
            </div>

            <PasswordInput
              label="New Password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              showStrengthMeter={true}
              required
            />

            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={loading}
              className="w-full font-bold"
            >
              Save New Password
            </Button>
          </form>
        )}

        {step === 4 && (
          <div className="text-center space-y-4 py-4">
            <div className="w-14 h-14 rounded-full bg-[#E6F4EA] flex items-center justify-center text-[#2FAE60] mx-auto border border-[#CDE9D6]">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-[#0C2A1B]">Password Reset Successfully</h3>
            <p className="text-xs text-[#6A7B70]">
              Your account has been secured with the new password.
            </p>
            <Button
              variant="primary"
              size="md"
              onClick={() => marketplaceStore.navigate('/sign-in')}
              className="font-bold w-full"
            >
              Sign In Now →
            </Button>
          </div>
        )}
      </div>

      <div className="text-xs text-[#A3B1A8] text-center pt-4 border-t border-[#DCE8E0]">
        ProLink Security Operations Center
      </div>
    </div>
  );
};
