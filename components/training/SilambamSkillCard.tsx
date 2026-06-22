'use client'
import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'

interface SilambamSkill {
  id: string
  name: string
  instructions: string[]
  mistakes: string[]
  feedback: string
  homework: string
}

interface Props {
  skill: SilambamSkill
}

export default function SilambamSkillCard({ skill }: Props) {
  const [open, setOpen] = useState(false)
  return (
    <div className="glass rounded-2xl border border-orion-border overflow-hidden">
      <button
        className="w-full flex items-center justify-between p-4 text-left hover:bg-white/5 transition-colors"
        onClick={() => setOpen(o => !o)}
      >
        <span className="font-semibold text-white text-sm">{skill.name}</span>
        {open ? <ChevronUp size={18} className="text-orion-blue" /> : <ChevronDown size={18} className="text-slate-400" />}
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-3 border-t border-orion-border">
          <div>
            <p className="text-xs font-semibold text-orion-blue mb-1 uppercase tracking-widest">Instructions</p>
            <ul className="space-y-1">
              {skill.instructions.map((ins, i) => (
                <li key={i} className="text-sm text-slate-300 flex gap-2"><span className="text-orion-blue">•</span>{ins}</li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-xs font-semibold text-red-400 mb-1 uppercase tracking-widest">Common Mistakes</p>
            <ul className="space-y-1">
              {skill.mistakes.map((m, i) => (
                <li key={i} className="text-sm text-slate-400 flex gap-2"><span className="text-red-400">!</span>{m}</li>
              ))}
            </ul>
          </div>
          <div className="bg-orion-blue/10 border border-orion-blue/30 rounded-xl px-3 py-2">
            <p className="text-xs font-semibold text-orion-blue mb-1">ORION Says</p>
            <p className="text-sm text-slate-200 italic">&quot;{skill.feedback}&quot;</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-green-400 mb-1 uppercase tracking-widest">Practice Homework</p>
            <p className="text-sm text-slate-300">{skill.homework}</p>
          </div>
        </div>
      )}
    </div>
  )
}
