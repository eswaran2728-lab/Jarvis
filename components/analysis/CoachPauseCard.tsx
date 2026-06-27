'use client'
import { Play, RotateCcw, ChevronRight } from 'lucide-react'
import SimpleAdvancedToggle from './SimpleAdvancedToggle'
import { SimpleCoachMoment } from '@/lib/orion/coachMomentBuilder'

type Props = {
  moment: SimpleCoachMoment | null
  timestamp: string
  loading: boolean
  timedOut: boolean
  onReplay: () => void
  onSlowMotion: () => void
  onContinue: () => void
  onQuickScan: () => void
}

export default function CoachPauseCard({
  moment, timestamp, loading, timedOut,
  onReplay, onSlowMotion, onContinue, onQuickScan,
}: Props) {
  const playerColor = moment?.player?.includes('Red') ? '#ef4444' : moment?.player?.includes('Blue') ? '#3b82f6' : '#00d4ff'

  return (
    <div className="rounded-2xl border border-red-500/40 bg-slate-900 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-800" style={{ background: 'rgba(239,68,68,0.08)' }}>
        <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse flex-shrink-0" />
        <span className="text-red-400 font-black tracking-widest uppercase" style={{ fontSize: 16 }}>
          ⏸ ORION PAUSED — {timestamp}
        </span>
      </div>

      {/* Loading */}
      {loading && !timedOut && (
        <div className="flex items-center gap-3 p-5 text-slate-400 animate-pulse">
          <div className="w-5 h-5 border-2 border-orion-blue border-t-transparent rounded-full animate-spin flex-shrink-0" />
          <span style={{ fontSize: 16 }}>ORION is analysing this moment…</span>
        </div>
      )}

      {/* Timeout fallback */}
      {timedOut && (
        <div className="p-5 space-y-4">
          <p className="text-yellow-400 font-semibold" style={{ fontSize: 16 }}>Analysis taking longer. Use Quick Scan?</p>
          <button onClick={onQuickScan}
            className="w-full py-3 rounded-xl bg-yellow-400/15 border border-yellow-400/40 text-yellow-400 font-bold active:scale-95 transition-all"
            style={{ fontSize: 16 }}>
            Quick Scan
          </button>
        </div>
      )}

      {/* Moment content */}
      {!loading && !timedOut && moment && (
        <div className="p-4 space-y-4">
          {/* Player */}
          <span className="inline-block text-sm font-bold px-3 py-1 rounded-full" style={{ background: `${playerColor}20`, color: playerColor, border: `1px solid ${playerColor}50` }}>
            {moment.player}
          </span>

          {/* Mistake */}
          {moment.mistake && (
            <Section label="Mistake" color="#ef4444">
              <p style={{ fontSize: 16 }} className="text-red-200 leading-snug">{moment.mistake}</p>
            </Section>
          )}

          {/* Fix */}
          <Section label="Fix" color="#facc15">
            <p style={{ fontSize: 16 }} className="text-yellow-100 leading-snug">{moment.fix}</p>
          </Section>

          {/* Counter */}
          {moment.counter && (
            <Section label="Counter" color="#00d4ff">
              <p style={{ fontSize: 16 }} className="text-orion-blue leading-snug font-semibold">{moment.counter}</p>
            </Section>
          )}

          {/* Positive note */}
          {moment.positiveNote && (
            <Section label="Good" color="#00ff88">
              <p style={{ fontSize: 16 }} className="text-green-300 leading-snug">✓ {moment.positiveNote}</p>
            </Section>
          )}

          {/* Skills */}
          {moment.skills.length > 0 && (
            <div>
              <p className="text-slate-500 text-sm font-semibold mb-2">Skill</p>
              <div className="flex flex-wrap gap-2">
                {moment.skills.map(sk => (
                  <span key={sk} className="px-3 py-1 rounded-full bg-orion-blue/10 border border-orion-blue/30 text-orion-blue font-bold" style={{ fontSize: 14 }}>
                    {sk}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Advanced toggle */}
          <SimpleAdvancedToggle data={moment.advanced} />
        </div>
      )}

      {/* Action buttons */}
      <div className="grid grid-cols-3 gap-2 p-4 border-t border-slate-800">
        <button onClick={onReplay}
          className="flex items-center justify-center gap-2 py-3 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 font-semibold active:scale-95 transition-all"
          style={{ fontSize: 16 }}>
          <RotateCcw size={15} /> Replay
        </button>
        <button onClick={onSlowMotion}
          className="flex items-center justify-center gap-2 py-3 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 font-semibold active:scale-95 transition-all"
          style={{ fontSize: 16 }}>
          <Play size={15} /> Slow 0.5×
        </button>
        <button onClick={onContinue}
          className="flex items-center justify-center gap-1.5 py-3 rounded-xl text-white font-bold active:scale-95 transition-all"
          style={{ fontSize: 16, background: 'linear-gradient(135deg,#00d4ff25,#3b82f625)', border: '1px solid #00d4ff40' }}>
          Go <ChevronRight size={15} />
        </button>
      </div>
    </div>
  )
}

function Section({ label, color, children }: { label: string; color: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl p-3 space-y-1" style={{ background: `${color}08`, border: `1px solid ${color}25` }}>
      <p className="text-xs font-bold uppercase tracking-wider" style={{ color }}>{label}</p>
      {children}
    </div>
  )
}
