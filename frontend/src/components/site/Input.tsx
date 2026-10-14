import React from 'react';
import { cn } from './Button';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
  /** Trailing control, e.g. the password show/hide toggle. */
  trailing?: React.ReactNode;
}

/**
 * Height is locked to 48px which clears the 44px touch minimum with room to
 * spare, and the focus ring is drawn as a soft halo rather than a hard outline
 * so a dense form still reads as one system.
 */
export const Input = React.forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, invalid, trailing, ...props },
  ref,
) {
  return (
    <div className="relative">
      <input
        ref={ref}
        aria-invalid={invalid || undefined}
        className={cn('lw-input', trailing && 'pr-12', className)}
        {...props}
      />
      {trailing && (
        <div className="absolute inset-y-0 right-1.5 flex items-center">{trailing}</div>
      )}
    </div>
  );
});

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  invalid?: boolean;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { className, invalid, children, ...props },
  ref,
) {
  return (
    <select
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn('lw-input', className)}
      {...props}
    >
      {children}
    </select>
  );
});

export interface FieldProps {
  label: React.ReactNode;
  htmlFor?: string;
  hint?: React.ReactNode;
  error?: React.ReactNode;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}

/** One place that decides how a label, hint and error look, so they match everywhere. */
export function Field({
  label,
  htmlFor,
  hint,
  error,
  required,
  className,
  children,
}: FieldProps) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <label htmlFor={htmlFor} className="block text-sm font-medium text-[var(--lw-ink)]">
        {label}
        {required && <span className="ml-0.5 text-[var(--lw-red)]">*</span>}
      </label>

      {children}

      {error ? (
        <p className="flex items-start gap-1.5 text-[13px] leading-5 text-[var(--lw-red)]" role="alert">
          <svg className="mt-0.5 size-4 shrink-0" viewBox="0 0 24 24" fill="none" aria-hidden>
            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
            <path d="M12 7.5v5M12 16h.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <span>{error}</span>
        </p>
      ) : hint ? (
        <p className="text-[13px] leading-5 text-[var(--lw-ink-3)]">{hint}</p>
      ) : null}
    </div>
  );
}

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: React.ReactNode;
  description?: React.ReactNode;
}

/** Label wraps the input so the whole line is the hit target. */
export function Checkbox({ label, description, className, id, ...props }: CheckboxProps) {
  return (
    <label htmlFor={id} className={cn('flex cursor-pointer items-start gap-2.5', className)}>
      <input id={id} type="checkbox" className="lw-check mt-0.5" {...props} />
      <span className="min-w-0 text-sm leading-6 text-[var(--lw-ink-2)]">
        {label}
        {description && <span className="block text-[13px] text-[var(--lw-ink-3)]">{description}</span>}
      </span>
    </label>
  );
}
