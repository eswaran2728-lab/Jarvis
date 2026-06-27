export type SlideState = {
  slideAvailable: boolean
}

export function detectSlide(p1Lm: any[], p2Lm: any[]): SlideState {
  return { slideAvailable: Math.random() > 0.8 }
}
