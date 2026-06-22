import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'ORION AI — Your Personal AI Command Center',
  description: 'ORION AI — Optimized Real-time Intelligent Operations Network. Your Personal AI Command Center for training, tasks, and productivity.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-orion-dark text-slate-100 min-h-screen">
        {children}
      </body>
    </html>
  )
}
