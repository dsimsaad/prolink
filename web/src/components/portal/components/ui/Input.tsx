import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(({
  label,
  error,
  hint,
  leftIcon,
  rightIcon,
  className = '',
  disabled,
  id,
  ...props
}, ref) => {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className="w-full space-y-1.5">
      {label && (
        <label htmlFor={inputId} className="block text-xs font-semibold text-[#0C2A1B]">
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        {leftIcon && (
          <div className="absolute left-3 text-[#6A7B70] pointer-events-none flex items-center">
            {leftIcon}
          </div>
        )}
        <input
          ref={ref}
          id={inputId}
          disabled={disabled}
          className={`w-full h-10 px-3 text-sm bg-white text-[#0C2A1B] border rounded-[8px] transition-colors placeholder:text-[#A3B1A8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F6B3E] focus-visible:ring-offset-1 disabled:bg-[#F4FAF6] disabled:text-[#A3B1A8] disabled:cursor-not-allowed ${
            leftIcon ? 'pl-9' : ''
          } ${rightIcon ? 'pr-9' : ''} ${
            error
              ? 'border-[#B42318] focus-visible:ring-[#B42318]'
              : 'border-[#DCE8E0] hover:border-[#A9D3B5] focus:border-[#0F6B3E]'
          } ${className}`}
          {...props}
        />
        {rightIcon && (
          <div className="absolute right-3 text-[#6A7B70] flex items-center">
            {rightIcon}
          </div>
        )}
      </div>
      {error && (
        <p className="text-xs text-[#B42318] font-medium">{error}</p>
      )}
      {hint && !error && (
        <p className="text-xs text-[#6A7B70]">{hint}</p>
      )}
    </div>
  );
});

Input.displayName = 'Input';
