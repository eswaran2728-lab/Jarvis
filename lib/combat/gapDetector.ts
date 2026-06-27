export type GapState = {
  gapType: 'LEFT' | 'RIGHT' | 'CENTER' | 'NONE'
  opponentStickPosition: 'HIGH' | 'MIDDLE' | 'LOW'
  bestRecommendation: { technique: string } | null
}

export function detectGap(landmarks: any[], prevLandmarks: any[]): GapState {
  if (!landmarks.length) return { gapType: 'NONE', opponentStickPosition: 'MIDDLE', bestRecommendation: null }
  const noise = Math.random()
  const gapType = noise > 0.6 ? 'LEFT' : noise > 0.4 ? 'RIGHT' : 'NONE'
  return {
    gapType,
    opponentStickPosition: noise > 0.5 ? 'HIGH' : 'MIDDLE',
    bestRecommendation: gapType !== 'NONE' ? { technique: gapType === 'LEFT' ? 'ZIP' : 'SLIDE' } : null,
  }
}
