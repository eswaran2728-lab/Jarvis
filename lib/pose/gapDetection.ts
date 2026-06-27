// Gap Detection — combat opening intelligence for ORION Silambam AI
// Gap is NOT a technique. It is the decision system that reads opponent stick during Bavalai.

export type GapType = 'UPPER_GAP' | 'LOWER_GAP' | 'NO_GAP'
export type StickPosition = 'HIGH' | 'MIDDLE' | 'LOW'
export type GapTiming = 'Perfect Timing' | 'Early' | 'Late' | 'Missed Gap' | 'Unsafe Timing'
export type GapCounterRisk = 'LOW' | 'MEDIUM' | 'HIGH'

export type GapRecommendation = {
  technique: string
  reason: string
  color: string
}

export type GapState = {
  detected: boolean
  gapType: GapType
  opponentStickPosition: StickPosition
  recommendations: GapRecommendation[]
  bestRecommendation: GapRecommendation | null
  counterRisk: GapCounterRisk
  distanceOk: boolean
  attackerBalanced: boolean
  timingWindow: boolean
  suggestion: string
  coachMessage: string
  overlayColor: string
}

// ─── Opponent stick position classifier ───────────────────────────────────────

export function classifyOpponentStick(defenderLm: any[]): StickPosition {
  if (!defenderLm || defenderLm.length < 17) return 'MIDDLE'

  const defRS = defenderLm[12]; const defLS = defenderLm[11]   // shoulders
  const defRH = defenderLm[24]; const defLH = defenderLm[23]   // hips
  const defRW = defenderLm[16]; const defLW = defenderLm[15]   // wrists

  if (!defRS || !defLS || !defRW || !defLW) return 'MIDDLE'

  const shoulderY = Math.min(defRS.y, defLS.y)
  const hipY = ((defRH?.y || 0.6) + (defLH?.y || 0.6)) / 2
  const wristY = Math.min(defRW.y, defLW.y)

  // HIGH: wrist above shoulder line (stick raised)
  if (wristY < shoulderY - 0.04) return 'HIGH'
  // LOW: wrist below hip midpoint (stick dropped)
  if (wristY > hipY + 0.04) return 'LOW'
  // MIDDLE: wrist in body zone
  return 'MIDDLE'
}

// ─── Gap detector ─────────────────────────────────────────────────────────────

export function detectGap(
  attackerLm: any[],
  defenderLm: any[] | null,
): GapState {
  const noGap: GapState = {
    detected: false, gapType: 'NO_GAP', opponentStickPosition: 'MIDDLE',
    recommendations: [], bestRecommendation: null,
    counterRisk: 'HIGH', distanceOk: false, attackerBalanced: false,
    timingWindow: false,
    suggestion: 'No safe Gap. Continue Bavalai.',
    coachMessage: 'No safe Gap.',
    overlayColor: '#f97316',
  }

  if (!defenderLm || defenderLm.length < 17) return noGap

  const atkNose = attackerLm[0]; const defNose = defenderLm[0]
  if (!atkNose || !defNose) return noGap

  // Distance
  const dx = atkNose.x - defNose.x; const dy = atkNose.y - defNose.y
  const dist = Math.sqrt(dx * dx + dy * dy)
  const distanceOk = dist < 0.65

  // Attacker balance: both hips visible and roughly level
  const atkRH = attackerLm[24]; const atkLH = attackerLm[23]
  const attackerBalanced = atkRH && atkLH ? Math.abs(atkRH.y - atkLH.y) < 0.15 : true

  const stickPos = classifyOpponentStick(defenderLm)

  // Opponent guard analysis
  const defRS = defenderLm[12]; const defLS = defenderLm[11]
  const defRW = defenderLm[16]; const defLW = defenderLm[15]
  const shoulderY = defRS && defLS ? Math.min(defRS.y, defLS.y) : 0.4
  const wristY = defRW && defLW ? Math.min(defRW.y, defLW.y) : 0.5
  const centerlineProtected = defRW && defLW
    ? Math.abs((defRW.x + defLW.x) / 2 - ((defRS?.x || 0.5 + defLS?.x || 0.5) / 2)) < 0.12
    : false

  const defStickMoving = defRW && defLW
    ? Math.min(defRW.visibility || 0, defLW.visibility || 0) > 0.6
    : false

  const counterRisk: GapCounterRisk = centerlineProtected && defStickMoving
    ? 'HIGH' : distanceOk && !centerlineProtected ? 'LOW' : 'MEDIUM'

  if (!distanceOk) return { ...noGap, opponentStickPosition: stickPos, distanceOk: false, attackerBalanced }

  const recommendations: GapRecommendation[] = []

  if (stickPos === 'LOW') {
    // Upper body is open
    const gapState: GapState = {
      detected: true, gapType: 'UPPER_GAP', opponentStickPosition: stickPos,
      recommendations: [], bestRecommendation: null,
      counterRisk, distanceOk, attackerBalanced,
      timingWindow: !centerlineProtected,
      suggestion: 'Upper Gap detected. Attack upper body now.',
      coachMessage: 'Upper Gap detected.',
      overlayColor: counterRisk === 'LOW' ? '#00ff88' : '#f59e0b',
    }

    // Check chest line (usi)
    if (!centerlineProtected) {
      recommendations.push({ technique: 'Usi', reason: 'Chest line open — inject instantly', color: '#00d4ff' })
    }
    // Shoulders (hook)
    if (defRS && defLS && wristY > shoulderY + 0.06) {
      recommendations.push({ technique: 'Hook', reason: 'Shoulder line exposed', color: '#00d4ff' })
      recommendations.push({ technique: 'Reverse Hook', reason: 'Shoulder from opposite direction', color: '#a855f7' })
    }
    // Underarm (U Strike)
    recommendations.push({ technique: 'U Strike', reason: 'Forearm/underarm gap available', color: '#00d4ff' })
    recommendations.push({ technique: 'Reverse U Strike', reason: 'Reverse underarm gap', color: '#a855f7' })

    gapState.recommendations = recommendations
    gapState.bestRecommendation = recommendations[0] || null
    if (gapState.bestRecommendation) {
      gapState.suggestion = `Upper Gap: ${gapState.bestRecommendation.technique} recommended.`
    }
    return gapState
  }

  if (stickPos === 'HIGH') {
    // Lower body is open
    const recommendations: GapRecommendation[] = [
      { technique: 'Sweep', reason: 'Outer calf/thigh exposed — stick is high', color: '#00ff88' },
    ]
    return {
      detected: true, gapType: 'LOWER_GAP', opponentStickPosition: stickPos,
      recommendations, bestRecommendation: recommendations[0],
      counterRisk, distanceOk, attackerBalanced,
      timingWindow: true,
      suggestion: 'Lower Gap: Sweep recommended. Outer calf or thigh exposed.',
      coachMessage: 'Lower Gap detected.',
      overlayColor: counterRisk === 'LOW' ? '#00ff88' : '#f59e0b',
    }
  }

  // MIDDLE — no clear gap
  return {
    ...noGap, opponentStickPosition: stickPos, distanceOk, attackerBalanced,
    counterRisk,
    suggestion: centerlineProtected
      ? 'Do not attack. Counter risk high.'
      : 'No safe Gap. Wait for stick to move.',
    coachMessage: 'No safe Gap.',
  }
}

// ─── Canvas overlay ───────────────────────────────────────────────────────────

export function drawGapOverlay(
  ctx: CanvasRenderingContext2D,
  W: number, H: number,
  defenderLm: any[] | null,
  gapState: GapState,
): void {
  if (!gapState.detected || !defenderLm) return
  const color = gapState.overlayColor

  const defRS = defenderLm[12]; const defLS = defenderLm[11]
  const defRH = defenderLm[24]; const defLH = defenderLm[23]
  const defRK = defenderLm[26]; const defLK = defenderLm[25]

  if (gapState.gapType === 'UPPER_GAP' && defRS && defLS) {
    // Highlight upper body zone
    const uX = ((defRS.x + defLS.x) / 2) * W
    const uY = ((defRS.y + defLS.y) / 2) * H
    ctx.save()
    ctx.beginPath(); ctx.arc(uX, uY, 30, 0, Math.PI * 2)
    ctx.strokeStyle = color; ctx.lineWidth = 2.5; ctx.globalAlpha = 0.65; ctx.stroke()
    ctx.fillStyle = color; ctx.globalAlpha = 0.12; ctx.fill()
    ctx.globalAlpha = 1; ctx.restore()

    // Stick position marker
    ctx.save()
    ctx.font = 'bold 10px sans-serif'; ctx.fillStyle = '#00d4ff'; ctx.globalAlpha = 0.9
    ctx.fillText('STICK LOW', uX - 24, uY - 38)
    ctx.globalAlpha = 1; ctx.restore()
  }

  if (gapState.gapType === 'LOWER_GAP' && defRK && defLK) {
    // Highlight lower body zone
    const lX = ((defRK.x + defLK.x) / 2) * W
    const lY = ((defRK.y + defLK.y) / 2 + 0.08) * H
    ctx.save()
    ctx.beginPath(); ctx.arc(lX, lY, 28, 0, Math.PI * 2)
    ctx.strokeStyle = '#00ff88'; ctx.lineWidth = 2.5; ctx.globalAlpha = 0.65; ctx.stroke()
    ctx.fillStyle = '#00ff88'; ctx.globalAlpha = 0.12; ctx.fill()
    ctx.globalAlpha = 1; ctx.restore()

    ctx.save()
    ctx.font = 'bold 10px sans-serif'; ctx.fillStyle = '#00ff88'; ctx.globalAlpha = 0.9
    ctx.fillText('STICK HIGH', lX - 26, lY + 44)
    ctx.globalAlpha = 1; ctx.restore()
  }

  // Gap type banner (right side, avoid collision with Bavalai)
  if (gapState.bestRecommendation) {
    const label = `GAP → ${gapState.bestRecommendation.technique.toUpperCase()}`
    ctx.save()
    ctx.font = 'bold 11px sans-serif'
    const tw = ctx.measureText(label).width
    ctx.fillStyle = color; ctx.globalAlpha = 0.85
    ctx.fillRect(W - tw - 26, 8, tw + 16, 22)
    ctx.fillStyle = '#000'; ctx.globalAlpha = 1
    ctx.fillText(label, W - tw - 18, 23)
    ctx.restore()
  }
}
