// Defence Detection — two defence types for ORION Silambam AI
// Type 1: Active Bavalai Defence (stick stays moving, body line protected)
// Type 2: Emergency Block Defence (sudden incoming, direct intercept)

export type DefenceType = 'ACTIVE_BAVALAI' | 'EMERGENCY_BLOCK' | 'NONE'
export type DefenceResult = 'Successful Defence' | 'Partial Defence' | 'Failed Defence'
export type BodyLineStatus = 'Protected' | 'Exposed' | 'Vulnerable'

export type DefenceOpportunity = {
  threatDetected: boolean
  threatDirection: 'LEFT' | 'RIGHT' | 'CENTER' | 'NONE'
  recommendedDefence: DefenceType
  bodyLineStatus: BodyLineStatus
  suggestion: string
  warning: string | null
  overlayColor: string
}

export type DefenceAttemptResult = {
  detected: boolean
  defenceType: DefenceType
  stickActive: boolean
  bodyLineCovered: boolean
  blockContact: boolean
  bavalaiMaintained: boolean
  result: DefenceResult
  coachingFeedback: string
}

// ─── Threat detector (from opponent wrist movement) ───────────────────────────

export function detectIncomingThreat(
  defenderLm: any[],
  prevDefenderLm: any[] | null,
  attackerLm: any[],
): { threatened: boolean; direction: 'LEFT' | 'RIGHT' | 'CENTER' | 'NONE'; speed: number } {
  if (!prevDefenderLm) return { threatened: false, direction: 'NONE', speed: 0 }

  const defRW = defenderLm[16]; const defLW = defenderLm[15]
  const prevRW = prevDefenderLm[16]; const prevLW = prevDefenderLm[15]
  const atkNose = attackerLm[0]
  if (!defRW || !prevRW || !defLW || !prevLW || !atkNose) return { threatened: false, direction: 'NONE', speed: 0 }

  const rDx = defRW.x - prevRW.x; const rDy = defRW.y - prevRW.y
  const lDx = defLW.x - prevLW.x; const lDy = defLW.y - prevLW.y
  const rSpeed = Math.sqrt(rDx * rDx + rDy * rDy)
  const lSpeed = Math.sqrt(lDx * lDx + lDy * lDy)
  const maxSpeed = Math.max(rSpeed, lSpeed)

  if (maxSpeed < 0.025) return { threatened: false, direction: 'NONE', speed: 0 }

  const domW = rSpeed > lSpeed ? defRW : defLW
  const dir: 'LEFT' | 'RIGHT' | 'CENTER' = Math.abs(domW.x - atkNose.x) < 0.08
    ? 'CENTER' : domW.x < atkNose.x ? 'LEFT' : 'RIGHT'

  return { threatened: maxSpeed > 0.03, direction: dir, speed: maxSpeed }
}

// ─── Opportunity detector ─────────────────────────────────────────────────────

export function detectDefenceOpportunity(
  attackerLm: any[],
  defenderLm: any[] | null,
  prevDefenderLm: any[] | null,
  bavalaiActive: boolean,
): DefenceOpportunity {
  const noDef: DefenceOpportunity = {
    threatDetected: false, threatDirection: 'NONE',
    recommendedDefence: 'NONE', bodyLineStatus: 'Protected',
    suggestion: 'No incoming threat. Maintain Bavalai.',
    warning: null, overlayColor: '#64748b',
  }

  if (!defenderLm) return noDef

  const threat = detectIncomingThreat(attackerLm, prevDefenderLm, defenderLm)

  // Body line status: are attacker wrists covering chest centerline?
  const atkRW = attackerLm[16]; const atkLW = attackerLm[15]
  const atkRS = attackerLm[12]; const atkLS = attackerLm[11]
  const chestCenterX = atkRS && atkLS ? (atkRS.x + atkLS.x) / 2 : 0.5
  const wristCenterX = atkRW && atkLW ? (atkRW.x + atkLW.x) / 2 : 0.5
  const bodyLineCovered = Math.abs(wristCenterX - chestCenterX) < 0.15
  const bodyLineStatus: BodyLineStatus = bodyLineCovered ? 'Protected' : 'Exposed'

  if (!threat.threatened) {
    return {
      ...noDef,
      bodyLineStatus,
      suggestion: bavalaiActive
        ? 'Bavalai active. Body line maintained.'
        : 'Maintain Bavalai for Active Defence.',
    }
  }

  // High speed = emergency situation
  const recommendedDefence: DefenceType = threat.speed > 0.06 || !bavalaiActive
    ? 'EMERGENCY_BLOCK'
    : 'ACTIVE_BAVALAI'

  return {
    threatDetected: true,
    threatDirection: threat.direction,
    recommendedDefence,
    bodyLineStatus,
    suggestion: recommendedDefence === 'ACTIVE_BAVALAI'
      ? `Active Bavalai Defence — keep stick moving, cover ${threat.direction === 'CENTER' ? 'centerline' : threat.direction + ' side'}.`
      : `Emergency Block — intercept the ${threat.direction} attack directly.`,
    warning: bodyLineStatus === 'Exposed' ? 'Body line exposed. Cover center.' : null,
    overlayColor: recommendedDefence === 'EMERGENCY_BLOCK' ? '#f97316' : '#00d4ff',
  }
}

// ─── Attempt analysis ─────────────────────────────────────────────────────────

export function analyzeDefenceAttempt(
  attackerLm: any[],
  defenderLm: any[] | null,
  prevAttackerLm: any[] | null,
  opportunity: DefenceOpportunity,
  bavalaiActive: boolean,
): DefenceAttemptResult {
  const base: DefenceAttemptResult = {
    detected: false, defenceType: 'NONE', stickActive: false,
    bodyLineCovered: false, blockContact: false, bavalaiMaintained: false,
    result: 'Failed Defence', coachingFeedback: '',
  }

  if (!opportunity.threatDetected || !defenderLm || !prevAttackerLm) {
    base.coachingFeedback = 'No threat to defend against.'
    return base
  }

  const atkRW = attackerLm[16]; const atkLW = attackerLm[15]
  const prevRW = prevAttackerLm[16]; const prevLW = prevAttackerLm[15]
  if (!atkRW || !prevRW) { base.coachingFeedback = 'Wrist data unavailable.'; return base }

  // Stick activity: wrist is moving
  const domRW = (atkRW.visibility || 0) > (atkLW?.visibility || 0) ? atkRW : atkLW
  const domPrevRW = (prevRW.visibility || 0) > (prevLW?.visibility || 0) ? prevRW : prevLW
  const wristSpeed = Math.sqrt(Math.pow(domRW.x - domPrevRW.x, 2) + Math.pow(domRW.y - domPrevRW.y, 2))
  const stickActive = wristSpeed > 0.015

  // Body line: wrist covers chest
  const atkRS = attackerLm[12]; const atkLS = attackerLm[11]
  const chestCenterX = atkRS && atkLS ? (atkRS.x + atkLS.x) / 2 : 0.5
  const wristCenterX = atkRW && atkLW ? (atkRW.x + atkLW.x) / 2 : 0.5
  const bodyLineCovered = Math.abs(wristCenterX - chestCenterX) < 0.15

  // Block contact: attacker wrist near defender's attacking wrist
  const defRW = defenderLm[16]; const defLW = defenderLm[15]
  let blockContact = false
  if (defRW && defLW) {
    const nearRW = Math.sqrt(Math.pow(domRW.x - defRW.x, 2) + Math.pow(domRW.y - defRW.y, 2))
    const nearLW = Math.sqrt(Math.pow(domRW.x - defLW.x, 2) + Math.pow(domRW.y - defLW.y, 2))
    blockContact = Math.min(nearRW, nearLW) < 0.12
  }

  const bavalaiMaintained = bavalaiActive && stickActive

  const defenceType = opportunity.recommendedDefence

  // Result
  let result: DefenceResult
  if (defenceType === 'ACTIVE_BAVALAI') {
    if (bavalaiMaintained && bodyLineCovered) result = 'Successful Defence'
    else if (stickActive || bodyLineCovered) result = 'Partial Defence'
    else result = 'Failed Defence'
  } else {
    if (blockContact && bodyLineCovered) result = 'Successful Defence'
    else if (blockContact || stickActive) result = 'Partial Defence'
    else result = 'Failed Defence'
  }

  // Coaching
  let coachingFeedback = ''
  if (defenceType === 'ACTIVE_BAVALAI') {
    if (result === 'Successful Defence') coachingFeedback = 'Excellent Active Bavalai Defence. Stick stayed moving and body line protected.'
    else if (!bavalaiMaintained) coachingFeedback = 'Active Bavalai Defence requires continuous stick movement. Do not stop Bavalai under pressure.'
    else coachingFeedback = 'Good defence attempt. Ensure body centerline is always covered during Bavalai.'
  } else {
    if (result === 'Successful Defence') coachingFeedback = 'Clean Emergency Block. Direct intercept executed successfully.'
    else if (!blockContact) coachingFeedback = 'Emergency Block missed. Intercept earlier — redirect the attacking wrist, do not wait.'
    else coachingFeedback = 'Block made contact but body line exposed. Protect center immediately after block.'
  }

  return {
    detected: true, defenceType, stickActive, bodyLineCovered,
    blockContact, bavalaiMaintained, result, coachingFeedback,
  }
}

// ─── Canvas overlay ───────────────────────────────────────────────────────────

export function drawDefenceOverlay(
  ctx: CanvasRenderingContext2D,
  W: number, H: number,
  attackerLm: any[],
  opportunity: DefenceOpportunity,
): void {
  if (!opportunity.threatDetected) return

  const color = opportunity.overlayColor

  // Shield arc around attacker chest
  const atkRS = attackerLm[12]; const atkLS = attackerLm[11]
  if (atkRS && atkLS) {
    const cX = ((atkRS.x + atkLS.x) / 2) * W
    const cY = ((atkRS.y + atkLS.y) / 2) * H
    ctx.save()
    ctx.beginPath(); ctx.arc(cX, cY, 34, 0, Math.PI * 2)
    ctx.strokeStyle = color; ctx.lineWidth = 2.5; ctx.globalAlpha = 0.65; ctx.stroke()
    ctx.globalAlpha = 1; ctx.restore()
  }

  // Threat direction indicator
  const atkNose = attackerLm[0]
  if (atkNose) {
    const arrowX = opportunity.threatDirection === 'LEFT' ? atkNose.x * W - 50
      : opportunity.threatDirection === 'RIGHT' ? atkNose.x * W + 50
      : atkNose.x * W
    const arrowY = atkNose.y * H - 20
    ctx.save()
    ctx.font = 'bold 14px sans-serif'; ctx.fillStyle = '#f97316'; ctx.globalAlpha = 0.9
    ctx.fillText(
      opportunity.threatDirection === 'LEFT' ? '◀ THREAT' : opportunity.threatDirection === 'RIGHT' ? 'THREAT ▶' : '▼ THREAT',
      arrowX - 30, arrowY,
    )
    ctx.globalAlpha = 1; ctx.restore()
  }

  // Defence type banner
  const isEmergency = opportunity.recommendedDefence === 'EMERGENCY_BLOCK'
  const label = isEmergency ? '🛡 EMERGENCY BLOCK' : '⟳ ACTIVE BAVALAI DEFENCE'
  ctx.save()
  ctx.font = 'bold 11px sans-serif'
  const tw = ctx.measureText(label).width
  ctx.fillStyle = color; ctx.globalAlpha = 0.88
  ctx.fillRect(W / 2 - tw / 2 - 10, H - 36, tw + 20, 22)
  ctx.fillStyle = '#000'; ctx.globalAlpha = 1
  ctx.fillText(label, W / 2 - tw / 2, H - 20)
  ctx.restore()
}
