import React from 'react';
import { Loader2, Check } from 'lucide-react';
import { clsx } from 'clsx';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  isSuccess?: boolean;
  pulseGlow?: boolean;
  icon?: React.ReactNode;
  children?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({
  variant = 'secondary',
  size = 'md',
  isLoading = false,
  isSuccess = false,
  pulseGlow = false,
  icon,
  children,
  className,
  disabled,
  onClick,
  ...props
}, ref) => {
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled || isLoading) return;
    onClick?.(e);
  };

  const baseStyles = "relative inline-flex items-center justify-center font-semibold tracking-wide rounded-lg transition-colors duration-150 select-none overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-600";

  const sizeStyles: Record<ButtonSize, string> = {
    sm: "text-[11px] px-3 py-1.5 gap-1.5 min-h-[32px]",
    md: "text-xs px-4 py-2.5 gap-2 min-h-[40px]",
    lg: "text-sm px-6 py-3.5 gap-2.5 min-h-[48px]"
  };

  const variantStyles: Record<ButtonVariant, string> = {
    primary: "bg-sky-700 text-white hover:bg-sky-800",
    secondary: "liquid-glass border border-white/70 dark:border-white/15 text-slate-800 dark:text-slate-100 hover:bg-white/80 dark:hover:bg-slate-800/80 hover:-translate-y-[1px] neu-flat-sm",
    ghost: "bg-transparent text-slate-600 dark:text-slate-300 hover:bg-white/40 dark:hover:bg-slate-800/40 hover:text-slate-900 dark:hover:text-white",
    danger: "bg-red-500/15 border border-red-500/30 text-red-600 dark:text-red-400 hover:bg-red-500/25 hover:border-red-500/50",
    success: "bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-300 hover:bg-emerald-500/25"
  };

  const glowClass = pulseGlow ? "shadow-[0_0_20px_rgba(6,182,212,0.4)] animate-pulse" : "";
  const disabledClass = disabled || isLoading ? "opacity-50 cursor-not-allowed pointer-events-none" : "cursor-pointer";

  return (
    <button
      ref={(node) => {
        if (typeof ref === 'function') ref(node);
        else if (ref) (ref as any).current = node;
      }}
      disabled={disabled || isLoading}
      onClick={handleClick}
      className={clsx(
        baseStyles,
        sizeStyles[size],
        variantStyles[variant],
        glowClass,
        disabledClass,
        className
      )}
      {...props}
    >
      {/* Content states */}
      {isLoading ? (
        <span className="flex items-center gap-1.5">
          <Loader2 className="w-4 h-4 animate-spin text-current" />
          <span>Processing...</span>
        </span>
      ) : isSuccess ? (
        <span className="flex items-center gap-1.5 text-emerald-500 dark:text-emerald-300">
          <Check className="w-4 h-4" />
          <span>Completed</span>
        </span>
      ) : (
        <>
          {icon && <span className="flex-shrink-0">{icon}</span>}
          {children}
        </>
      )}
    </button>
  );
});

Button.displayName = 'Button';
