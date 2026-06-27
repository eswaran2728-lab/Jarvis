'use client'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { useState } from 'react'
import { CombatSkill } from '@/lib/combat/skillLibrary'

type Props = { skill: CombatSkill }

export default function SkillSuggestionCard({ skill }: Props) {
  const [open, setOpen] = useState(false)
  return (
    <div className="rounded-2xl border border-orion-blue/25 bg-orion-blue/5 overflow-hidden">
      <button className="w-full flex items-center gap-3 px-4 py-3 text-left" onClick={() => setOpen(v => !v)}>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-orion-blue text-sm font-black">{skill.name}</span>
          </div>
          <p className="text-slate-400 text-[11px] mt-0.5">{skill.tagline}</p>
        </div>
        {open ? <ChevronUp size={14} className="text-slate-500 flex-shrink-0" /> : <ChevronDown size={14} className="text-slate-500 flex-shrink-0" />}
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-3 border-t border-orion-blue/10">
          <p className="text-slate-300 text-xs leading-relaxed pt-2">{skill.description}</p>

          <div className="space-y-1">
            <p className="text-[10px] text-orion-blue font-semibold uppercase tracking-wide">When to use</p>
            <p className="text-slate-400 text-xs leading-relaxed">{skill.whenToUse}</p>
          </div>

          <div className="space-y-1.5">
            <p className="text-[10px] text-orion-blue font-semibold uppercase tracking-wide">Key Points</p>
            {skill.keyPoints.map((pt, i) => (
              <p key={i} className="text-slate-300 text-xs">→ {pt}</p>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
