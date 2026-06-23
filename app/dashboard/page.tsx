'use client'
import Link from 'next/link'
import AppShell from '@/components/layout/AppShell'
import DashboardCard from '@/components/dashboard/DashboardCard'
import OrionOrb from '@/components/jarvis/OrionOrb'
import VoiceCommandButton from '@/components/jarvis/VoiceCommandButton'
import { mockTasks, mockReminders, mockTrainingSessions } from '@/lib/mockData'
import { Camera, MessageCircle, Bell, Calendar, Swords, TrendingUp, Video, ClipboardList } from 'lucide-react'

const quickActions = [
  { label: 'Start Training', href: '/training', icon: Camera, color: 'text-green-400 bg-green-400/10 border-green-400/30' },
  { label: 'Ask ORION', href: '/assistant', icon: MessageCircle, color: 'text-orion-blue bg-orion-blue/10 border-orion-blue/30' },
  { label: 'Reminders', href: '/reminders', icon: Bell, color: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30' },
  { label: 'Daily Plan', href: '/tasks', icon: Calendar, color: 'text-purple-400 bg-purple-400/10 border-purple-400/30' },
  { label: 'Silambam', href: '/training/silambam', icon: Swords, color: 'text-orange-400 bg-orange-400/10 border-orange-400/30' },
  { label: 'Progress', href: '/progress', icon: TrendingUp, color: 'text-pink-400 bg-pink-400/10 border-pink-400/30' },
  { label: 'Video Analysis', href: '/training/video', icon: Video, color: 'text-cyan-400 bg-cyan-400/10 border-cyan-400/30' },
  { label: 'Athlete Plan', href: '/training/plan', icon: ClipboardList, color: 'text-violet-400 bg-violet-400/10 border-violet-400/30' },
]

export default function DashboardPage() {
  const pendingTasks = mockTasks.filter(t => !t.completed)
  const pendingReminders = mockReminders.filter(r => r.status === 'pending')
  const lastSession = mockTrainingSessions[0]

  return (
    <AppShell>
      <div className="p-4 md:p-6 max-w-4xl mx-auto w-full">
        {/* Header */}
        <div className="mb-6">
          <p className="text-slate-400 text-sm">Good morning,</p>
          <h1 className="text-2xl font-bold text-white">Training Dashboard</h1>
        </div>

        {/* Orb + Voice */}
        <div className="flex items-center justify-between mb-6 glass rounded-2xl border border-orion-border p-6">
          <div>
            <p className="text-xs text-orion-blue uppercase tracking-widest mb-1">Status</p>
            <p className="text-white font-semibold">Sir, ORION is online.</p>
            <p className="text-slate-400 text-sm mt-1">All systems operational.</p>
            {lastSession && (
              <p className="text-slate-400 text-sm mt-2">
                Last session score: <span className="text-orion-blue font-bold">{lastSession.score}/100</span>
              </p>
            )}
          </div>
          <div className="flex flex-col items-center gap-6">
            <OrionOrb size="md" status="idle" />
            <VoiceCommandButton />
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { label: 'Tasks Left', value: pendingTasks.length, color: 'text-yellow-400' },
            { label: 'Reminders', value: pendingReminders.length, color: 'text-orion-blue' },
            { label: 'Best Score', value: Math.max(...mockTrainingSessions.map(s => s.score)), color: 'text-green-400' },
          ].map(({ label, value, color }) => (
            <div key={label} className="glass rounded-xl border border-orion-border p-3 text-center">
              <div className={`text-2xl font-bold ${color}`}>{value}</div>
              <div className="text-xs text-slate-400 mt-1">{label}</div>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <DashboardCard title="Quick Actions" className="mb-6">
          <div className="grid grid-cols-3 lg:grid-cols-4 gap-3">
            {quickActions.map(({ label, href, icon: Icon, color }) => (
              <Link key={href} href={href}
                className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all hover:scale-105 ${color}`}
              >
                <Icon size={22} />
                <span className="text-xs font-medium text-white text-center leading-tight">{label}</span>
              </Link>
            ))}
          </div>
        </DashboardCard>

        {/* Today's Tasks */}
        <DashboardCard title="Today's Tasks" className="mb-6">
          {pendingTasks.slice(0, 3).map(task => (
            <div key={task.id} className="flex items-center gap-3 py-2 border-b border-orion-border last:border-0">
              <div className="w-2 h-2 rounded-full bg-orion-blue flex-shrink-0" />
              <span className="text-sm text-slate-300 flex-1">{task.title}</span>
              <span className={`text-xs ${task.priority === 'high' ? 'text-red-400' : task.priority === 'medium' ? 'text-yellow-400' : 'text-green-400'}`}>
                {task.priority}
              </span>
            </div>
          ))}
          <Link href="/tasks" className="text-xs text-orion-blue mt-3 block hover:underline">View all tasks →</Link>
        </DashboardCard>

        {/* Training summary */}
        <DashboardCard title="Recent Training" glowing>
          {mockTrainingSessions.slice(0, 3).map(s => (
            <div key={s.id} className="flex items-center gap-3 py-2 border-b border-orion-border last:border-0">
              <div className={`text-lg font-bold ${s.score >= 80 ? 'text-green-400' : s.score >= 60 ? 'text-yellow-400' : 'text-red-400'}`}>{s.score}</div>
              <div className="flex-1">
                <div className="text-sm text-white">{s.mode}</div>
                <div className="text-xs text-slate-400">{s.date} · {s.duration} min</div>
              </div>
            </div>
          ))}
          <Link href="/progress" className="text-xs text-orion-blue mt-3 block hover:underline">View full progress →</Link>
        </DashboardCard>
      </div>
    </AppShell>
  )
}
