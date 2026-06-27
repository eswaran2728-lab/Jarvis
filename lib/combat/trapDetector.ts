export type TrapOpportunity = {
  trapAvailable: boolean
  suggestedFakeTarget: string | null
  suggestedRealTarget: string | null
}

export function detectTrapOpportunity(p1Lm: any[], p2Lm: any[]): TrapOpportunity {
  const available = Math.random() > 0.85
  return {
    trapAvailable: available,
    suggestedFakeTarget: available ? 'head' : null,
    suggestedRealTarget: available ? 'hand' : null,
  }
}
