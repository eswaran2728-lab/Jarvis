import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'ESWA JARVIS',
  description: 'AI Training Assistant',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-jarvis-dark text-slate-100 min-h-screen">
        {children}
      </body>
    </html>
  )
}
