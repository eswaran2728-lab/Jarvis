'use client'
import { TrackingMode } from '@/lib/orion/playerFocus'

type Props = {
  mode: TrackingMode
  confident: boolean
  playersLocked: boolean
  onSelectP1: () => void
  onSelectP2: () => void
  onRescan: () => void
}

const MODE_LABEL: Record<TrackingMode, string> = {
  pose: 'Pose',
  movement: 'Movement',
  manual: 'Manual',
}

export default function TrackingStatusBadge({ mode, confident, playersLocked, onSelectP1, onSelectP2, onRescan }: Props) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-slate-800 border border-slate-700 text-slate-400">
          Tracking: {MODE_LABEL[mode]}
        </span>
        {playersLocked && (
          <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-orion-blue/10 border border-orion-blue/30 text-orion-blue">
            Focus: Red P1 vs Blue P2
          </span>
        )}
        {!confident && (
          <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-yellow-400/10 border border-yellow-400/30 text-yellow-400">
            ⚠ Low confidence
          </span>
        )}
      </div>

      {!confident && (
        <div className="rounded-2xl border border-yellow-400/20 bg-yellow-400/5 p-4 space-y-3">
          <p className="text-white text-base font-semibold">Select Red and Blue fighter to improve analysis.</p>
          <div className="flex gap-2 flex-wrap">
            <button onClick={onSelectP1}
              className="flex-1 py-3 rounded-xl text-base font-bold active:scale-95 transition-all"
              style={{ background: '#ef444415', border: '1px solid #ef444450', color: '#ef4444' }}>
              Select Red P1
            </button>
            <button onClick={onSelectP2}
              className="flex-1 py-3 rounded-xl text-base font-bold active:scale-95 transition-all"
              style={{ background: '#3b82f615', border: '1px solid #3b82f650', color: '#3b82f6' }}>
              Select Blue P2
            </button>
            <button onClick={onRescan}
              className="w-full py-3 rounded-xl text-base font-bold bg-slate-800 border border-slate-700 text-slate-300 active:scale-95 transition-all">
              Re-scan
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
