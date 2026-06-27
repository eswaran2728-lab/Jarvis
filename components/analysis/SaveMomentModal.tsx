'use client'
import { useState } from 'react'
import { X } from 'lucide-react'
import {
  MomentCategory, SavedCombatMoment, saveCombatMoment, suggestCategory,
} from '@/lib/orion/memoryLibrary'
import { SimpleCoachMoment } from '@/lib/orion/coachMomentBuilder'

type Props = {
  open: boolean
  timestamp: number
  timeStr: string
  player: string
  moment: SimpleCoachMoment | null
  momentType: string
  videoName: string
  onClose: () => void
  onSaved: (m: SavedCombatMoment) => void
}

const CATEGORIES: { id: MomentCategory; label: string; color: string }[] = [
  { id: 'attack',        label: 'Attack',        color: '#ef4444' },
  { id: 'defence',       label: 'Defence',       color: '#3b82f6' },
  { id: 'counter_attack',label: 'Counter Attack',color: '#a855f7' },
  { id: 'footwork',      label: 'Footwork',      color: '#22c55e' },
  { id: 'mistake',       label: 'Mistake',       color: '#f59e0b' },
  { id: 'custom',        label: 'Custom',        color: '#64748b' },
]

export default function SaveMomentModal({ open, timestamp, timeStr, player, moment, momentType, videoName, onClose, onSaved }: Props) {
  const suggested = suggestCategory(momentType, moment?.mistake || moment?.fix || '')
  const [category, setCategory] = useState<MomentCategory>(suggested)
  const [name, setName] = useState('')

  if (!open) return null

  function handleSave() {
    if (!name.trim()) return
    const clipStart = Math.max(0, timestamp - 2)
    const clipEnd = timestamp + 3
    const saved = saveCombatMoment({
      sourceVideoId: `vid_${videoName}`,
      sourceVideoName: videoName || 'Combat Video',
      timestamp,
      clipStart,
      clipEnd,
      player: (player as SavedCombatMoment['player']) || 'Both',
      category,
      customName: name.trim(),
      isReference: false,
      simpleNote: {
        whatHappened: moment?.mistake || moment?.positiveNote || moment?.fix || 'Combat moment',
        fix: moment?.fix,
        counter: moment?.counter || undefined,
        skill: moment?.skills?.[0],
      },
      advancedNote: moment?.advanced ? {
        stickSpeed: moment.advanced.stickSpeed,
        confidence: moment.advanced.confidence,
        targetZone: moment.advanced.targetZone,
        footworkType: moment.advanced.footworkType,
        technicalNote: moment.advanced.technicalNote,
      } : undefined,
      relatedSkills: moment?.skills || [],
    })
    onSaved(saved)
    setName('')
    onClose()
  }

  const catMeta = CATEGORIES.find(c => c.id === category)!

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.75)' }}>
      <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-700 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <span className="text-white font-black" style={{ fontSize: 18 }}>Save This Moment</span>
          <button onClick={onClose} className="p-1.5 rounded-lg bg-slate-800 text-slate-400 active:scale-95 transition-all">
            <X size={16} />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Info */}
          <div className="flex flex-wrap gap-2 text-sm">
            <InfoChip label="Time" value={timeStr} />
            <InfoChip label="Player" value={player || 'Both'} color={player?.includes('Red') ? '#ef4444' : player?.includes('Blue') ? '#3b82f6' : undefined} />
            {moment?.mistake && <InfoChip label="Detected" value="Mistake" color="#ef4444" />}
            {moment?.positiveNote && <InfoChip label="Detected" value="Good Action" color="#22c55e" />}
          </div>

          {/* Category */}
          <div>
            <p className="text-slate-400 text-sm font-semibold mb-2">Category</p>
            <div className="grid grid-cols-3 gap-2">
              {CATEGORIES.map(cat => (
                <button key={cat.id} onClick={() => setCategory(cat.id)}
                  className="py-2.5 rounded-xl text-sm font-bold transition-all active:scale-95"
                  style={category === cat.id
                    ? { background: `${cat.color}25`, border: `1.5px solid ${cat.color}`, color: cat.color }
                    : { background: '#1e293b', border: '1px solid #334155', color: '#64748b' }}>
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Name input */}
          <div>
            <p className="text-slate-400 text-sm font-semibold mb-2">Moment Name</p>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSave()}
              placeholder={
                category === 'attack' ? 'e.g. Blue ZIP counter' :
                category === 'defence' ? 'e.g. Red emergency block' :
                category === 'counter_attack' ? 'e.g. Fast counter entry' :
                category === 'footwork' ? 'e.g. Fast retreat defence' :
                category === 'mistake' ? 'e.g. Red open guard' :
                'Custom moment name'
              }
              className="w-full rounded-xl bg-slate-800 border border-slate-700 text-white px-4 py-3 text-base placeholder:text-slate-600 focus:outline-none focus:border-orion-blue transition-all"
              style={{ fontSize: 16 }}
              autoFocus
            />
          </div>

          {/* Preview */}
          {name.trim() && (
            <div className="rounded-xl p-3 flex items-center gap-2" style={{ background: `${catMeta.color}10`, border: `1px solid ${catMeta.color}30` }}>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: `${catMeta.color}20`, color: catMeta.color }}>{catMeta.label}</span>
              <span className="text-white text-sm font-semibold">{name}</span>
              <span className="text-slate-500 text-xs ml-auto">{timeStr}</span>
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-3">
            <button onClick={onClose}
              className="flex-1 py-3 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 font-semibold active:scale-95 transition-all"
              style={{ fontSize: 16 }}>
              Cancel
            </button>
            <button onClick={handleSave} disabled={!name.trim()}
              className="flex-1 py-3 rounded-xl font-bold active:scale-95 transition-all disabled:opacity-40"
              style={{ fontSize: 16, background: 'linear-gradient(135deg,#00d4ff30,#3b82f630)', border: '1px solid #00d4ff50', color: '#00d4ff' }}>
              Save to Library
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function InfoChip({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800 border border-slate-700">
      <span className="text-slate-500 text-xs">{label}:</span>
      <span className="text-xs font-semibold" style={{ color: color || '#e2e8f0' }}>{value}</span>
    </div>
  )
}
