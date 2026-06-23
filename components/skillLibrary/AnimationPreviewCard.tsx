'use client'
import { useEffect, useRef, useState } from 'react'
import { SkillClip, PoseKeyframe } from '@/types/skillLibrary'

type Props = { clip: SkillClip; width?: number; height?: number; autoPlay?: boolean }

const PHASE_COLORS: Record<string, string> = {
  ready: '#4ade80', attack: '#f97316', impact: '#ef4444',
  defense: '#3b82f6', counter: '#a855f7', reset: '#94a3b8',
}
const PHASE_LABELS: Record<string, string> = {
  ready: 'READY', attack: 'ATTACK ▶', impact: '⚡ IMPACT',
  defense: 'DEFENSE', counter: '↩ COUNTER', reset: 'RESET',
}

function drawGround(ctx: CanvasRenderingContext2D, w: number, h: number) {
  // Dark tactical floor
  const grad = ctx.createLinearGradient(0, h * 0.75, 0, h)
  grad.addColorStop(0, '#1a1a2e')
  grad.addColorStop(1, '#0d0d1a')
  ctx.fillStyle = grad
  ctx.fillRect(0, h * 0.75, w, h * 0.25)
  // Grid lines
  ctx.strokeStyle = '#ffffff08'
  ctx.lineWidth = 0.5
  for (let x = 0; x < w; x += 30) {
    ctx.beginPath(); ctx.moveTo(x, h * 0.75); ctx.lineTo(x + 20, h); ctx.stroke()
  }
  ctx.strokeStyle = '#ffffff05'
  for (let y = h * 0.78; y < h; y += 15) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke()
  }
}

function drawFighter(
  ctx: CanvasRenderingContext2D,
  fx: number, fy: number,
  w: number, h: number,
  facing: 'right' | 'left',
  highlight: boolean,
  stickAngle: number,
  stickLen: number,
  armAngle: number,
  legSpread: number,
  phase: string
) {
  const scale = h * 0.38
  const cx = fx * w
  const cy = fy * h

  ctx.save()

  // Shadow
  ctx.beginPath()
  ctx.ellipse(cx, cy + scale * 0.52, scale * 0.18, scale * 0.04, 0, 0, Math.PI * 2)
  ctx.fillStyle = '#00000050'
  ctx.fill()

  const dir = facing === 'right' ? 1 : -1
  const color = highlight ? '#ff4444' : (facing === 'right' ? '#9ca3af' : '#6b7280')
  const glowColor = highlight ? '#ff0000' : (facing === 'right' ? '#60a5fa' : '#34d399')

  if (highlight) {
    ctx.shadowColor = '#ff0000'
    ctx.shadowBlur = 15
  } else {
    ctx.shadowColor = glowColor
    ctx.shadowBlur = 8
  }

  ctx.strokeStyle = color
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'

  // Leg positions
  const lSpread = legSpread * scale * 0.8
  const footY = cy + scale * 0.5

  // Legs
  ctx.lineWidth = scale * 0.08
  ctx.beginPath()
  ctx.moveTo(cx, cy + scale * 0.2)
  ctx.lineTo(cx - lSpread * 0.4, cy + scale * 0.35)
  ctx.lineTo(cx - lSpread * 0.5 + dir * 5, footY)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(cx, cy + scale * 0.2)
  ctx.lineTo(cx + lSpread * 0.4, cy + scale * 0.35)
  ctx.lineTo(cx + lSpread * 0.5 - dir * 5, footY)
  ctx.stroke()

  // Torso
  ctx.lineWidth = scale * 0.1
  ctx.beginPath()
  ctx.moveTo(cx, cy + scale * 0.2)
  ctx.lineTo(cx, cy - scale * 0.18)
  ctx.stroke()

  // Arms — angle based on armAngle
  const aRad = (armAngle * Math.PI) / 180
  const armLen = scale * 0.28
  const elbowX = cx + Math.cos(aRad) * armLen * dir
  const elbowY = cy - scale * 0.1 + Math.sin(aRad) * armLen
  const wristX = elbowX + Math.cos(aRad * 0.6) * armLen * 0.8 * dir
  const wristY = elbowY + Math.sin(aRad * 0.6) * armLen * 0.8

  ctx.lineWidth = scale * 0.07
  ctx.beginPath()
  ctx.moveTo(cx, cy - scale * 0.08)
  ctx.lineTo(elbowX, elbowY)
  ctx.lineTo(wristX, wristY)
  ctx.stroke()

  // Head
  ctx.fillStyle = color
  ctx.shadowColor = glowColor
  ctx.shadowBlur = 10
  ctx.beginPath()
  ctx.arc(cx, cy - scale * 0.28, scale * 0.1, 0, Math.PI * 2)
  ctx.fill()

  // Silambam stick
  if (stickLen > 0) {
    const sRad = (stickAngle * Math.PI) / 180
    const sLen = stickLen * scale * 1.2
    const sx1 = wristX - Math.cos(sRad) * sLen * 0.3 * dir
    const sy1 = wristY - Math.sin(sRad) * sLen * 0.3
    const sx2 = wristX + Math.cos(sRad) * sLen * 0.7 * dir
    const sy2 = wristY + Math.sin(sRad) * sLen * 0.7

    ctx.lineWidth = scale * 0.045
    ctx.strokeStyle = highlight ? '#ff6600' : '#e2e8f0'
    ctx.shadowColor = highlight ? '#ff4400' : '#ffffff80'
    ctx.shadowBlur = highlight ? 12 : 4
    ctx.beginPath()
    ctx.moveTo(sx1, sy1)
    ctx.lineTo(sx2, sy2)
    ctx.stroke()

    // Stick tip glow
    ctx.beginPath()
    ctx.arc(sx2, sy2, scale * 0.04, 0, Math.PI * 2)
    ctx.fillStyle = highlight ? '#ff4400' : '#ffffff'
    ctx.fill()
  }

  ctx.restore()
}

function drawArrow(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, color: string, label?: string) {
  ctx.save()
  ctx.strokeStyle = color
  ctx.fillStyle = color
  ctx.lineWidth = 2
  ctx.shadowColor = color
  ctx.shadowBlur = 6
  ctx.setLineDash([4, 3])
  ctx.beginPath()
  ctx.moveTo(x1, y1)
  ctx.lineTo(x2, y2)
  ctx.stroke()
  ctx.setLineDash([])
  // Arrowhead
  const angle = Math.atan2(y2 - y1, x2 - x1)
  ctx.beginPath()
  ctx.moveTo(x2, y2)
  ctx.lineTo(x2 - 10 * Math.cos(angle - 0.4), y2 - 10 * Math.sin(angle - 0.4))
  ctx.lineTo(x2 - 10 * Math.cos(angle + 0.4), y2 - 10 * Math.sin(angle + 0.4))
  ctx.closePath()
  ctx.fill()
  if (label) {
    ctx.shadowBlur = 0
    ctx.font = 'bold 9px monospace'
    ctx.fillText(label, (x1 + x2) / 2, (y1 + y2) / 2 - 6)
  }
  ctx.restore()
}

function drawImpactFlash(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  const rays = 8
  ctx.save()
  ctx.shadowColor = '#ff0000'
  ctx.shadowBlur = 20
  for (let i = 0; i < rays; i++) {
    const angle = (i / rays) * Math.PI * 2
    const len = r * (0.8 + Math.random() * 0.4)
    ctx.strokeStyle = `rgba(255, ${60 + i * 20}, 0, 0.9)`
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(x + Math.cos(angle) * r * 0.3, y + Math.sin(angle) * r * 0.3)
    ctx.lineTo(x + Math.cos(angle) * len, y + Math.sin(angle) * len)
    ctx.stroke()
  }
  const g = ctx.createRadialGradient(x, y, 0, x, y, r)
  g.addColorStop(0, 'rgba(255,80,0,0.9)')
  g.addColorStop(0.5, 'rgba(255,30,0,0.5)')
  g.addColorStop(1, 'rgba(255,0,0,0)')
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.arc(x, y, r, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

export default function AnimationPreviewCard({ clip, width = 320, height = 200, autoPlay = true }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [frameIdx, setFrameIdx] = useState(0)
  const [playing, setPlaying] = useState(autoPlay)
  const rafRef = useRef<number>(0)
  const startRef = useRef<number>(0)

  const frames = clip.poseKeyframes || []
  const totalFrames = frames.length

  useEffect(() => {
    if (!playing || totalFrames === 0) return
    let fi = 0
    startRef.current = performance.now()

    const tick = (now: number) => {
      const dur = frames[fi]?.timestampMs ? (frames[Math.min(fi + 1, totalFrames - 1)]?.timestampMs - frames[fi]?.timestampMs) || 400 : 400
      const elapsed = now - startRef.current
      if (elapsed >= dur) {
        fi = (fi + 1) % totalFrames
        setFrameIdx(fi)
        startRef.current = now
      }
      drawFrame(fi)
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [playing, clip])

  useEffect(() => {
    if (!playing) drawFrame(frameIdx)
  }, [frameIdx, playing])

  function drawFrame(fi: number) {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const w = canvas.width, h = canvas.height

    // Background
    const bg = ctx.createLinearGradient(0, 0, 0, h)
    bg.addColorStop(0, '#0f0f1a')
    bg.addColorStop(0.6, '#1a0a0a')
    bg.addColorStop(1, '#0d0d0d')
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, w, h)

    // Grid overlay
    ctx.strokeStyle = '#ffffff04'
    ctx.lineWidth = 0.5
    for (let x = 0; x < w; x += 20) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke() }
    for (let y = 0; y < h; y += 20) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke() }

    drawGround(ctx, w, h)

    if (frames.length === 0) {
      // Placeholder if no keyframes
      ctx.fillStyle = '#ffffff15'
      ctx.font = `bold ${Math.round(w * 0.06)}px monospace`
      ctx.textAlign = 'center'
      ctx.fillText('ANIMATION PREVIEW', w / 2, h / 2 - 10)
      ctx.font = `${Math.round(w * 0.04)}px monospace`
      ctx.fillStyle = '#00d4ff60'
      ctx.fillText(clip.skillType, w / 2, h / 2 + 15)
      ctx.textAlign = 'left'
      return
    }

    const frame = frames[fi]
    const fa = frame.fighterA
    const fb = frame.fighterB

    // Draw fighters
    drawFighter(ctx, fa.x, 0.62, w, h, 'right', !!fa.highlight, fa.stickAngle, fa.stickLength, fa.armAngle, fa.legSpread, frame.phase)
    drawFighter(ctx, fb.x, 0.62, w, h, 'left', !!fb.highlight, fb.stickAngle, fb.stickLength, fb.armAngle, fb.legSpread, frame.phase)

    // Attack arrows
    if (frame.phase === 'attack' || frame.phase === 'impact') {
      const ax = fa.x * w
      const bx = fb.x * w
      const ay = 0.45 * h
      drawArrow(ctx, ax + 20, ay, bx - 20, ay, '#f97316', 'ATTACK')
    }
    if (frame.phase === 'counter') {
      const ax = fa.x * w
      const bx = fb.x * w
      const cy2 = 0.55 * h
      drawArrow(ctx, bx - 20, cy2, ax + 20, cy2, '#a855f7', 'COUNTER')
    }

    // Impact flash
    if (frame.phase === 'impact') {
      const mx = ((fa.x + fb.x) / 2) * w
      const my = 0.52 * h
      drawImpactFlash(ctx, mx, my, w * 0.06)
    }

    // Phase overlay
    const phaseColor = PHASE_COLORS[frame.phase] || '#ffffff'
    const phaseLabel = PHASE_LABELS[frame.phase] || frame.phase.toUpperCase()
    ctx.save()
    ctx.fillStyle = phaseColor + '22'
    ctx.fillRect(0, 0, w, h * 0.12)
    ctx.fillStyle = phaseColor
    ctx.font = `bold ${Math.round(w * 0.055)}px monospace`
    ctx.fillText(phaseLabel, 8, h * 0.085)

    // Reaction time
    if (clip.reactionTimeMs && clip.reactionTimeMs > 0 && frame.phase === 'impact') {
      ctx.font = `${Math.round(w * 0.038)}px monospace`
      ctx.fillStyle = '#ffffff80'
      ctx.fillText(`Reaction: ${(clip.reactionTimeMs / 1000).toFixed(2)}s`, w - w * 0.5, h * 0.085)
    }

    // Point decision badge
    if (frame.phase === 'reset') {
      const isPoint = clip.pointDecision.toLowerCase().includes('point to') || clip.pointDecision.toLowerCase().includes('1 point')
      ctx.fillStyle = isPoint ? '#00ff8822' : '#ff000022'
      ctx.strokeStyle = isPoint ? '#00ff88' : '#ff4444'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.roundRect(w - 90, h - 28, 85, 22, 4)
      ctx.fill(); ctx.stroke()
      ctx.fillStyle = isPoint ? '#00ff88' : '#ff4444'
      ctx.font = `bold ${Math.round(w * 0.038)}px monospace`
      ctx.textAlign = 'right'
      ctx.fillText(isPoint ? '✓ POINT' : '✗ NO POINT', w - 8, h - 11)
      ctx.textAlign = 'left'
    }
    ctx.restore()

    // Category tag
    ctx.save()
    ctx.fillStyle = '#00d4ff15'
    ctx.strokeStyle = '#00d4ff40'
    ctx.lineWidth = 0.5
    ctx.beginPath()
    ctx.roundRect(6, h - 22, 70, 16, 3)
    ctx.fill(); ctx.stroke()
    ctx.fillStyle = '#00d4ff'
    ctx.font = `${Math.round(w * 0.032)}px monospace`
    ctx.fillText(clip.category.replace('_', ' ').toUpperCase(), 10, h - 9)
    ctx.restore()
  }

  const phase = frames[frameIdx]?.phase || 'ready'

  return (
    <div className="flex flex-col gap-2">
      <div className="relative rounded-xl overflow-hidden border border-slate-700/50" style={{ background: '#0f0f1a' }}>
        <canvas ref={canvasRef} width={width} height={height} className="w-full" />
        {/* Frame dots */}
        {totalFrames > 1 && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
            {frames.map((f, i) => (
              <button key={i} onClick={() => { setPlaying(false); setFrameIdx(i); setTimeout(() => drawFrame(i), 10) }}
                className="rounded-full transition-all"
                style={{ width: i === frameIdx ? 16 : 8, height: 8,
                  background: i === frameIdx ? PHASE_COLORS[f.phase] || '#00d4ff' : '#ffffff30' }} />
            ))}
          </div>
        )}
      </div>
      {/* Step panels */}
      <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${Math.min(frames.length, 4)}, 1fr)` }}>
        {frames.slice(0, 4).map((f, i) => {
          const c = PHASE_COLORS[f.phase] || '#00d4ff'
          return (
            <button key={i} onClick={() => { setPlaying(false); setFrameIdx(i); setTimeout(() => drawFrame(i), 10) }}
              className="rounded-lg px-1 py-1.5 text-center transition-all border"
              style={{ background: i === frameIdx ? `${c}18` : '#1e293b40', borderColor: i === frameIdx ? `${c}60` : '#334155' }}>
              <p className="text-[9px] font-bold" style={{ color: c }}>{PHASE_LABELS[f.phase]}</p>
            </button>
          )
        })}
      </div>
      <button onClick={() => setPlaying(p => !p)}
        className="text-xs py-1.5 rounded-lg border border-slate-700 text-slate-400 hover:text-white transition-colors">
        {playing ? '⏸ Pause' : '▶ Play Animation'}
      </button>
    </div>
  )
}
