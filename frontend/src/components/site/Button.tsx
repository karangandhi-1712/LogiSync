import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export type ButtonVariant = 'primary' | 'secondary' | 'ghost';
export type ButtonSize = 'md' | 'lg' | 'sm';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leadingIcon?: React.ReactNode;
  trailingIcon?: React.ReactNode;
}

/**
 * The brief's `Button/Primary`, `Button/Secondary`, `Button/Ghost` are one
 * component with a variant rather than three near-identical files — the API is
 * identical, so splitting them would only duplicate the state matrix.
 *
 * Height is fixed per size and the loading state swaps the label in place, so a
 * row of buttons keeps its baseline while a submit is in flight.
 */
const VARIANT: Record<ButtonVariant, string> = {
  primary: 'lw-btn-primary',
  secondary: 'lw-btn-secondary',
  ghost: 'lw-btn-ghost',
};

const SIZE: Record<ButtonSize, string> = {
  // `sm` is a dense-desktop size. Anything on a primary mobile path uses `md`.
  sm: 'h-10 px-3.5 text-[13px]',
  md: '',
  lg: 'h-12 px-6 text-[15px]',
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'primary',
    size = 'md',
    isLoading = false,
    leadingIcon,
    trailingIcon,
    className,
    disabled,
    children,
    ...props
  },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || isLoading}
      aria-busy={isLoading || undefined}
      className={cn('lw-btn', VARIANT[variant], SIZE[size], className)}
      {...props}
    >
      {isLoading ? (
        <>
          <svg
            className="size-4 shrink-0 animate-spin"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden
          >
            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" opacity=".25" />
            <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
          <span>Please wait</span>
        </>
      ) : (
        <>
          {leadingIcon}
          {children}
          {trailingIcon}
        </>
      )}
    </button>
  );
});
