'use client'
import { TrackingMode } from '@/lib/orion/playerFocus'
import { Crosshair, AlertTriangle } from 'lucide-react'

type Props = {
  mode: TrackingMode
  confident: boolean
  playersLocked: boolean
  onSelectP1: () => void
  onSelectP2: () => void
  onRescan: () => void
}

const MODE_CONFIG: Record<TrackingMode, { label: string; color: string }> = {
  pose:     { label: 'POSE TRACKING',     color: '#22c55e' },
  movement: { label: 'MOVEMENT TRACKING', color: '#f59e0b' },
  manual:   { label: 'MANUAL LOCK',       color: '#00d4ff' },
}

export default function TrackingStatusBadge({ mode, confident, playersLocked, onSelectP1, onSelectP2, onRescan }: Props) {
  const cfg = MODE_CONFIG[mode]

  return (
    <div className="space-y-3">
      {/* Status row */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg"
          style={{ background: `${cfg.color}10`, border: `1px solid ${cfg.color}30` }}>
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: cfg.color, boxShadow: `0 0 4px ${cfg.color}` }} />
          <span className="text-xs font-bold uppercase tracking-wider" style={{ color: cfg.color, letterSpacing: '0.08em' }}>
            {cfg.label}
          </span>
        </div>

        {playersLocked && (
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg"
            style={{ background: 'rgba(0,212,255,0.08)', border: '1px solid rgba(0,212,255,0.25)' }}>
            <Crosshair size={11} style={{ color: '#00d4ff' }} />
            <span className="text-xs font-bold tracking-wider" style={{ color: '#00d4ff', letterSpacing: '0.06em' }}>
              FOCUS: RED P1 vs BLUE P2
            </span>
          </div>
        )}
      </div>

      {/* Confused state */}
      {!confident && (
        <div className="rounded-2xl overflow-hidden"
          style={{ background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.2)' }}>
          <div className="flex items-center gap-2 px-4 py-3 border-b" style={{ borderColor: 'rgba(245,158,11,0.15)' }}>
            <AlertTriangle size={14} className="text-yellow-400 flex-shrink-0" />
            <p className="text-yellow-300 font-semibold" style={{ fontSize: 15 }}>
              Select Red and Blue fighter to improve analysis.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 p-3">
            <button onClick={onSelectP1}
              className="active:scale-95 transition-all"
              style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.35)', color: '#ef4444', fontSize: 14, fontWeight: 700, padding: '12px', borderRadius: 12 }}>
              Select Red P1
            </button>
            <button onClick={onSelectP2}
              className="py-3 rounded-xl font-bold active:scale-95 transition-all"
              style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.35)', color: '#3b82f6', fontSize: 14, fontWeight: 700, padding: '12px', borderRadius: 12 }}>
              Select Blue P2
            </button>
            <button onClick={onRescan}
              className="py-3 rounded-xl font-bold active:scale-95 transition-all"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#64748b', fontSize: 14, fontWeight: 700, padding: '12px', borderRadius: 12 }}>
              Re-scan
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
