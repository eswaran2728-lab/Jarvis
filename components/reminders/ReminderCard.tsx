'use client'
import { Reminder } from '@/types'
import { Bell, Check, Trash2 } from 'lucide-react'
import { formatDate, formatTime } from '@/lib/utils'

interface Props {
  reminder: Reminder
  onMarkDone: (id: string) => void
  onDelete: (id: string) => void
}

const statusColors = {
  pending: 'text-orion-blue bg-orion-blue/10',
  done: 'text-green-400 bg-green-400/10',
  missed: 'text-red-400 bg-red-400/10',
}

export default function ReminderCard({ reminder, onMarkDone, onDelete }: Props) {
  return (
    <div className="glass rounded-xl border border-orion-border p-4 flex items-center gap-3">
      <Bell size={18} className={reminder.status === 'done' ? 'text-green-400' : 'text-orion-blue'} />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-white">{reminder.title}</p>
        <p className="text-xs text-slate-400">{formatDate(reminder.datetime)} · {formatTime(reminder.datetime)}</p>
      </div>
      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[reminder.status]}`}>
        {reminder.status}
      </span>
      {reminder.status === 'pending' && (
        <button onClick={() => onMarkDone(reminder.id)} className="text-slate-600 hover:text-green-400 transition-colors">
          <Check size={16} />
        </button>
      )}
      <button onClick={() => onDelete(reminder.id)} className="text-slate-600 hover:text-red-400 transition-colors">
        <Trash2 size={16} />
      </button>
    </div>
  )
}
