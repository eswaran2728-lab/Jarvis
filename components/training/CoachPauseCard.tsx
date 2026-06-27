'use client'
import { Play, RotateCcw, ChevronRight, BookOpen } from 'lucide-react'
import { SKILL_LIBRARY } from '@/lib/combat/skillLibrary'

type Props = {
  moment: any
  timestamp: string
  onReplay: () => void
  onSlowMotion: () => void
  onContinue: () => void
  loading?: boolean
}

export default function CoachPauseCard({ moment, timestamp, onReplay, onSlowMotion, onContinue, loading }: Props) {
  const P1 = '#ef4444'
  const P2 = '#3b82f6'
  const playerColor = moment?.player === 'Red P1' ? P1 : moment?.player === 'Blue P2' ? P2 : '#00d4ff'

  return (
    <div className="rounded-2xl border border-[#ef4444]/40 bg-slate-900/80 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-slate-800" style={{ background: 'rgba(239,68,68,0.08)' }}>
        <div className="w-2.5 h-2.5 rounded-full bg-[#ef4444] animate-pulse flex-shrink-0" />
        <span className="text-[#ef4444] text-xs font-black tracking-widest uppercase">⏸ ORION PAUSED</span>
        <span className="ml-auto text-slate-400 text-xs tabular-nums">Time: {timestamp}</span>
      </div>

      {loading ? (
        <div className="flex items-center gap-3 p-4 text-slate-400 text-xs animate-pulse">
          <div className="w-4 h-4 border-2 border-orion-blue border-t-transparent rounded-full animate-spin flex-shrink-0" />
          ORION is analysing this moment…
        </div>
      ) : moment ? (
        <div className="p-4 space-y-3">
          {/* Player badge */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold px-2.5 py-1 rounded-full" style={{ background: `${playerColor}20`, color: playerColor, border: `1px solid ${playerColor}50` }}>
              {moment.player}
            </span>
            {moment.positiveNote && (
              <span className="text-xs text-green-400">✓ Good action</span>
            )}
          </div>

          {/* Action */}
          <div className="space-y-0.5">
            <p className="text-[10px] text-slate-500 uppercase tracking-wide font-semibold">Action</p>
            <p className="text-white text-sm leading-snug">{moment.action}</p>
          </div>

          {/* Mistake */}
          {moment.mistake && (
            <div className="rounded-xl bg-red-500/8 border border-red-500/20 p-3 space-y-1.5">
              <p className="text-[10px] text-red-400 uppercase tracking-wide font-semibold">Mistake</p>
              <p className="text-red-200 text-sm leading-snug">{moment.mistake}</p>
              {moment.whyRisky && (
                <>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wide font-semibold mt-1">Why it is risky</p>
                  <p className="text-slate-300 text-xs leading-snug">{moment.whyRisky}</p>
                </>
              )}
            </div>
          )}

          {/* Correction */}
          <div className="rounded-xl bg-yellow-400/5 border border-yellow-400/20 p-3 space-y-1">
            <p className="text-[10px] text-yellow-400 uppercase tracking-wide font-semibold">Correction</p>
            <p className="text-yellow-100 text-sm leading-snug">{moment.correction}</p>
          </div>

          {/* Best counter */}
          {moment.bestCounter && (
            <div className="space-y-0.5">
              <p className="text-[10px] text-slate-500 uppercase tracking-wide font-semibold">Best Counter</p>
              <p className="text-orion-blue text-sm leading-snug font-semibold">{moment.bestCounter}</p>
            </div>
          )}

          {/* Positive note */}
          {moment.positiveNote && (
            <p className="text-green-400 text-xs leading-snug">✓ {moment.positiveNote}</p>
          )}

          {/* Skill tags */}
          {moment.relatedSkills?.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] text-slate-500 uppercase tracking-wide font-semibold">Recommended Skills</p>
              <div className="flex flex-wrap gap-2">
                {moment.relatedSkills.map((sk: string) => {
                  const skill = SKILL_LIBRARY[sk]
                  if (!skill) return null
                  return (
                    <div key={sk} className="rounded-xl bg-orion-blue/5 border border-orion-blue/20 px-3 py-2 space-y-0.5">
                      <p className="text-orion-blue text-xs font-bold">{skill.name}</p>
                      <p className="text-slate-400 text-[10px]">{skill.tagline}</p>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      ) : null}

      {/* Action buttons */}
      <div className="grid grid-cols-3 gap-2 p-3 border-t border-slate-800">
        <button onClick={onReplay}
          className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 text-xs font-semibold active:scale-95 transition-all">
          <RotateCcw size={13} /> Replay
        </button>
        <button onClick={onSlowMotion}
          className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 text-xs font-semibold active:scale-95 transition-all">
          <Play size={13} /> Slow Mo
        </button>
        <button onClick={onContinue}
          className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-white text-xs font-bold active:scale-95 transition-all"
          style={{ background: 'linear-gradient(135deg, #00d4ff33, #3b82f633)', border: '1px solid #00d4ff50' }}>
          Continue <ChevronRight size={13} />
        </button>
      </div>
    </div>
  )
}
