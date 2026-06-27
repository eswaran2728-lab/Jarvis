export type ZipState = {
  zipAvailable: boolean
}

export function detectZip(p1Lm: any[], p2Lm: any[]): ZipState {
  return { zipAvailable: Math.random() > 0.8 }
}
