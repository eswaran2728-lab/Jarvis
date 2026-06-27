'use client'
import { forwardRef } from 'react'

type Props = {
  src: string | null
  isPausedByOrion: boolean
  selectingPlayer: 'P1' | 'P2' | null
  settingZone: boolean
  onCanvasClick: (e: React.MouseEvent<HTMLDivElement>) => void
  onZoneMouseDown: (e: React.MouseEvent<HTMLDivElement>) => void
  onZoneMouseUp: (e: React.MouseEvent<HTMLDivElement>) => void
  canvasRef: React.RefObject<HTMLCanvasElement>
  onPlay: () => void
  onPause: () => void
}

const CombatVideoPlayer = forwardRef<HTMLVideoElement, Props>(function CombatVideoPlayer(
  { src, isPausedByOrion, selectingPlayer, settingZone, onCanvasClick, onZoneMouseDown, onZoneMouseUp, canvasRef, onPlay, onPause },
  videoRef
) {
  const cursor = selectingPlayer ? 'crosshair' : settingZone ? 'crosshair' : 'default'

  return (
    <div className="relative rounded-2xl overflow-hidden bg-black" style={{ minHeight: '45vh' }}>
      {src ? (
        <>
          <video
            ref={videoRef}
            src={src}
            className="w-full h-full object-contain"
            style={{ minHeight: '45vh', display: 'block' }}
            playsInline
            onPlay={onPlay}
            onPause={onPause}
          />
          <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full pointer-events-none"
            style={{ mixBlendMode: 'screen' }}
          />
          {/* Interaction layer */}
          <div
            className="absolute inset-0"
            style={{ cursor }}
            onClick={onCanvasClick}
            onMouseDown={onZoneMouseDown}
            onMouseUp={onZoneMouseUp}
          />

          {/* ORION PAUSED overlay */}
          {isPausedByOrion && (
            <div className="absolute top-3 left-3 right-3 flex items-center gap-2 rounded-xl px-3 py-2"
              style={{ background: 'rgba(0,0,0,0.75)' }}>
              <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse flex-shrink-0" />
              <span className="text-red-400 font-black tracking-widest uppercase" style={{ fontSize: 14 }}>⏸ ORION PAUSED</span>
            </div>
          )}

          {/* Tap hint overlay */}
          {selectingPlayer && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="rounded-2xl px-5 py-3 text-center" style={{ background: 'rgba(0,0,0,0.85)' }}>
                <p className="text-yellow-400 font-bold animate-pulse" style={{ fontSize: 18 }}>
                  Tap on {selectingPlayer === 'P1' ? 'Red' : 'Blue'} fighter
                </p>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="text-slate-600" style={{ fontSize: 16 }}>No video loaded</p>
        </div>
      )}
    </div>
  )
})

export default CombatVideoPlayer
