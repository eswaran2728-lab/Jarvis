import { fetchCoachMoment, SimpleCoachMoment } from './coachMomentBuilder'

export type ScanMoment = {
  id: string
  timestamp: number
  timeStr: string
  player: string
  type: SimpleCoachMoment['momentType']
  coach: SimpleCoachMoment
}

function fmtTime(s: number) {
  const m = Math.floor(s / 60)
  return `${m}:${Math.floor(s % 60).toString().padStart(2, '0')}`
}

export async function quickScan(
  video: HTMLVideoElement,
  p1Lm: () => any[],
  p2Lm: () => any[],
  onProgress: (pct: number) => void,
  stepSec = 4
): Promise<ScanMoment[]> {
  const duration = video.duration
  if (!duration) return []

  const results: ScanMoment[] = []
  const steps = Math.floor(duration / stepSec)

  for (let i = 0; i < steps; i++) {
    video.currentTime = i * stepSec
    await new Promise(r => setTimeout(r, 250))
    onProgress(Math.round(((i + 1) / steps) * 100))

    const lm1 = p1Lm(); const lm2 = p2Lm()
    const hasData = lm1.length > 0 || lm2.length > 0
    if (!hasData) continue

    // Only call API on every other step to keep it fast
    if (i % 2 !== 0) continue

    const t = i * stepSec
    try {
      const coach = await fetchCoachMoment({
        timestamp: fmtTime(t),
        player: 'Both',
        detectedTechniques: 'Auto scan',
      })
      results.push({
        id: `scan-${t}-${Math.random()}`,
        timestamp: t,
        timeStr: fmtTime(t),
        player: coach.player,
        type: coach.momentType,
        coach,
      })
    } catch { /* skip frame */ }
  }

  return results
}
