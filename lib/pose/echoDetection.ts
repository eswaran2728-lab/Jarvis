// Echo Detection — counter combination skill for ORION Silambam AI
// Echo = Intercept → Redirect → Immediate Counter (NOT passive blocking)

export type EchoTimingRating = 'Too Early' | 'Perfect Timing' | 'Slightly Late' | 'Too Late' | 'Missed Timing'
export type EchoInterceptResult = 'Clean Intercept' | 'Partial Intercept' | 'Missed'
export type EchoRedirectResult = 'Successful Redirect' | 'Partial Redirect' | 'Failed'
export type EchoCounterResult = 'Clean Touch' | 'Light Touch' | 'Missed Touch' | 'Not Attempted'
export type EchoFootwork = 'Rear Leg Advanced' | 'Neutral' | 'Stepped Backward'
export type EchoFinalResult = 'Successful Echo' | 'Partial Echo' | 'Failed Echo'

export type EchoPoint = { x: number; y: number; ts: number }

export type EchoOpportunity = {
  available: boolean
  opponentAttackDetected: boolean
  attackDirection: 'LEFT' | 'RIGHT' | 'CENTER' | 'NONE'
  counterTarget: string
  counterRisk: 'LOW' | 'MEDIUM' | 'HIGH'
  secondEchoAvailable: boolean
  warning: string | null
  suggestion: string
  overlayColor: string
}

export type EchoAttemptResult = {
  detected: boolean
  echoNumber: 1 | 2
  interceptResult: EchoInterceptResult
  redirectResult: EchoRedirectResult
  counterTarget: string
  counterResult: EchoCounterResult
  footwork: EchoFootwork
  bodyMovement: 'Forward Bend' | 'Stable' | 'Backward Lean'
  timing: EchoTimingRating
  counterRisk: 'LOW' | 'MEDIUM' | 'HIGH'
  finalResult: EchoFinalResult
  coachingFeedback: string
}

// ─── Incoming attack detector ─────────────────────────────────────────────────

export function detectIncomingAttack(
  prevDefenderLm: any[] | null,
  currDefenderLm: any[] | null,
  attackerLm: any[],
): { detected: boolean; direction: 'LEFT' | 'RIGHT' | 'CENTER' | 'NONE'; speed: number } {
  if (!prevDefenderLm || !currDefenderLm) return { detected: false, direction: 'NONE', speed: 0 }

  const prevRW = prevDefenderLm[16]; const prevLW = prevDefenderLm[15]
  const currRW = currDefenderLm[16]; const currLW = currDefenderLm[15]
  const atkNose = attackerLm[0]
  if (!prevRW || !currRW || !prevLW || !currLW || !atkNose) return { detected: false, direction: 'NONE', speed: 0 }

  // Dominant wrist movement speed
  const rDx = currRW.x - prevRW.x; const rDy = currRW.y - prevRW.y
  const lDx = currLW.x - prevLW.x; const lDy = currLW.y - prevLW.y
  const rSpeed = Math.sqrt(rDx * rDx + rDy * rDy)
  const lSpeed = Math.sqrt(lDx * lDx + lDy * lDy)
  const maxSpeed = Math.max(rSpeed, lSpeed)

  // Attack = fast wrist movement toward attacker
  if (maxSpeed < 0.02) return { detected: false, direction: 'NONE', speed: 0 }

  // Direction: which wrist is moving faster toward attacker
  const domW = rSpeed > lSpeed ? currRW : currLW
  const dir: 'LEFT' | 'RIGHT' | 'CENTER' = Math.abs(domW.x - atkNose.x) < 0.08
    ? 'CENTER' : domW.x < atkNose.x ? 'LEFT' : 'RIGHT'

  return { detected: maxSpeed > 0.03, direction: dir, speed: maxSpeed }
}

// ─── Opportunity detector ─────────────────────────────────────────────────────

export function detectEchoOpportunity(
  attackerLm: any[],
  defenderLm: any[] | null,
  prevDefenderLm: any[] | null,
): EchoOpportunity {
  const noEcho: EchoOpportunity = {
    available: false, opponentAttackDetected: false,
    attackDirection: 'NONE', counterTarget: '',
    counterRisk: 'MEDIUM', secondEchoAvailable: false, warning: null,
    suggestion: 'No incoming attack detected.',
    overlayColor: '#64748b',
  }

  if (!defenderLm) return noEcho

  const attack = detectIncomingAttack(prevDefenderLm, defenderLm, attackerLm)
  if (!attack.detected) return noEcho

  // Determine best counter target based on attack direction
  const defRS = defenderLm[12]; const defLS = defenderLm[11]
  const atkNose = attackerLm[0]
  const defNose = defenderLm[0]

  const counterTarget = attack.direction === 'CENTER' ? 'Chest'
    : attack.direction === 'LEFT' ? 'Left Shoulder' : 'Right Shoulder'

  // Distance OK for counter
  const dx = (atkNose?.x || 0.5) - (defNose?.x || 0.5)
  const dy = (atkNose?.y || 0.5) - (defNose?.y || 0.5)
  const dist = Math.sqrt(dx * dx + dy * dy)
  const inRange = dist < 0.55

  // Is a second Echo possible (opponent appears to be in a combination)?
  const defWristSpeed = attack.speed
  const secondEchoAvailable = defWristSpeed > 0.06

  const counterRisk: 'LOW' | 'MEDIUM' | 'HIGH' = inRange ? 'MEDIUM' : 'HIGH'

  return {
    available: inRange,
    opponentAttackDetected: true,
    attackDirection: attack.direction,
    counterTarget,
    counterRisk,
    secondEchoAvailable,
    warning: !inRange ? 'Too far to counter. Move forward.' : null,
    suggestion: inRange
      ? `Opponent attacking. Use Echo. Intercept and counter to ${counterTarget}.`
      : 'Intercept now. Close distance before countering.',
    overlayColor: '#00d4ff',
  }
}

// ─── Attempt analysis ─────────────────────────────────────────────────────────

export function analyzeEchoAttempt(
  attackerLm: any[],
  defenderLm: any[] | null,
  prevAttackerLm: any[] | null,
  opportunity: EchoOpportunity,
  echoNumber: 1 | 2 = 1,
): EchoAttemptResult {
  const base: EchoAttemptResult = {
    detected: false, echoNumber, interceptResult: 'Missed', redirectResult: 'Failed',
    counterTarget: opportunity.counterTarget, counterResult: 'Not Attempted',
    footwork: 'Neutral', bodyMovement: 'Stable',
    timing: 'Missed Timing', counterRisk: opportunity.counterRisk,
    finalResult: 'Failed Echo', coachingFeedback: '',
  }

  if (!opportunity.opponentAttackDetected || !defenderLm || !prevAttackerLm) {
    base.coachingFeedback = 'No incoming attack to Echo.'
    return base
  }

  const atkRW = attackerLm[16]; const atkLW = attackerLm[15]
  const prevRW = prevAttackerLm[16]; const prevLW = prevAttackerLm[15]
  if (!atkRW || !prevRW) { base.coachingFeedback = 'Wrist landmarks not visible.'; return base }

  // Intercept: attacker wrist moved toward opponent quickly
  const domW = (atkRW.visibility || 0) > (atkLW?.visibility || 0) ? atkRW : atkLW
  const prevDomW = (prevRW.visibility || 0) > (prevLW?.visibility || 0) ? prevRW : prevLW
  const wristSpeed = Math.sqrt(Math.pow(domW.x - prevDomW.x, 2) + Math.pow(domW.y - prevDomW.y, 2))
  const intercepted = wristSpeed > 0.025
  const interceptResult: EchoInterceptResult = intercepted ? 'Clean Intercept' : 'Missed'

  // Footwork: did rear foot advance? (hip movement toward opponent)
  const atkRH = attackerLm[24]; const atkLH = attackerLm[23]
  const prevRH = prevAttackerLm[24]; const prevLH = prevAttackerLm[23]
  let footwork: EchoFootwork = 'Neutral'
  if (atkRH && prevRH && atkLH && prevLH) {
    const hipDx = ((atkRH.x + atkLH.x) / 2) - ((prevRH.x + prevLH.x) / 2)
    const defNoseX = defenderLm[0]?.x || 0.5
    const movingToward = Math.sign(defNoseX - (atkRH.x + atkLH.x) / 2) === Math.sign(hipDx)
    footwork = movingToward ? 'Rear Leg Advanced' : hipDx < -0.02 ? 'Stepped Backward' : 'Neutral'
  }

  // Body movement: forward bend = nose moves down
  const atkNose = attackerLm[0]; const prevNose = prevAttackerLm[0]
  let bodyMovement: 'Forward Bend' | 'Stable' | 'Backward Lean' = 'Stable'
  if (atkNose && prevNose) {
    const noseChange = atkNose.y - prevNose.y
    bodyMovement = noseChange > 0.01 ? 'Forward Bend' : noseChange < -0.015 ? 'Backward Lean' : 'Stable'
  }

  // Counter: wrist proximity to defender's chest/shoulder
  let counterResult: EchoCounterResult = 'Not Attempted'
  let counterTarget = opportunity.counterTarget
  if (intercepted && defenderLm) {
    const defRS = defenderLm[12]; const defLS = defenderLm[11]
    const chestX = defRS && defLS ? (defRS.x + defLS.x) / 2 : 0.5
    const chestY = defRS && defLS ? (defRS.y + defLS.y) / 2 + 0.06 : 0.5
    const cDist = Math.sqrt(Math.pow(domW.x - chestX, 2) + Math.pow(domW.y - chestY, 2))
    counterResult = cDist < 0.10 ? 'Clean Touch' : cDist < 0.18 ? 'Light Touch' : 'Missed Touch'
    counterTarget = cDist < 0.18 ? 'Chest' : opportunity.counterTarget
  }

  // Timing
  const timing: EchoTimingRating = !intercepted ? 'Missed Timing'
    : footwork === 'Stepped Backward' ? 'Too Late'
    : counterResult === 'Clean Touch' ? 'Perfect Timing'
    : counterResult === 'Light Touch' ? 'Slightly Late'
    : 'Too Late'

  // Redirect: proxied from intercept + wrist crossing motion
  const redirectResult: EchoRedirectResult = intercepted && wristSpeed > 0.04 ? 'Successful Redirect' : intercepted ? 'Partial Redirect' : 'Failed'

  // Final result
  let finalResult: EchoFinalResult
  if (intercepted && counterResult === 'Clean Touch' && footwork !== 'Stepped Backward') finalResult = 'Successful Echo'
  else if (intercepted && counterResult !== 'Not Attempted') finalResult = 'Partial Echo'
  else finalResult = 'Failed Echo'

  // Coaching
  let coachingFeedback = ''
  if (finalResult === 'Successful Echo') coachingFeedback = `Excellent Echo. You redirected the attack and countered immediately to ${counterTarget}.`
  else if (footwork === 'Stepped Backward') coachingFeedback = 'Do not step backward. Pull the rear leg forward and close distance to counter.'
  else if (!intercepted) coachingFeedback = 'Echo missed. Timing late. Opponent completed the attack first.'
  else if (counterResult === 'Not Attempted') coachingFeedback = 'You blocked but did not counter. Echo requires immediate response after interception.'
  else coachingFeedback = `Good${echoNumber === 2 ? ' second' : ''} intercept but counter timing can be faster.`

  return {
    detected: true, echoNumber, interceptResult, redirectResult,
    counterTarget, counterResult, footwork, bodyMovement,
    timing, counterRisk: opportunity.counterRisk, finalResult, coachingFeedback,
  }
}

// ─── Canvas overlay ───────────────────────────────────────────────────────────

export function drawEchoOverlay(
  ctx: CanvasRenderingContext2D,
  W: number, H: number,
  attackerLm: any[],
  defenderLm: any[] | null,
  opportunity: EchoOpportunity,
): void {
  if (!opportunity.opponentAttackDetected) return

  // Draw opponent attack line in red
  if (defenderLm) {
    const defRW = defenderLm[16]; const defLW = defenderLm[15]
    const atkNose = attackerLm[0]
    const domW = (defRW?.visibility || 0) > (defLW?.visibility || 0) ? defRW : defLW
    if (domW && atkNose) {
      ctx.save()
      ctx.beginPath(); ctx.moveTo(domW.x * W, domW.y * H); ctx.lineTo(atkNose.x * W, atkNose.y * H)
      ctx.strokeStyle = '#f97316'; ctx.lineWidth = 3; ctx.globalAlpha = 0.6
      ctx.setLineDash([8, 5]); ctx.stroke(); ctx.setLineDash([])
      ctx.globalAlpha = 1; ctx.restore()
    }
  }

  // Draw intercept point (attacker wrist) in yellow
  const atkRW = attackerLm[16]; const atkLW = attackerLm[15]
  const domAtkW = (atkRW?.visibility || 0) > (atkLW?.visibility || 0) ? atkRW : atkLW
  if (domAtkW) {
    ctx.save()
    ctx.beginPath(); ctx.arc(domAtkW.x * W, domAtkW.y * H, 14, 0, Math.PI * 2)
    ctx.strokeStyle = '#f59e0b'; ctx.lineWidth = 3; ctx.globalAlpha = 0.85; ctx.stroke()
    ctx.globalAlpha = 1; ctx.restore()
    ctx.save()
    ctx.font = 'bold 10px sans-serif'; ctx.fillStyle = '#f59e0b'; ctx.globalAlpha = 0.95
    ctx.fillText('INTERCEPT', domAtkW.x * W - 28, domAtkW.y * H - 18)
    ctx.globalAlpha = 1; ctx.restore()
  }

  // Counter target highlight (green)
  if (defenderLm && opportunity.available) {
    const defRS = defenderLm[12]; const defLS = defenderLm[11]
    if (defRS && defLS) {
      const cX = ((defRS.x + defLS.x) / 2) * W; const cY = ((defRS.y + defLS.y) / 2 + 0.06) * H
      ctx.save()
      ctx.beginPath(); ctx.arc(cX, cY, 18, 0, Math.PI * 2)
      ctx.strokeStyle = '#00ff88'; ctx.lineWidth = 2.5; ctx.globalAlpha = 0.8; ctx.stroke()
      ctx.fillStyle = '#00ff88'; ctx.globalAlpha = 0.2; ctx.fill()
      ctx.globalAlpha = 1; ctx.restore()
    }
  }

  // Banner
  const label = opportunity.available ? '⚡ ECHO NOW — DO NOT RETREAT' : '⚠ INCOMING — ECHO READY'
  ctx.save()
  ctx.font = 'bold 12px sans-serif'
  const tw = ctx.measureText(label).width
  ctx.fillStyle = opportunity.available ? '#00d4ff' : '#f59e0b'; ctx.globalAlpha = 0.88
  ctx.fillRect(W / 2 - tw / 2 - 10, H / 2 - 20, tw + 20, 24)
  ctx.fillStyle = '#000'; ctx.globalAlpha = 1
  ctx.fillText(label, W / 2 - tw / 2, H / 2 - 3)
  ctx.restore()
}
