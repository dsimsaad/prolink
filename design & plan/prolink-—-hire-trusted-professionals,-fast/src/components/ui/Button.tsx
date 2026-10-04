import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'outline' | 'ghost' | 'danger' | 'secondary';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  className = '',
  disabled,
  ...props
}, ref) => {
  const base = "inline-flex items-center justify-center font-medium transition-colors duration-150 select-none whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F6B3E] focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none cursor-pointer";

  const sizeClasses = {
    sm: "h-8 px-3 text-xs rounded-[8px] gap-1.5",
    md: "h-10 px-4 text-sm rounded-[8px] gap-2",
    lg: "h-12 px-6 text-base rounded-[8px] gap-2.5 font-semibold",
    icon: "h-9 w-9 rounded-[8px] p-0"
  }[size];

  const variantClasses = {
    primary: "bg-[#0F6B3E] text-white hover:bg-[#0B5632] active:bg-[#084626] shadow-xs",
    outline: "bg-white text-[#0C2A1B] border border-[#DCE8E0] hover:bg-[#F4FAF6] active:bg-[#E6F4EA]",
    ghost: "bg-transparent text-[#0C2A1B] hover:bg-[#F4FAF6] active:bg-[#E6F4EA]",
    secondary: "bg-[#E6F4EA] text-[#0F6B3E] hover:bg-[#CDE9D6] active:bg-[#A9D3B5]",
    danger: "bg-[#FEF2F2] text-[#B42318] border border-[#FECACA] hover:bg-[#FEE2E2]"
  }[variant];

  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={`${base} ${sizeClasses} ${variantClasses} ${className}`}
      {...props}
    >
      {loading ? (
        <span className="inline-flex items-center gap-2">
          <svg className="animate-spin h-4 w-4 text-current" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span>{children}</span>
        </span>
      ) : children}
    </button>
  );
});

Button.displayName = 'Button';
