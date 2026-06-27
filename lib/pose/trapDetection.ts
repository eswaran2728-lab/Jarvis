// Trap Detection — deception attack for ORION Silambam AI
// Trap = fake target → instant real attack (NOT a block or defence)

export type TrapPhase = 'Fake' | 'Transition' | 'Real Attack' | 'None'
export type TrapResult = 'Successful Trap' | 'Partial Trap' | 'Failed Trap'
export type TrapTouchResult = 'Clean Touch' | 'Light Touch' | 'Missed Touch' | 'Not Attempted'
export type TrapHandState = 'Apart' | 'Together'

export type TrapPoint = { x: number; y: number; ts: number }

export type TrapOpportunity = {
  available: boolean
  defenderGuardBias: 'LEFT' | 'RIGHT' | 'CENTER' | 'NONE'
  suggestedFakeTarget: string
  suggestedRealTarget: string
  counterRisk: 'LOW' | 'MEDIUM' | 'HIGH'
  warning: string | null
  suggestion: string
  overlayColor: string
}

export type TrapAttemptResult = {
  detected: boolean
  phase: TrapPhase
  fakeTarget: string
  realTarget: string
  handsDuringFake: TrapHandState
  handsDuringReal: TrapHandState
  transitionSpeed: 'Too Slow' | 'Moderate' | 'Fast' | 'Deceptive'
  touchResult: TrapTouchResult
  defenderReacted: boolean
  finalResult: TrapResult
  coachingFeedback: string
}

// ─── Guard bias detector ──────────────────────────────────────────────────────

export function detectDefenderGuardBias(
  defenderLm: any[],
): { bias: 'LEFT' | 'RIGHT' | 'CENTER' | 'NONE'; openSide: string } {
  if (!defenderLm || defenderLm.length < 17) return { bias: 'NONE', openSide: '' }

  const defRW = defenderLm[16]; const defLW = defenderLm[15]
  const defRS = defenderLm[12]; const defLS = defenderLm[11]
  if (!defRW || !defLW || !defRS || !defLS) return { bias: 'NONE', openSide: '' }

  const centerX = (defRS.x + defLS.x) / 2
  const wristCenterX = (defRW.x + defLW.x) / 2

  const bias = wristCenterX < centerX - 0.08 ? 'LEFT'
    : wristCenterX > centerX + 0.08 ? 'RIGHT'
    : 'CENTER'

  const openSide = bias === 'LEFT' ? 'Right Shoulder' : bias === 'RIGHT' ? 'Left Shoulder' : 'Chest'
  return { bias, openSide }
}

// ─── Opportunity detector ─────────────────────────────────────────────────────

export function detectTrapOpportunity(
  attackerLm: any[],
  defenderLm: any[] | null,
): TrapOpportunity {
  const noTrap: TrapOpportunity = {
    available: false, defenderGuardBias: 'NONE',
    suggestedFakeTarget: '', suggestedRealTarget: '',
    counterRisk: 'HIGH', warning: null,
    suggestion: 'No Trap opportunity. Maintain Bavalai.',
    overlayColor: '#64748b',
  }

  if (!defenderLm) return noTrap

  const atkNose = attackerLm[0]; const defNose = defenderLm[0]
  if (!atkNose || !defNose) return noTrap

  const dx = atkNose.x - defNose.x; const dy = atkNose.y - defNose.y
  const dist = Math.sqrt(dx * dx + dy * dy)
  const inRange = dist < 0.60

  if (!inRange) return { ...noTrap, warning: 'Too far. Move into Trap range.', suggestion: 'Close distance before using Trap.' }

  const { bias, openSide } = detectDefenderGuardBias(defenderLm)

  // Fake toward where defender is guarding; real strike where they are NOT
  const fakeTarget = bias === 'LEFT' ? 'Left Shoulder' : bias === 'RIGHT' ? 'Right Shoulder' : 'Chest'
  const realTarget = bias === 'LEFT' ? 'Right Shoulder' : bias === 'RIGHT' ? 'Left Shoulder' : 'Right Shoulder'

  const counterRisk: 'LOW' | 'MEDIUM' | 'HIGH' = bias !== 'NONE' ? 'LOW' : 'MEDIUM'

  return {
    available: true,
    defenderGuardBias: bias,
    suggestedFakeTarget: fakeTarget,
    suggestedRealTarget: realTarget,
    counterRisk,
    warning: null,
    suggestion: `Trap: Fake to ${fakeTarget} → Real strike to ${realTarget}. Hands apart during fake.`,
    overlayColor: '#a855f7',
  }
}

// ─── Attempt analysis ─────────────────────────────────────────────────────────

export function analyzeTrapAttempt(
  attackerLm: any[],
  defenderLm: any[] | null,
  prevAttackerLm: any[] | null,
  tipHistory: TrapPoint[],
  opportunity: TrapOpportunity,
): TrapAttemptResult {
  const base: TrapAttemptResult = {
    detected: false, phase: 'None',
    fakeTarget: opportunity.suggestedFakeTarget,
    realTarget: opportunity.suggestedRealTarget,
    handsDuringFake: 'Together', handsDuringReal: 'Together',
    transitionSpeed: 'Too Slow', touchResult: 'Not Attempted',
    defenderReacted: false,
    finalResult: 'Failed Trap', coachingFeedback: '',
  }

  if (!defenderLm || !prevAttackerLm || tipHistory.length < 6) {
    base.coachingFeedback = 'Not enough movement data for Trap analysis.'
    return base
  }

  const atkRW = attackerLm[16]; const atkLW = attackerLm[15]
  const prevRW = prevAttackerLm[16]; const prevLW = prevAttackerLm[15]
  if (!atkRW || !prevRW || !atkLW || !prevLW) {
    base.coachingFeedback = 'Wrist landmarks not visible.'
    return base
  }

  // Hand spacing: apart during fake = hands spread wide
  const handSpread = Math.sqrt(Math.pow(atkRW.x - atkLW.x, 2) + Math.pow(atkRW.y - atkLW.y, 2))
  const handsDuringReal: TrapHandState = handSpread < 0.15 ? 'Together' : 'Apart'

  // Check early history for hand state during "fake" phase
  const earlyIdx = Math.floor(tipHistory.length * 0.3)
  const earlyPts = tipHistory.slice(0, earlyIdx)
  const latePts = tipHistory.slice(earlyIdx)

  // Wrist speed for transition analysis
  const domRW = (atkRW.visibility || 0) > (atkLW?.visibility || 0) ? atkRW : atkLW
  const domPrevRW = (prevRW.visibility || 0) > (prevLW?.visibility || 0) ? prevRW : prevLW
  const wristSpeed = Math.sqrt(Math.pow(domRW.x - domPrevRW.x, 2) + Math.pow(domRW.y - domPrevRW.y, 2))

  // Direction change detection: fake goes one way, real goes another
  let directionChange = false
  if (earlyPts.length >= 2 && latePts.length >= 2) {
    const earlyDx = earlyPts[earlyPts.length - 1].x - earlyPts[0].x
    const lateDx = latePts[latePts.length - 1].x - latePts[0].x
    directionChange = earlyDx * lateDx < 0   // opposite horizontal directions
  }

  const transitionSpeed: 'Too Slow' | 'Moderate' | 'Fast' | 'Deceptive' =
    wristSpeed > 0.07 && directionChange ? 'Deceptive'
    : wristSpeed > 0.05 ? 'Fast'
    : wristSpeed > 0.025 ? 'Moderate'
    : 'Too Slow'

  // Counter touch: wrist proximity to real target (opposite shoulder)
  const defRS = defenderLm[12]; const defLS = defenderLm[11]
  let touchResult: TrapTouchResult = 'Not Attempted'
  if (defRS && defLS) {
    const realX = opportunity.suggestedRealTarget.includes('Right') ? defRS.x : defLS.x
    const realY = opportunity.suggestedRealTarget.includes('Right') ? defRS.y : defLS.y
    const tDist = Math.sqrt(Math.pow(domRW.x - realX, 2) + Math.pow(domRW.y - realY, 2))
    touchResult = tDist < 0.09 ? 'Clean Touch' : tDist < 0.17 ? 'Light Touch' : 'Missed Touch'
  }

  // Defender reaction: did they move wrist toward the fake target?
  const defRW = defenderLm[16]; const defLW = defenderLm[15]
  const defWristCenterX = defRW && defLW ? (defRW.x + defLW.x) / 2 : 0.5
  const fakeIsLeft = opportunity.suggestedFakeTarget.includes('Left')
  const defenderReacted = fakeIsLeft ? defWristCenterX < 0.4 : defWristCenterX > 0.6

  // Phase
  const phase: TrapPhase = wristSpeed > 0.02 && directionChange ? 'Real Attack'
    : wristSpeed > 0.01 ? 'Fake'
    : 'None'

  // Final result
  let finalResult: TrapResult
  if (touchResult === 'Clean Touch' && directionChange && defenderReacted) finalResult = 'Successful Trap'
  else if (touchResult !== 'Not Attempted' && directionChange) finalResult = 'Partial Trap'
  else finalResult = 'Failed Trap'

  // Coaching
  let coachingFeedback = ''
  if (finalResult === 'Successful Trap') coachingFeedback = `Excellent Trap. Defender reacted to fake, you converted to ${opportunity.suggestedRealTarget}.`
  else if (!directionChange) coachingFeedback = 'No direction change detected. Trap requires a real fake — move toward one target then instantly strike another.'
  else if (!defenderReacted) coachingFeedback = 'Defender did not react to the fake. Make the fake movement more convincing before transitioning.'
  else if (touchResult === 'Missed Touch') coachingFeedback = 'Good deception but missed the real target. Sharpen the final strike after the transition.'
  else coachingFeedback = 'Trap initiated. Increase transition speed to make it truly deceptive.'

  return {
    detected: true, phase, fakeTarget: opportunity.suggestedFakeTarget,
    realTarget: opportunity.suggestedRealTarget,
    handsDuringFake: 'Apart', handsDuringReal,
    transitionSpeed, touchResult, defenderReacted,
    finalResult, coachingFeedback,
  }
}

// ─── Canvas overlay ───────────────────────────────────────────────────────────

export function drawTrapOverlay(
  ctx: CanvasRenderingContext2D,
  W: number, H: number,
  attackerLm: any[],
  defenderLm: any[] | null,
  opportunity: TrapOpportunity,
): void {
  if (!opportunity.available || !defenderLm) return

  const defRS = defenderLm[12]; const defLS = defenderLm[11]

  // Highlight fake target in orange (where to PRETEND to attack)
  const fakeIsRight = opportunity.suggestedFakeTarget.includes('Right')
  const fakeLm = fakeIsRight ? defRS : defLS
  if (fakeLm) {
    ctx.save()
    ctx.beginPath(); ctx.arc(fakeLm.x * W, fakeLm.y * H, 16, 0, Math.PI * 2)
    ctx.strokeStyle = '#f97316'; ctx.lineWidth = 2; ctx.globalAlpha = 0.7
    ctx.setLineDash([5, 4]); ctx.stroke(); ctx.setLineDash([])
    ctx.globalAlpha = 1; ctx.restore()
    ctx.save()
    ctx.font = 'bold 9px sans-serif'; ctx.fillStyle = '#f97316'; ctx.globalAlpha = 0.85
    ctx.fillText('FAKE', fakeLm.x * W - 10, fakeLm.y * H - 20)
    ctx.globalAlpha = 1; ctx.restore()
  }

  // Highlight real target in purple (where to ACTUALLY strike)
  const realIsRight = opportunity.suggestedRealTarget.includes('Right')
  const realLm = realIsRight ? defRS : defLS
  if (realLm) {
    ctx.save()
    ctx.beginPath(); ctx.arc(realLm.x * W, realLm.y * H, 18, 0, Math.PI * 2)
    ctx.strokeStyle = '#a855f7'; ctx.lineWidth = 2.5; ctx.globalAlpha = 0.85; ctx.stroke()
    ctx.fillStyle = '#a855f7'; ctx.globalAlpha = 0.15; ctx.fill()
    ctx.globalAlpha = 1; ctx.restore()
    ctx.save()
    ctx.font = 'bold 9px sans-serif'; ctx.fillStyle = '#a855f7'; ctx.globalAlpha = 0.9
    ctx.fillText('REAL', realLm.x * W - 10, realLm.y * H - 22)
    ctx.globalAlpha = 1; ctx.restore()
  }

  // Arrow from fake to real
  if (fakeLm && realLm) {
    ctx.save()
    ctx.beginPath()
    ctx.moveTo(fakeLm.x * W, fakeLm.y * H)
    ctx.lineTo(realLm.x * W, realLm.y * H)
    ctx.strokeStyle = '#a855f7'; ctx.lineWidth = 1.5; ctx.globalAlpha = 0.5
    ctx.setLineDash([4, 4]); ctx.stroke(); ctx.setLineDash([])
    ctx.globalAlpha = 1; ctx.restore()
  }

  // Banner
  const label = '🎭 TRAP — FAKE THEN STRIKE'
  ctx.save()
  ctx.font = 'bold 11px sans-serif'
  const tw = ctx.measureText(label).width
  ctx.fillStyle = '#a855f7'; ctx.globalAlpha = 0.88
  ctx.fillRect(W / 2 - tw / 2 - 10, 36, tw + 20, 22)
  ctx.fillStyle = '#fff'; ctx.globalAlpha = 1
  ctx.fillText(label, W / 2 - tw / 2, 51)
  ctx.restore()
}
