import React from 'react';
import { cn } from './Button';

export function Card({
  className,
  interactive,
  flush,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { interactive?: boolean; flush?: boolean }) {
  return (
    <div
      className={cn('lw-card', !flush && 'p-6', interactive && 'lw-card-hover', className)}
      {...props}
    />
  );
}

export function CardBody({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('p-6', className)} {...props} />;
}

export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn('text-base font-semibold text-[var(--lw-ink)]', className)}
      {...props}
    />
  );
}

export function CardText({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn('lw-body text-[var(--lw-ink-3)]', className)}
      {...props}
    />
  );
}

export type BadgeTone = 'blue' | 'teal' | 'amber' | 'slate';

export function Badge({
  tone = 'slate',
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: BadgeTone }) {
  return (
    <span className={cn('lw-badge', `lw-badge-${tone}`, className)} {...props}>
      {children}
    </span>
  );
}

/** Section eyebrow - the short uppercase label above a heading. */
export function Eyebrow({
  className,
  tone = 'blue',
  ...props
}: React.HTMLAttributes<HTMLParagraphElement> & { tone?: 'blue' | 'teal' }) {
  return (
    <p
      className={cn(
        'lw-eyebrow',
        tone === 'teal' ? 'text-[var(--lw-teal)]' : 'text-[var(--lw-blue)]',
        className,
      )}
      {...props}
    />
  );
}
