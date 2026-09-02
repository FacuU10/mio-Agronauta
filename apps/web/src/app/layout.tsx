import type { Metadata } from 'next'
import { QueryProvider } from '@/lib/query-client'
import { buildRouteMetadata } from '@/lib/route-contracts'
import './globals.css'

export const metadata: Metadata = buildRouteMetadata('/')

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body className="min-h-screen bg-[var(--background)] text-[var(--foreground)] antialiased">
        <QueryProvider>
          <a
            className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-amber-200 focus:px-4 focus:py-3 focus:font-semibold focus:text-stone-950"
            href="#main-content"
          >
            Saltar al contenido principal
          </a>
          {children}
        </QueryProvider>
      </body>
    </html>
  )
}
