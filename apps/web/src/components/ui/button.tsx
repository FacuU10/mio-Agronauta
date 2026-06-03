import * as React from 'react'
import { cn } from '@/lib/utils'

type ButtonVariant = 'default' | 'secondary' | 'outline' | 'ghost' | 'destructive'

const variants: Record<ButtonVariant, string> = {
  default: 'bg-[var(--primary)] text-[var(--primary-foreground)] hover:opacity-90',
  secondary: 'bg-[var(--secondary)] text-[var(--secondary-foreground)] hover:opacity-90',
  outline: 'border border-[var(--border)] bg-white text-[var(--foreground)] hover:bg-[var(--muted)]',
  ghost: 'text-[var(--foreground)] hover:bg-[var(--muted)]',
  destructive: 'bg-[var(--destructive)] text-[var(--destructive-foreground)] hover:opacity-90',
}

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
}

export function Button({ className, variant = 'default', type = 'button', ...props }: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex h-10 items-center justify-center rounded-xl px-4 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] disabled:cursor-not-allowed disabled:opacity-50',
        variants[variant],
        className,
      )}
      {...props}
    />
  )
}
