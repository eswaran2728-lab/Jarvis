'use client'
import { useState, useEffect, useRef } from 'react'
import { PoseFrame, SilambamTechnique } from '@/lib/pose/motionAnalysis'

type Props = {
  technique: SilambamTechnique
  size?: number
  autoPlay?: boolean
  loop?: boolean
  showLabel?: boolean
  highlightColor?: string
}

function lerp(a: number, b: number, t: number) { return a + (b - a) * t }

function lerpFrame(f1: PoseFrame, f2: PoseFrame, t: number): PoseFrame {
  const lp = (k: keyof PoseFrame) => {
    const a = f1[k] as { x: number; y: number }
    const b = f2[k] as { x: number; y: number }
    if (!a || !b) return a
    return { x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t) }
  }
  return {
    head: lp('head') as any, neck: lp('neck') as any,
    leftShoulder: lp('leftShoulder') as any, rightShoulder: lp('rightShoulder') as any,
    leftElbow: lp('leftElbow') as any, rightElbow: lp('rightElbow') as any,
    leftWrist: lp('leftWrist') as any, rightWrist: lp('rightWrist') as any,
    leftHip: lp('leftHip') as any, rightHip: lp('rightHip') as any,
    leftKnee: lp('leftKnee') as any, rightKnee: lp('rightKnee') as any,
    leftFoot: lp('leftFoot') as any, rightFoot: lp('rightFoot') as any,
    stickBase: f1.stickBase ? lp('stickBase') as any : undefined,
    stickTip: f1.stickTip ? lp('stickTip') as any : undefined,
    duration: f1.duration,
  }
}

export default function SkillAnimation({ technique, size = 200, autoPlay = true, loop = true, showLabel = true, highlightColor }: Props) {
  const [frame, setFrame] = useState<PoseFrame>(technique.animationFrames[0])
  const [playing, setPlaying] = useState(autoPlay)
  const [frameIdx, setFrameIdx] = useState(0)
  const [progress, setProgress] = useState(0)
  const rafRef = useRef<number | null>(null)
  const startRef = useRef<number>(0)
  const color = highlightColor || technique.animationFrames.length > 0 ? '#00d4ff' : '#00d4ff'
  const accentColor = highlightColor || '#00d4ff'

  useEffect(() => {
    if (!playing) return
    const frames = technique.animationFrames
    let fi = 0
    startRef.current = performance.now()

    const animate = (now: number) => {
      const elapsed = now - startRef.current
      const dur = frames[fi].duration
      const t = Math.min(elapsed / dur, 1)
      const nextFi = (fi + 1) % frames.length
      setFrame(lerpFrame(frames[fi], frames[nextFi], t))
      setFrameIdx(fi)
      setProgress(((fi + t) / frames.length) * 100)
      if (t >= 1) {
        fi = nextFi
        if (fi === 0 && !loop) { setPlaying(false); return }
        startRef.current = now
      }
      rafRef.current = requestAnimationFrame(animate)
    }
    rafRef.current = requestAnimationFrame(animate)
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [playing, technique, loop])

  const s = size
  const px = (v: number) => Math.round(v * s)
  const pt = (p: { x: number; y: number }) => `${px(p.x)},${px(p.y)}`

  const bones = [
    [frame.head, frame.neck],
    [frame.neck, frame.leftShoulder], [frame.neck, frame.rightShoulder],
    [frame.leftShoulder, frame.leftElbow], [frame.leftElbow, frame.leftWrist],
    [frame.rightShoulder, frame.rightElbow], [frame.rightElbow, frame.rightWrist],
    [frame.leftShoulder, frame.leftHip], [frame.rightShoulder, frame.rightHip],
    [frame.leftHip, frame.rightHip],
    [frame.leftHip, frame.leftKnee], [frame.leftKnee, frame.leftFoot],
    [frame.rightHip, frame.rightKnee], [frame.rightKnee, frame.rightFoot],
  ] as [{ x: number; y: number }, { x: number; y: number }][]

  const joints = [frame.head, frame.neck, frame.leftShoulder, frame.rightShoulder,
    frame.leftElbow, frame.rightElbow, frame.leftWrist, frame.rightWrist,
    frame.leftHip, frame.rightHip, frame.leftKnee, frame.rightKnee,
    frame.leftFoot, frame.rightFoot]

  const diffColor = {
    'strike': '#00d4ff', 'block': '#f97316', 'footwork': '#00ff88',
    'spin': '#a855f7', 'combo': '#eab308',
  }[technique.category] || '#00d4ff'

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: s, height: s }}>
        {/* Background glow */}
        <div className="absolute inset-0 rounded-2xl" style={{ background: `radial-gradient(ellipse at 50% 60%, ${diffColor}08 0%, transparent 70%)` }} />

        <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`} className="relative z-10">
          {/* Shadow */}
          <ellipse cx={s * 0.5} cy={s * 0.93} rx={s * 0.18} ry={s * 0.03} fill={`${diffColor}20`} />

          {/* Stick (Silambam stick) */}
          {frame.stickBase && frame.stickTip && (
            <>
              <line x1={px(frame.stickBase.x)} y1={px(frame.stickBase.y)}
                x2={px(Math.max(-0.05, Math.min(1.05, frame.stickTip.x)))}
                y2={px(Math.max(-0.05, Math.min(1.05, frame.stickTip.y)))}
                stroke={diffColor} strokeWidth={3} strokeLinecap="round"
                style={{ filter: `drop-shadow(0 0 4px ${diffColor})` }} />
              <circle cx={px(Math.max(0, Math.min(1, frame.stickTip.x)))}
                cy={px(Math.max(0, Math.min(1, frame.stickTip.y)))}
                r={4} fill={diffColor} opacity={0.9} />
            </>
          )}

          {/* Bones */}
          {bones.map(([a, b], i) => (
            <line key={i}
              x1={px(a.x)} y1={px(a.y)} x2={px(b.x)} y2={px(b.y)}
              stroke={diffColor} strokeWidth={2.5} strokeLinecap="round" opacity={0.85} />
          ))}

          {/* Joints */}
          {joints.map((j, i) => (
            <circle key={i} cx={px(j.x)} cy={px(j.y)} r={i === 0 ? 8 : 4}
              fill={i === 0 ? '#1e293b' : diffColor}
              stroke={diffColor} strokeWidth={i === 0 ? 2 : 1}
              style={i === 0 ? { filter: `drop-shadow(0 0 6px ${diffColor})` } : undefined} />
          ))}

          {/* Wrist highlights during strike */}
          {(technique.category === 'strike' || technique.category === 'spin') && (
            <>
              <circle cx={px(frame.leftWrist.x)} cy={px(frame.leftWrist.y)} r={6}
                fill="none" stroke={diffColor} strokeWidth={1.5} opacity={0.4 + (progress % 100) / 200} />
              <circle cx={px(frame.rightWrist.x)} cy={px(frame.rightWrist.y)} r={6}
                fill="none" stroke={diffColor} strokeWidth={1.5} opacity={0.4 + (progress % 100) / 200} />
            </>
          )}
        </svg>
      </div>

      {/* Progress bar */}
      <div className="w-full h-1 rounded-full bg-slate-800 overflow-hidden" style={{ width: s }}>
        <div className="h-full rounded-full transition-all" style={{ width: `${progress}%`, background: diffColor }} />
      </div>

      {/* Controls */}
      <button onClick={() => setPlaying(p => !p)}
        className="text-xs px-4 py-1.5 rounded-full border transition-all"
        style={{ borderColor: `${diffColor}50`, color: diffColor, background: `${diffColor}10` }}>
        {playing ? '⏸ Pause' : '▶ Play'}
      </button>

      {showLabel && (
        <div className="text-center">
          <p className="text-xs font-bold" style={{ color: diffColor }}>{technique.name}</p>
          <p className="text-xs text-slate-500">{technique.tamilName}</p>
        </div>
      )}
    </div>
  )
}
