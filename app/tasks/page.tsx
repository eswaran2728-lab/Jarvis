'use client'
import { useState } from 'react'
import AppShell from '@/components/layout/AppShell'
import TaskCard from '@/components/tasks/TaskCard'
import { Task } from '@/types'
import { mockTasks } from '@/lib/mockData'
import { Plus } from 'lucide-react'

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>(mockTasks)
  const [newTitle, setNewTitle] = useState('')
  const [priority, setPriority] = useState<Task['priority']>('medium')

  function addTask() {
    if (!newTitle.trim()) return
    const task: Task = {
      id: Date.now().toString(),
      title: newTitle.trim(),
      completed: false,
      priority,
      createdAt: new Date().toISOString(),
    }
    setTasks(prev => [task, ...prev])
    setNewTitle('')
  }

  function toggleTask(id: string) {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, completed: !t.completed } : t))
  }

  function deleteTask(id: string) {
    setTasks(prev => prev.filter(t => t.id !== id))
  }

  const pending = tasks.filter(t => !t.completed)
  const done = tasks.filter(t => t.completed)

  return (
    <AppShell>
      <div className="p-4 md:p-6 max-w-2xl mx-auto w-full">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white">Task Manager</h1>
          <p className="text-slate-400 text-sm mt-1">{pending.length} pending · {done.length} completed</p>
        </div>

        {/* Add task */}
        <div className="glass rounded-2xl border border-jarvis-border p-4 mb-6 space-y-3">
          <input
            value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addTask()}
            placeholder="Add a new task..."
            className="w-full bg-jarvis-navy border border-jarvis-border rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-jarvis-blue/50"
          />
          <div className="flex gap-2 items-center">
            {(['low', 'medium', 'high'] as const).map(p => (
              <button
                key={p}
                onClick={() => setPriority(p)}
                className={`text-xs px-3 py-1.5 rounded-full border transition-all capitalize ${
                  priority === p
                    ? p === 'high' ? 'bg-red-400/20 border-red-400 text-red-400'
                    : p === 'medium' ? 'bg-yellow-400/20 border-yellow-400 text-yellow-400'
                    : 'bg-green-400/20 border-green-400 text-green-400'
                    : 'border-jarvis-border text-slate-500'
                }`}
              >
                {p}
              </button>
            ))}
            <button
              onClick={addTask}
              className="ml-auto flex items-center gap-1 px-4 py-1.5 rounded-xl bg-jarvis-blue/20 border border-jarvis-blue/40 text-jarvis-blue text-sm hover:bg-jarvis-blue/30 transition-colors"
            >
              <Plus size={16} /> Add
            </button>
          </div>
        </div>

        {/* Pending tasks */}
        {pending.length > 0 && (
          <div className="mb-6 space-y-2">
            <p className="text-xs text-jarvis-blue uppercase tracking-widest mb-3">Pending ({pending.length})</p>
            {pending.map(t => <TaskCard key={t.id} task={t} onToggle={toggleTask} onDelete={deleteTask} />)}
          </div>
        )}

        {/* Completed */}
        {done.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs text-slate-500 uppercase tracking-widest mb-3">Completed ({done.length})</p>
            {done.map(t => <TaskCard key={t.id} task={t} onToggle={toggleTask} onDelete={deleteTask} />)}
          </div>
        )}
      </div>
    </AppShell>
  )
}
