// Slide Detection — Trap + U movement + upper touch → slide to lower touch
// Slide = one continuous flowing combination: Trap deception + U path + upper body touch + immediate downward slide to lower body touch

export type SlidePhase = 'Trap Phase' | 'U Movement' | 'Upper Touch' | 'Slide Down' | 'Lower Touch' | 'None'
export type SlideTouchResult = 'Clean Touch' | 'Light Touch' | 'Missed Touch' | 'Not Attempted'
export type SlideResult = 'Successful Slide' | 'Partial Slide' | 'Failed Slide'

export type SlidePoint = { x: number; y: number; ts: number }

export type SlideOpportunity = {
  available: boolean
  upperTargetOpen: boolean
  lowerTargetOpen: boolean
  upperTarget: string
  lowerTarget: string
  suggestion: string
  counterRisk: 'LOW' | 'MEDIUM' | 'HIGH'
  overlayColor: string
}

export type SlideAttemptResult = {
  detected: boolean
  currentPhase: SlidePhase
  upperTouchResult: SlideTouchResult
  lowerTouchResult: SlideTouchResult
  uPathDetected: boolean
  slideSpeedRating: 'Too Slow' | 'Moderate' | 'Fast' | 'Fluid'
  continuousFlow: boolean
  finalResult: SlideResult
  coachingFeedback: string
}

// ─── U-path detector for Slide (reused logic from U Strike) ──────────────────

export function detectSlideUPath(tipHistory: SlidePoint[]): {
  hasUShape: boolean
  lowestPoint: SlidePoint | null
  directionChange: boolean
} {
  if (tipHistory.length < 8) return { hasUShape: false, lowestPoint: null, directionChange: false }

  const mid = Math.floor(tipHistory.length / 2)
  const firstHalf = tipHistory.slice(0, mid)
  const secondHalf = tipHistory.slice(mid)

  const firstDx = firstHalf[firstHalf.length - 1].x - firstHalf[0].x
  const secondDx = secondHalf[secondHalf.length - 1].x - secondHalf[0].x
  const directionChange = firstDx * secondDx < 0   // reversed horizontal

  // Lowest Y point (maximum on screen = bottom of U)
  const lowestPoint = tipHistory.reduce((lo, p) => p.y > lo.y ? p : lo, tipHistory[0])

  // U-shape: lowest point in middle third
  const midIdx = tipHistory.indexOf(lowestPoint)
  const inMiddle = midIdx > tipHistory.length * 0.25 && midIdx < tipHistory.length * 0.75

  return { hasUShape: directionChange && inMiddle, lowestPoint, directionChange }
}

// ─── Opportunity detector ─────────────────────────────────────────────────────

export function detectSlideOpportunity(
  attackerLm: any[],
  defenderLm: any[] | null,
): SlideOpportunity {
  const noSlide: SlideOpportunity = {
    available: false, upperTargetOpen: false, lowerTargetOpen: false,
    upperTarget: '', lowerTarget: '',
    suggestion: 'No Slide opportunity.',
    counterRisk: 'HIGH', overlayColor: '#64748b',
  }

  if (!defenderLm) return noSlide

  const atkNose = attackerLm[0]; const defNose = defenderLm[0]
  if (!atkNose || !defNose) return noSlide

  const dx = atkNose.x - defNose.x; const dy = atkNose.y - defNose.y
  const dist = Math.sqrt(dx * dx + dy * dy)
  if (dist > 0.60) return noSlide

  // Upper body open: check chest/shoulder guard
  const defRS = defenderLm[12]; const defLS = defenderLm[11]
  const defRW = defenderLm[16]; const defLW = defenderLm[15]
  const defRK = defenderLm[26]; const defLK = defenderLm[25]

  const shoulderY = defRS && defLS ? Math.min(defRS.y, defLS.y) : 0.4
  const wristY = defRW && defLW ? Math.min(defRW.y, defLW.y) : 0.5
  const upperTargetOpen = wristY > shoulderY + 0.06   // stick low = upper body exposed

  // Lower body open: knees/calves exposed (stick is raised or at upper level)
  const hipY = defenderLm[23] && defenderLm[24]
    ? (defenderLm[23].y + defenderLm[24].y) / 2 : 0.6
  const lowerTargetOpen = wristY < hipY - 0.05   // stick high = lower body exposed

  if (!upperTargetOpen && !lowerTargetOpen) return noSlide

  return {
    available: true,
    upperTargetOpen,
    lowerTargetOpen,
    upperTarget: 'Chest',
    lowerTarget: 'Outer Calf',
    suggestion: 'Slide opportunity: Trap → U path → touch Chest → slide to Outer Calf.',
    counterRisk: 'MEDIUM',
    overlayColor: '#00d4ff',
  }
}

// ─── Attempt analysis ─────────────────────────────────────────────────────────

export function analyzeSlideAttempt(
  attackerLm: any[],
  defenderLm: any[] | null,
  prevAttackerLm: any[] | null,
  tipHistory: SlidePoint[],
  opportunity: SlideOpportunity,
): SlideAttemptResult {
  const base: SlideAttemptResult = {
    detected: false, currentPhase: 'None',
    upperTouchResult: 'Not Attempted', lowerTouchResult: 'Not Attempted',
    uPathDetected: false, slideSpeedRating: 'Too Slow',
    continuousFlow: false,
    finalResult: 'Failed Slide', coachingFeedback: '',
  }

  if (!defenderLm || !prevAttackerLm || tipHistory.length < 10) {
    base.coachingFeedback = 'Not enough movement data for Slide analysis.'
    return base
  }

  const atkRW = attackerLm[16]; const atkLW = attackerLm[15]
  const prevRW = prevAttackerLm[16]; const prevLW = prevAttackerLm[15]
  if (!atkRW || !prevRW) { base.coachingFeedback = 'Wrist landmarks not visible.'; return base }

  const domRW = (atkRW.visibility || 0) > (atkLW?.visibility || 0) ? atkRW : atkLW
  const domPrevRW = (prevRW.visibility || 0) > (prevLW?.visibility || 0) ? prevRW : prevLW
  const wristSpeed = Math.sqrt(Math.pow(domRW.x - domPrevRW.x, 2) + Math.pow(domRW.y - domPrevRW.y, 2))

  // U-path detection
  const { hasUShape, lowestPoint } = detectSlideUPath(tipHistory)

  // Slide speed
  const slideSpeedRating: SlideAttemptResult['slideSpeedRating'] = wristSpeed > 0.065 ? 'Fluid'
    : wristSpeed > 0.04 ? 'Fast'
    : wristSpeed > 0.02 ? 'Moderate'
    : 'Too Slow'

  // Upper touch check: tip near defender chest
  const defRS = defenderLm[12]; const defLS = defenderLm[11]
  let upperTouchResult: SlideTouchResult = 'Not Attempted'
  if (defRS && defLS) {
    const chestX = (defRS.x + defLS.x) / 2
    const chestY = (defRS.y + defLS.y) / 2 + 0.05
    // Use midpoint of history for upper touch
    const midPt = tipHistory[Math.floor(tipHistory.length * 0.4)]
    if (midPt) {
      const uDist = Math.sqrt(Math.pow(midPt.x - chestX, 2) + Math.pow(midPt.y - chestY, 2))
      upperTouchResult = uDist < 0.09 ? 'Clean Touch' : uDist < 0.17 ? 'Light Touch' : 'Missed Touch'
    }
  }

  // Lower touch check: tip near defender calf at end of history
  const defRK = defenderLm[26]; const defLK = defenderLm[25]
  const defRA = defenderLm[28]; const defLA = defenderLm[27]
  let lowerTouchResult: SlideTouchResult = 'Not Attempted'
  if ((defRK || defLK) && tipHistory.length > 0) {
    const lastPt = tipHistory[tipHistory.length - 1]
    const calfX = defRK && defLK ? (defRK.x + defLK.x) / 2 : (defRK?.x || defLK?.x || 0.5)
    const calfY = defRK && defLK ? (defRK.y + defLK.y) / 2 + 0.07 : 0.75
    const lDist = Math.sqrt(Math.pow(lastPt.x - calfX, 2) + Math.pow(lastPt.y - calfY, 2))
    lowerTouchResult = lDist < 0.10 ? 'Clean Touch' : lDist < 0.18 ? 'Light Touch' : 'Missed Touch'
  }

  // Continuous flow: check if direction changed (downward movement in second half)
  const halfIdx = Math.floor(tipHistory.length / 2)
  const secondHalf = tipHistory.slice(halfIdx)
  const continuousFlow = secondHalf.length > 2
    ? secondHalf[secondHalf.length - 1].y > secondHalf[0].y + 0.03   // net downward movement
    : false

  // Phase
  const currentPhase: SlidePhase = lowerTouchResult !== 'Not Attempted' ? 'Lower Touch'
    : continuousFlow ? 'Slide Down'
    : upperTouchResult !== 'Not Attempted' ? 'Upper Touch'
    : hasUShape ? 'U Movement'
    : 'Trap Phase'

  // Final result
  let finalResult: SlideResult
  if (upperTouchResult === 'Clean Touch' && lowerTouchResult === 'Clean Touch' && continuousFlow) finalResult = 'Successful Slide'
  else if (upperTouchResult !== 'Not Attempted' && continuousFlow) finalResult = 'Partial Slide'
  else finalResult = 'Failed Slide'

  // Coaching
  let coachingFeedback = ''
  if (finalResult === 'Successful Slide') coachingFeedback = 'Excellent Slide. Trap, U path, upper touch and lower touch all connected in one fluid motion.'
  else if (!hasUShape) coachingFeedback = 'Slide requires a clear U path. Swing down under the guard then come up and slide down to the low target.'
  else if (!continuousFlow) coachingFeedback = 'Upper touch detected but did not slide down. After touching the upper target, immediately follow through to the lower target without stopping.'
  else if (lowerTouchResult === 'Missed Touch') coachingFeedback = 'Slide started but missed lower target. Aim for the outer calf after the upper touch.'
  else coachingFeedback = 'Good Slide attempt. Work on keeping the full combination connected — trap, U, upper, slide, lower — as one motion.'

  return {
    detected: true, currentPhase,
    upperTouchResult, lowerTouchResult,
    uPathDetected: hasUShape,
    slideSpeedRating, continuousFlow,
    finalResult, coachingFeedback,
  }
}

// ─── Canvas overlay ───────────────────────────────────────────────────────────

export function drawSlideOverlay(
  ctx: CanvasRenderingContext2D,
  W: number, H: number,
  attackerLm: any[],
  defenderLm: any[] | null,
  tipHistory: SlidePoint[],
  opportunity: SlideOpportunity,
): void {
  if (!opportunity.available || !defenderLm) return

  // Draw tip path in cyan
  if (tipHistory.length >= 4) {
    ctx.save()
    ctx.beginPath()
    ctx.moveTo(tipHistory[0].x * W, tipHistory[0].y * H)
    for (let i = 1; i < tipHistory.length; i++) {
      ctx.lineTo(tipHistory[i].x * W, tipHistory[i].y * H)
    }
    ctx.strokeStyle = '#00d4ff'; ctx.lineWidth = 2; ctx.globalAlpha = 0.55
    ctx.setLineDash([5, 4]); ctx.stroke(); ctx.setLineDash([])
    ctx.globalAlpha = 1; ctx.restore()
  }

  // Upper target (chest) — cyan ring
  const defRS = defenderLm[12]; const defLS = defenderLm[11]
  if (defRS && defLS) {
    const uX = ((defRS.x + defLS.x) / 2) * W; const uY = ((defRS.y + defLS.y) / 2 + 0.05) * H
    ctx.save()
    ctx.beginPath(); ctx.arc(uX, uY, 16, 0, Math.PI * 2)
    ctx.strokeStyle = '#00d4ff'; ctx.lineWidth = 2; ctx.globalAlpha = 0.75; ctx.stroke()
    ctx.globalAlpha = 1; ctx.restore()
    ctx.save(); ctx.font = 'bold 9px sans-serif'; ctx.fillStyle = '#00d4ff'; ctx.globalAlpha = 0.9
    ctx.fillText('UPPER', uX - 14, uY - 20); ctx.globalAlpha = 1; ctx.restore()
  }

  // Lower target (calf) — green ring
  const defRK = defenderLm[26]; const defLK = defenderLm[25]
  if (defRK && defLK) {
    const lX = ((defRK.x + defLK.x) / 2) * W; const lY = ((defRK.y + defLK.y) / 2 + 0.07) * H
    ctx.save()
    ctx.beginPath(); ctx.arc(lX, lY, 14, 0, Math.PI * 2)
    ctx.strokeStyle = '#00ff88'; ctx.lineWidth = 2; ctx.globalAlpha = 0.75; ctx.stroke()
    ctx.fillStyle = '#00ff88'; ctx.globalAlpha = 0.12; ctx.fill()
    ctx.globalAlpha = 1; ctx.restore()
    ctx.save(); ctx.font = 'bold 9px sans-serif'; ctx.fillStyle = '#00ff88'; ctx.globalAlpha = 0.9
    ctx.fillText('LOWER', lX - 14, lY + 26); ctx.globalAlpha = 1; ctx.restore()
  }

  // Banner
  const label = '〜 SLIDE — TRAP → U → UPPER → LOWER'
  ctx.save()
  ctx.font = 'bold 11px sans-serif'
  const tw = ctx.measureText(label).width
  ctx.fillStyle = '#00d4ff'; ctx.globalAlpha = 0.88
  ctx.fillRect(W / 2 - tw / 2 - 10, 62, tw + 20, 22)
  ctx.fillStyle = '#000'; ctx.globalAlpha = 1
  ctx.fillText(label, W / 2 - tw / 2, 77)
  ctx.restore()
}
