'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Video, BookOpen, MessageCircle } from 'lucide-react'

const nav = [
  { href: '/dashboard',  icon: Home,          label: 'Dashboard' },
  { href: '/analysis',   icon: Video,         label: 'Analysis'  },
  { href: '/academy',    icon: BookOpen,      label: 'Academy'   },
  { href: '/assistant',  icon: MessageCircle, label: 'ORION'     },
]

export default function BottomNav() {
  const pathname = usePathname()
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 lg:hidden glass border-t border-orion-border safe-area-bottom">
      <div className="flex items-center justify-around px-1 py-2">
        {nav.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
          return (
            <Link key={href} href={href} className="flex flex-col items-center gap-0.5 px-4 py-1 min-w-[60px]">
              <Icon size={22} className={active ? 'text-orion-blue' : 'text-slate-500'} />
              <span className={`text-[10px] font-medium ${active ? 'text-orion-blue' : 'text-slate-500'}`}>{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
