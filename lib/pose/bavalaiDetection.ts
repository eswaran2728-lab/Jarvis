// Bavalai detection engine for ORION Silambam AI
// Bavalai = fundamental 360° spinning stick movement — foundation of all combat techniques

import { detectUStrikeOpportunity, UStrikeOpportunity } from './uStrikeDetection'
import { detectHookOpportunity, HookOpportunity } from './hookDetection'
import { detectUsiOpportunity, UsiOpportunity } from './usiDetection'
import { detectSweepOpportunity, SweepOpportunity } from './sweepDetection'

export type BavalaiQuality = 'Excellent' | 'Good' | 'Needs Improvement' | 'Lost Rhythm' | 'Not Detected'
export type BavalaiCoachMessage =
  | 'Maintain Bavalai.'
  | 'Return to Bavalai.'
  | 'Bavalai rhythm lost.'
  | 'Excellent Bavalai control.'
  | 'Bavalai speed too slow.'
  | 'Bavalai too large. Reduce movement.'
  | 'Prepare attack from Bavalai.'
  | 'Return to Bavalai after scoring.'
  | 'Attack opportunity detected.'

export type BavalaiPoint = { x: number; y: number; ts: number; angle: number }

export type TechniqueOpportunity = {
  technique: string
  reason: string
  priority: number   // 1 = highest
  available: boolean
  color: string
}

export type BavalaiState = {
  detected: boolean
  quality: BavalaiQuality
  rotationCount: number
  rotationSpeed: 'Too Slow' | 'Moderate' | 'Good' | 'Excellent'
  compactness: 'Compact' | 'Acceptable' | 'Too Large'
  rhythmScore: number   // 0-100
  coachMessage: BavalaiCoachMessage
  opportunities: TechniqueOpportunity[]
  bestOpportunity: TechniqueOpportunity | null
  overlayColor: string
}

// ─── Wrist angle tracker ──────────────────────────────────────────────────────

export function getBavalaiWristAngle(lm: any[]): number | null {
  const rW = lm[16]; const lW = lm[15]
  const rS = lm[12]; const lS = lm[11]
  if (!rW || !lW || !rS || !lS) return null
  // Use dominant wrist relative to its shoulder to track rotational position
  const domW = (rW.visibility || 0) > (lW.visibility || 0) ? rW : lW
  const domS = (rW.visibility || 0) > (lW.visibility || 0) ? rS : lS
  return Math.atan2(domW.y - domS.y, domW.x - domS.x)
}

// ─── Bavalai rotation detector ────────────────────────────────────────────────

export function analyzeBavalaiRotation(history: BavalaiPoint[]): {
  rotationCount: number
  avgAngularSpeed: number   // radians per second
  compactness: 'Compact' | 'Acceptable' | 'Too Large'
  rhythmScore: number
} {
  if (history.length < 8) return { rotationCount: 0, avgAngularSpeed: 0, compactness: 'Too Large', rhythmScore: 0 }

  // Count direction reversals as proxy for rotation count
  let rotations = 0
  let totalAngleDelta = 0
  let prevDelta = 0

  for (let i = 1; i < history.length; i++) {
    let delta = history[i].angle - history[i - 1].angle
    // Wrap to [-π, π]
    if (delta > Math.PI) delta -= 2 * Math.PI
    if (delta < -Math.PI) delta += 2 * Math.PI
    totalAngleDelta += Math.abs(delta)
    if (i > 1 && prevDelta * delta < -0.1) rotations += 0.5
    prevDelta = delta
  }

  const durationSec = (history[history.length - 1].ts - history[0].ts) / 1000 || 0.001
  const avgAngularSpeed = totalAngleDelta / durationSec   // rad/s

  // Compactness: measure how much the wrist position spreads (variance in x/y)
  const xs = history.map(p => p.x); const ys = history.map(p => p.y)
  const xRange = Math.max(...xs) - Math.min(...xs)
  const yRange = Math.max(...ys) - Math.min(...ys)
  const spread = Math.max(xRange, yRange)
  const compactness: 'Compact' | 'Acceptable' | 'Too Large' =
    spread < 0.20 ? 'Compact' : spread < 0.35 ? 'Acceptable' : 'Too Large'

  // Rhythm score: based on consistency of angular speed
  const deltas: number[] = []
  for (let i = 1; i < history.length; i++) {
    let d = history[i].angle - history[i - 1].angle
    if (d > Math.PI) d -= 2 * Math.PI
    if (d < -Math.PI) d += 2 * Math.PI
    deltas.push(Math.abs(d))
  }
  const mean = deltas.reduce((s, d) => s + d, 0) / deltas.length
  const variance = deltas.reduce((s, d) => s + Math.pow(d - mean, 2), 0) / deltas.length
  const rhythmScore = Math.max(0, Math.min(100, Math.round(100 - variance * 500)))

  return { rotationCount: Math.max(0, Math.round(rotations)), avgAngularSpeed, compactness, rhythmScore }
}

// ─── Opportunity aggregator ───────────────────────────────────────────────────

export function aggregateTechniqueOpportunities(
  attackerLm: any[],
  defenderLm: any[] | null,
  fromBavalai: boolean,
): TechniqueOpportunity[] {
  const opps: TechniqueOpportunity[] = []

  // U Strike
  try {
    const u = detectUStrikeOpportunity(attackerLm, defenderLm)
    opps.push({
      technique: u.type === 'REVERSE_U_STRIKE' ? 'Reverse U Strike' : 'U Strike',
      reason: u.reason,
      priority: u.available ? 2 : 5,
      available: u.available,
      color: u.overlayColor,
    })
  } catch { /* skip */ }

  // Hook
  try {
    const h = detectHookOpportunity(attackerLm, defenderLm)
    opps.push({
      technique: h.type === 'REVERSE_HOOK' ? 'Reverse Hook' : 'Hook',
      reason: h.reason,
      priority: h.available ? 2 : 5,
      available: h.available,
      color: h.overlayColor,
    })
  } catch { /* skip */ }

  // Usi
  try {
    const ui = detectUsiOpportunity(attackerLm, defenderLm)
    opps.push({
      technique: 'Usi',
      reason: ui.reason,
      priority: ui.available ? 1 : 5,    // Usi = fastest, highest priority
      available: ui.available,
      color: ui.overlayColor,
    })
  } catch { /* skip */ }

  // Sweep
  try {
    const sw = detectSweepOpportunity(attackerLm, defenderLm, fromBavalai)
    opps.push({
      technique: 'Sweep',
      reason: sw.reason,
      priority: sw.available ? 3 : 5,
      available: sw.available,
      color: sw.overlayColor,
    })
  } catch { /* skip */ }

  return opps.sort((a, b) => a.priority - b.priority)
}

// ─── Main Bavalai state detector ──────────────────────────────────────────────

export function analyzeBavalaiState(
  attackerLm: any[],
  defenderLm: any[] | null,
  bavalaiHistory: BavalaiPoint[],
): BavalaiState {
  const noDetect: BavalaiState = {
    detected: false, quality: 'Not Detected',
    rotationCount: 0, rotationSpeed: 'Too Slow', compactness: 'Too Large',
    rhythmScore: 0, coachMessage: 'Maintain Bavalai.',
    opportunities: [], bestOpportunity: null, overlayColor: '#64748b',
  }

  if (bavalaiHistory.length < 8) return noDetect

  const { rotationCount, avgAngularSpeed, compactness, rhythmScore } = analyzeBavalaiRotation(bavalaiHistory)

  // Need at least some rotation to be detected as Bavalai
  if (avgAngularSpeed < 0.5 && rotationCount < 1) return noDetect

  // Speed classification
  const rotationSpeed =
    avgAngularSpeed < 1.5 ? 'Too Slow'
    : avgAngularSpeed < 3.5 ? 'Moderate'
    : avgAngularSpeed < 6.0 ? 'Good'
    : 'Excellent'

  // Quality
  const quality: BavalaiQuality =
    rhythmScore >= 75 && compactness !== 'Too Large' ? 'Excellent'
    : rhythmScore >= 55 && compactness !== 'Too Large' ? 'Good'
    : rhythmScore >= 35 ? 'Needs Improvement'
    : 'Lost Rhythm'

  // Coach message
  let coachMessage: BavalaiCoachMessage
  if (quality === 'Lost Rhythm') coachMessage = 'Bavalai rhythm lost.'
  else if (compactness === 'Too Large') coachMessage = 'Bavalai too large. Reduce movement.'
  else if (rotationSpeed === 'Too Slow') coachMessage = 'Bavalai speed too slow.'
  else if (quality === 'Excellent') coachMessage = 'Excellent Bavalai control.'
  else coachMessage = 'Maintain Bavalai.'

  // Scan for attack opportunities while in Bavalai
  const opportunities = aggregateTechniqueOpportunities(attackerLm, defenderLm, true)
  const bestOpportunity = opportunities.find(o => o.available) || null

  if (bestOpportunity) coachMessage = 'Attack opportunity detected.'

  return {
    detected: true, quality,
    rotationCount, rotationSpeed, compactness, rhythmScore,
    coachMessage,
    opportunities, bestOpportunity,
    overlayColor: quality === 'Excellent' ? '#00ff88' : quality === 'Good' ? '#00d4ff' : quality === 'Needs Improvement' ? '#f59e0b' : '#f97316',
  }
}

// ─── Canvas overlay ───────────────────────────────────────────────────────────

export function drawBavalaiOverlay(
  ctx: CanvasRenderingContext2D,
  W: number, H: number,
  attackerLm: any[],
  bavalaiState: BavalaiState,
  bavalaiHistory: BavalaiPoint[],
): void {
  if (!bavalaiState.detected) return
  const color = bavalaiState.overlayColor

  // Draw Bavalai wrist rotation arc
  if (bavalaiHistory.length >= 4) {
    ctx.save()
    ctx.beginPath()
    ctx.moveTo(bavalaiHistory[0].x * W, bavalaiHistory[0].y * H)
    for (let i = 1; i < bavalaiHistory.length; i++) {
      ctx.lineTo(bavalaiHistory[i].x * W, bavalaiHistory[i].y * H)
    }
    ctx.strokeStyle = color; ctx.lineWidth = 2.5; ctx.globalAlpha = 0.5
    ctx.setLineDash([6, 4]); ctx.stroke(); ctx.setLineDash([])
    ctx.globalAlpha = 1; ctx.restore()
  }

  // Bavalai quality badge
  const rS = attackerLm[12]; const lS = attackerLm[11]
  if (rS && lS) {
    const centerX = ((rS.x + lS.x) / 2) * W
    const centerY = ((rS.y + lS.y) / 2) * H - 30
    ctx.save()
    ctx.font = 'bold 10px sans-serif'
    const label = `⟳ BAVALAI ${bavalaiState.quality.toUpperCase()}`
    const tw = ctx.measureText(label).width
    ctx.fillStyle = color; ctx.globalAlpha = 0.85
    ctx.fillRect(centerX - tw / 2 - 6, centerY - 12, tw + 12, 18)
    ctx.fillStyle = '#000'; ctx.globalAlpha = 1
    ctx.fillText(label, centerX - tw / 2, centerY)
    ctx.restore()
  }

  // Best opportunity call-out
  if (bavalaiState.bestOpportunity) {
    const opp = bavalaiState.bestOpportunity
    ctx.save()
    ctx.font = 'bold 12px sans-serif'
    const label = `⚡ ${opp.technique.toUpperCase()} OPENING`
    const tw = ctx.measureText(label).width
    ctx.fillStyle = opp.color; ctx.globalAlpha = 0.90
    ctx.fillRect(8, 8, tw + 16, 24)
    ctx.fillStyle = '#000'; ctx.globalAlpha = 1
    ctx.fillText(label, 16, 24)
    ctx.restore()
  }
}
