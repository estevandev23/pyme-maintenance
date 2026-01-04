import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'MantenPro - Sistema de Gestión de Mantenimiento',
  description: 'Sistema de gestión de mantenimiento preventivo y correctivo para PYMEs',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es">
      <body className="font-sans antialiased">
        {children}
      </body>
    </html>
  )
}
