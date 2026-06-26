// Usi (Injection Strike) detection engine for ORION Silambam AI

export type UsiSpeedRating = 'Too Slow' | 'Moderate' | 'Good Combat Speed' | 'Excellent Combat Speed' | 'Usi Speed'
export type UsiTouchResult = 'Clean Touch' | 'Light Touch' | 'Unclear Touch' | 'Missed Touch' | 'Blocked Touch'
export type UsiFinalResult = 'Successful Usi' | 'Partial Usi' | 'Failed Usi'

export type UsiPoint = { x: number; y: number; ts: number }

export type UsiOpportunity = {
  available: boolean
  reason: string
  chestOpen: boolean
  guardLow: boolean
  counterRisk: 'LOW' | 'MEDIUM' | 'HIGH'
  warning: string | null
  suggestion: string
  overlayColor: string
}

export type UsiAttemptResult = {
  detected: boolean
  touchTarget: 'Chest'
  touchResult: UsiTouchResult
  stickPath: 'Straight-line tip entry' | 'Slightly curved' | 'Not straight'
  speedRating: UsiSpeedRating
  speedNote: string
  recoverySpeed: 'Good' | 'Slow' | 'Not detected'
  finalResult: UsiFinalResult
  coachingFeedback: string
}

export type UsiTimestamp = {
  videoTimeSec: number
  videoTimeStr: string
  fighter: string
  opportunity: UsiOpportunity
  attempt: UsiAttemptResult | null
}

// ─── Stick tip estimation ─────────────────────────────────────────────────────

export function estimateUsiStickTip(lm: any[]): { x: number; y: number } | null {
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

export function detectUsiOpportunity(
  attackerLm: any[],
  defenderLm: any[] | null,
): UsiOpportunity {
  if (!defenderLm || defenderLm.length < 17) {
    return {
      available: false,
      reason: 'Single player — point camera at both fighters',
      chestOpen: false, guardLow: false, counterRisk: 'MEDIUM', warning: null,
      suggestion: 'Two players needed for Usi detection.',
      overlayColor: '#64748b',
    }
  }

  const defNose = defenderLm[0]
  const defRS   = defenderLm[12]; const defLS = defenderLm[11]
  const defRH   = defenderLm[24]; const defLH = defenderLm[23]
  const defRW   = defenderLm[16]; const defLW = defenderLm[15]
  const atkNose = attackerLm[0]
  const atkRW   = attackerLm[16]; const atkLW = attackerLm[15]

  if (!defRS || !defLS) {
    return {
      available: false, reason: 'Defender landmarks unclear',
      chestOpen: false, guardLow: false, counterRisk: 'MEDIUM', warning: null,
      suggestion: 'Ensure full upper body is visible.',
      overlayColor: '#64748b',
    }
  }

  // Distance check
  const dx = (atkNose?.x || 0.5) - (defNose?.x || 0.5)
  const dy = (atkNose?.y || 0.5) - (defNose?.y || 0.5)
  const dist = Math.sqrt(dx * dx + dy * dy)
  const inRange = dist < 0.60

  if (!inRange) {
    return {
      available: false, reason: 'Distance too far for Usi',
      chestOpen: false, guardLow: false, counterRisk: 'LOW', warning: null,
      suggestion: 'Close the distance before attempting Usi.',
      overlayColor: '#64748b',
    }
  }

  // Chest open: estimate chest center between shoulders and hips
  const chestX = ((defRS.x + defLS.x) / 2)
  const chestY = ((defRS.y + defLS.y) / 2 + (defRH?.y || defRS.y + 0.2) + (defLH?.y || defLS.y + 0.2)) / 3

  // Guard low: defender's wrists are below shoulder level (not protecting chest)
  const defWristY = Math.min(defRW?.y || 1, defLW?.y || 1)
  const defShoulderY = Math.min(defRS.y, defLS.y)
  const guardLow = defWristY > defShoulderY + 0.10

  // Centerline check: is defender's stick away from center?
  const centerlineProtected = defRW && defLW
    ? Math.abs((defRW.x + defLW.x) / 2 - chestX) < 0.12 && defWristY < chestY
    : false

  const defStickThreat = defRW && defLW
    ? Math.min(defRW.y, defLW.y) < defShoulderY + 0.05
    : false

  // Attacker stick alignment with chest
  const atkDomW = (atkRW?.visibility || 0) > (atkLW?.visibility || 0) ? atkRW : atkLW
  const atkAligned = atkDomW
    ? Math.abs(atkDomW.x - chestX) < 0.20
    : false

  const counterRisk: 'LOW' | 'MEDIUM' | 'HIGH' = defStickThreat || centerlineProtected
    ? 'HIGH' : guardLow ? 'LOW' : 'MEDIUM'

  if (centerlineProtected) {
    return {
      available: false,
      reason: "Opponent's stick protects the centerline",
      chestOpen: false, guardLow,
      counterRisk: 'HIGH',
      warning: "Do not use Usi here. Opponent's stick is protecting the centerline.",
      suggestion: "Do not try Usi. Opponent is ready to counter.",
      overlayColor: '#f97316',
    }
  }

  if (!guardLow) {
    return {
      available: false,
      reason: "Opponent guard is active — chest not accessible",
      chestOpen: false, guardLow: false,
      counterRisk,
      warning: defStickThreat ? "Opponent ready to counter." : null,
      suggestion: "Wait for the guard to drop before using Usi.",
      overlayColor: '#f59e0b',
    }
  }

  return {
    available: true,
    reason: "Chest line open and guard is low",
    chestOpen: true, guardLow: true,
    counterRisk,
    warning: counterRisk === 'HIGH' ? "Recover guard immediately after Usi." : null,
    suggestion: atkAligned
      ? "Usi opportunity available. Chest line open. Attack directly with stick tip."
      : "Use Usi now. Align stick tip with chest and inject directly.",
    overlayColor: '#00d4ff',
  }
}

// ─── Straight-line path analysis ──────────────────────────────────────────────

export function analyzeUsiPath(tips: UsiPoint[]): {
  isStraight: boolean
  pathType: 'Straight-line tip entry' | 'Slightly curved' | 'Not straight'
  durationMs: number
} {
  if (tips.length < 4) return { isStraight: false, pathType: 'Not straight', durationMs: 0 }
  const durationMs = tips[tips.length - 1].ts - tips[0].ts

  // Measure deviation from straight line between first and last point
  const p0 = tips[0]; const pN = tips[tips.length - 1]
  const lineDx = pN.x - p0.x; const lineDy = pN.y - p0.y
  const lineLen = Math.sqrt(lineDx * lineDx + lineDy * lineDy) || 0.001

  const maxDeviation = tips.reduce((max, p) => {
    // Distance from point to the line p0→pN
    const cross = Math.abs((pN.y - p0.y) * p.x - (pN.x - p0.x) * p.y + pN.x * p0.y - pN.y * p0.x)
    return Math.max(max, cross / lineLen)
  }, 0)

  const isStraight = maxDeviation < 0.04
  const pathType: 'Straight-line tip entry' | 'Slightly curved' | 'Not straight' =
    maxDeviation < 0.04 ? 'Straight-line tip entry'
    : maxDeviation < 0.09 ? 'Slightly curved'
    : 'Not straight'

  return { isStraight, pathType, durationMs }
}

// ─── Speed rating ─────────────────────────────────────────────────────────────

export function rateUsiSpeed(durationMs: number): { rating: UsiSpeedRating; note: string } {
  if (durationMs > 700) return { rating: 'Too Slow',   note: 'Usi was too slow. This technique must be instant. Reduce preparation time and attack directly with the stick tip.' }
  if (durationMs > 450) return { rating: 'Moderate',   note: 'Moderate speed. Push for a faster entry with less preparation.' }
  if (durationMs > 250) return { rating: 'Good Combat Speed', note: 'Good Usi timing. Maintain alignment and clean tip contact.' }
  return                       { rating: 'Usi Speed',  note: 'Usi executed instantly. Excellent blink-of-an-eye timing.' }
}

// ─── Coaching feedback ────────────────────────────────────────────────────────

export function generateUsiFeedback(r: UsiAttemptResult): string {
  if (r.finalResult === 'Successful Usi') {
    return `Excellent Usi. ${r.stickPath} with clean chest touch. ${r.recoverySpeed === 'Good' ? 'Fast recovery — well done.' : 'Recover guard faster after touch.'}`
  }
  if (r.speedRating === 'Too Slow') {
    return 'Usi was too slow. Opponent had counter opportunity. This technique must be instant.'
  }
  if (r.stickPath === 'Not straight') {
    return 'Usi missed because stick tip was not aligned with chest. Reduce body movement. Let the stick tip travel directly.'
  }
  if (r.touchResult === 'Missed Touch') {
    return 'Chest line was open but you delayed the attack. Usi must be executed immediately when the chest line opens.'
  }
  if (r.recoverySpeed === 'Slow') {
    return 'Good Usi, but recover guard faster. After Usi, exit or guard immediately.'
  }
  return 'After Usi, exit or guard immediately.'
}

// ─── Attempt analysis ─────────────────────────────────────────────────────────

export function analyzeUsiAttempt(
  attackerLm: any[],
  defenderLm: any[] | null,
  tipHistory: UsiPoint[],
  opportunity: UsiOpportunity,
): UsiAttemptResult {
  const base: UsiAttemptResult = {
    detected: false, touchTarget: 'Chest', touchResult: 'Missed Touch',
    stickPath: 'Not straight', speedRating: 'Too Slow', speedNote: '',
    recoverySpeed: 'Not detected',
    finalResult: 'Failed Usi', coachingFeedback: '',
  }

  if (tipHistory.length < 4) { base.coachingFeedback = 'No Usi movement detected.'; return base }

  const path = analyzeUsiPath(tipHistory)
  if (!path.isStraight && path.pathType === 'Not straight') {
    base.coachingFeedback = 'Stick path was not straight. Usi requires a direct tip entry.'; return base
  }

  const { rating, note } = rateUsiSpeed(path.durationMs)

  // Touch detection — check tip proximity to defender's chest center
  let touchResult: UsiTouchResult = 'Missed Touch'
  if (defenderLm) {
    const defRS = defenderLm[12]; const defLS = defenderLm[11]
    const defRH = defenderLm[24]; const defLH = defenderLm[23]
    if (defRS && defLS) {
      const chestX = (defRS.x + defLS.x) / 2
      const chestY = (defRS.y + defLS.y) / 2 + 0.08
      const tip = tipHistory[tipHistory.length - 1]
      const dist = Math.sqrt(Math.pow(tip.x - chestX, 2) + Math.pow(tip.y - chestY, 2))
      touchResult = dist < 0.10 ? 'Clean Touch' : dist < 0.18 ? 'Light Touch' : dist < 0.28 ? 'Unclear Touch' : 'Missed Touch'
    }
  }

  // Recovery speed: check if last tip points move back toward attacker (withdrawal)
  let recoverySpeed: 'Good' | 'Slow' | 'Not detected' = 'Not detected'
  if (tipHistory.length > 8) {
    const peak = tipHistory[Math.floor(tipHistory.length * 0.6)]
    const last = tipHistory[tipHistory.length - 1]
    const withdrawal = Math.sqrt(Math.pow(last.x - peak.x, 2) + Math.pow(last.y - peak.y, 2))
    const withdrawalTime = last.ts - peak.ts
    recoverySpeed = withdrawal > 0.08 && withdrawalTime < 350 ? 'Good' : 'Slow'
  }

  let finalResult: UsiFinalResult
  if (touchResult === 'Clean Touch' && path.isStraight) finalResult = 'Successful Usi'
  else if (touchResult !== 'Missed Touch') finalResult = 'Partial Usi'
  else finalResult = 'Failed Usi'

  const result: UsiAttemptResult = {
    detected: true, touchTarget: 'Chest', touchResult,
    stickPath: path.pathType, speedRating: rating, speedNote: note,
    recoverySpeed, finalResult, coachingFeedback: '',
  }
  result.coachingFeedback = generateUsiFeedback(result)
  return result
}

// ─── Canvas overlay ───────────────────────────────────────────────────────────

export function drawUsiOverlay(
  ctx: CanvasRenderingContext2D,
  W: number, H: number,
  attackerLm: any[],
  defenderLm: any[] | null,
  opportunity: UsiOpportunity,
  tipHistory: UsiPoint[],
): void {
  if (!opportunity.available && !opportunity.chestOpen) return
  const color = opportunity.overlayColor

  // Draw straight attack line from attacker wrist toward defender chest
  if (defenderLm && attackerLm) {
    const atkRW = attackerLm[16]; const atkLW = attackerLm[15]
    const domW = (atkRW?.visibility || 0) > (atkLW?.visibility || 0) ? atkRW : atkLW
    const defRS = defenderLm[12]; const defLS = defenderLm[11]
    if (domW && defRS && defLS) {
      const chestX = (defRS.x + defLS.x) / 2
      const chestY = (defRS.y + defLS.y) / 2 + 0.08
      ctx.save()
      ctx.beginPath()
      ctx.moveTo(domW.x * W, domW.y * H)
      ctx.lineTo(chestX * W, chestY * H)
      ctx.strokeStyle = color; ctx.lineWidth = 3; ctx.globalAlpha = 0.65
      ctx.setLineDash([10, 5])
      ctx.stroke()
      ctx.setLineDash([])
      ctx.globalAlpha = 1
      // Arrowhead at chest
      const angle = Math.atan2(chestY * H - domW.y * H, chestX * W - domW.x * W)
      ctx.fillStyle = color; ctx.globalAlpha = 0.9
      ctx.translate(chestX * W, chestY * H)
      ctx.rotate(angle)
      ctx.beginPath()
      ctx.moveTo(0, 0); ctx.lineTo(-14, -6); ctx.lineTo(-14, 6); ctx.closePath(); ctx.fill()
      ctx.restore()

      // Chest target circle
      ctx.save()
      ctx.beginPath()
      ctx.arc(chestX * W, chestY * H, 24, 0, Math.PI * 2)
      ctx.strokeStyle = color; ctx.lineWidth = 2.5; ctx.globalAlpha = 0.8; ctx.stroke()
      ctx.beginPath()
      ctx.arc(chestX * W, chestY * H, 8, 0, Math.PI * 2)
      ctx.fillStyle = color; ctx.globalAlpha = 0.4; ctx.fill()
      ctx.globalAlpha = 1
      ctx.restore()
    }
  }

  // Tip trail
  if (tipHistory.length >= 3) {
    ctx.save()
    ctx.beginPath()
    ctx.moveTo(tipHistory[0].x * W, tipHistory[0].y * H)
    for (let i = 1; i < tipHistory.length; i++) {
      ctx.lineTo(tipHistory[i].x * W, tipHistory[i].y * H)
    }
    ctx.strokeStyle = '#00d4ff'; ctx.lineWidth = 2; ctx.globalAlpha = 0.5
    ctx.setLineDash([5, 5]); ctx.stroke(); ctx.setLineDash([])
    ctx.globalAlpha = 1
    ctx.restore()
  }

  // Banner
  const label = opportunity.available ? '💉 USI OPPORTUNITY — CHEST OPEN' : '⚠ USI — COUNTER RISK'
  ctx.save()
  ctx.font = 'bold 13px sans-serif'
  const tw = ctx.measureText(label).width
  ctx.fillStyle = opportunity.available ? '#00d4ff' : '#f97316'
  ctx.globalAlpha = 0.85
  ctx.fillRect(W / 2 - tw / 2 - 10, 12, tw + 20, 26)
  ctx.fillStyle = '#000'; ctx.globalAlpha = 1
  ctx.fillText(label, W / 2 - tw / 2, 30)
  ctx.restore()
}
