export type LockedPlayer = {
  id: 'P1' | 'P2'
  label: 'Red P1' | 'Blue P2'
  color: '#ef4444' | '#3b82f6'
  landmarkIndex: number  // index in the landmarks array from MediaPipe
  bbox: { x: number; y: number; w: number; h: number }  // normalised 0-1
  confidence: number
  locked: boolean
}

export type CombatZone = {
  x: number; y: number; w: number; h: number  // normalised 0-1
  active: boolean
}

export function computeBbox(landmarks: any[]): { x: number; y: number; w: number; h: number } {
  let minX = 1, minY = 1, maxX = 0, maxY = 0
  for (const lm of landmarks) {
    if ((lm.visibility ?? 1) < 0.3) continue
    if (lm.x < minX) minX = lm.x
    if (lm.y < minY) minY = lm.y
    if (lm.x > maxX) maxX = lm.x
    if (lm.y > maxY) maxY = lm.y
  }
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY }
}

export function bboxArea(bbox: { w: number; h: number }) {
  return bbox.w * bbox.h
}

export function bboxCenterX(bbox: { x: number; w: number }) {
  return bbox.x + bbox.w / 2
}

export function isInsideCombatZone(bbox: { x: number; y: number; w: number; h: number }, zone: CombatZone): boolean {
  if (!zone.active) return true
  const cx = bbox.x + bbox.w / 2
  const cy = bbox.y + bbox.h / 2
  return cx >= zone.x && cx <= zone.x + zone.w && cy >= zone.y && cy <= zone.y + zone.h
}

export function autoSelectPlayers(allLandmarks: any[][], zone: CombatZone): { p1Idx: number; p2Idx: number } | null {
  if (allLandmarks.length < 2) return null

  // Score each person: area (bigger = closer) + inside zone bonus
  const scored = allLandmarks.map((lm, idx) => {
    const bbox = computeBbox(lm)
    const area = bboxArea(bbox)
    const inZone = isInsideCombatZone(bbox, zone)
    return { idx, area, bbox, inZone }
  })

  // Sort by zone first, then area descending
  scored.sort((a, b) => {
    if (a.inZone !== b.inZone) return a.inZone ? -1 : 1
    return b.area - a.area
  })

  const top2 = scored.slice(0, 2)
  if (top2.length < 2) return null

  // Assign: left-most center X = P1 (Red), right = P2 (Blue)
  const [a, b] = top2
  if (bboxCenterX(a.bbox) <= bboxCenterX(b.bbox)) {
    return { p1Idx: a.idx, p2Idx: b.idx }
  } else {
    return { p1Idx: b.idx, p2Idx: a.idx }
  }
}

export function buildLockedPlayers(allLandmarks: any[][], p1Idx: number, p2Idx: number): LockedPlayer[] {
  const p1Bbox = computeBbox(allLandmarks[p1Idx])
  const p2Bbox = computeBbox(allLandmarks[p2Idx])
  return [
    { id: 'P1', label: 'Red P1', color: '#ef4444', landmarkIndex: p1Idx, bbox: p1Bbox, confidence: 0.85, locked: true },
    { id: 'P2', label: 'Blue P2', color: '#3b82f6', landmarkIndex: p2Idx, bbox: p2Bbox, confidence: 0.85, locked: true },
  ]
}

export function findClosestPersonToClick(
  allLandmarks: any[][], clickX: number, clickY: number
): number {
  let best = 0, bestDist = Infinity
  allLandmarks.forEach((lm, i) => {
    const bbox = computeBbox(lm)
    const cx = bbox.x + bbox.w / 2
    const cy = bbox.y + bbox.h / 2
    const d = Math.sqrt((cx - clickX) ** 2 + (cy - clickY) ** 2)
    if (d < bestDist) { bestDist = d; best = i }
  })
  return best
}
