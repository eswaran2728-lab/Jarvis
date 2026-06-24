'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { Home, MessageCircle, Dumbbell, CheckSquare, Settings, Swords, Video, Library, BookOpen, Bell, TrendingUp, ClipboardList, X, Menu } from 'lucide-react'

const mainNav = [
  { href: '/dashboard', icon: Home, label: 'Home' },
  { href: '/assistant', icon: MessageCircle, label: 'Chat' },
  { href: '/training/video', icon: Video, label: 'Video' },
  { href: '/training/skill-library', icon: Library, label: 'Skills' },
  { href: '/more', icon: Menu, label: 'More' },
]

const moreItems = [
  { href: '/training', icon: Dumbbell, label: 'Training' },
  { href: '/training/silambam', icon: Swords, label: 'Silambam' },
  { href: '/training/silambam/rules', icon: BookOpen, label: 'Combat Rules' },
  { href: '/training/plan', icon: ClipboardList, label: 'Athlete Plan' },
  { href: '/tasks', icon: CheckSquare, label: 'Tasks' },
  { href: '/reminders', icon: Bell, label: 'Reminders' },
  { href: '/progress', icon: TrendingUp, label: 'Progress' },
  { href: '/settings', icon: Settings, label: 'Settings' },
]

export default function BottomNav() {
  const pathname = usePathname()
  const [showMore, setShowMore] = useState(false)

  const isMoreActive = moreItems.some(i => pathname === i.href || pathname.startsWith(i.href + '/'))

  return (
    <>
      {/* More drawer */}
      {showMore && (
        <div className="fixed inset-0 z-40 lg:hidden" onClick={() => setShowMore(false)}>
          <div className="absolute inset-0 bg-black/60" />
          <div className="absolute bottom-16 left-0 right-0 glass border-t border-orion-border rounded-t-3xl p-4 pb-6"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <span className="text-white font-bold text-sm">All Pages</span>
              <button onClick={() => setShowMore(false)} className="p-1 text-slate-400"><X size={18} /></button>
            </div>
            <div className="grid grid-cols-4 gap-3">
              {moreItems.map(({ href, icon: Icon, label }) => {
                const active = pathname === href || pathname.startsWith(href + '/')
                return (
                  <Link key={href} href={href} onClick={() => setShowMore(false)}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl transition-all ${active ? 'bg-orion-blue/20 border border-orion-blue/40' : 'bg-slate-800/60 border border-slate-700'}`}>
                    <Icon size={20} className={active ? 'text-orion-blue' : 'text-slate-400'} />
                    <span className={`text-[10px] text-center font-medium leading-tight ${active ? 'text-orion-blue' : 'text-slate-400'}`}>{label}</span>
                  </Link>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Bottom bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 lg:hidden glass border-t border-orion-border safe-area-bottom">
        <div className="flex items-center justify-around px-1 py-2">
          {mainNav.map(({ href, icon: Icon, label }) => {
            if (href === '/more') {
              const active = isMoreActive || showMore
              return (
                <button key="more" onClick={() => setShowMore(v => !v)}
                  className="flex flex-col items-center gap-0.5 px-3 py-1 min-w-[56px]">
                  {showMore
                    ? <X size={22} className="text-orion-blue" />
                    : <Menu size={22} className={active ? 'text-orion-blue' : 'text-slate-500'} />
                  }
                  <span className={`text-[10px] ${active ? 'text-orion-blue' : 'text-slate-500'}`}>More</span>
                </button>
              )
            }
            const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href.split('/').slice(0, 2).join('/') + '/') && !moreItems.some(m => pathname.startsWith(m.href)))
            return (
              <Link key={href} href={href} className="flex flex-col items-center gap-0.5 px-3 py-1 min-w-[56px]">
                <Icon size={22} className={active ? 'text-orion-blue' : 'text-slate-500'} />
                <span className={`text-[10px] ${active ? 'text-orion-blue' : 'text-slate-500'}`}>{label}</span>
              </Link>
            )
          })}
        </div>
      </nav>
    </>
  )
}
