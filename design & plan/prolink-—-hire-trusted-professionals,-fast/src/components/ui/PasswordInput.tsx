import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Input, InputProps } from './Input';

export interface PasswordInputProps extends Omit<InputProps, 'type' | 'rightIcon'> {
  showStrengthMeter?: boolean;
}

export const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(({
  showStrengthMeter = false,
  value,
  onChange,
  ...props
}, ref) => {
  const [show, setShow] = useState(false);
  const pwdValue = String(value || '');

  // Calculate password strength (0-4)
  let strength = 0;
  if (pwdValue.length >= 8) strength++;
  if (/[A-Z]/.test(pwdValue)) strength++;
  if (/[0-9]/.test(pwdValue)) strength++;
  if (/[^A-Za-z0-9]/.test(pwdValue)) strength++;

  const strengthLabels = ['Too weak', 'Weak', 'Fair', 'Good', 'Strong'];
  const strengthColors = ['bg-neutral-200', 'bg-[#B42318]', 'bg-[#C77D0A]', 'bg-[#2FAE60]', 'bg-[#0F6B3E]'];

  return (
    <div className="w-full space-y-1.5">
      <Input
        ref={ref}
        type={show ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        rightIcon={
          <button
            type="button"
            onClick={() => setShow(!show)}
            className="text-[#6A7B70] hover:text-[#0C2A1B] cursor-pointer focus:outline-none"
            tabIndex={-1}
          >
            {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        }
        {...props}
      />

      {showStrengthMeter && pwdValue.length > 0 && (
        <div className="space-y-1 pt-1">
          <div className="flex gap-1.5 h-1.5">
            {[1, 2, 3, 4].map((step) => (
              <div
                key={step}
                className={`flex-1 rounded-full transition-all duration-200 ${
                  strength >= step ? strengthColors[strength] : 'bg-[#E6F4EA]'
                }`}
              />
            ))}
          </div>
          <div className="flex justify-between items-center text-[11px] text-[#6A7B70]">
            <span>Strength: <strong className="text-[#0C2A1B]">{strengthLabels[strength]}</strong></span>
            <span>Use 8+ chars, upper & numbers</span>
          </div>
        </div>
      )}
    </div>
  );
});

PasswordInput.displayName = 'PasswordInput';
