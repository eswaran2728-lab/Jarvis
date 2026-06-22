'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, MessageCircle, Dumbbell, CheckSquare, Settings } from 'lucide-react'

const navItems = [
  { href: '/dashboard', icon: Home, label: 'Home' },
  { href: '/assistant', icon: MessageCircle, label: 'Chat' },
  { href: '/training', icon: Dumbbell, label: 'Train' },
  { href: '/tasks', icon: CheckSquare, label: 'Tasks' },
  { href: '/settings', icon: Settings, label: 'Settings' },
]

export default function BottomNav() {
  const pathname = usePathname()
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 lg:hidden glass border-t border-jarvis-border">
      <div className="flex items-center justify-around px-2 py-2">
        {navItems.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link key={href} href={href} className="flex flex-col items-center gap-1 px-3 py-1">
              <Icon size={22} className={active ? 'text-jarvis-blue' : 'text-slate-500'} />
              <span className={`text-xs ${active ? 'text-jarvis-blue' : 'text-slate-500'}`}>{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
