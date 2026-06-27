// Zip Detection — straight double-touch combination for ORION Silambam AI
// Zip = any legal target → any other legal target, straight path, both touches in sequence
// Normal Zip (forward first) + Reverse Zip (backward first)

export type ZipType = 'NORMAL_ZIP' | 'REVERSE_ZIP' | 'NONE'
export type ZipTouchResult = 'Clean Touch' | 'Light Touch' | 'Missed Touch' | 'Not Attempted'
export type ZipSpeedRating = 'Too Slow' | 'Moderate' | 'Fast' | 'Zip Speed'
export type ZipResult = 'Successful Zip' | 'Partial Zip' | 'Failed Zip'

export type ZipPoint = { x: number; y: number; ts: number }

export type ZipOpportunity = {
  available: boolean
  zipType: ZipType
  firstTarget: string
  secondTarget: string
  suggestion: string
  counterRisk: 'LOW' | 'MEDIUM' | 'HIGH'
  overlayColor: string
}

export type ZipAttemptResult = {
  detected: boolean
  zipType: ZipType
  firstTouchResult: ZipTouchResult
  secondTouchResult: ZipTouchResult
  handsTogethery: boolean
  pathStraightness: 'Straight' | 'Slight Curve' | 'Too Curved'
  speedRating: ZipSpeedRating
  timeBetweenTouches: number   // ms
  finalResult: ZipResult
  coachingFeedback: string
}

// ─── Path straightness checker ────────────────────────────────────────────────

export function assessZipPathStraightness(tipHistory: ZipPoint[]): {
  straightness: 'Straight' | 'Slight Curve' | 'Too Curved'
  maxDeviation: number
} {
  if (tipHistory.length < 4) return { straightness: 'Straight', maxDeviation: 0 }

  const p0 = tipHistory[0]; const pN = tipHistory[tipHistory.length - 1]
  const lineLen = Math.sqrt(Math.pow(pN.x - p0.x, 2) + Math.pow(pN.y - p0.y, 2))
  if (lineLen < 0.01) return { straightness: 'Straight', maxDeviation: 0 }

  // Max perpendicular distance from the p0→pN line
  const A = pN.y - p0.y; const B = p0.x - pN.x; const C = pN.x * p0.y - p0.x * pN.y
  let maxDev = 0
  for (const p of tipHistory) {
    const dev = Math.abs(A * p.x + B * p.y + C) / lineLen
    if (dev > maxDev) maxDev = dev
  }

  const straightness: 'Straight' | 'Slight Curve' | 'Too Curved' =
    maxDev < 0.04 ? 'Straight'
    : maxDev < 0.09 ? 'Slight Curve'
    : 'Too Curved'

  return { straightness, maxDeviation: maxDev }
}

// ─── Opportunity detector ─────────────────────────────────────────────────────

export function detectZipOpportunity(
  attackerLm: any[],
  defenderLm: any[] | null,
): ZipOpportunity {
  const noZip: ZipOpportunity = {
    available: false, zipType: 'NONE',
    firstTarget: '', secondTarget: '',
    suggestion: 'No Zip opportunity.',
    counterRisk: 'HIGH', overlayColor: '#64748b',
  }

  if (!defenderLm) return noZip

  const atkNose = attackerLm[0]; const defNose = defenderLm[0]
  if (!atkNose || !defNose) return noZip

  const dx = atkNose.x - defNose.x; const dy = atkNose.y - defNose.y
  const dist = Math.sqrt(dx * dx + dy * dy)
  if (dist > 0.55) return noZip

  // Any combination is valid; suggest based on guard openings
  const defRW = defenderLm[16]; const defLW = defenderLm[15]
  const defRS = defenderLm[12]; const defLS = defenderLm[11]
  const wristY = defRW && defLW ? Math.min(defRW.y, defLW.y) : 0.5
  const shoulderY = defRS && defLS ? Math.min(defRS.y, defLS.y) : 0.4

  // Normal Zip: near target first then far; Reverse Zip: far first then near
  const zipType: ZipType = dist < 0.35 ? 'NORMAL_ZIP' : 'REVERSE_ZIP'

  // Suggest target pair based on guard
  const upperOpen = wristY > shoulderY + 0.06
  const firstTarget = upperOpen ? 'Chest' : 'Right Shoulder'
  const secondTarget = upperOpen ? 'Left Shoulder' : 'Chest'

  return {
    available: true, zipType,
    firstTarget, secondTarget,
    suggestion: `${zipType === 'NORMAL_ZIP' ? 'Normal' : 'Reverse'} Zip: strike ${firstTarget} → immediately ${secondTarget}. Both hands together, straight path.`,
    counterRisk: 'LOW',
    overlayColor: '#00d4ff',
  }
}

// ─── Attempt analysis ─────────────────────────────────────────────────────────

export function analyzeZipAttempt(
  attackerLm: any[],
  defenderLm: any[] | null,
  prevAttackerLm: any[] | null,
  tipHistory: ZipPoint[],
  opportunity: ZipOpportunity,
): ZipAttemptResult {
  const base: ZipAttemptResult = {
    detected: false, zipType: opportunity.zipType,
    firstTouchResult: 'Not Attempted', secondTouchResult: 'Not Attempted',
    handsTogethery: false, pathStraightness: 'Too Curved',
    speedRating: 'Too Slow', timeBetweenTouches: 0,
    finalResult: 'Failed Zip', coachingFeedback: '',
  }

  if (!defenderLm || !prevAttackerLm || tipHistory.length < 8) {
    base.coachingFeedback = 'Not enough movement data for Zip analysis.'
    return base
  }

  const atkRW = attackerLm[16]; const atkLW = attackerLm[15]
  const prevRW = prevAttackerLm[16]; const prevLW = prevAttackerLm[15]
  if (!atkRW || !prevRW) { base.coachingFeedback = 'Wrist landmarks not visible.'; return base }

  // Hands together
  const handSpread = Math.sqrt(Math.pow(atkRW.x - atkLW.x, 2) + Math.pow(atkRW.y - atkLW.y, 2))
  const handsTogethery = handSpread < 0.14

  // Path straightness
  const { straightness } = assessZipPathStraightness(tipHistory)

  // Speed
  const domRW = (atkRW.visibility || 0) > (atkLW?.visibility || 0) ? atkRW : atkLW
  const domPrevRW = (prevRW.visibility || 0) > (prevLW?.visibility || 0) ? prevRW : prevLW
  const wristSpeed = Math.sqrt(Math.pow(domRW.x - domPrevRW.x, 2) + Math.pow(domRW.y - domPrevRW.y, 2))
  const totalDuration = tipHistory.length > 1
    ? tipHistory[tipHistory.length - 1].ts - tipHistory[0].ts : 999

  const speedRating: ZipSpeedRating = totalDuration < 200 ? 'Zip Speed'
    : wristSpeed > 0.055 ? 'Fast'
    : wristSpeed > 0.03 ? 'Moderate'
    : 'Too Slow'

  // Touch detection: first and second targets
  const defRS = defenderLm[12]; const defLS = defenderLm[11]
  let firstTouchResult: ZipTouchResult = 'Not Attempted'
  let secondTouchResult: ZipTouchResult = 'Not Attempted'
  let timeBetweenTouches = 0

  if (defRS && defLS && tipHistory.length >= 4) {
    const firstTargetIsRight = opportunity.firstTarget.includes('Right') || opportunity.firstTarget === 'Chest'
    const firstX = opportunity.firstTarget === 'Chest' ? (defRS.x + defLS.x) / 2 : firstTargetIsRight ? defRS.x : defLS.x
    const firstY = opportunity.firstTarget === 'Chest' ? (defRS.y + defLS.y) / 2 + 0.05 : (defRS.y + defLS.y) / 2

    const midIdx = Math.floor(tipHistory.length * 0.45)
    const midPt = tipHistory[midIdx]
    const fDist = Math.sqrt(Math.pow(midPt.x - firstX, 2) + Math.pow(midPt.y - firstY, 2))
    firstTouchResult = fDist < 0.09 ? 'Clean Touch' : fDist < 0.16 ? 'Light Touch' : 'Missed Touch'

    const secondX = opportunity.secondTarget.includes('Right') ? defRS.x : defLS.x
    const secondY = (defRS.y + defLS.y) / 2
    const lastPt = tipHistory[tipHistory.length - 1]
    const sDist = Math.sqrt(Math.pow(lastPt.x - secondX, 2) + Math.pow(lastPt.y - secondY, 2))
    secondTouchResult = sDist < 0.09 ? 'Clean Touch' : sDist < 0.16 ? 'Light Touch' : 'Missed Touch'

    timeBetweenTouches = tipHistory.length > 2
      ? tipHistory[tipHistory.length - 1].ts - tipHistory[midIdx].ts : 0
  }

  // Final result
  let finalResult: ZipResult
  if (firstTouchResult === 'Clean Touch' && secondTouchResult === 'Clean Touch' && straightness !== 'Too Curved') finalResult = 'Successful Zip'
  else if (firstTouchResult !== 'Not Attempted' && secondTouchResult !== 'Not Attempted') finalResult = 'Partial Zip'
  else finalResult = 'Failed Zip'

  // Coaching
  let coachingFeedback = ''
  if (finalResult === 'Successful Zip') coachingFeedback = `Excellent ${opportunity.zipType === 'NORMAL_ZIP' ? 'Normal' : 'Reverse'} Zip. Both targets hit cleanly in a straight double-touch.`
  else if (!handsTogethery) coachingFeedback = 'Zip requires both hands together throughout. Grip the stick firmly with both hands.'
  else if (straightness === 'Too Curved') coachingFeedback = 'Zip path too curved. Zip is a straight double-touch — keep the stick in a direct line between both targets.'
  else if (firstTouchResult === 'Missed Touch') coachingFeedback = 'Missed the first target. In a Zip, the first touch sets up the second — accuracy on both is essential.'
  else if (secondTouchResult === 'Missed Touch') coachingFeedback = 'First touch made but second missed. After the first strike, immediately redirect to the second target without pausing.'
  else if (speedRating === 'Too Slow') coachingFeedback = 'Zip speed too slow. Both touches must come so fast they feel like one strike — practise the "snapping" wrist action.'
  else coachingFeedback = 'Good Zip attempt. Aim for Zip Speed — under 200ms from first to second touch.'

  return {
    detected: true, zipType: opportunity.zipType,
    firstTouchResult, secondTouchResult,
    handsTogethery, pathStraightness: straightness,
    speedRating, timeBetweenTouches,
    finalResult, coachingFeedback,
  }
}

// ─── Canvas overlay ───────────────────────────────────────────────────────────

export function drawZipOverlay(
  ctx: CanvasRenderingContext2D,
  W: number, H: number,
  attackerLm: any[],
  defenderLm: any[] | null,
  tipHistory: ZipPoint[],
  opportunity: ZipOpportunity,
): void {
  if (!opportunity.available || !defenderLm) return

  // Draw straight zip line in cyan
  if (tipHistory.length >= 4) {
    ctx.save()
    ctx.beginPath()
    ctx.moveTo(tipHistory[0].x * W, tipHistory[0].y * H)
    for (let i = 1; i < tipHistory.length; i++) {
      ctx.lineTo(tipHistory[i].x * W, tipHistory[i].y * H)
    }
    ctx.strokeStyle = '#00d4ff'; ctx.lineWidth = 2.5; ctx.globalAlpha = 0.6
    ctx.stroke(); ctx.globalAlpha = 1; ctx.restore()
  }

  const defRS = defenderLm[12]; const defLS = defenderLm[11]

  // First target — cyan ring
  if (defRS && defLS) {
    const fIsRight = opportunity.firstTarget.includes('Right') || opportunity.firstTarget === 'Chest'
    const fX = opportunity.firstTarget === 'Chest' ? ((defRS.x + defLS.x) / 2) * W : (fIsRight ? defRS.x : defLS.x) * W
    const fY = opportunity.firstTarget === 'Chest' ? ((defRS.y + defLS.y) / 2 + 0.05) * H : ((defRS.y + defLS.y) / 2) * H
    ctx.save()
    ctx.beginPath(); ctx.arc(fX, fY, 14, 0, Math.PI * 2)
    ctx.strokeStyle = '#00d4ff'; ctx.lineWidth = 2.5; ctx.globalAlpha = 0.8; ctx.stroke()
    ctx.globalAlpha = 1; ctx.restore()
    ctx.save(); ctx.font = 'bold 9px sans-serif'; ctx.fillStyle = '#00d4ff'; ctx.globalAlpha = 0.9
    ctx.fillText('1st', fX - 8, fY - 18); ctx.globalAlpha = 1; ctx.restore()

    // Second target — brighter ring
    const sIsRight = opportunity.secondTarget.includes('Right')
    const sX = (sIsRight ? defRS.x : defLS.x) * W
    const sY = ((defRS.y + defLS.y) / 2) * H
    ctx.save()
    ctx.beginPath(); ctx.arc(sX, sY, 14, 0, Math.PI * 2)
    ctx.strokeStyle = '#00ff88'; ctx.lineWidth = 2.5; ctx.globalAlpha = 0.85; ctx.stroke()
    ctx.fillStyle = '#00ff88'; ctx.globalAlpha = 0.15; ctx.fill()
    ctx.globalAlpha = 1; ctx.restore()
    ctx.save(); ctx.font = 'bold 9px sans-serif'; ctx.fillStyle = '#00ff88'; ctx.globalAlpha = 0.9
    ctx.fillText('2nd', sX - 8, sY - 18); ctx.globalAlpha = 1; ctx.restore()

    // Arrow between targets
    ctx.save()
    ctx.beginPath(); ctx.moveTo(fX, fY); ctx.lineTo(sX, sY)
    ctx.strokeStyle = '#00d4ff'; ctx.lineWidth = 1.5; ctx.globalAlpha = 0.45
    ctx.setLineDash([4, 4]); ctx.stroke(); ctx.setLineDash([])
    ctx.globalAlpha = 1; ctx.restore()
  }

  // Banner
  const label = `⚡⚡ ${opportunity.zipType === 'NORMAL_ZIP' ? 'NORMAL' : 'REVERSE'} ZIP`
  ctx.save()
  ctx.font = 'bold 12px sans-serif'
  const tw = ctx.measureText(label).width
  ctx.fillStyle = '#00d4ff'; ctx.globalAlpha = 0.9
  ctx.fillRect(W - tw - 26, 34, tw + 16, 22)
  ctx.fillStyle = '#000'; ctx.globalAlpha = 1
  ctx.fillText(label, W - tw - 18, 49)
  ctx.restore()
}
