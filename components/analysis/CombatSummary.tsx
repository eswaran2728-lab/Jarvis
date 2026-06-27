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
  const mistakes = moments.filter(m => m.type === 'mistake').length
  const counters = moments.filter(m => m.type === 'counter').length
  const openPoints = moments.filter(m => m.type === 'scoring_chance').length
  const goodActions = moments.filter(m => m.type === 'good_action').length

  const stats = [
    { label: 'Mistakes', count: mistakes, color: '#ef4444' },
    { label: 'Counters', count: counters, color: '#a855f7' },
    { label: 'Open Points', count: openPoints, color: '#00d4ff' },
    { label: 'Good Actions', count: goodActions, color: '#00ff88' },
  ]

  return (
    <div className="space-y-4">
      {/* ORION Summary header */}
      <div className="rounded-2xl border border-orion-blue/30 bg-orion-blue/5 p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-2 h-2 rounded-full bg-orion-blue" />
          <span className="text-orion-blue font-black tracking-widest uppercase" style={{ fontSize: 14 }}>ORION SUMMARY</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {stats.map(s => (
            <div key={s.label} className="rounded-xl p-3 text-center" style={{ background: `${s.color}10`, border: `1px solid ${s.color}30` }}>
              <p className="font-black" style={{ fontSize: 28, color: s.color, lineHeight: 1 }}>{s.count}</p>
              <p className="text-slate-400 text-xs font-semibold mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Moment list */}
      <MomentList moments={moments} onJump={onJump} videoName={videoName} onSaved={onSaved} />
    </div>
  )
}
