import { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface DashboardCardProps {
  title: string
  children: ReactNode
  className?: string
  glowing?: boolean
}

export default function DashboardCard({ title, children, className, glowing }: DashboardCardProps) {
  return (
    <div className={cn(
      'glass rounded-2xl p-4 border border-jarvis-border',
      glowing && 'glow-blue border-jarvis-blue/30',
      className
    )}>
      <h3 className="text-xs font-semibold text-jarvis-blue uppercase tracking-widest mb-3">{title}</h3>
      {children}
    </div>
  )
}
