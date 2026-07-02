'use client'
import { useState } from 'react'
import { Bookmark, ChevronRight } from 'lucide-react'
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
  mistake:        '#ef4444',
  counter:        '#a855f7',
  scoring_chance: '#00d4ff',
  good_action:    '#22c55e',
}
const TYPE_LABEL: Record<string, string> = {
  mistake:        'MISTAKE',
  counter:        'COUNTER',
  scoring_chance: 'OPEN POINT',
  good_action:    'GOOD',
}

export default function MomentList({ moments, onJump, videoName, onSaved }: Props) {
  if (!moments.length) return (
    <div className="rounded-2xl p-8 text-center"
      style={{ background: 'rgba(8,13,26,0.6)', border: '1px solid rgba(255,255,255,0.06)' }}>
      <p className="text-slate-400 font-semibold" style={{ fontSize: 16 }}>No moments captured yet.</p>
      <p className="text-slate-600 text-sm mt-1">Run Scan Full Match or play the video — ORION will auto-pause.</p>
    </div>
  )

  return (
    <div className="space-y-2">
      {moments.map(m => <MomentCard key={m.id} moment={m} onJump={onJump} videoName={videoName} onSaved={onSaved} />)}
    </div>
  )
}

function MomentCard({ moment, onJump, videoName, onSaved }: {
  moment: ScanMoment; onJump: (t: number) => void; videoName?: string; onSaved?: (m: SavedCombatMoment) => void
}) {
  const [showAdv, setShowAdv] = useState(false)
  const [saveOpen, setSaveOpen] = useState(false)
  const color = TYPE_COLOR[moment.type] || '#00d4ff'
  const c = moment.coach

  return (
    <div className="rounded-2xl overflow-hidden"
      style={{
        background: 'linear-gradient(160deg, rgba(8,13,26,0.95), rgba(5,8,16,0.98))',
        border: '1px solid rgba(255,255,255,0.06)',
        boxShadow: '0 2px 12px rgba(0,0,0,0.3)',
      }}>
      {/* Top row */}
      <button onClick={() => onJump(moment.timestamp)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left transition-all active:bg-white/5">
        {/* Time + type indicator */}
        <div className="flex-shrink-0 flex items-center gap-2">
          <div className="w-1 h-8 rounded-full flex-shrink-0" style={{ background: `linear-gradient(to bottom, ${color}, ${color}44)` }} />
          <div>
            <p className="font-black tabular-nums text-white" style={{ fontSize: 17, lineHeight: 1 }}>{moment.timeStr}</p>
            <p className="font-bold uppercase tracking-wider mt-0.5" style={{ fontSize: 9, color, letterSpacing: '0.1em' }}>
              {TYPE_LABEL[moment.type] || moment.type}
            </p>
          </div>
        </div>

        {/* Main text */}
        <p className="flex-1 text-slate-200 leading-snug" style={{ fontSize: 15 }}>
          {c.mistake || c.positiveNote || c.timelineNote}
        </p>

        <ChevronRight size={14} className="text-slate-600 flex-shrink-0" />
      </button>

      {/* Fix / Counter */}
      <div className="px-4 pb-3 space-y-1 -mt-1">
        {c.fix && (
          <p className="text-sm" style={{ color: '#fcd34d' }}>
            <span className="text-slate-600 text-xs font-semibold mr-1">Fix</span>{c.fix}
          </p>
        )}
        {c.counter && (
          <p className="text-sm" style={{ color: '#00d4ff' }}>
            <span className="text-slate-600 text-xs font-semibold mr-1">Counter</span>{c.counter}
          </p>
        )}
      </div>

      {/* Footer: advanced + save */}
      <div className="flex items-center gap-2 px-4 pb-3">
        <button onClick={() => setShowAdv(v => !v)}
          className="text-xs font-bold uppercase tracking-wider transition-all"
          style={{ color: showAdv ? '#00d4ff' : '#475569', letterSpacing: '0.08em' }}>
          {showAdv ? '▲ Hide' : '▼ Advanced'}
        </button>
        <button onClick={() => setSaveOpen(true)}
          className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold active:scale-95 transition-all"
          style={{ background: 'rgba(0,212,255,0.08)', border: '1px solid rgba(0,212,255,0.25)', color: '#00d4ff', fontSize: 12 }}>
          <Bookmark size={11} /> Save
        </button>
      </div>

      {showAdv && (
        <div className="px-4 pb-4">
          <SimpleAdvancedToggle data={c.advanced} />
        </div>
      )}

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
