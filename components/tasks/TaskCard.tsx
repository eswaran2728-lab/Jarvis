'use client'
import { Task } from '@/types'
import { Check, Trash2 } from 'lucide-react'

interface Props {
  task: Task
  onToggle: (id: string) => void
  onDelete: (id: string) => void
}

const priorityColors = { low: 'text-green-400 bg-green-400/10', medium: 'text-yellow-400 bg-yellow-400/10', high: 'text-red-400 bg-red-400/10' }

export default function TaskCard({ task, onToggle, onDelete }: Props) {
  return (
    <div className={`glass rounded-xl border border-jarvis-border p-4 flex items-center gap-3 transition-all ${task.completed ? 'opacity-50' : ''}`}>
      <button
        onClick={() => onToggle(task.id)}
        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
          task.completed ? 'bg-green-400 border-green-400' : 'border-slate-500 hover:border-jarvis-blue'
        }`}
      >
        {task.completed && <Check size={12} className="text-white" />}
      </button>
      <div className="flex-1 min-w-0">
        <p className={`text-sm ${task.completed ? 'line-through text-slate-500' : 'text-white'}`}>{task.title}</p>
      </div>
      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${priorityColors[task.priority]}`}>
        {task.priority}
      </span>
      <button onClick={() => onDelete(task.id)} className="text-slate-600 hover:text-red-400 transition-colors">
        <Trash2 size={16} />
      </button>
    </div>
  )
}
