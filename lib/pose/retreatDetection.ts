// Retreat Detection — global combat recovery for ORION Silambam AI
// Retreat = immediate backward movement after scoring/attacking — applies to ALL techniques

export type RetreatResult = 'Clean Retreat' | 'Partial Retreat' | 'No Retreat' | 'Too Slow'
export type RetreatStickStatus = 'Active' | 'Dropped' | 'Static'
export type RetreatBalanceStatus = 'Balanced' | 'Off Balance' | 'Unknown'

export type RetreatState = {
  retreating: boolean
  speed: 'Immediate' | 'Fast' | 'Moderate' | 'Too Slow' | 'None'
  stickStatus: RetreatStickStatus
  balance: RetreatBalanceStatus
  returnedToBavalai: boolean
  result: RetreatResult
  coachingFeedback: string
  overlayColor: string
}

// ─── Retreat detector ─────────────────────────────────────────────────────────

export function detectRetreat(
  attackerLm: any[],
  prevAttackerLm: any[] | null,
  defenderLm: any[] | null,
  wristSpeedHistory: number[],   // recent wrist speeds (to detect post-attack)
  bavalaiActive: boolean,
): RetreatState {
  const noRetreat: RetreatState = {
    retreating: false, speed: 'None', stickStatus: 'Static',
    balance: 'Unknown', returnedToBavalai: false,
    result: 'No Retreat', coachingFeedback: '',
    overlayColor: '#64748b',
  }

  if (!prevAttackerLm) return noRetreat

  const atkNose = attackerLm[0]; const prevNose = prevAttackerLm[0]
  const defNose = defenderLm?.[0]
  if (!atkNose || !prevNose) return noRetreat

  // Hip center movement: retreating = moving away from defender
  const atkRH = attackerLm[24]; const atkLH = attackerLm[23]
  const prevRH = prevAttackerLm[24]; const prevLH = prevAttackerLm[23]

  let retreating = false
  let retreatSpeed = 0

  if (atkRH && atkLH && prevRH && prevLH && defNose) {
    const currHipCenterX = (atkRH.x + atkLH.x) / 2
    const prevHipCenterX = (prevRH.x + prevLH.x) / 2
    const hipDx = currHipCenterX - prevHipCenterX
    const defDir = Math.sign(defNose.x - currHipCenterX)   // direction toward defender
    retreating = Math.sign(hipDx) !== defDir && Math.abs(hipDx) > 0.008
    retreatSpeed = Math.abs(hipDx)
  } else {
    // Fallback: use nose movement
    const noseDx = atkNose.x - prevNose.x
    const defDir = defNose ? Math.sign(defNose.x - atkNose.x) : 0
    retreating = Math.sign(noseDx) !== defDir && Math.abs(noseDx) > 0.005
    retreatSpeed = Math.abs(noseDx)
  }

  if (!retreating) return noRetreat

  // Speed classification
  const speed: RetreatState['speed'] = retreatSpeed > 0.04 ? 'Immediate'
    : retreatSpeed > 0.025 ? 'Fast'
    : retreatSpeed > 0.01 ? 'Moderate'
    : 'Too Slow'

  // Stick status during retreat
  const atkRW = attackerLm[16]; const atkLW = attackerLm[15]
  const prevRW = prevAttackerLm[16]; const prevLW = prevAttackerLm[15]
  let stickStatus: RetreatStickStatus = 'Static'
  if (atkRW && prevRW) {
    const wristSpeed = Math.sqrt(Math.pow(atkRW.x - prevRW.x, 2) + Math.pow(atkRW.y - prevRW.y, 2))
    stickStatus = wristSpeed > 0.02 ? 'Active' : wristSpeed > 0.005 ? 'Static' : 'Dropped'
  }

  // Balance during retreat
  const balance: RetreatBalanceStatus = atkRH && atkLH
    ? Math.abs(atkRH.y - atkLH.y) < 0.12 ? 'Balanced' : 'Off Balance'
    : 'Unknown'

  const returnedToBavalai = bavalaiActive && stickStatus === 'Active'

  // Result
  let result: RetreatResult
  if (speed === 'Immediate' || speed === 'Fast') {
    result = stickStatus === 'Active' ? 'Clean Retreat' : 'Partial Retreat'
  } else if (speed === 'Moderate') {
    result = 'Partial Retreat'
  } else {
    result = 'Too Slow'
  }

  // Coaching
  let coachingFeedback = ''
  if (result === 'Clean Retreat') coachingFeedback = 'Excellent retreat. Immediate withdrawal with stick active.'
  else if (stickStatus !== 'Active') coachingFeedback = 'Retreating but stick dropped. Keep Bavalai active during retreat — never drop the stick.'
  else if (speed === 'Too Slow' || speed === 'Moderate') coachingFeedback = 'Retreat too slow. After every attack, step back IMMEDIATELY before opponent can counter.'
  else if (balance === 'Off Balance') coachingFeedback = 'Retreating off balance. Stay balanced — drop your weight and keep both hips level.'
  else coachingFeedback = 'Good retreat. Maintain stick activity while re-establishing Bavalai.'

  return {
    retreating, speed, stickStatus, balance, returnedToBavalai,
    result, coachingFeedback,
    overlayColor: result === 'Clean Retreat' ? '#00ff88' : result === 'Partial Retreat' ? '#f59e0b' : '#f97316',
  }
}

// ─── Canvas overlay ───────────────────────────────────────────────────────────

export function drawRetreatOverlay(
  ctx: CanvasRenderingContext2D,
  W: number, H: number,
  attackerLm: any[],
  retreatState: RetreatState,
): void {
  if (!retreatState.retreating) return

  const color = retreatState.overlayColor
  const atkNose = attackerLm[0]

  // Direction arrow showing retreat movement
  if (atkNose) {
    const aX = atkNose.x * W; const aY = atkNose.y * H
    ctx.save()
    ctx.beginPath()
    ctx.moveTo(aX, aY)
    ctx.lineTo(aX - 40, aY)
    ctx.strokeStyle = color; ctx.lineWidth = 3; ctx.globalAlpha = 0.75; ctx.stroke()
    // Arrowhead
    ctx.beginPath(); ctx.moveTo(aX - 40, aY)
    ctx.lineTo(aX - 30, aY - 8); ctx.lineTo(aX - 30, aY + 8); ctx.closePath()
    ctx.fillStyle = color; ctx.globalAlpha = 0.75; ctx.fill()
    ctx.globalAlpha = 1; ctx.restore()
  }

  // Speed badge
  ctx.save()
  ctx.font = 'bold 10px sans-serif'
  const label = `RETREAT — ${retreatState.speed.toUpperCase()}`
  const tw = ctx.measureText(label).width
  ctx.fillStyle = color; ctx.globalAlpha = 0.85
  ctx.fillRect(8, H - 62, tw + 16, 20)
  ctx.fillStyle = '#000'; ctx.globalAlpha = 1
  ctx.fillText(label, 16, H - 48)
  ctx.restore()

  // Stick warning if dropped
  if (retreatState.stickStatus !== 'Active') {
    ctx.save()
    ctx.font = 'bold 10px sans-serif'
    const warn = 'KEEP STICK ACTIVE'
    const ww = ctx.measureText(warn).width
    ctx.fillStyle = '#f97316'; ctx.globalAlpha = 0.88
    ctx.fillRect(8, H - 38, ww + 16, 20)
    ctx.fillStyle = '#000'; ctx.globalAlpha = 1
    ctx.fillText(warn, 16, H - 24)
    ctx.restore()
  }
}
