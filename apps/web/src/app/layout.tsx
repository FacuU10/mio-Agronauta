import type { Metadata } from 'next'
import { QueryProvider } from '@/lib/query-client'
import './globals.css'

export const metadata: Metadata = {
  title: 'Agronauta | Inteligencia de riesgo productivo',
  description:
    'Landing pública de Agronauta con acceso directo a la demo del MVP de riesgo arrocero en Corrientes.',
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
