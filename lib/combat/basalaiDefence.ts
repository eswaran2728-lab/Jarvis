export type TechniqueOpportunity = { technique: string }

export type BasalaiState = {
  defenceActive: boolean
  defenceType: string | null
  bestOpportunity: TechniqueOpportunity | null
}

export function detectActiveBasalaiDefence(p1Lm: any[], p2Lm: any[], prevLm: any[][]): BasalaiState {
  const active = Math.random() > 0.8
  return {
    defenceActive: active,
    defenceType: active ? 'Bavalai guard' : null,
    bestOpportunity: active ? { technique: 'COUNTER_TOUCH' } : null,
  }
}
