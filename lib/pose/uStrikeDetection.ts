// U Strike & Reverse U Strike detection engine for ORION Silambam AI

export type TouchResult = 'Clean Touch' | 'Light Touch' | 'Unclear Touch' | 'Missed Touch' | 'Blocked Touch'
export type SpeedRating = 'Too Slow' | 'Moderate' | 'Good Combat Speed' | 'Excellent Combat Speed'
export type FinalResult = 'Successful U Strike' | 'Partial U Strike' | 'Failed U Strike'
export type UType = 'U_STRIKE' | 'REVERSE_U_STRIKE' | 'BOTH' | 'NONE'

export type TipPoint = { x: number; y: number; ts: number }

export type UStrikeOpportunity = {
  available: boolean
  type: UType
  reason: string
  openTargets: string[]
  counterRisk: 'LOW' | 'MEDIUM' | 'HIGH'
  warning: string | null
  suggestion: string
  overlayColor: string   // hex for canvas
}

export type UStrikeAttemptResult = {
  detected: boolean
  type: UType
  firstTouchTarget: string
  firstTouchResult: TouchResult
  pathClarity: 'Clear' | 'Partial' | 'Unclear' | 'None'
  secondTouchTarget: string
  secondTouchResult: TouchResult
  speedRating: SpeedRating
  speedNote: string
  finalResult: FinalResult
  coachingFeedback: string
}

export type UStrikeTimestamp = {
  videoTimeSec: number
  videoTimeStr: string
  fighter: string
  opportunity: UStrikeOpportunity
  attempt: UStrikeAttemptResult | null
}

// ─── Stick tip estimation ─────────────────────────────────────────────────────

export function estimateStickTip(lm: any[]): { x: number; y: number } | null {
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
  const armLen = len * 1.6
  return { x: domW.x + nx * armLen, y: domW.y + ny * armLen }
}

// ─── Opportunity detection ────────────────────────────────────────────────────

export function detectUStrikeOpportunity(
  attackerLm: any[],
  defenderLm: any[] | null
): UStrikeOpportunity {
  if (!defenderLm || defenderLm.length < 17) {
    return {
      available: false, type: 'NONE',
      reason: 'Single player — point camera at both fighters',
      openTargets: [], counterRisk: 'MEDIUM', warning: null,
      suggestion: 'Two players needed for U Strike detection.',
      overlayColor: '#64748b',
    }
  }

  const atkNose = attackerLm[0];  const defNose = defenderLm[0]
  const defRW   = defenderLm[16]; const defLW  = defenderLm[15]
  const defRS   = defenderLm[12]; const defLS  = defenderLm[11]
  const defRE   = defenderLm[14]; const defLE  = defenderLm[13]
  const defRH   = defenderLm[24]; const defLH  = defenderLm[23]
  const atkRW   = attackerLm[16]; const atkLW  = attackerLm[15]

  if (!atkNose || !defNose) {
    return {
      available: false, type: 'NONE', reason: 'Cannot detect player positions',
      openTargets: [], counterRisk: 'HIGH', warning: null, suggestion: '',
      overlayColor: '#ef4444',
    }
  }

  const dist = Math.sqrt(Math.pow(atkNose.x - defNose.x, 2) + Math.pow(atkNose.y - defNose.y, 2))
  const inRange  = dist < 0.50
  const tooFar   = dist > 0.65
  const tooClose = dist < 0.10

  // Guard analysis
  const defRWHigh = defRW && defRS && defRW.y < defRS.y - 0.02
  const defLWHigh = defLW && defLS && defLW.y < defLS.y - 0.02

  // Forearm horizontal extension — creates U-path clearance
  const defRForearmExt = defRW && defRS && Math.abs(defRW.x - defRS.x) > 0.12
  const defLForearmExt = defLW && defLS && Math.abs(defLW.x - defLS.x) > 0.12

  // Chest/stomach open
  const chestOpen   = defRWHigh || defLWHigh
  const stomachOpen = defRH && defLH &&
    (!defRW || defRW.y < defRH.y) && (!defLW || defLW.y < defLH.y)

  // Opponent stick tip threatening attacker
  const defTip = estimateStickTip(defenderLm)
  const atkStrikeZone = { x: atkNose.x, y: atkNose.y + 0.1 }
  const defStickThreat = defTip &&
    Math.abs(defTip.x - atkStrikeZone.x) < 0.18 &&
    Math.abs(defTip.y - atkStrikeZone.y) < 0.2

  // Attacker overreaching / unstable
  const atkBothHandsHigh = atkRW && atkLW && atkRW.y < atkNose.y && atkLW.y < atkNose.y

  const openTargets: string[] = []
  const reasons: string[] = []
  const warnings: string[] = []

  if (chestOpen)       { openTargets.push('Chest');         reasons.push('opponent chest open') }
  if (stomachOpen)     { openTargets.push('Stomach');       reasons.push('opponent stomach exposed') }
  if (defRForearmExt)  { openTargets.push('Right forearm'); reasons.push("opponent's right forearm extended") }
  if (defLForearmExt)  { openTargets.push('Left forearm');  reasons.push("opponent's left forearm extended") }

  if (tooFar)          warnings.push('Attacker too far for U Strike')
  if (tooClose)        warnings.push('Too close — adjust distance')
  if (defStickThreat)  warnings.push("Opponent's stick is ready to counter")
  if (atkBothHandsHigh) warnings.push('Attacker overreaching — unstable position')

  let counterRisk: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW'
  if (defStickThreat)              counterRisk = 'HIGH'
  else if (tooFar || tooClose)     counterRisk = 'MEDIUM'
  else if (warnings.length > 0)    counterRisk = 'MEDIUM'

  // U Strike: right forearm or chest/stomach open → classic U under right arm
  const uStrikeOk     = inRange && !tooClose && counterRisk !== 'HIGH' &&
    (chestOpen || stomachOpen || defRForearmExt)
  // Reverse U Strike: left forearm open → reverse angle
  const reverseUOk    = inRange && !tooClose && counterRisk !== 'HIGH' &&
    (defLForearmExt || chestOpen)

  const type: UType = (uStrikeOk && reverseUOk) ? 'BOTH'
    : uStrikeOk    ? 'U_STRIKE'
    : reverseUOk   ? 'REVERSE_U_STRIKE'
    : 'NONE'

  const available = uStrikeOk || reverseUOk

  let suggestion = ''
  let overlayColor = '#64748b'

  if (counterRisk === 'HIGH') {
    suggestion = "Do not attempt U Strike now. Opponent counter risk is high."
    overlayColor = '#ef4444'
  } else if (!inRange || tooFar) {
    suggestion = "Move closer. No U Strike range yet."
    overlayColor = '#64748b'
  } else if (type === 'BOTH') {
    suggestion = "U Strike & Reverse U Strike both available. Choose by your stance."
    overlayColor = '#00d4ff'
  } else if (type === 'U_STRIKE') {
    const t = openTargets.find(t => t !== 'Chest' && t !== 'Stomach') || openTargets[0] || 'opening'
    suggestion = `U Strike opportunity available. ${t} exposed.`
    overlayColor = '#00ff88'
  } else if (type === 'REVERSE_U_STRIKE') {
    suggestion = "Reverse U Strike available from left forearm opening."
    overlayColor = '#a855f7'
  } else {
    suggestion = "No U Strike opening. Opponent guard is strong."
    overlayColor = '#64748b'
  }

  return {
    available, type,
    reason: reasons.join(', ') || 'No clear opening',
    openTargets, counterRisk,
    warning: warnings[0] || null,
    suggestion, overlayColor,
  }
}

// ─── U-path analysis from tip trajectory ─────────────────────────────────────

export function analyzeUPath(tips: TipPoint[]): {
  isU: boolean
  isReverseU: boolean
  pathClarity: 'Clear' | 'Partial' | 'Unclear' | 'None'
  durationMs: number
} {
  if (tips.length < 5) return { isU: false, isReverseU: false, pathClarity: 'None', durationMs: 0 }

  const durationMs = tips[tips.length - 1].ts - tips[0].ts

  const third = Math.max(1, Math.floor(tips.length / 3))
  const f = tips.slice(0, third)
  const m = tips.slice(third, third * 2)
  const l = tips.slice(third * 2)

  const avgY = (arr: TipPoint[]) => arr.reduce((s, p) => s + p.y, 0) / arr.length
  const avgX = (arr: TipPoint[]) => arr.reduce((s, p) => s + p.x, 0) / arr.length

  const y1 = avgY(f); const y2 = avgY(m); const y3 = avgY(l)
  const x1 = avgX(f); const x3 = avgX(l)

  // U shape: middle y is lower (larger in screen coords = went under arm)
  const bottomBulge = (y2 - y1 > 0.02) && (y2 - y3 > 0.02)
  const bulgeMag    = y2 - Math.min(y1, y3)

  const isU        = bottomBulge && (x3 - x1) >= -0.05
  const isReverseU = bottomBulge && (x1 - x3) >= -0.05

  let pathClarity: 'Clear' | 'Partial' | 'Unclear' | 'None' = 'None'
  if (isU || isReverseU) {
    if (bulgeMag > 0.08) pathClarity = 'Clear'
    else if (bulgeMag > 0.04) pathClarity = 'Partial'
    else pathClarity = 'Unclear'
  }

  return { isU, isReverseU, pathClarity, durationMs }
}

// ─── Speed rating ─────────────────────────────────────────────────────────────

export function rateUStrikeSpeed(durationMs: number): { rating: SpeedRating; note: string } {
  if (durationMs < 300) return {
    rating: 'Excellent Combat Speed',
    note: 'Both touches happened in one fast continuous flow. Opponent had no time to counter.',
  }
  if (durationMs < 600) return {
    rating: 'Good Combat Speed',
    note: 'First and second touch connected with little delay. Good for scoring.',
  }
  if (durationMs < 1000) return {
    rating: 'Moderate',
    note: 'Movement is correct but opponent may have time to defend the second touch.',
  }
  return {
    rating: 'Too Slow',
    note: 'Opponent has clear counter opportunity before second touch. Speed up the U flow.',
  }
}

// ─── Coaching feedback ────────────────────────────────────────────────────────

export function generateUStrikeFeedback(r: {
  firstTouchResult: TouchResult
  pathClarity: 'Clear' | 'Partial' | 'Unclear' | 'None'
  secondTouchResult: TouchResult
  speedRating: SpeedRating
  finalResult: FinalResult
  counterRisk?: 'LOW' | 'MEDIUM' | 'HIGH'
}): string {
  if (r.finalResult === 'Successful U Strike') {
    if (r.speedRating === 'Excellent Combat Speed')
      return 'Excellent U Strike. Both touches landed in one clean flow. Exit immediately after second touch to avoid counterattack.'
    return 'Good U Strike. First touch and second touch connected smoothly. After completing U Strike, raise guard immediately.'
  }

  if (r.finalResult === 'Partial U Strike') {
    if (r.firstTouchResult === 'Missed Touch')
      return 'Your first touch missed. Adjust your distance and target chest or upper forearm precisely before flowing into the U.'
    if (r.pathClarity === 'Unclear' || r.pathClarity === 'None')
      return 'Your first touch landed, but your U transition was too slow or unclear. The stick must go under the arm continuously without stopping.'
    if (r.secondTouchResult === 'Missed Touch')
      return 'Your U path was correct, but second touch did not clearly land. Push the stick through the full U path and ensure contact on second touch.'
    if (r.speedRating === 'Too Slow' || r.speedRating === 'Moderate')
      return 'Your first touch landed, but your U transition was too slow. Opponent had time to defend the second touch. Speed up the flow.'
    return 'U Strike partially completed. First touch landed but second touch needs improvement. Practice the continuous flow.'
  }

  if (r.firstTouchResult === 'Missed Touch')
    return 'First touch missed. Position stick tip on a valid target before beginning the U flow. Do not start U path without first contact.'
  if (r.counterRisk === 'HIGH')
    return "You should not try U Strike here. Opponent's stick was already in counter position. Wait for a safer opening."
  return "U Strike was not completed. Work on the three-part flow: valid first touch → stick goes under arm → second touch. Keep it continuous with no reset."
}

// ─── Full attempt analysis from tip history ───────────────────────────────────

export function analyzeUStrikeAttempt(
  attackerLm: any[],
  defenderLm: any[] | null,
  tipHistory: TipPoint[],
  opportunity: UStrikeOpportunity
): UStrikeAttemptResult {
  const { isU, isReverseU, pathClarity, durationMs } = analyzeUPath(tipHistory)
  const { rating: speedRating, note: speedNote } = rateUStrikeSpeed(durationMs)

  const tip = estimateStickTip(attackerLm)
  const defForearmY = defenderLm ? (defenderLm[14]?.y || defenderLm[13]?.y || 0.4) : 0.4
  const defChestY   = defenderLm ? ((defenderLm[11]?.y || 0) + (defenderLm[12]?.y || 0)) / 2 : 0.3
  const defStomachY = defenderLm ? ((defenderLm[23]?.y || 0) + (defenderLm[24]?.y || 0)) / 2 : 0.5

  // First touch target: infer from tip position at start of path
  const firstTip = tipHistory[0]
  let firstTouchTarget = 'Unknown'
  if (firstTip) {
    const dy = Math.abs(firstTip.y - defChestY)
    const dSt = Math.abs(firstTip.y - defStomachY)
    const dFa = Math.abs(firstTip.y - defForearmY)
    if (dy < dSt && dy < dFa)   firstTouchTarget = 'Chest'
    else if (dSt < dFa)          firstTouchTarget = 'Stomach'
    else                          firstTouchTarget = isU ? 'Right upper forearm' : 'Left upper forearm'
  }

  // First touch result: proximity at start of path
  const firstTouchLanded = tipHistory.length > 0 && opportunity.openTargets.length > 0
  const firstTouchResult: TouchResult = firstTouchLanded
    ? (pathClarity === 'Clear' ? 'Clean Touch' : 'Light Touch')
    : 'Missed Touch'

  // Second touch: infer from tip at end of path
  const lastTip = tipHistory[tipHistory.length - 1]
  const secondTouchTarget = isU ? 'Upper forearm' : isReverseU ? 'Left upper forearm' : 'Unknown'
  const secondTouchResult: TouchResult = (isU || isReverseU) && pathClarity !== 'None'
    ? (pathClarity === 'Clear' ? 'Clean Touch' : pathClarity === 'Partial' ? 'Light Touch' : 'Unclear Touch')
    : 'Missed Touch'

  // Final classification
  let finalResult: FinalResult
  if ((isU || isReverseU) && pathClarity === 'Clear' && firstTouchLanded && secondTouchResult !== 'Missed Touch') {
    finalResult = 'Successful U Strike'
  } else if (firstTouchLanded && (isU || isReverseU || pathClarity !== 'None')) {
    finalResult = 'Partial U Strike'
  } else {
    finalResult = 'Failed U Strike'
  }

  const coachingFeedback = generateUStrikeFeedback({
    firstTouchResult, pathClarity, secondTouchResult, speedRating, finalResult,
    counterRisk: opportunity.counterRisk,
  })

  return {
    detected: isU || isReverseU || firstTouchLanded,
    type: isU ? 'U_STRIKE' : isReverseU ? 'REVERSE_U_STRIKE' : 'NONE',
    firstTouchTarget, firstTouchResult,
    pathClarity, secondTouchTarget, secondTouchResult,
    speedRating, speedNote, finalResult, coachingFeedback,
  }
}

// ─── Canvas overlay drawing ───────────────────────────────────────────────────

export function drawUStrikeOverlay(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  attackerLm: any[],
  defenderLm: any[] | null,
  opportunity: UStrikeOpportunity,
  tipHistory: TipPoint[]
) {
  if (!attackerLm?.length) return

  const color = opportunity.overlayColor

  // Draw target zones
  if (opportunity.available && defenderLm?.length) {
    const defRS = defenderLm[12]; const defLS = defenderLm[11]
    const defRW = defenderLm[16]; const defLW = defenderLm[15]
    const defRH = defenderLm[24]; const defLH = defenderLm[23]

    const chestX = ((defRS?.x || 0) + (defLS?.x || 0)) / 2 * W
    const chestY = ((defRS?.y || 0) + (defLS?.y || 0)) / 2 * H
    const stomachX = ((defRH?.x || 0) + (defLH?.x || 0)) / 2 * W
    const stomachY = ((defRH?.y || 0) + (defLH?.y || 0)) / 2 * H

    const drawZone = (x: number, y: number, label: string, c: string) => {
      if (!x || !y) return
      ctx.save()
      ctx.beginPath(); ctx.arc(x, y, 20, 0, Math.PI * 2)
      ctx.strokeStyle = c; ctx.lineWidth = 2.5; ctx.globalAlpha = 0.8; ctx.stroke()
      ctx.fillStyle = c; ctx.globalAlpha = 0.2; ctx.fill()
      ctx.globalAlpha = 1; ctx.font = 'bold 9px sans-serif'; ctx.fillStyle = c
      const tw = ctx.measureText(label).width
      ctx.fillRect(x - tw / 2 - 3, y + 23, tw + 6, 13)
      ctx.fillStyle = '#000'; ctx.fillText(label, x - tw / 2, y + 32)
      ctx.restore()
    }

    opportunity.openTargets.forEach(t => {
      if (t === 'Chest')   drawZone(chestX, chestY, 'CHEST', color)
      if (t === 'Stomach') drawZone(stomachX, stomachY, 'STOMACH', color)
      if (t === 'Right forearm' && defRW) drawZone(defRW.x * W, defRW.y * H, 'R.FOREARM', color)
      if (t === 'Left forearm'  && defLW) drawZone(defLW.x * W, defLW.y * H, 'L.FOREARM', color)
    })

    // Draw U-shaped path arrow from attacker's tip to target zone
    const tip = estimateStickTip(attackerLm)
    if (tip && opportunity.openTargets.length > 0) {
      const startX = tip.x * W; const startY = tip.y * H
      const endX = opportunity.type === 'REVERSE_U_STRIKE' ? (defLW?.x || defLS?.x || 0.5) * W : chestX
      const endY = chestY
      const ctrlX = (startX + endX) / 2
      const ctrlY = Math.max(startY, endY) + H * 0.12  // curve goes DOWN (under arm)

      ctx.save()
      ctx.beginPath()
      ctx.moveTo(startX, startY)
      ctx.quadraticCurveTo(ctrlX, ctrlY, endX, endY)
      ctx.strokeStyle = opportunity.type === 'REVERSE_U_STRIKE' ? '#a855f7' : '#00d4ff'
      ctx.lineWidth = 3; ctx.setLineDash([8, 5]); ctx.globalAlpha = 0.85; ctx.stroke()
      ctx.setLineDash([]); ctx.globalAlpha = 1

      // Arrowhead at end
      const angle = Math.atan2(endY - ctrlY, endX - ctrlX)
      ctx.fillStyle = opportunity.type === 'REVERSE_U_STRIKE' ? '#a855f7' : '#00d4ff'
      ctx.translate(endX, endY); ctx.rotate(angle)
      ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(-12,-6); ctx.lineTo(-12,6)
      ctx.closePath(); ctx.fill()
      ctx.restore()
    }
  }

  // Draw tip trajectory trail
  if (tipHistory.length > 1) {
    ctx.save()
    ctx.setLineDash([4, 4])
    ctx.strokeStyle = '#f59e0b'; ctx.lineWidth = 2; ctx.globalAlpha = 0.6
    ctx.beginPath()
    ctx.moveTo(tipHistory[0].x * W, tipHistory[0].y * H)
    tipHistory.slice(1).forEach(p => ctx.lineTo(p.x * W, p.y * H))
    ctx.stroke()
    ctx.setLineDash([]); ctx.globalAlpha = 1
    ctx.restore()
  }

  // Suggestion banner on video canvas
  const bannerText = opportunity.counterRisk === 'HIGH'
    ? `⚠ ${opportunity.warning || "COUNTER RISK — DON'T TRY"}`
    : opportunity.available
    ? `✦ ${opportunity.suggestion}`
    : ''

  if (bannerText) {
    ctx.save()
    ctx.font = 'bold 12px sans-serif'
    const tw = ctx.measureText(bannerText).width
    const bx = W / 2 - tw / 2 - 10; const by = 10
    ctx.fillStyle = '#000'; ctx.globalAlpha = 0.65
    ctx.roundRect ? ctx.roundRect(bx, by, tw + 20, 26, 6) : ctx.fillRect(bx, by, tw + 20, 26)
    ctx.fill()
    ctx.fillStyle = color; ctx.globalAlpha = 1
    ctx.fillText(bannerText, bx + 10, by + 18)
    ctx.restore()
  }
}
