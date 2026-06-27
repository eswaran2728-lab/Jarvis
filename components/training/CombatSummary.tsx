'use client'
import { Target, AlertTriangle, RotateCcw, ThumbsUp } from 'lucide-react'

type CombatMoment = {
  id: string
  timestamp: number
  timeStr: string
  player: string
  type: 'mistake' | 'counter' | 'scoring_chance' | 'good_action'
  moment: any
}

type Props = {
  moments: CombatMoment[]
  p1Label?: string
  p2Label?: string
  onJump: (timeSec: number) => void
}

const TYPE_META = {
  mistake:        { icon: AlertTriangle, color: '#ef4444', label: 'Mistake'       },
  counter:        { icon: RotateCcw,    color: '#a855f7', label: 'Counter'        },
  scoring_chance: { icon: Target,       color: '#00d4ff', label: 'Scoring Chance' },
  good_action:    { icon: ThumbsUp,     color: '#00ff88', label: 'Good Action'    },
}

export default function CombatSummary({ moments, p1Label = 'Red P1', p2Label = 'Blue P2', onJump }: Props) {
  const mistakes       = moments.filter(m => m.type === 'mistake')
  const counters       = moments.filter(m => m.type === 'counter')
  const scoringChances = moments.filter(m => m.type === 'scoring_chance')
  const goodActions    = moments.filter(m => m.type === 'good_action')

  const stats = [
    { label: 'Mistakes',        count: mistakes.length,       color: '#ef4444' },
    { label: 'Scoring Chances', count: scoringChances.length, color: '#00d4ff' },
    { label: 'Counters',        count: counters.length,       color: '#a855f7' },
    { label: 'Good Actions',    count: goodActions.length,    color: '#00ff88' },
  ]

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="rounded-2xl border border-orion-blue/30 bg-orion-blue/5 p-4 space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-orion-blue" />
          <span className="text-orion-blue text-sm font-black tracking-widest uppercase">ORION COMBAT SUMMARY</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span className="font-semibold" style={{ color: '#ef4444' }}>{p1Label}</span>
          <span>vs</span>
          <span className="font-semibold" style={{ color: '#3b82f6' }}>{p2Label}</span>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-2">
          {stats.map(s => (
            <div key={s.label} className="rounded-xl p-3 text-center" style={{ background: `${s.color}10`, border: `1px solid ${s.color}30` }}>
              <p className="text-2xl font-black" style={{ color: s.color }}>{s.count}</p>
              <p className="text-[10px] text-slate-400 font-semibold mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Moment list */}
      {moments.length === 0 ? (
        <div className="rounded-2xl border border-slate-700 bg-slate-800/40 p-8 text-center">
          <p className="text-slate-400 text-sm">No moments captured yet.</p>
          <p className="text-slate-500 text-xs mt-1">Run a full match scan or let ORION auto-pause during playback.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {moments.map(m => {
            const meta = TYPE_META[m.type] || TYPE_META.good_action
            const Icon = meta.icon
            return (
              <button key={m.id} onClick={() => onJump(m.timestamp)}
                className="w-full rounded-2xl border border-slate-700 bg-slate-900/60 p-3 text-left transition-all hover:border-orion-blue/30 active:scale-[0.99]">
                <div className="flex items-start gap-3">
                  {/* Timestamp + type */}
                  <div className="flex-shrink-0 space-y-1 text-center w-12">
                    <p className="text-white text-xs font-bold tabular-nums">{m.timeStr}</p>
                    <div className="w-7 h-7 rounded-full flex items-center justify-center mx-auto" style={{ background: `${meta.color}20` }}>
                      <Icon size={12} style={{ color: meta.color }} />
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: `${meta.color}15`, color: meta.color }}>
                        {meta.label}
                      </span>
                      <span className="text-[10px] text-slate-500">{m.player}</span>
                    </div>
                    <p className="text-slate-200 text-xs leading-snug">{m.moment?.action || 'Combat moment'}</p>
                    {m.moment?.mistake && (
                      <p className="text-red-300 text-[10px] leading-snug">✗ {m.moment.mistake}</p>
                    )}
                    {m.moment?.correction && (
                      <p className="text-yellow-300 text-[10px] leading-snug">→ {m.moment.correction}</p>
                    )}
                    {m.moment?.relatedSkills?.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-0.5">
                        {m.moment.relatedSkills.map((sk: string) => (
                          <span key={sk} className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-orion-blue/10 text-orion-blue">{sk}</span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Jump arrow */}
                  <div className="flex-shrink-0 text-slate-600 text-xs">▶</div>
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
