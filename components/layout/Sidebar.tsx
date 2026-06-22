'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, MessageCircle, Dumbbell, CheckSquare, Bell, TrendingUp, Settings, Swords } from 'lucide-react'

const navItems = [
  { href: '/dashboard', icon: Home, label: 'Dashboard' },
  { href: '/assistant', icon: MessageCircle, label: 'Assistant' },
  { href: '/training', icon: Dumbbell, label: 'Training' },
  { href: '/training/silambam', icon: Swords, label: 'Silambam' },
  { href: '/tasks', icon: CheckSquare, label: 'Tasks' },
  { href: '/reminders', icon: Bell, label: 'Reminders' },
  { href: '/progress', icon: TrendingUp, label: 'Progress' },
  { href: '/settings', icon: Settings, label: 'Settings' },
]

export default function Sidebar() {
  const pathname = usePathname()
  return (
    <aside className="hidden lg:flex flex-col w-64 min-h-screen glass border-r border-jarvis-border p-6">
      <div className="mb-8">
        <div className="text-jarvis-blue text-2xl font-bold glow-text tracking-widest">ESWA</div>
        <div className="text-white text-3xl font-black tracking-widest">JARVIS</div>
        <div className="text-slate-400 text-xs mt-1">AI Training Assistant</div>
      </div>
      <nav className="flex flex-col gap-1 flex-1">
        {navItems.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || (href !== '/training' && pathname.startsWith(href + '/')) || (href === '/training' && pathname === '/training')
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                active
                  ? 'bg-jarvis-blue/20 text-jarvis-blue border border-jarvis-blue/30 glow-blue'
                  : 'text-slate-400 hover:text-jarvis-blue hover:bg-white/5'
              }`}
            >
              <Icon size={18} />
              <span className="text-sm font-medium">{label}</span>
            </Link>
          )
        })}
      </nav>
      <div className="mt-auto text-xs text-slate-500 text-center pt-4 border-t border-jarvis-border">
        JARVIS v1.0 · Safe Training Only
      </div>
    </aside>
  )
}
