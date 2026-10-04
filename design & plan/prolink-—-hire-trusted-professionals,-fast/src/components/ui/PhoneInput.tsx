import React from 'react';
import { Phone } from 'lucide-react';

interface PhoneInputProps {
  label?: string;
  value: string;
  onChange: (val: string) => void;
  error?: string;
  placeholder?: string;
  disabled?: boolean;
}

export const PhoneInput: React.FC<PhoneInputProps> = ({
  label = 'Mobile Phone (+92)',
  value,
  onChange,
  error,
  placeholder = '300 1234567',
  disabled
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Keep numbers and spaces
    const raw = e.target.value.replace(/[^0-9\s]/g, '');
    onChange(raw);
  };

  return (
    <div className="w-full space-y-1.5">
      {label && (
        <label className="block text-xs font-semibold text-[#0C2A1B]">
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        {/* Country code prefix */}
        <div className="absolute left-0 top-0 bottom-0 pl-3 pr-2.5 bg-[#F4FAF6] border-r border-[#DCE8E0] rounded-l-[8px] flex items-center gap-1.5 text-xs font-semibold text-[#0C2A1B] select-none">
          <span className="text-base leading-none">🇵🇰</span>
          <span>+92</span>
        </div>
        <input
          type="tel"
          disabled={disabled}
          value={value}
          onChange={handleChange}
          placeholder={placeholder}
          className={`w-full h-10 pl-[84px] pr-3 text-sm bg-white text-[#0C2A1B] border rounded-[8px] transition-colors placeholder:text-[#A3B1A8] tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F6B3E] focus-visible:ring-offset-1 disabled:bg-[#F4FAF6] disabled:text-[#A3B1A8] ${
            error
              ? 'border-[#B42318] focus-visible:ring-[#B42318]'
              : 'border-[#DCE8E0] hover:border-[#A9D3B5] focus:border-[#0F6B3E]'
          }`}
        />
      </div>
      {error && (
        <p className="text-xs text-[#B42318] font-medium">{error}</p>
      )}
    </div>
  );
};

interface OtpInputProps {
  length?: number;
  value: string;
  onChange: (val: string) => void;
  onComplete?: (code: string) => void;
  error?: string;
  resendSeconds?: number;
  onResend?: () => void;
}

export const OtpInput: React.FC<OtpInputProps> = ({
  length = 6,
  value,
  onChange,
  onComplete,
  error,
  resendSeconds = 30,
  onResend
}) => {
  const [timer, setTimer] = React.useState(resendSeconds);

  React.useEffect(() => {
    if (timer <= 0) return;
    const interval = setInterval(() => setTimer(t => t - 1), 1000);
    return () => clearInterval(interval);
  }, [timer]);

  const handleDigitChange = (index: number, char: string) => {
    if (!/^\d*$/.test(char)) return;
    const valArr = value.split('');
    valArr[index] = char.slice(-1);
    const newVal = valArr.join('').slice(0, length);
    onChange(newVal);

    if (newVal.length === length && onComplete) {
      onComplete(newVal);
    }

    // Auto advance focus
    if (char && index < length - 1) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !value[index] && index > 0) {
      const prevInput = document.getElementById(`otp-${index - 1}`);
      prevInput?.focus();
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2 max-w-[340px]">
        {Array.from({ length }).map((_, i) => (
          <input
            key={i}
            id={`otp-${i}`}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={value[i] || ''}
            onChange={(e) => handleDigitChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            className={`w-11 h-12 text-center text-lg font-bold tabular-nums rounded-[8px] border bg-white text-[#0C2A1B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F6B3E] ${
              error ? 'border-[#B42318]' : 'border-[#DCE8E0] focus:border-[#0F6B3E]'
            }`}
          />
        ))}
      </div>

      {error && (
        <p className="text-xs text-[#B42318] font-medium">{error}</p>
      )}

      <div className="flex items-center justify-between text-xs text-[#6A7B70] pt-1">
        <span>Didn't receive SMS code?</span>
        {timer > 0 ? (
          <span className="tabular-nums font-mono text-[#A3B1A8]">Resend in {timer}s</span>
        ) : (
          <button
            type="button"
            onClick={() => {
              setTimer(resendSeconds);
              onResend?.();
            }}
            className="text-[#0F6B3E] font-semibold hover:underline cursor-pointer"
          >
            Resend Code
          </button>
        )}
      </div>
    </div>
  );
};
