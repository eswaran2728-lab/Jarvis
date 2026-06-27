export type MomentCategory = 'attack' | 'defence' | 'counter_attack' | 'footwork' | 'mistake' | 'custom'

export type SavedCombatMoment = {
  id: string
  sourceVideoId: string
  sourceVideoName: string
  timestamp: number
  clipStart: number
  clipEnd: number
  player: 'Red P1' | 'Blue P2' | 'Both'
  category: MomentCategory
  customName: string
  isReference: boolean
  simpleNote: {
    whatHappened: string
    fix?: string
    counter?: string
    skill?: string
  }
  advancedNote?: {
    stickSpeed?: string
    confidence?: number
    targetZone?: string
    footworkType?: string
    technicalNote?: string
  }
  relatedSkills: string[]
  createdAt: string
}

const STORAGE_KEY = 'orion_saved_combat_moments'

function readAll(): SavedCombatMoment[] {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
  } catch { return [] }
}

function writeAll(moments: SavedCombatMoment[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(moments))
}

export function getSavedMoments(): SavedCombatMoment[] {
  return readAll().sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
}

export function saveCombatMoment(moment: Omit<SavedCombatMoment, 'id' | 'createdAt'>): SavedCombatMoment {
  const saved: SavedCombatMoment = {
    ...moment,
    id: `cm_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    createdAt: new Date().toISOString(),
  }
  writeAll([...readAll(), saved])
  return saved
}

export function deleteSavedMoment(id: string) {
  writeAll(readAll().filter(m => m.id !== id))
}

export function updateSavedMoment(id: string, updates: Partial<SavedCombatMoment>) {
  writeAll(readAll().map(m => m.id === id ? { ...m, ...updates } : m))
}

export function getMomentsByCategory(category: MomentCategory): SavedCombatMoment[] {
  return getSavedMoments().filter(m => m.category === category)
}

export function searchSavedMoments(query: string): SavedCombatMoment[] {
  const q = query.toLowerCase()
  return getSavedMoments().filter(m =>
    m.customName.toLowerCase().includes(q) ||
    m.player.toLowerCase().includes(q) ||
    m.simpleNote.whatHappened.toLowerCase().includes(q) ||
    m.relatedSkills.some(s => s.toLowerCase().includes(q))
  )
}

export function suggestCategory(momentType: string, action: string): MomentCategory {
  const a = action.toLowerCase()
  if (momentType === 'good_action') {
    if (a.includes('attack') || a.includes('strike') || a.includes('zip') || a.includes('touch')) return 'attack'
    if (a.includes('defend') || a.includes('block') || a.includes('guard') || a.includes('bavalai')) return 'defence'
    if (a.includes('counter')) return 'counter_attack'
    if (a.includes('footwork') || a.includes('step') || a.includes('retreat') || a.includes('slide')) return 'footwork'
  }
  if (momentType === 'mistake') return 'mistake'
  if (momentType === 'counter') return 'counter_attack'
  return 'custom'
}
