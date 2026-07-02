'use client'
import { useState } from 'react'
import { Play, RotateCcw, ChevronRight, Bookmark, Zap } from 'lucide-react'
import SimpleAdvancedToggle from './SimpleAdvancedToggle'
import SaveMomentModal from './SaveMomentModal'
import { SimpleCoachMoment } from '@/lib/orion/coachMomentBuilder'
import { SavedCombatMoment } from '@/lib/orion/memoryLibrary'

type Props = {
  moment: SimpleCoachMoment | null
  timestamp: string
  timestampSec: number
  loading: boolean
  timedOut: boolean
  videoName?: string
  onReplay: () => void
  onSlowMotion: () => void
  onContinue: () => void
  onQuickScan: () => void
  onSaved?: (m: SavedCombatMoment) => void
}

export default function CoachPauseCard({
  moment, timestamp, timestampSec, loading, timedOut, videoName,
  onReplay, onSlowMotion, onContinue, onQuickScan, onSaved,
}: Props) {
  const [saveOpen, setSaveOpen] = useState(false)
  const playerColor = moment?.player?.includes('Red') ? '#ef4444' : moment?.player?.includes('Blue') ? '#3b82f6' : '#00d4ff'

  return (
    <div className="slide-up rounded-2xl overflow-hidden"
      style={{
        background: 'linear-gradient(160deg, rgba(8,13,26,0.98), rgba(20,8,8,0.98))',
        border: '1px solid rgba(239,68,68,0.3)',
        boxShadow: '0 0 0 1px rgba(239,68,68,0.08), 0 8px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.04)',
      }}>

      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b"
        style={{ background: 'rgba(239,68,68,0.07)', borderColor: 'rgba(239,68,68,0.15)' }}>
        <div className="w-2.5 h-2.5 rounded-full bg-red-500 pause-ring flex-shrink-0" />
        <span className="text-red-400 font-black tracking-[0.15em] uppercase flex-1"
          style={{ fontSize: 13, letterSpacing: '0.12em' }}>
          ⏸ ORION PAUSED
        </span>
        <span className="text-slate-500 font-mono text-sm">{timestamp}</span>
      </div>

      {/* Loading */}
      {loading && !timedOut && (
        <div className="flex items-center gap-3 px-5 py-6">
          <div className="relative flex-shrink-0">
            <div className="w-6 h-6 rounded-full border-2 border-orion-blue/30" />
            <div className="absolute inset-0 w-6 h-6 rounded-full border-2 border-orion-blue border-t-transparent animate-spin" />
          </div>
          <span className="text-slate-400 animate-pulse" style={{ fontSize: 16 }}>
            ORION is analysing this moment…
          </span>
        </div>
      )}

      {/* Timeout */}
      {timedOut && (
        <div className="p-5 space-y-4">
          <p className="text-yellow-400 font-semibold" style={{ fontSize: 16 }}>
            Analysis taking longer than expected.
          </p>
          <button onClick={onQuickScan}
            className="w-full py-3.5 rounded-xl font-bold active:scale-95 transition-all"
            style={{ fontSize: 16, background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.4)', color: '#f59e0b' }}>
            Use Quick Scan
          </button>
        </div>
      )}

      {/* Fallback warning */}
      {!loading && !timedOut && moment?.isFallback && (
        <div className="mx-4 mt-4 rounded-xl px-4 py-3 flex items-start gap-2.5"
          style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)' }}>
          <Zap size={15} className="text-yellow-400 flex-shrink-0 mt-0.5" />
          <p className="text-yellow-300 text-sm leading-snug">
            ORION AI not connected. Add <strong>ANTHROPIC_API_KEY</strong> in Vercel → Settings → Environment Variables.
          </p>
        </div>
      )}

      {/* Moment content */}
      {!loading && !timedOut && moment && (
        <div className="p-4 space-y-3">
          {/* Player badge */}
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-sm font-bold px-3 py-1.5 rounded-full"
              style={{ background: `${playerColor}18`, color: playerColor, border: `1px solid ${playerColor}45` }}>
              <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: playerColor }} />
              {moment.player}
            </span>
          </div>

          {/* Mistake */}
          {moment.mistake && (
            <Section label="Mistake" color="#ef4444" icon="✕">
              <p style={{ fontSize: 16 }} className="text-red-100 leading-snug">{moment.mistake}</p>
            </Section>
          )}

          {/* Fix */}
          <Section label="Fix" color="#facc15" icon="→">
            <p style={{ fontSize: 16 }} className="text-yellow-100 leading-snug font-medium">{moment.fix}</p>
          </Section>

          {/* Counter */}
          {moment.counter && (
            <Section label="Counter" color="#00d4ff" icon="⚡">
              <p style={{ fontSize: 16 }} className="text-orion-blue leading-snug font-semibold">{moment.counter}</p>
            </Section>
          )}

          {/* Positive */}
          {moment.positiveNote && (
            <Section label="Good Action" color="#22c55e" icon="✓">
              <p style={{ fontSize: 16 }} className="text-green-300 leading-snug">{moment.positiveNote}</p>
            </Section>
          )}

          {/* Skills */}
          {moment.skills.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap pt-1">
              <span className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Skill</span>
              {moment.skills.map(sk => (
                <span key={sk} className="text-xs font-black px-2.5 py-1 rounded-full tracking-wide"
                  style={{ background: 'rgba(0,212,255,0.1)', border: '1px solid rgba(0,212,255,0.3)', color: '#00d4ff' }}>
                  {sk}
                </span>
              ))}
            </div>
          )}

          {/* Advanced */}
          <SimpleAdvancedToggle data={moment.advanced} />
        </div>
      )}

      {/* Action buttons */}
      <div className="grid grid-cols-3 gap-2 px-4 pb-4"
        style={{ borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: 12 }}>
        <button onClick={onReplay}
          className="flex flex-col items-center gap-1.5 py-3 rounded-xl active:scale-95 transition-all"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', fontSize: 13, color: '#94a3b8', fontWeight: 600 }}>
          <RotateCcw size={16} />
          Replay
        </button>
        <button onClick={onSlowMotion}
          className="flex flex-col items-center gap-1.5 py-3 rounded-xl active:scale-95 transition-all"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', fontSize: 13, color: '#94a3b8', fontWeight: 600 }}>
          <Play size={16} />
          Slow 0.5×
        </button>
        <button onClick={onContinue}
          className="flex flex-col items-center gap-1.5 py-3 rounded-xl active:scale-95 transition-all"
          style={{ background: 'linear-gradient(135deg,rgba(0,212,255,0.18),rgba(59,130,246,0.18))', border: '1px solid rgba(0,212,255,0.4)', fontSize: 13, color: '#00d4ff', fontWeight: 700 }}>
          <ChevronRight size={16} />
          Continue
        </button>
      </div>

      {/* Save button */}
      {!loading && !timedOut && moment && (
        <div className="px-4 pb-4 -mt-1">
          <button onClick={() => setSaveOpen(true)}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold active:scale-95 transition-all"
            style={{ fontSize: 15, background: 'rgba(0,212,255,0.06)', border: '1px solid rgba(0,212,255,0.25)', color: '#00d4ff' }}>
            <Bookmark size={15} /> Save to Memory Library
          </button>
        </div>
      )}

      <SaveMomentModal
        open={saveOpen}
        timestamp={timestampSec}
        timeStr={timestamp}
        player={moment?.player || 'Both'}
        moment={moment}
        momentType={moment?.momentType || 'good_action'}
        videoName={videoName || 'Combat Video'}
        onClose={() => setSaveOpen(false)}
        onSaved={m => { onSaved?.(m); setSaveOpen(false) }}
      />
    </div>
  )
}

function Section({ label, color, icon, children }: { label: string; color: string; icon: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl px-3.5 py-3 space-y-1"
      style={{ background: `${color}07`, border: `1px solid ${color}22` }}>
      <div className="flex items-center gap-1.5">
        <span className="text-[10px] font-black uppercase tracking-[0.12em]" style={{ color }}>{icon} {label}</span>
      </div>
      {children}
    </div>
  )
}
