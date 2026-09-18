import React, { useState } from 'react';
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

interface Ripple {
  x: number;
  y: number;
  id: number;
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
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled || isLoading) return;

    // Trigger Material-style ripple originating from exact click coords
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const newRipple = { x, y, id: Date.now() };

    setRipples(prev => [...prev, newRipple]);
    setTimeout(() => {
      setRipples(prev => prev.filter(r => r.id !== newRipple.id));
    }, 600);

    onClick?.(e);
  };

  const baseStyles = "relative inline-flex items-center justify-center font-bold tracking-wide rounded-2xl transition-all duration-150 select-none overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 active:scale-[0.98] active:translate-y-[1px]";

  const sizeStyles: Record<ButtonSize, string> = {
    sm: "text-[11px] px-3 py-1.5 gap-1.5 min-h-[32px]",
    md: "text-xs px-4 py-2.5 gap-2 min-h-[40px]",
    lg: "text-sm px-6 py-3.5 gap-2.5 min-h-[48px]"
  };

  const variantStyles: Record<ButtonVariant, string> = {
    primary: "bg-gradient-to-r from-sky-500 via-cyan-500 to-teal-400 text-white shadow-md hover:shadow-cyan-500/25 hover:-translate-y-[1px]",
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
      {/* Ripple layer */}
      {ripples.map(r => (
        <span
          key={r.id}
          className="absolute rounded-full pointer-events-none bg-white/30 dark:bg-cyan-300/30 animate-ping"
          style={{
            left: r.x,
            top: r.y,
            width: 8,
            height: 8,
            transform: 'translate(-50%, -50%)'
          }}
        />
      ))}

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
