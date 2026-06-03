import * as React from 'react'
import { cn } from '@/lib/utils'

const variants = {
  default: 'bg-[var(--secondary)] text-[var(--secondary-foreground)]',
  success: 'bg-emerald-100 text-emerald-800',
  warning: 'bg-amber-100 text-amber-800',
  destructive: 'bg-rose-100 text-rose-800',
  outline: 'border border-[var(--border)] bg-white text-[var(--foreground)]',
} as const

export function Badge({ className, variant = 'default', ...props }: React.HTMLAttributes<HTMLSpanElement> & { variant?: keyof typeof variants }) {
  return <span className={cn('inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium', variants[variant], className)} {...props} />
}
