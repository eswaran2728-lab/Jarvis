'use client'
import { Lock, Unlock, Crosshair, RotateCcw } from 'lucide-react'
import { LockedPlayer, CombatZone } from '@/lib/combat/playerLock'

type Props = {
  locked: boolean
  players: LockedPlayer[]
  combatZone: CombatZone
  selectingPlayer: 'P1' | 'P2' | null
  onAutoLock: () => void
  onSelectPlayer: (id: 'P1' | 'P2') => void
  onCancelSelect: () => void
  onResetZone: () => void
  onSetZone: () => void
  settingZone: boolean
}

export default function CombatFocusSelector({
  locked, players, combatZone,
  selectingPlayer, onAutoLock, onSelectPlayer, onCancelSelect,
  onResetZone, onSetZone, settingZone,
}: Props) {
  const P1 = '#ef4444'
  const P2 = '#3b82f6'

  return (
    <div className="rounded-2xl border border-slate-700 bg-slate-900/60 p-3 space-y-3">
      {/* Lock status */}
      <div className="flex items-center gap-2">
        {locked ? (
          <>
            <Lock size={13} className="text-green-400 flex-shrink-0" />
            <span className="text-green-400 text-xs font-bold">Combat Focus Locked: {players.map(p => p.label).join(' vs ')}</span>
          </>
        ) : (
          <>
            <Unlock size={13} className="text-yellow-400 flex-shrink-0" />
            <span className="text-yellow-400 text-xs font-semibold">No players locked — auto-detecting</span>
          </>
        )}
      </div>

      {/* Player select buttons */}
      <div className="grid grid-cols-3 gap-2">
        <button onClick={onAutoLock}
          className="col-span-1 py-2.5 rounded-xl flex items-center justify-center gap-1.5 text-xs font-bold active:scale-95 transition-all"
          style={{ background: '#00d4ff15', border: '1px solid #00d4ff40', color: '#00d4ff' }}>
          <Crosshair size={13} /> Auto Lock
        </button>
        <button onClick={() => selectingPlayer === 'P1' ? onCancelSelect() : onSelectPlayer('P1')}
          className="py-2.5 rounded-xl flex items-center justify-center gap-1.5 text-xs font-bold active:scale-95 transition-all"
          style={selectingPlayer === 'P1'
            ? { background: `${P1}30`, border: `1px solid ${P1}`, color: P1 }
            : { background: `${P1}10`, border: `1px solid ${P1}40`, color: P1 }}>
          {selectingPlayer === 'P1' ? '→ Tap Red P1' : 'Select Red P1'}
        </button>
        <button onClick={() => selectingPlayer === 'P2' ? onCancelSelect() : onSelectPlayer('P2')}
          className="py-2.5 rounded-xl flex items-center justify-center gap-1.5 text-xs font-bold active:scale-95 transition-all"
          style={selectingPlayer === 'P2'
            ? { background: `${P2}30`, border: `1px solid ${P2}`, color: P2 }
            : { background: `${P2}10`, border: `1px solid ${P2}40`, color: P2 }}>
          {selectingPlayer === 'P2' ? '→ Tap Blue P2' : 'Select Blue P2'}
        </button>
      </div>

      {selectingPlayer && (
        <p className="text-yellow-400 text-[11px] text-center animate-pulse">
          Tap on the {selectingPlayer === 'P1' ? 'Red' : 'Blue'} player in the video above
        </p>
      )}

      {/* Combat zone */}
      <div className="flex gap-2">
        <button onClick={settingZone ? onResetZone : onSetZone}
          className="flex-1 py-2 rounded-xl text-xs font-semibold active:scale-95 transition-all"
          style={settingZone
            ? { background: '#f59e0b20', border: '1px solid #f59e0b60', color: '#f59e0b' }
            : { background: '#1e293b', border: '1px solid #334155', color: '#94a3b8' }}>
          {settingZone ? '→ Drag on video' : 'Set Combat Zone'}
        </button>
        {combatZone.active && (
          <button onClick={onResetZone}
            className="px-3 py-2 rounded-xl text-xs font-semibold active:scale-95 transition-all bg-slate-800 border border-slate-700 text-slate-400 flex items-center gap-1">
            <RotateCcw size={12} /> Reset
          </button>
        )}
      </div>

      {combatZone.active && (
        <p className="text-green-400 text-[10px] text-center">
          Combat zone active — only analysing inside selected area
        </p>
      )}
    </div>
  )
}
