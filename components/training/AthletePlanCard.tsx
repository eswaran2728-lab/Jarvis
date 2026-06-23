'use client'

interface AthletePlanCardProps {
  exercise: string
  detail: string
  difficulty: 'Easy' | 'Medium' | 'Hard' | 'Elite'
  tip: string
  completed: boolean
  onToggle: () => void
}

const difficultyColors: Record<string, string> = {
  Easy: 'text-green-400 bg-green-400/10 border-green-400/30',
  Medium: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30',
  Hard: 'text-orange-400 bg-orange-400/10 border-orange-400/30',
  Elite: 'text-red-400 bg-red-400/10 border-red-400/30',
}

export default function AthletePlanCard({ exercise, detail, difficulty, tip, completed, onToggle }: AthletePlanCardProps) {
  return (
    <div
      className={`glass rounded-xl border p-4 transition-all cursor-pointer ${
        completed ? 'border-green-400/30 bg-green-400/5' : 'border-orion-border hover:border-orion-blue/30'
      }`}
      onClick={onToggle}
    >
      <div className="flex items-start gap-3">
        {/* Checkbox */}
        <div className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
          completed ? 'border-green-400 bg-green-400' : 'border-slate-500 hover:border-orion-blue'
        }`}>
          {completed && (
            <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
              <path d="M1 4L4 7L9 1" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className={`text-sm font-semibold ${completed ? 'text-slate-500 line-through' : 'text-white'}`}>
              {exercise}
            </span>
            <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${difficultyColors[difficulty]}`}>
              {difficulty}
            </span>
          </div>
          <p className={`text-sm font-medium mb-2 ${completed ? 'text-slate-600' : 'text-orion-blue'}`}>{detail}</p>
          <p className="text-xs text-slate-500 leading-relaxed">
            <span className="text-slate-400 font-medium">ORION tip: </span>{tip}
          </p>
        </div>
      </div>
    </div>
  )
}
