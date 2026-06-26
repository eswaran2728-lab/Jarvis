// Hook & Reverse Hook detection engine for ORION Silambam AI

export type HookType = 'HOOK' | 'REVERSE_HOOK' | 'BOTH' | 'NONE'
export type HookTouchResult = 'Clean Touch' | 'Light Touch' | 'Unclear Touch' | 'Missed Touch' | 'Blocked Touch'
export type HookSpeedRating = 'Too Slow' | 'Moderate' | 'Good Combat Speed' | 'Excellent Combat Speed'
export type HookFinalResult = 'Successful Hook' | 'Partial Hook' | 'Failed Hook' | 'Successful Reverse Hook' | 'Partial Reverse Hook' | 'Failed Reverse Hook'

export type HookPoint = { x: number; y: number; ts: number }

export type HookOpportunity = {
  available: boolean
  type: HookType
  reason: string
  openTargets: string[]
  counterRisk: 'LOW' | 'MEDIUM' | 'HIGH'
  pathTooWide: boolean
  warning: string | null
  suggestion: string
  overlayColor: string
}

export type HookAttemptResult = {
  detected: boolean
  type: HookType
  firstTouchTarget: string
  firstTouchResult: HookTouchResult
  pathCompactness: 'Compact' | 'Acceptable' | 'Too Wide'
  secondTouchTarget: string
  secondTouchResult: HookTouchResult
  speedRating: HookSpeedRating
  speedNote: string
  continuousFlow: boolean
  finalResult: HookFinalResult
  coachingFeedback: string
}

export type HookTimestamp = {
  videoTimeSec: number
  videoTimeStr: string
  fighter: string
  opportunity: HookOpportunity
  attempt: HookAttemptResult | null
}

// ─── Stick tip estimation (same logic as uStrikeDetection) ────────────────────

export function estimateHookStickTip(lm: any[]): { x: number; y: number } | null {
  const rW = lm[16]; const lW = lm[15]
  const rE = lm[14]; const lE = lm[13]
  if (!rW || !lW) return null
  const domW = (rW.visibility || 0) > (lW.visibility || 0) ? rW : lW
  const domE = (rW.visibility || 0) > (lW.visibility || 0) ? rE : lE
  if (!domE) return null
  const dx = domW.x - domE.x
  const dy = domW.y - domE.y
  const len = Math.sqrt(dx * dx + dy * dy) || 0.001
  const nx = dx / len; const ny = dy / len
  return { x: domW.x + nx * len * 1.6, y: domW.y + ny * len * 1.6 }
}

// ─── Opportunity detection ────────────────────────────────────────────────────

export function detectHookOpportunity(
  attackerLm: any[],
  defenderLm: any[] | null,
): HookOpportunity {
  if (!defenderLm || defenderLm.length < 17) {
    return {
      available: false, type: 'NONE',
      reason: 'Single player — point camera at both fighters',
      openTargets: [], counterRisk: 'MEDIUM', pathTooWide: false, warning: null,
      suggestion: 'Two players needed for Hook detection.',
      overlayColor: '#64748b',
    }
  }

  const atkRS = attackerLm[12]; const atkLS = attackerLm[11]
  const atkRW = attackerLm[16]; const atkLW = attackerLm[15]
  const defRS = defenderLm[12]; const defLS = defenderLm[11]
  const defRW = defenderLm[16]; const defLW = defenderLm[15]
  const defNose = defenderLm[0]; const atkNose = attackerLm[0]

  if (!atkRS || !atkLS || !defRS || !defLS) {
    return {
      available: false, type: 'NONE',
      reason: 'Not enough landmarks visible',
      openTargets: [], counterRisk: 'MEDIUM', pathTooWide: false, warning: null,
      suggestion: 'Ensure full upper body is visible.',
      overlayColor: '#64748b',
    }
  }

  // Distance between fighters
  const dx = (atkNose?.x || 0.5) - (defNose?.x || 0.5)
  const dy = (atkNose?.y || 0.5) - (defNose?.y || 0.5)
  const dist = Math.sqrt(dx * dx + dy * dy)
  const inRange = dist < 0.55

  // Check if defender's shoulders are exposed (low guard)
  const defGuardY = Math.min(defRW?.y || 1, defLW?.y || 1)
  const defShoulderY = Math.min(defRS.y, defLS.y)
  const shouldersOpen = defGuardY > defShoulderY + 0.08

  // Defender's stick threat — is their wrist raised (active guard)?
  const defStickThreat = defRW && defLW
    ? Math.min(defRW.y, defLW.y) < defShoulderY + 0.05
    : false

  const openTargets: string[] = []
  if (shouldersOpen && defRS.x < 0.5) openTargets.push('Left Shoulder')
  if (shouldersOpen && defLS.x >= 0.5) openTargets.push('Right Shoulder')
  if (shouldersOpen) openTargets.push('Chest')

  const counterRisk: 'LOW' | 'MEDIUM' | 'HIGH' = defStickThreat
    ? 'HIGH'
    : shouldersOpen ? 'LOW' : 'MEDIUM'

  // Determine Hook vs Reverse Hook based on attacker's dominant hand position
  const atkDomRight = (atkRW?.visibility || 0) > (atkLW?.visibility || 0)
  const atkWristX = atkDomRight ? (atkRW?.x || 0.5) : (atkLW?.x || 0.5)
  // If dominant wrist is on attacker's left side → natural Hook; right → Reverse Hook
  const preferReverse = atkWristX > 0.5

  if (!inRange) {
    return {
      available: false, type: 'NONE',
      reason: 'Distance too far for Hook',
      openTargets: [], counterRisk, pathTooWide: false,
      warning: 'Move closer before attempting Hook.',
      suggestion: 'Close the distance first.',
      overlayColor: '#64748b',
    }
  }

  if (!shouldersOpen) {
    return {
      available: false, type: preferReverse ? 'REVERSE_HOOK' : 'HOOK',
      reason: 'Opponent guard is active — shoulder line protected',
      openTargets: [],
      counterRisk: 'HIGH', pathTooWide: false,
      warning: defStickThreat ? 'Opponent ready to counter.' : null,
      suggestion: defStickThreat
        ? 'Do not attempt Hook. Opponent is ready to counter.'
        : 'Wait for the guard to drop before Hook.',
      overlayColor: '#f97316',
    }
  }

  const type = preferReverse ? 'REVERSE_HOOK' : 'HOOK'
  return {
    available: true,
    type,
    reason: `${type === 'HOOK' ? 'Hook' : 'Reverse Hook'} opening: shoulder line exposed`,
    openTargets,
    counterRisk,
    pathTooWide: false,
    warning: counterRisk === 'HIGH' ? 'Counter risk is HIGH — opponent may respond.' : null,
    suggestion: `${type === 'HOOK' ? 'Hook' : 'Reverse Hook'} opportunity available. Keep the C-path compact and flow continuously.`,
    overlayColor: type === 'HOOK' ? '#00d4ff' : '#a855f7',
  }
}

// ─── C-path (Hook shape) analysis ────────────────────────────────────────────

export function analyzeHookPath(tips: HookPoint[]): {
  isHook: boolean
  isReverseHook: boolean
  pathCompactness: 'Compact' | 'Acceptable' | 'Too Wide'
  continuousFlow: boolean
  durationMs: number
} {
  if (tips.length < 6) return { isHook: false, isReverseHook: false, pathCompactness: 'Too Wide', continuousFlow: false, durationMs: 0 }
  const durationMs = tips[tips.length - 1].ts - tips[0].ts
  // Split into thirds
  const t = Math.floor(tips.length / 3)
  const first = tips.slice(0, t)
  const mid   = tips.slice(t, 2 * t)
  const last  = tips.slice(2 * t)

  const avgX = (seg: HookPoint[]) => seg.reduce((s, p) => s + p.x, 0) / seg.length
  const avgY = (seg: HookPoint[]) => seg.reduce((s, p) => s + p.y, 0) / seg.length

  // Hook (left → dip → right) or Reverse Hook (right → dip → left)
  const firstX = avgX(first); const lastX = avgX(last)
  const midY = avgY(mid)
  const firstY = avgY(first); const lastY = avgY(last)

  // C-shape: middle segment Y higher than both ends (going up then down in y-space means mid is higher)
  const cBulge = midY < firstY - 0.02 && midY < lastY - 0.02

  const isHook = cBulge && firstX < lastX          // left-to-right arc
  const isReverseHook = cBulge && firstX > lastX   // right-to-left arc

  // Measure total horizontal span
  const xSpan = Math.abs(lastX - firstX)
  const pathCompactness: 'Compact' | 'Acceptable' | 'Too Wide' =
    xSpan < 0.18 ? 'Compact' : xSpan < 0.30 ? 'Acceptable' : 'Too Wide'

  // Continuous flow: time gaps between points should be roughly even
  const gaps = tips.slice(1).map((p, i) => p.ts - tips[i].ts)
  const avgGap = gaps.reduce((s, g) => s + g, 0) / gaps.length
  const continuousFlow = gaps.every(g => g < avgGap * 3)

  return { isHook, isReverseHook, pathCompactness, continuousFlow, durationMs }
}

// ─── Speed rating ─────────────────────────────────────────────────────────────

export function rateHookSpeed(durationMs: number): { rating: HookSpeedRating; note: string } {
  if (durationMs > 900)  return { rating: 'Too Slow',             note: 'Reduce stick travel and shorten the C-path.' }
  if (durationMs > 650)  return { rating: 'Moderate',             note: 'Good attempt. Push for faster flow.' }
  if (durationMs > 400)  return { rating: 'Good Combat Speed',    note: 'Solid Hook speed. Maintain compactness.' }
  return                        { rating: 'Excellent Combat Speed', note: 'Excellent Hook speed with tight control.' }
}

// ─── Coaching feedback ────────────────────────────────────────────────────────

export function generateHookFeedback(r: HookAttemptResult): string {
  if (r.finalResult.startsWith('Successful')) {
    return `Excellent ${r.type === 'HOOK' ? 'Hook' : 'Reverse Hook'}. Compact movement with excellent stick control.`
  }
  if (r.pathCompactness === 'Too Wide') {
    return 'Hook path is too wide. Shorten the movement to improve speed and stick control.'
  }
  if (!r.continuousFlow) {
    return 'Maintain continuous flow. Do not pause or reset mid-movement.'
  }
  if (r.secondTouchResult === 'Missed Touch') {
    return `First touch connected but second touch missed. Complete the ${r.type === 'HOOK' ? 'Hook' : 'Reverse Hook'} with full commitment.`
  }
  if (r.speedRating === 'Too Slow') {
    return 'Hook speed too slow. Opponent had counter opportunity. Increase movement speed.'
  }
  return `${r.type === 'HOOK' ? 'Reverse Hook' : 'Hook'} would have been a better option here.`
}

// ─── Attempt analysis ─────────────────────────────────────────────────────────

export function analyzeHookAttempt(
  attackerLm: any[],
  defenderLm: any[] | null,
  tipHistory: HookPoint[],
  opportunity: HookOpportunity,
): HookAttemptResult {
  const base: HookAttemptResult = {
    detected: false, type: opportunity.type === 'REVERSE_HOOK' ? 'REVERSE_HOOK' : 'HOOK',
    firstTouchTarget: '', firstTouchResult: 'Missed Touch',
    pathCompactness: 'Too Wide', secondTouchTarget: '', secondTouchResult: 'Missed Touch',
    speedRating: 'Too Slow', speedNote: '',
    continuousFlow: false,
    finalResult: opportunity.type === 'REVERSE_HOOK' ? 'Failed Reverse Hook' : 'Failed Hook',
    coachingFeedback: '',
  }

  if (tipHistory.length < 6) { base.coachingFeedback = 'No Hook movement detected.'; return base }

  const path = analyzeHookPath(tipHistory)
  if (!path.isHook && !path.isReverseHook) { base.coachingFeedback = 'No compact C-shaped path detected.'; return base }

  const type: HookType = path.isReverseHook ? 'REVERSE_HOOK' : 'HOOK'
  const { rating, note } = rateHookSpeed(path.durationMs)

  // Touch detection based on defender landmarks
  let firstTouch: HookTouchResult = 'Unclear Touch'
  let secondTouch: HookTouchResult = 'Unclear Touch'
  let firstTarget = 'Left Shoulder'
  let secondTarget = 'Right Shoulder'

  if (defenderLm) {
    const defRS = defenderLm[12]; const defLS = defenderLm[11]
    if (type === 'HOOK') {
      firstTarget = 'Left Shoulder'; secondTarget = 'Right Shoulder'
    } else {
      firstTarget = 'Right Shoulder'; secondTarget = 'Left Shoulder'
    }
    const tip = tipHistory[tipHistory.length - 1]
    const sTip = tipHistory[Math.floor(tipHistory.length / 2)]
    // First touch: mid-path near shoulder
    const firstDist = defRS ? Math.sqrt(Math.pow(sTip.x - defRS.x, 2) + Math.pow(sTip.y - defRS.y, 2)) : 1
    firstTouch = firstDist < 0.12 ? 'Clean Touch' : firstDist < 0.20 ? 'Light Touch' : 'Missed Touch'
    // Second touch: end of path near opposite shoulder
    const secondDist = defLS ? Math.sqrt(Math.pow(tip.x - defLS.x, 2) + Math.pow(tip.y - defLS.y, 2)) : 1
    secondTouch = secondDist < 0.12 ? 'Clean Touch' : secondDist < 0.20 ? 'Light Touch' : 'Missed Touch'
  }

  let finalResult: HookFinalResult
  const label = type === 'HOOK' ? 'Hook' : 'Reverse Hook'
  if (firstTouch !== 'Missed Touch' && secondTouch !== 'Missed Touch' && path.pathCompactness !== 'Too Wide') {
    finalResult = `Successful ${label}` as HookFinalResult
  } else if (firstTouch !== 'Missed Touch') {
    finalResult = `Partial ${label}` as HookFinalResult
  } else {
    finalResult = `Failed ${label}` as HookFinalResult
  }

  const result: HookAttemptResult = {
    detected: true, type, firstTouchTarget: firstTarget, firstTouchResult: firstTouch,
    pathCompactness: path.pathCompactness, continuousFlow: path.continuousFlow,
    secondTouchTarget: secondTarget, secondTouchResult: secondTouch,
    speedRating: rating, speedNote: note, finalResult, coachingFeedback: '',
  }
  result.coachingFeedback = generateHookFeedback(result)
  return result
}

// ─── Canvas overlay ───────────────────────────────────────────────────────────

export function drawHookOverlay(
  ctx: CanvasRenderingContext2D,
  W: number, H: number,
  attackerLm: any[],
  defenderLm: any[] | null,
  opportunity: HookOpportunity,
  tipHistory: HookPoint[],
): void {
  if (!opportunity.available && opportunity.type === 'NONE') return
  const color = opportunity.overlayColor

  // Draw C-path from tip history
  if (tipHistory.length >= 4) {
    ctx.save()
    ctx.beginPath()
    ctx.moveTo(tipHistory[0].x * W, tipHistory[0].y * H)
    for (let i = 1; i < tipHistory.length; i++) {
      ctx.lineTo(tipHistory[i].x * W, tipHistory[i].y * H)
    }
    ctx.strokeStyle = color
    ctx.lineWidth = 3
    ctx.globalAlpha = 0.7
    ctx.setLineDash([8, 4])
    ctx.stroke()
    ctx.setLineDash([])
    ctx.globalAlpha = 1
    ctx.restore()
  }

  // Draw target shoulder circles on defender
  if (defenderLm && opportunity.openTargets.length > 0) {
    const defRS = defenderLm[12]; const defLS = defenderLm[11]
    const targets = [defRS, defLS].filter(Boolean)
    targets.forEach(s => {
      ctx.save()
      ctx.beginPath()
      ctx.arc(s.x * W, s.y * H, 22, 0, Math.PI * 2)
      ctx.strokeStyle = color; ctx.lineWidth = 2.5; ctx.globalAlpha = 0.7; ctx.stroke()
      ctx.beginPath()
      ctx.arc(s.x * W, s.y * H, 8, 0, Math.PI * 2)
      ctx.fillStyle = color; ctx.globalAlpha = 0.4; ctx.fill()
      ctx.globalAlpha = 1
      ctx.restore()
    })
  }

  // Suggestion banner
  if (opportunity.available) {
    const label = opportunity.type === 'HOOK' ? '🔵 HOOK OPENING' : '🟣 REVERSE HOOK OPENING'
    ctx.save()
    ctx.font = 'bold 13px sans-serif'
    const tw = ctx.measureText(label).width
    ctx.fillStyle = color; ctx.globalAlpha = 0.85
    ctx.fillRect(W / 2 - tw / 2 - 10, H - 44, tw + 20, 26)
    ctx.fillStyle = '#000'; ctx.globalAlpha = 1
    ctx.fillText(label, W / 2 - tw / 2, H - 26)
    ctx.restore()
  } else if (opportunity.counterRisk === 'HIGH') {
    const label = '⚠ COUNTER RISK HIGH'
    ctx.save()
    ctx.font = 'bold 13px sans-serif'
    const tw = ctx.measureText(label).width
    ctx.fillStyle = '#f97316'; ctx.globalAlpha = 0.85
    ctx.fillRect(W / 2 - tw / 2 - 10, H - 44, tw + 20, 26)
    ctx.fillStyle = '#000'; ctx.globalAlpha = 1
    ctx.fillText(label, W / 2 - tw / 2, H - 26)
    ctx.restore()
  }
}
