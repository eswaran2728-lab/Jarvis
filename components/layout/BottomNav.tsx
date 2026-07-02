'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Video, Bookmark, BookOpen, MessageCircle } from 'lucide-react'

const nav = [
  { href: '/dashboard',  icon: Home,          label: 'Dashboard' },
  { href: '/analysis',   icon: Video,         label: 'Analysis'  },
  { href: '/memory',     icon: Bookmark,      label: 'Memory'    },
  { href: '/academy',    icon: BookOpen,      label: 'Academy'   },
  { href: '/assistant',  icon: MessageCircle, label: 'ORION'     },
]

export default function BottomNav() {
  const pathname = usePathname()
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 lg:hidden safe-area-bottom"
      style={{ background: 'rgba(3,6,15,0.92)', backdropFilter: 'blur(20px)', borderTop: '1px solid rgba(0,212,255,0.1)' }}>
      {/* Thin neon top line */}
      <div style={{ height: 1, background: 'linear-gradient(90deg, transparent, rgba(0,212,255,0.4), transparent)' }} />
      <div className="flex items-center justify-around px-1 py-2">
        {nav.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
          return (
            <Link key={href} href={href}
              className="relative flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all"
              style={active ? { background: 'rgba(0,212,255,0.08)' } : {}}>
              <Icon size={21}
                style={active
                  ? { color: '#00d4ff', filter: 'drop-shadow(0 0 6px rgba(0,212,255,0.8))' }
                  : { color: '#475569' }} />
              <span className="text-[10px] font-semibold tracking-wide"
                style={{ color: active ? '#00d4ff' : '#475569' }}>
                {label}
              </span>
              {active && <span className="nav-active-dot" />}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
