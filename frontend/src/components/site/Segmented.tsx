import React from 'react';
import { cn } from './Button';

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  hint?: string;
}

export interface SegmentedProps<T extends string> {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Rendered as a radiogroup when the choice sets intent, otherwise tabs. */
  mode?: 'radio' | 'tab';
  ariaLabel: string;
  className?: string;
}

/**
 * Segmented control. Kept on a native radio input so arrow-key navigation and
 * screen-reader semantics come for free instead of being re-implemented.
 */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  mode = 'radio',
  ariaLabel,
  className,
}: SegmentedProps<T>) {
  return (
    <div
      role={mode === 'radio' ? 'radiogroup' : 'tablist'}
      aria-label={ariaLabel}
      className={cn('lw-segmented', className)}
    >
      {options.map((opt) => {
        const selected = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role={mode === 'radio' ? 'radio' : 'tab'}
            aria-checked={mode === 'radio' ? selected : undefined}
            aria-selected={mode === 'tab' ? selected : undefined}
            title={opt.hint}
            onClick={() => onChange(opt.value)}
            className="lw-segment"
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

/** Small inline toggle used for the password reveal. */
export function IconToggle({
  label,
  onClick,
  children,
  className,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn(
        // 44px minimum so the control clears the touch-target floor on a phone.
        'grid size-11 place-items-center rounded-lg text-[var(--lw-ink-3)] transition-colors',
        'hover:bg-[var(--lw-line-2)] hover:text-[var(--lw-ink)]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--lw-blue)]',
        className,
      )}
    >
      {children}
    </button>
  );
}
