export type TrackingMode = 'pose' | 'movement' | 'manual'

export type PlayerFocus = {
  p1Index: number
  p2Index: number
  mode: TrackingMode
  confident: boolean
}

function bboxArea(lm: any[]): number {
  const vis = lm.filter(p => p && p.visibility > 0.3)
  if (vis.length < 2) return 0
  const xs = vis.map((p: any) => p.x)
  const ys = vis.map((p: any) => p.y)
  return (Math.max(...xs) - Math.min(...xs)) * (Math.max(...ys) - Math.min(...ys))
}

function centerX(lm: any[]): number {
  const vis = lm.filter(p => p && p.visibility > 0.3)
  if (!vis.length) return 0.5
  return vis.reduce((s: number, p: any) => s + p.x, 0) / vis.length
}

function isInsideZone(lm: any[], zone: { x: number; y: number; w: number; h: number; active: boolean }): boolean {
  if (!zone.active) return true
  const cx = centerX(lm)
  const vis = lm.filter(p => p && p.visibility > 0.3)
  const cy = vis.length ? vis.reduce((s: number, p: any) => s + p.y, 0) / vis.length : 0.5
  return cx >= zone.x && cx <= zone.x + zone.w && cy >= zone.y && cy <= zone.y + zone.h
}

export function autoFocusPlayers(
  allLandmarks: any[][],
  zone: { x: number; y: number; w: number; h: number; active: boolean }
): PlayerFocus {
  if (!allLandmarks.length) {
    return { p1Index: 0, p2Index: 1, mode: 'movement', confident: false }
  }

  const candidates = allLandmarks
    .map((lm, i) => ({ i, area: bboxArea(lm), cx: centerX(lm), inZone: isInsideZone(lm, zone) }))
    .filter(c => c.area > 0.001)
    .sort((a, b) => {
      if (a.inZone !== b.inZone) return a.inZone ? -1 : 1
      return b.area - a.area
    })

  if (candidates.length < 2) {
    const p1i = candidates[0]?.i ?? 0
    return { p1Index: p1i, p2Index: p1i, mode: 'pose', confident: false }
  }

  const top2 = candidates.slice(0, 2).sort((a, b) => a.cx - b.cx)
  return {
    p1Index: top2[0].i,
    p2Index: top2[1].i,
    mode: 'pose',
    confident: true,
  }
}

export function findClosestToClick(allLandmarks: any[][], nx: number, ny: number): number {
  let best = 0; let bestDist = Infinity
  allLandmarks.forEach((lm, i) => {
    const vis = lm.filter(p => p && p.visibility > 0.3)
    if (!vis.length) return
    const cx = vis.reduce((s: number, p: any) => s + p.x, 0) / vis.length
    const cy = vis.reduce((s: number, p: any) => s + p.y, 0) / vis.length
    const d = Math.hypot(cx - nx, cy - ny)
    if (d < bestDist) { bestDist = d; best = i }
  })
  return best
}
