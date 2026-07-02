'use client'
import { ScanMoment } from '@/lib/orion/quickScan'
import MomentList from './MomentList'
import { SavedCombatMoment } from '@/lib/orion/memoryLibrary'

type Props = {
  moments: ScanMoment[]
  onJump: (t: number) => void
  videoName?: string
  onSaved?: (m: SavedCombatMoment) => void
}

export default function CombatSummary({ moments, onJump, videoName, onSaved }: Props) {
  const mistakes    = moments.filter(m => m.type === 'mistake').length
  const counters    = moments.filter(m => m.type === 'counter').length
  const openPoints  = moments.filter(m => m.type === 'scoring_chance').length
  const goodActions = moments.filter(m => m.type === 'good_action').length

  const stats = [
    { label: 'Mistakes',     count: mistakes,    color: '#ef4444' },
    { label: 'Counters',     count: counters,    color: '#a855f7' },
    { label: 'Open Points',  count: openPoints,  color: '#00d4ff' },
    { label: 'Good Actions', count: goodActions, color: '#22c55e' },
  ]

  return (
    <div className="space-y-4">
      {/* Summary header */}
      <div className="rounded-2xl overflow-hidden"
        style={{
          background: 'linear-gradient(145deg, rgba(0,212,255,0.05), rgba(8,13,26,0.98))',
          border: '1px solid rgba(0,212,255,0.18)',
          boxShadow: '0 4px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(0,212,255,0.08)',
        }}>
        {/* Header row */}
        <div className="flex items-center gap-2.5 px-4 py-3 border-b" style={{ borderColor: 'rgba(0,212,255,0.1)' }}>
          <div className="w-1.5 h-1.5 rounded-full bg-orion-blue" style={{ boxShadow: '0 0 6px #00d4ff' }} />
          <span className="text-orion-blue font-black tracking-[0.18em] uppercase" style={{ fontSize: 11 }}>
            ORION SUMMARY
          </span>
          <span className="ml-auto text-slate-600 text-xs">{moments.length} moments</span>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-4 divide-x" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
          {stats.map(s => (
            <div key={s.label} className="flex flex-col items-center py-4 gap-0.5">
              <span className="font-black leading-none" style={{ fontSize: 28, color: s.color, textShadow: `0 0 20px ${s.color}60` }}>
                {s.count}
              </span>
              <span className="text-slate-500 text-[9px] font-bold uppercase tracking-wider text-center leading-tight mt-1">
                {s.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      <MomentList moments={moments} onJump={onJump} videoName={videoName} onSaved={onSaved} />
    </div>
  )
}
