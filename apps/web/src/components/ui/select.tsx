import * as React from 'react'
import { cn } from '@/lib/utils'

export function Select({ className, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn('flex h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--input)] px-3 py-2 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-[var(--ring)]', className)}
      {...props}
    />
  )
}
