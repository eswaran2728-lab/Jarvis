'use client'
import { useEffect, useRef, useState } from 'react'
import AppShell from '@/components/layout/AppShell'
import {
  SavedCombatMoment, MomentCategory,
  getSavedMoments, deleteSavedMoment, updateSavedMoment, searchSavedMoments,
} from '@/lib/orion/memoryLibrary'
import { Bookmark, Play, Pencil, Trash2, Star, Search, X } from 'lucide-react'

const CATEGORY_META: Record<MomentCategory | 'all' | 'reference', { label: string; color: string }> = {
  all:           { label: 'All',          color: '#00d4ff' },
  attack:        { label: 'Attack',       color: '#ef4444' },
  defence:       { label: 'Defence',      color: '#3b82f6' },
  counter_attack:{ label: 'Counter',      color: '#a855f7' },
  footwork:      { label: 'Footwork',     color: '#22c55e' },
  mistake:       { label: 'Mistake',      color: '#f59e0b' },
  custom:        { label: 'Custom',       color: '#64748b' },
  reference:     { label: 'Reference',    color: '#f97316' },
}

type FilterTab = MomentCategory | 'all' | 'reference'

const TAB_ORDER: FilterTab[] = ['all', 'attack', 'defence', 'counter_attack', 'footwork', 'mistake', 'custom', 'reference']

export default function MemoryLibraryPage() {
  const [moments, setMoments] = useState<SavedCombatMoment[]>([])
  const [filter, setFilter] = useState<FilterTab>('all')
  const [query, setQuery] = useState('')
  const [renameId, setRenameId] = useState<string | null>(null)
  const [renameName, setRenameName] = useState('')
  const [playMoment, setPlayMoment] = useState<SavedCombatMoment | null>(null)

  useEffect(() => { setMoments(getSavedMoments()) }, [])

  function refresh() { setMoments(getSavedMoments()) }

  const displayed = (() => {
    let list = query.trim() ? searchSavedMoments(query) : moments
    if (filter === 'reference') list = list.filter(m => m.isReference)
    else if (filter !== 'all') list = list.filter(m => m.category === filter)
    return list
  })()

  function handleDelete(id: string) {
    deleteSavedMoment(id); refresh()
  }

  function handleToggleReference(id: string, current: boolean) {
    updateSavedMoment(id, { isReference: !current }); refresh()
  }

  function startRename(m: SavedCombatMoment) {
    setRenameId(m.id); setRenameName(m.customName)
  }

  function commitRename(id: string) {
    if (renameName.trim()) updateSavedMoment(id, { customName: renameName.trim() })
    setRenameId(null); refresh()
  }

  return (
    <AppShell>
      <div className="p-3 md:p-5 max-w-2xl mx-auto w-full space-y-4" style={{ paddingBottom: 100 }}>

        {/* Header */}
        <div className="flex items-center gap-3">
          <Bookmark size={22} className="text-orion-blue flex-shrink-0" />
          <div>
            <h1 className="text-white font-black tracking-tight" style={{ fontSize: 22 }}>ORION Memory</h1>
            <p className="text-slate-500 text-sm">Saved combat moments</p>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search moments, players, skills…"
            className="w-full rounded-xl bg-slate-800 border border-slate-700 text-white pl-10 pr-10 py-3 text-base placeholder:text-slate-600 focus:outline-none focus:border-orion-blue transition-all"
            style={{ fontSize: 15 }}
          />
          {query && (
            <button onClick={() => setQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500">
              <X size={15} />
            </button>
          )}
        </div>

        {/* Category filter tabs (scrollable) */}
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {TAB_ORDER.map(tab => {
            const meta = CATEGORY_META[tab]
            const active = filter === tab
            return (
              <button key={tab} onClick={() => setFilter(tab)}
                className="flex-shrink-0 px-3 py-2 rounded-xl text-sm font-bold transition-all"
                style={active
                  ? { background: `${meta.color}20`, border: `1.5px solid ${meta.color}`, color: meta.color }
                  : { background: '#1e293b', border: '1px solid #334155', color: '#64748b' }}>
                {meta.label}
              </button>
            )
          })}
        </div>

        {/* Count */}
        <p className="text-slate-500 text-sm">{displayed.length} moment{displayed.length !== 1 ? 's' : ''}</p>

        {/* Empty state */}
        {displayed.length === 0 && (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-10 text-center space-y-3">
            <Bookmark size={36} className="text-slate-700 mx-auto" />
            <p className="text-slate-300 font-semibold" style={{ fontSize: 18 }}>No saved combat moments yet.</p>
            <p className="text-slate-500 text-sm leading-relaxed max-w-xs mx-auto">
              When ORION finds a good attack, defence, counter, or mistake, tap Save Moment to build your own Silambam library.
            </p>
          </div>
        )}

        {/* Moment cards */}
        <div className="space-y-3">
          {displayed.map(m => (
            <MomentCard
              key={m.id}
              moment={m}
              isRenaming={renameId === m.id}
              renameName={renameName}
              onRenameChange={setRenameName}
              onRenameCommit={() => commitRename(m.id)}
              onStartRename={() => startRename(m)}
              onDelete={() => handleDelete(m.id)}
              onToggleRef={() => handleToggleReference(m.id, m.isReference)}
              onPlay={() => setPlayMoment(m)}
            />
          ))}
        </div>
      </div>

      {/* Play clip modal */}
      {playMoment && (
        <PlayClipModal moment={playMoment} onClose={() => setPlayMoment(null)} />
      )}
    </AppShell>
  )
}

// ── Moment Card ───────────────────────────────────────────────────────────────
function MomentCard({
  moment, isRenaming, renameName, onRenameChange, onRenameCommit,
  onStartRename, onDelete, onToggleRef, onPlay,
}: {
  moment: SavedCombatMoment
  isRenaming: boolean
  renameName: string
  onRenameChange: (v: string) => void
  onRenameCommit: () => void
  onStartRename: () => void
  onDelete: () => void
  onToggleRef: () => void
  onPlay: () => void
}) {
  const meta = CATEGORY_META[moment.category]
  const playerColor = moment.player.includes('Red') ? '#ef4444' : moment.player.includes('Blue') ? '#3b82f6' : '#00d4ff'
  const fmtTime = (s: number) => `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, '0')}`

  return (
    <div className="rounded-2xl border border-slate-700 bg-slate-900 overflow-hidden">
      {/* Top */}
      <div className="px-4 py-3 space-y-2">
        {/* Name row */}
        <div className="flex items-start gap-2">
          {isRenaming ? (
            <input
              autoFocus
              value={renameName}
              onChange={e => onRenameChange(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && onRenameCommit()}
              onBlur={onRenameCommit}
              className="flex-1 rounded-lg bg-slate-800 border border-orion-blue text-white px-3 py-1.5 text-base focus:outline-none"
              style={{ fontSize: 16 }}
            />
          ) : (
            <p className="flex-1 text-white font-black leading-snug" style={{ fontSize: 18 }}>{moment.customName}</p>
          )}
          {moment.isReference && (
            <span className="flex-shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: '#f9731615', color: '#f97316', border: '1px solid #f9731630' }}>
              Reference
            </span>
          )}
        </div>

        {/* Meta row */}
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-xs font-bold px-2.5 py-1 rounded-full" style={{ background: `${meta.color}15`, color: meta.color, border: `1px solid ${meta.color}30` }}>
            {meta.label}
          </span>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700" style={{ color: playerColor }}>
            {moment.player}
          </span>
          <span className="text-slate-500 text-xs">{fmtTime(moment.timestamp)}</span>
          <span className="text-slate-600 text-xs">·</span>
          <span className="text-slate-500 text-xs truncate max-w-[120px]">{moment.sourceVideoName}</span>
        </div>

        {/* Note */}
        <p className="text-slate-300 text-sm leading-snug">{moment.simpleNote.whatHappened}</p>
        {moment.simpleNote.fix && <p className="text-yellow-300 text-sm">Fix: {moment.simpleNote.fix}</p>}
        {moment.simpleNote.counter && <p className="text-orion-blue text-sm">Counter: {moment.simpleNote.counter}</p>}

        {/* Skills */}
        {moment.relatedSkills.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-0.5">
            {moment.relatedSkills.map(sk => (
              <span key={sk} className="text-xs font-bold px-2 py-0.5 rounded-full bg-orion-blue/10 border border-orion-blue/20 text-orion-blue">{sk}</span>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="grid grid-cols-4 gap-1.5 px-3 pb-3">
        <button onClick={onPlay}
          className="col-span-1 flex flex-col items-center gap-1 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 active:scale-95 transition-all">
          <Play size={15} />
          <span className="text-[10px] font-semibold">Play Clip</span>
        </button>
        <button onClick={onStartRename}
          className="flex flex-col items-center gap-1 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 active:scale-95 transition-all">
          <Pencil size={15} />
          <span className="text-[10px] font-semibold">Rename</span>
        </button>
        <button onClick={onToggleRef}
          className="flex flex-col items-center gap-1 py-2.5 rounded-xl active:scale-95 transition-all"
          style={moment.isReference
            ? { background: '#f9731615', border: '1px solid #f9731640', color: '#f97316' }
            : { background: '#1e293b', border: '1px solid #334155', color: '#64748b' }}>
          <Star size={15} fill={moment.isReference ? 'currentColor' : 'none'} />
          <span className="text-[10px] font-semibold">Reference</span>
        </button>
        <button onClick={onDelete}
          className="flex flex-col items-center gap-1 py-2.5 rounded-xl bg-red-500/8 border border-red-500/20 text-red-400 active:scale-95 transition-all">
          <Trash2 size={15} />
          <span className="text-[10px] font-semibold">Delete</span>
        </button>
      </div>
    </div>
  )
}

// ── Play Clip Modal ───────────────────────────────────────────────────────────
function PlayClipModal({ moment, onClose }: { moment: SavedCombatMoment; onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const v = videoRef.current
    if (!v) return
    v.currentTime = moment.clipStart
    v.play()
    const checkEnd = setInterval(() => {
      if (v.currentTime >= moment.clipEnd) { v.pause(); clearInterval(checkEnd) }
    }, 100)
    return () => clearInterval(checkEnd)
  }, [moment])

  const fmtTime = (s: number) => `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, '0')}`

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.85)' }}>
      <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-700 overflow-hidden space-y-0">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
          <div className="min-w-0">
            <p className="text-slate-400 text-xs">Playing saved moment</p>
            <p className="text-white font-bold text-base truncate">{moment.customName}</p>
          </div>
          <button onClick={onClose} className="ml-3 p-1.5 rounded-lg bg-slate-800 text-slate-400 flex-shrink-0">
            <X size={16} />
          </button>
        </div>

        {/* Clip info */}
        <div className="px-4 py-2 flex gap-2 text-sm text-slate-500">
          <span>{fmtTime(moment.clipStart)} → {fmtTime(moment.clipEnd)}</span>
          <span>·</span>
          <span className="truncate">{moment.sourceVideoName}</span>
        </div>

        {/* Placeholder — real clip playback requires the source video */}
        <div className="mx-4 mb-4 rounded-xl bg-black flex items-center justify-center" style={{ height: 200 }}>
          <div className="text-center space-y-2 p-4">
            <Play size={36} className="text-slate-700 mx-auto" />
            <p className="text-slate-400 text-sm font-semibold">Clip: {fmtTime(moment.clipStart)} – {fmtTime(moment.clipEnd)}</p>
            <p className="text-slate-600 text-xs">Re-open the source video and jump to {fmtTime(moment.timestamp)} to replay.</p>
          </div>
        </div>

        <div className="px-4 pb-4">
          <button onClick={onClose}
            className="w-full py-3 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 font-semibold"
            style={{ fontSize: 16 }}>
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
