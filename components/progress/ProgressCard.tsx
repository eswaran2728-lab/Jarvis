import { Skill } from '@/types'

interface Props { skill: Skill }

export default function ProgressCard({ skill }: Props) {
  const pct = (skill.level / skill.maxLevel) * 100
  return (
    <div className="glass rounded-xl border border-jarvis-border p-4">
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm text-white font-medium">{skill.name}</span>
        <span className="text-xs text-jarvis-blue">{skill.level}/{skill.maxLevel}</span>
      </div>
      <div className="h-2 bg-jarvis-border rounded-full overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-jarvis-blue to-blue-400 transition-all duration-700"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="mt-1 text-xs text-slate-500">{skill.category}</div>
    </div>
  )
}
