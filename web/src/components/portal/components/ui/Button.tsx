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
  const base = "inline-flex items-center justify-center font-medium transition-all duration-200 select-none whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--forest)] focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none cursor-pointer";

  const sizeClasses = {
    sm: "h-8 px-3.5 text-xs rounded-xl gap-1.5",
    md: "h-10 px-4 text-sm rounded-xl gap-2 font-semibold",
    lg: "h-12 px-6 text-base rounded-2xl gap-2.5 font-semibold",
    icon: "h-9 w-9 rounded-xl p-0"
  }[size];

  const variantClasses = {
    primary: "bg-[var(--forest)] text-white hover:bg-[var(--forest-hover)] active:bg-[var(--forest-active)] shadow-xs hover:shadow-sm",
    outline: "bg-white text-[var(--ink)] border border-[var(--border)] hover:bg-[var(--surface-mint)] hover:border-[var(--forest)] active:bg-[var(--mint)]",
    ghost: "bg-transparent text-[var(--ink)] hover:bg-[var(--surface-mint)] active:bg-[var(--mint)]",
    secondary: "bg-[var(--mint)] text-[var(--forest)] hover:bg-[#cde9d6] active:bg-[#a9d3b5]",
    danger: "bg-[var(--danger-soft)] text-[var(--danger-fg)] border border-[var(--danger-border)] hover:bg-[var(--danger-bg)]"
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
