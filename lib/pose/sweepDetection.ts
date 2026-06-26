// Sweep detection engine for ORION Silambam AI
// Low-line attack targeting outer calf/outer thigh from Bavalai flow

export type SweepTouchResult = 'Clean Touch' | 'Light Touch' | 'Unclear Touch' | 'Missed Touch' | 'Blocked Touch' | 'Invalid Foot Contact'
export type SweepSpeedRating = 'Too Slow' | 'Moderate' | 'Good Combat Speed' | 'Excellent Combat Speed'
export type SweepFinalResult = 'Successful Sweep' | 'Partial Sweep' | 'Failed Sweep' | 'Invalid Sweep'
export type SweepTarget = 'Outer Calf' | 'Outer Thigh' | 'Calf Area' | 'Thigh Area' | 'Foot (Invalid)' | 'None'

export type SweepPoint = { x: number; y: number; ts: number }

export type SweepOpportunity = {
  available: boolean
  reason: string
  openTarget: SweepTarget
  lowLineOpen: boolean
  guardHigh: boolean
  fromBavalai: boolean
  handsTogetherWarning: boolean
  counterRisk: 'LOW' | 'MEDIUM' | 'HIGH'
  warning: string | null
  suggestion: string
  overlayColor: string
}

export type SweepAttemptResult = {
  detected: boolean
  target: SweepTarget
  touchResult: SweepTouchResult
  handsTogether: boolean
  bavalaFlowDetected: boolean
  stickPath: 'Straight low-line strike' | 'Controlled arc' | 'Uncontrolled swing'
  speedRating: SweepSpeedRating
  speedNote: string
  recovery: 'Good' | 'Slow' | 'Not detected'
  finalResult: SweepFinalResult
  coachingFeedback: string
}

export type SweepTimestamp = {
  videoTimeSec: number
  videoTimeStr: string
  fighter: string
  opportunity: SweepOpportunity
  attempt: SweepAttemptResult | null
}

// ─── Stick tip estimation (low-line variant) ──────────────────────────────────

export function estimateSweepStickTip(lm: any[]): { x: number; y: number } | null {
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

export function detectSweepOpportunity(
  attackerLm: any[],
  defenderLm: any[] | null,
  fromBavalai = false,
): SweepOpportunity {
  if (!defenderLm || defenderLm.length < 29) {
    return {
      available: false,
      reason: 'Single player or insufficient landmarks',
      openTarget: 'None', lowLineOpen: false, guardHigh: false,
      fromBavalai, handsTogetherWarning: false,
      counterRisk: 'MEDIUM', warning: null,
      suggestion: 'Two players needed for Sweep detection.',
      overlayColor: '#64748b',
    }
  }

  const defRS = defenderLm[12]; const defLS = defenderLm[11]   // shoulders
  const defRK = defenderLm[26]; const defLK = defenderLm[25]   // knees
  const defRA = defenderLm[28]; const defLA = defenderLm[27]   // ankles
  const defRW = defenderLm[16]; const defLW = defenderLm[15]   // wrists
  const defNose = defenderLm[0]
  const atkNose = attackerLm[0]
  const atkRW   = attackerLm[16]; const atkLW = attackerLm[15]

  if (!defRS || !defLS) {
    return {
      available: false, reason: 'Defender landmarks unclear',
      openTarget: 'None', lowLineOpen: false, guardHigh: false,
      fromBavalai, handsTogetherWarning: false,
      counterRisk: 'MEDIUM', warning: null,
      suggestion: 'Ensure full body is visible.',
      overlayColor: '#64748b',
    }
  }

  // Distance check
  const dx = (atkNose?.x || 0.5) - (defNose?.x || 0.5)
  const dy = (atkNose?.y || 0.5) - (defNose?.y || 0.5)
  const dist = Math.sqrt(dx * dx + dy * dy)
  const inRange = dist < 0.65

  if (!inRange) {
    return {
      available: false, reason: 'Distance too far for Sweep',
      openTarget: 'None', lowLineOpen: false, guardHigh: false,
      fromBavalai, handsTogetherWarning: false,
      counterRisk: 'LOW', warning: null,
      suggestion: 'Close the distance before attempting Sweep.',
      overlayColor: '#64748b',
    }
  }

  // Defender guard height — is it high? (hands near shoulders or above)
  const defWristY = Math.min(defRW?.y || 1, defLW?.y || 1)
  const defShoulderY = Math.min(defRS.y, defLS.y)
  const guardHigh = defWristY < defShoulderY + 0.05

  // Check lower body exposure
  const defRKneeY = defRK?.y || 0; const defLKneeY = defLK?.y || 0
  const defRAnkleY = defRA?.y || 0; const defLAnkleY = defLA?.y || 0

  // Determine which side is more exposed (closer to attacker horizontally)
  const atkCenterX = atkNose?.x || 0.5
  const defCenterX = defNose?.x || 0.5
  const attackFromLeft = atkCenterX < defCenterX

  let openTarget: SweepTarget = 'None'
  let lowLineOpen = false

  if (defRK && defLK) {
    // Check calf zone visibility (knees and ankles visible = lower body exposed)
    const kneeVis = Math.max(defRK.visibility || 0, defLK.visibility || 0)
    const ankleVis = Math.max(defRA?.visibility || 0, defLA?.visibility || 0)

    if (kneeVis > 0.5) {
      lowLineOpen = true
      // Determine which outer calf/thigh is accessible based on attack angle
      const outerKnee = attackFromLeft ? defLK : defRK
      const outerAnkle = attackFromLeft ? defLA : defRA

      if (outerAnkle && (outerAnkle.visibility || 0) > 0.4) {
        // Ankle visible — sweep should target calf area (not foot)
        openTarget = 'Outer Calf'
      } else if (outerKnee) {
        openTarget = 'Outer Thigh'
      }
    }
  }

  // Attacker hands together check
  const handsTogetherWarning = atkRW && atkLW
    ? Math.abs(atkRW.x - atkLW.x) > 0.20 || Math.abs(atkRW.y - atkLW.y) > 0.15
    : false

  const defStickThreat = defRW && defLW
    ? Math.min(defRW.y, defLW.y) < defShoulderY + 0.08
    : false

  const counterRisk: 'LOW' | 'MEDIUM' | 'HIGH' = !guardHigh && defStickThreat
    ? 'HIGH' : lowLineOpen && guardHigh ? 'LOW' : 'MEDIUM'

  if (!lowLineOpen || openTarget === 'None') {
    return {
      available: false,
      reason: 'Lower body target not clearly exposed',
      openTarget, lowLineOpen: false, guardHigh,
      fromBavalai, handsTogetherWarning,
      counterRisk,
      warning: defStickThreat ? 'Opponent ready to counter low attacks.' : null,
      suggestion: guardHigh
        ? 'Sweep not recommended yet. Wait for guard to shift.'
        : 'Do not try Sweep. Opponent is ready to counter.',
      overlayColor: '#f97316',
    }
  }

  return {
    available: true,
    reason: `${openTarget} exposed${guardHigh ? ' — guard is high' : ''}`,
    openTarget, lowLineOpen: true, guardHigh,
    fromBavalai, handsTogetherWarning,
    counterRisk,
    warning: handsTogetherWarning
      ? 'Bring both hands together before striking.'
      : counterRisk === 'HIGH' ? 'Recover guard immediately after Sweep.' : null,
    suggestion: `${openTarget} open. Sweep recommended. ${fromBavalai ? 'Transition from Bavalai into straight low strike.' : 'Strike straight to lower leg.'}`,
    overlayColor: '#00ff88',
  }
}

// ─── Path analysis for low-line strike ────────────────────────────────────────

export function analyzeSweepPath(tips: SweepPoint[]): {
  isDownward: boolean
  pathType: 'Straight low-line strike' | 'Controlled arc' | 'Uncontrolled swing'
  durationMs: number
} {
  if (tips.length < 4) return { isDownward: false, pathType: 'Uncontrolled swing', durationMs: 0 }
  const durationMs = tips[tips.length - 1].ts - tips[0].ts

  const first = tips[0]; const last = tips[tips.length - 1]
  // Sweep tip should move downward (increasing Y) toward lower body
  const isDownward = last.y > first.y + 0.05

  // Measure path deviation from straight line
  const lineDx = last.x - first.x; const lineDy = last.y - first.y
  const lineLen = Math.sqrt(lineDx * lineDx + lineDy * lineDy) || 0.001
  const maxDev = tips.reduce((max, p) => {
    const cross = Math.abs((last.y - first.y) * p.x - (last.x - first.x) * p.y + last.x * first.y - last.y * first.x)
    return Math.max(max, cross / lineLen)
  }, 0)

  const pathType: 'Straight low-line strike' | 'Controlled arc' | 'Uncontrolled swing' =
    maxDev < 0.05 ? 'Straight low-line strike'
    : maxDev < 0.12 ? 'Controlled arc'
    : 'Uncontrolled swing'

  return { isDownward, pathType, durationMs }
}

// ─── Speed rating ─────────────────────────────────────────────────────────────

export function rateSweepSpeed(durationMs: number): { rating: SweepSpeedRating; note: string } {
  if (durationMs > 850) return { rating: 'Too Slow',             note: 'Sweep was too slow. Opponent had time to react.' }
  if (durationMs > 600) return { rating: 'Moderate',             note: 'Moderate Sweep speed. Push for faster low-line entry.' }
  if (durationMs > 380) return { rating: 'Good Combat Speed',    note: 'Good Sweep speed. Low-line attack was fast and direct.' }
  return                       { rating: 'Excellent Combat Speed', note: 'Excellent Sweep. Fast transition from Bavalai flow into leg touch.' }
}

// ─── Touch detection ──────────────────────────────────────────────────────────

export function detectSweepTouchTarget(tip: SweepPoint, defenderLm: any[]): {
  target: SweepTarget
  touchResult: SweepTouchResult
} {
  const defRK = defenderLm[26]; const defLK = defenderLm[25]
  const defRA = defenderLm[28]; const defLA = defenderLm[27]

  // Ankle zone — invalid (foot)
  if (defRA && (defRA.visibility || 0) > 0.4) {
    const ankleDist = Math.sqrt(Math.pow(tip.x - defRA.x, 2) + Math.pow(tip.y - defRA.y, 2))
    if (ankleDist < 0.08) return { target: 'Foot (Invalid)', touchResult: 'Invalid Foot Contact' }
  }
  if (defLA && (defLA.visibility || 0) > 0.4) {
    const ankleDist = Math.sqrt(Math.pow(tip.x - defLA.x, 2) + Math.pow(tip.y - defLA.y, 2))
    if (ankleDist < 0.08) return { target: 'Foot (Invalid)', touchResult: 'Invalid Foot Contact' }
  }

  // Calf zone (between knee and ankle)
  const calfTargets = [defRK, defLK].filter(Boolean)
  for (const knee of calfTargets) {
    const dist = Math.sqrt(Math.pow(tip.x - knee.x, 2) + Math.pow(tip.y - (knee.y + 0.08), 2))
    if (dist < 0.10) return { target: 'Outer Calf', touchResult: 'Clean Touch' }
    if (dist < 0.18) return { target: 'Outer Calf', touchResult: 'Light Touch' }
  }

  // Thigh zone (above knee)
  for (const knee of calfTargets) {
    const dist = Math.sqrt(Math.pow(tip.x - knee.x, 2) + Math.pow(tip.y - (knee.y - 0.08), 2))
    if (dist < 0.10) return { target: 'Outer Thigh', touchResult: 'Clean Touch' }
    if (dist < 0.18) return { target: 'Outer Thigh', touchResult: 'Light Touch' }
  }

  return { target: 'None', touchResult: 'Missed Touch' }
}

// ─── Coaching feedback ────────────────────────────────────────────────────────

export function generateSweepFeedback(r: SweepAttemptResult): string {
  if (r.touchResult === 'Invalid Foot Contact') return 'Invalid target. Foot is not a point. Target outer calf or outer thigh.'
  if (r.finalResult === 'Successful Sweep') {
    const hand = r.handsTogether ? '' : ' Bring both hands together during the strike next time.'
    return `Excellent Sweep. Clean touch on ${r.target}.${hand}`
  }
  if (!r.handsTogether) return 'Bring both hands together before the strike. Both hands must be on the stick at impact.'
  if (r.speedRating === 'Too Slow') return 'Sweep was too slow. Opponent had time to react. Faster Bavalai transition needed.'
  if (r.stickPath === 'Uncontrolled swing') return 'Do not overreach during Sweep. Keep the strike straight and controlled.'
  if (r.touchResult === 'Missed Touch') return 'Sweep missed. Check target alignment. Strike to outer calf or outer thigh.'
  if (r.recovery === 'Slow') return 'Recover immediately after Sweep. Opponent had counter opportunity because recovery was slow.'
  return 'Your Bavalai flow was good, but the low strike needs more precision.'
}

// ─── Attempt analysis ─────────────────────────────────────────────────────────

export function analyzeSweepAttempt(
  attackerLm: any[],
  defenderLm: any[] | null,
  tipHistory: SweepPoint[],
  opportunity: SweepOpportunity,
): SweepAttemptResult {
  const base: SweepAttemptResult = {
    detected: false, target: 'None', touchResult: 'Missed Touch',
    handsTogether: false, bavalaFlowDetected: opportunity.fromBavalai,
    stickPath: 'Uncontrolled swing', speedRating: 'Too Slow', speedNote: '',
    recovery: 'Not detected', finalResult: 'Failed Sweep', coachingFeedback: '',
  }

  if (tipHistory.length < 4) { base.coachingFeedback = 'No Sweep movement detected.'; return base }

  const path = analyzeSweepPath(tipHistory)
  if (!path.isDownward) { base.coachingFeedback = 'Stick path did not move toward lower body.'; return base }

  const { rating, note } = rateSweepSpeed(path.durationMs)

  // Hands together check
  const atkRW = attackerLm[16]; const atkLW = attackerLm[15]
  const handsTogether = atkRW && atkLW
    ? Math.abs(atkRW.x - atkLW.x) < 0.15 && Math.abs(atkRW.y - atkLW.y) < 0.12
    : false

  // Touch detection
  let target: SweepTarget = 'None'
  let touchResult: SweepTouchResult = 'Missed Touch'
  if (defenderLm) {
    const tip = tipHistory[tipHistory.length - 1]
    const result = detectSweepTouchTarget(tip, defenderLm)
    target = result.target; touchResult = result.touchResult
  }

  // Recovery
  let recovery: 'Good' | 'Slow' | 'Not detected' = 'Not detected'
  if (tipHistory.length > 8) {
    const peak = tipHistory[Math.floor(tipHistory.length * 0.65)]
    const last = tipHistory[tipHistory.length - 1]
    const withdrawal = Math.sqrt(Math.pow(last.x - peak.x, 2) + Math.pow(last.y - peak.y, 2))
    recovery = withdrawal > 0.06 ? 'Good' : 'Slow'
  }

  let finalResult: SweepFinalResult
  if (touchResult === 'Invalid Foot Contact') finalResult = 'Invalid Sweep'
  else if (touchResult === 'Clean Touch' && handsTogether) finalResult = 'Successful Sweep'
  else if (touchResult !== 'Missed Touch') finalResult = 'Partial Sweep'
  else finalResult = 'Failed Sweep'

  const result: SweepAttemptResult = {
    detected: true, target, touchResult, handsTogether,
    bavalaFlowDetected: opportunity.fromBavalai,
    stickPath: path.pathType, speedRating: rating, speedNote: note,
    recovery, finalResult, coachingFeedback: '',
  }
  result.coachingFeedback = generateSweepFeedback(result)
  return result
}

// ─── Canvas overlay ───────────────────────────────────────────────────────────

export function drawSweepOverlay(
  ctx: CanvasRenderingContext2D,
  W: number, H: number,
  attackerLm: any[],
  defenderLm: any[] | null,
  opportunity: SweepOpportunity,
  tipHistory: SweepPoint[],
): void {
  if (!opportunity.available && opportunity.openTarget === 'None') return

  const color = opportunity.available ? '#00ff88' : '#f97316'

  // Draw low-line attack path from attacker wrist downward
  if (defenderLm && attackerLm) {
    const atkRW = attackerLm[16]; const atkLW = attackerLm[15]
    const domW = (atkRW?.visibility || 0) > (atkLW?.visibility || 0) ? atkRW : atkLW
    const defRK = defenderLm[26]; const defLK = defenderLm[25]
    const targetKnee = defRK && defLK
      ? (Math.abs((domW?.x || 0.5) - defRK.x) < Math.abs((domW?.x || 0.5) - defLK.x) ? defRK : defLK)
      : (defRK || defLK)

    if (domW && targetKnee) {
      const calfX = targetKnee.x * W
      const calfY = (targetKnee.y + 0.08) * H  // calf = slightly below knee

      ctx.save()
      ctx.beginPath()
      ctx.moveTo(domW.x * W, domW.y * H)
      ctx.lineTo(calfX, calfY)
      ctx.strokeStyle = '#00d4ff'; ctx.lineWidth = 3; ctx.globalAlpha = 0.65
      ctx.setLineDash([10, 5]); ctx.stroke(); ctx.setLineDash([])
      ctx.globalAlpha = 1

      // Arrowhead at calf target
      const angle = Math.atan2(calfY - domW.y * H, calfX - domW.x * W)
      ctx.fillStyle = '#00d4ff'; ctx.globalAlpha = 0.9
      ctx.save()
      ctx.translate(calfX, calfY); ctx.rotate(angle)
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-14, -6); ctx.lineTo(-14, 6); ctx.closePath(); ctx.fill()
      ctx.restore()
      ctx.globalAlpha = 1
      ctx.restore()

      // Calf target circle (green = valid)
      ctx.save()
      ctx.beginPath(); ctx.arc(calfX, calfY, 20, 0, Math.PI * 2)
      ctx.strokeStyle = color; ctx.lineWidth = 2.5; ctx.globalAlpha = 0.8; ctx.stroke()
      ctx.beginPath(); ctx.arc(calfX, calfY, 7, 0, Math.PI * 2)
      ctx.fillStyle = color; ctx.globalAlpha = 0.4; ctx.fill()
      ctx.globalAlpha = 1; ctx.restore()

      // Label: "Outer Calf" or "Outer Thigh"
      ctx.save()
      ctx.font = 'bold 10px sans-serif'; ctx.fillStyle = color; ctx.globalAlpha = 0.9
      ctx.fillText(opportunity.openTarget, calfX - 30, calfY + 32)
      ctx.globalAlpha = 1; ctx.restore()

      // Mark ankle as invalid (red X)
      const defRA = defenderLm[28]; const defLA = defenderLm[27]
      const anklePoints = [defRA, defLA].filter(p => p && (p.visibility || 0) > 0.4)
      for (const ankle of anklePoints) {
        ctx.save()
        ctx.font = 'bold 13px sans-serif'; ctx.fillStyle = '#f97316'; ctx.globalAlpha = 0.85
        ctx.fillText('✕', ankle.x * W - 6, ankle.y * H + 5)
        ctx.globalAlpha = 1; ctx.restore()
      }
    }
  }

  // Tip trail
  if (tipHistory.length >= 3) {
    ctx.save()
    ctx.beginPath()
    ctx.moveTo(tipHistory[0].x * W, tipHistory[0].y * H)
    for (let i = 1; i < tipHistory.length; i++) ctx.lineTo(tipHistory[i].x * W, tipHistory[i].y * H)
    ctx.strokeStyle = '#00ff88'; ctx.lineWidth = 2; ctx.globalAlpha = 0.45
    ctx.setLineDash([4, 6]); ctx.stroke(); ctx.setLineDash([])
    ctx.globalAlpha = 1; ctx.restore()
  }

  // Hands together warning
  if (opportunity.handsTogetherWarning) {
    ctx.save()
    ctx.font = 'bold 11px sans-serif'
    const warn = '✋ BRING HANDS TOGETHER'
    const tw = ctx.measureText(warn).width
    ctx.fillStyle = '#f59e0b'; ctx.globalAlpha = 0.85
    ctx.fillRect(W / 2 - tw / 2 - 8, H - 72, tw + 16, 22)
    ctx.fillStyle = '#000'; ctx.globalAlpha = 1
    ctx.fillText(warn, W / 2 - tw / 2, H - 56)
    ctx.restore()
  }

  // Banner
  const label = opportunity.available ? '🟢 SWEEP OPPORTUNITY' : '⚠ SWEEP — LOW GUARD'
  ctx.save()
  ctx.font = 'bold 13px sans-serif'
  const tw = ctx.measureText(label).width
  ctx.fillStyle = opportunity.available ? '#00ff88' : '#f97316'; ctx.globalAlpha = 0.85
  ctx.fillRect(W / 2 - tw / 2 - 10, H - 44, tw + 20, 26)
  ctx.fillStyle = '#000'; ctx.globalAlpha = 1
  ctx.fillText(label, W / 2 - tw / 2, H - 26)
  ctx.restore()
}
