import type { Metadata } from 'next'
import { QueryProvider } from '@/lib/query-client'
import './globals.css'

export const metadata: Metadata = {
  title: 'Agronautas MVP',
  description: 'Intake, dashboard y alertas auditables para riesgo arrocero en Corrientes',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body className="min-h-screen bg-[var(--background)] text-[var(--foreground)] antialiased">
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  )
}
