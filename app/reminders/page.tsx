'use client'
import { useState } from 'react'
import AppShell from '@/components/layout/AppShell'
import ReminderCard from '@/components/reminders/ReminderCard'
import { Reminder } from '@/types'
import { mockReminders } from '@/lib/mockData'
import { Plus } from 'lucide-react'

export default function RemindersPage() {
  const [reminders, setReminders] = useState<Reminder[]>(mockReminders)
  const [title, setTitle] = useState('')
  const [datetime, setDatetime] = useState('')

  function addReminder() {
    if (!title.trim() || !datetime) return
    const r: Reminder = {
      id: Date.now().toString(),
      title: title.trim(),
      datetime,
      status: 'pending',
    }
    setReminders(prev => [r, ...prev])
    setTitle('')
    setDatetime('')
  }

  function markDone(id: string) {
    setReminders(prev => prev.map(r => r.id === id ? { ...r, status: 'done' as const } : r))
  }

  function deleteReminder(id: string) {
    setReminders(prev => prev.filter(r => r.id !== id))
  }

  return (
    <AppShell>
      <div className="p-4 md:p-6 max-w-2xl mx-auto w-full">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white">Reminders</h1>
          <p className="text-slate-400 text-sm mt-1">{reminders.filter(r => r.status === 'pending').length} pending reminders</p>
        </div>

        {/* Add reminder */}
        <div className="glass rounded-2xl border border-orion-border p-4 mb-6 space-y-3">
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Reminder title..."
            className="w-full bg-orion-navy border border-orion-border rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-orion-blue/50"
          />
          <div className="flex gap-2">
            <input
              type="datetime-local"
              value={datetime}
              onChange={e => setDatetime(e.target.value)}
              className="flex-1 bg-orion-navy border border-orion-border rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-orion-blue/50"
            />
            <button
              onClick={addReminder}
              className="flex items-center gap-1 px-4 py-3 rounded-xl bg-orion-blue/20 border border-orion-blue/40 text-orion-blue text-sm hover:bg-orion-blue/30 transition-colors"
            >
              <Plus size={16} /> Add
            </button>
          </div>
        </div>

        {/* List */}
        <div className="space-y-2">
          {reminders.map(r => (
            <ReminderCard key={r.id} reminder={r} onMarkDone={markDone} onDelete={deleteReminder} />
          ))}
        </div>
      </div>
    </AppShell>
  )
}
