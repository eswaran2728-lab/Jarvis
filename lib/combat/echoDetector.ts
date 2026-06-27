export type EchoState = {
  echoDetected: boolean
  echoDirection: 'left' | 'right' | null
}

export function detectEchoCounter(p1Lm: any[], p2Lm: any[]): EchoState {
  const detected = Math.random() > 0.8
  return { echoDetected: detected, echoDirection: detected ? (Math.random() > 0.5 ? 'left' : 'right') : null }
}
