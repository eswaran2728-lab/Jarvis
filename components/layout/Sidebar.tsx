'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, MessageCircle, Dumbbell, CheckSquare, Bell, TrendingUp, Settings, Video, ClipboardList, BookOpen, Bookmark } from 'lucide-react'

const navItems = [
  { href: '/dashboard',  icon: Home,          label: 'Dashboard'    },
  { href: '/analysis',   icon: Video,         label: 'Analysis'     },
  { href: '/memory',     icon: Bookmark,      label: 'ORION Memory' },
  { href: '/academy',    icon: BookOpen,      label: 'Academy'      },
  { href: '/assistant',  icon: MessageCircle, label: 'ORION'        },
  { href: '/training',   icon: Dumbbell,      label: 'Training'     },
  { href: '/training/plan', icon: ClipboardList, label: 'Athlete Plan' },
  { href: '/tasks',      icon: CheckSquare,   label: 'Tasks'        },
  { href: '/reminders',  icon: Bell,          label: 'Reminders'    },
  { href: '/progress',   icon: TrendingUp,    label: 'Progress'     },
  { href: '/settings',   icon: Settings,      label: 'Settings'     },
]

export default function Sidebar() {
  const pathname = usePathname()
  return (
    <aside className="hidden lg:flex flex-col w-64 min-h-screen glass border-r border-orion-border p-6">
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-2 h-2 rounded-full bg-orion-blue animate-pulse" />
          <span className="text-orion-blue text-xs font-semibold tracking-widest uppercase">Online</span>
        </div>
        <div className="text-orion-blue text-3xl font-black glow-text tracking-widest leading-none">ORION</div>
        <div className="text-white text-xl font-bold tracking-widest">AI</div>
        <div className="text-slate-500 text-xs mt-1 leading-relaxed">Your Personal AI<br />Command Center</div>
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
                  ? 'bg-orion-blue/20 text-orion-blue border border-orion-blue/30 glow-blue'
                  : 'text-slate-400 hover:text-orion-blue hover:bg-white/5'
              }`}
            >
              <Icon size={18} />
              <span className="text-sm font-medium">{label}</span>
            </Link>
          )
        })}
      </nav>
      <div className="mt-auto text-xs text-slate-500 text-center pt-4 border-t border-orion-border">
        ORION AI v1.0 · Safe Training Only
      </div>
    </aside>
  )
}
