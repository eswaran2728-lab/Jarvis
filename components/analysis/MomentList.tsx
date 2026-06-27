'use client'
import { useState } from 'react'
import { Bookmark } from 'lucide-react'
import SimpleAdvancedToggle from './SimpleAdvancedToggle'
import SaveMomentModal from './SaveMomentModal'
import { ScanMoment } from '@/lib/orion/quickScan'
import { SavedCombatMoment } from '@/lib/orion/memoryLibrary'

type Props = {
  moments: ScanMoment[]
  onJump: (t: number) => void
  videoName?: string
  onSaved?: (m: SavedCombatMoment) => void
}

const TYPE_COLOR: Record<string, string> = {
  mistake: '#ef4444',
  counter: '#a855f7',
  scoring_chance: '#00d4ff',
  good_action: '#00ff88',
}

export default function MomentList({ moments, onJump, videoName, onSaved }: Props) {
  if (!moments.length) return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-8 text-center">
      <p className="text-slate-400" style={{ fontSize: 16 }}>No moments yet.</p>
      <p className="text-slate-500 text-sm mt-1">Run Scan Full Match to see all combat moments.</p>
    </div>
  )

  return (
    <div className="space-y-3">
      {moments.map(m => <MomentCard key={m.id} moment={m} onJump={onJump} videoName={videoName} onSaved={onSaved} />)}
    </div>
  )
}

function MomentCard({
  moment, onJump, videoName, onSaved,
}: {
  moment: ScanMoment
  onJump: (t: number) => void
  videoName?: string
  onSaved?: (m: SavedCombatMoment) => void
}) {
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [saveOpen, setSaveOpen] = useState(false)
  const color = TYPE_COLOR[moment.type] || '#00d4ff'
  const c = moment.coach

  return (
    <div className="rounded-2xl border border-slate-700 bg-slate-900/60 overflow-hidden">
      {/* Top row — tap to jump */}
      <button onClick={() => onJump(moment.timestamp)} className="w-full flex items-center gap-3 px-4 py-3 text-left active:bg-slate-800/50 transition-all">
        <span className="text-white font-black tabular-nums" style={{ fontSize: 16 }}>{moment.timeStr}</span>
        <span className="flex-1 text-slate-200 leading-snug" style={{ fontSize: 16 }}>
          {c.mistake || c.positiveNote || c.timelineNote}
        </span>
        <span className="text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0" style={{ background: `${color}15`, color, border: `1px solid ${color}30` }}>
          {moment.type.replace('_', ' ')}
        </span>
      </button>

      {/* Fix + Counter quick view */}
      <div className="px-4 pb-2 space-y-1">
        <p className="text-yellow-200 text-sm">Fix: {c.fix}</p>
        {c.counter && <p className="text-orion-blue text-sm">Counter: {c.counter}</p>}
      </div>

      {/* Bottom row: Advanced + Save */}
      <div className="px-4 pb-4 flex items-center gap-3">
        <button onClick={() => setShowAdvanced(v => !v)}
          className="text-slate-500 text-sm font-semibold underline underline-offset-2">
          {showAdvanced ? 'Hide Advanced ▲' : 'Advanced ▼'}
        </button>
        <button onClick={() => setSaveOpen(true)}
          className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold active:scale-95 transition-all"
          style={{ background: '#00d4ff10', border: '1px solid #00d4ff30', color: '#00d4ff' }}>
          <Bookmark size={12} /> Save
        </button>
      </div>
      {showAdvanced && <div className="px-4 pb-4"><SimpleAdvancedToggle data={c.advanced} /></div>}

      <SaveMomentModal
        open={saveOpen}
        timestamp={moment.timestamp}
        timeStr={moment.timeStr}
        player={moment.player}
        moment={c}
        momentType={moment.type}
        videoName={videoName || 'Combat Video'}
        onClose={() => setSaveOpen(false)}
        onSaved={m => { onSaved?.(m); setSaveOpen(false) }}
      />
    </div>
  )
}
