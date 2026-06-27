export type RetreatState = {
  retreatDetected: boolean
  result: 'clean' | 'late' | 'blocked' | null
}

export function detectRetreat(p1Lm: any[], p2Lm: any[], prevLm: any[]): RetreatState {
  const detected = Math.random() > 0.85
  return { retreatDetected: detected, result: detected ? 'late' : null }
}
