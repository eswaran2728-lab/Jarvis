export type EmergencyBlockState = {
  blockDetected: boolean
}

export function detectEmergencyBlock(p1Lm: any[], p2Lm: any[]): EmergencyBlockState {
  return { blockDetected: Math.random() > 0.9 }
}
