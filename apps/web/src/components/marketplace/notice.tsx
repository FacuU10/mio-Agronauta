import { createElement, type ReactNode } from 'react'
import { AlertCircle, PackageOpen } from 'lucide-react'
const React = { createElement }
export function MarketplaceNotice({
  title,
  children,
  error = false,
  onRetry,
}: {
  title: string
  children: ReactNode
  error?: boolean
  onRetry?: () => void
}) {
  const Icon = error ? AlertCircle : PackageOpen
  return (
    <div
      className={`mkt-notice ${error ? 'mkt-notice-error' : ''}`}
      role={error ? 'alert' : 'status'}
    >
      <Icon size={32} strokeWidth={1.5} aria-hidden="true" />
      <h3>{title}</h3>
      <div>{children}</div>
      {onRetry ? (
        <button className="mkt-button mkt-button-outline" onClick={onRetry}>
          Volver a intentar
        </button>
      ) : null}
    </div>
  )
}
