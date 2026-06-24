// ORION Skill Library — Data Types
// Ready for Supabase migration: replace localStorage store with Supabase client

export type SkillClip = {
  id: string
  title: string
  originalVideoName: string
  originalVideoUrl?: string
  clipUrl?: string
  animationUrl?: string
  timestampStart: string
  timestampEnd: string
  category:
    | 'combat'
    | 'attack'
    | 'defense'
    | 'counter_attack'
    | 'footwork'
    | 'distance'
    | 'ring_control'
    | 'mistake_correction'
    | 'thanithiramai'
    | 'kuthuvarisai'
    | 'sandai_murai'
  skillType: string
  fighterAAction: string
  fighterBAction: string
  attackDescription: string
  defenseDescription: string
  counterAttackSuggestion: string
  footworkExplanation: string
  mistakeDetected: string
  correctSolution: string
  coachNote: string
  ruleDecision: string
  pointDecision: string
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  tags: string[]
  savedFolder: string
  createdAt: string
  // Animation metadata (populated by pose detection — TODO: connect real AI)
  poseKeyframes?: PoseKeyframe[]
  attackDirection?: 'left' | 'right' | 'overhead' | 'low' | 'thrust'
  impactZone?: 'head' | 'body' | 'legs' | 'arm' | 'stick'
  reactionTimeMs?: number
}

export type PoseKeyframe = {
  frameIndex: number
  timestampMs: number
  // Normalized 0-1 fighter positions
  fighterA: StickFigure
  fighterB: StickFigure
  phase: 'ready' | 'attack' | 'impact' | 'defense' | 'counter' | 'reset'
}

export type StickFigure = {
  x: number; y: number          // center position
  headAngle: number             // degrees
  armAngle: number
  legSpread: number
  stickAngle: number
  stickLength: number
  highlight?: boolean
}

export type VideoAnalysisSession = {
  id: string
  videoName: string
  videoUrl: string
  uploadedAt: string
  status: 'uploaded' | 'analyzing' | 'completed' | 'failed'
  totalClipsDetected: number
  categoriesDetected: string[]
  summary: string
  clips: SkillClip[]
}

export type SkillFolder = {
  id: string
  name: string
  category: SkillClip['category']
  icon: string
  color: string
  description: string
  clipCount?: number
}

// A reference clip is a short analyzed clip saved as a teaching example
// ORION uses these to suggest relevant past clips when new videos are uploaded
export type ReferenceClip = {
  id: string
  title: string
  videoName: string
  snapshot: string          // base64 JPEG thumbnail
  createdAt: string
  techniques: string[]      // detected technique names
  playerCount: number       // how many players detected
  pros: string[]            // what was done well
  cons: string[]            // what needs improvement
  coachTip: string          // ORION's main coaching point
  tags: string[]            // searchable tags
  metrics: {
    avgScore: number
    avgBalance: number
    avgSpeed: number
    avgPower: number
  }
}

export const SKILL_FOLDERS: SkillFolder[] = [
  { id: 'combat',            name: 'Combat Skills',          category: 'combat',            icon: '⚔️',  color: '#00d4ff', description: 'Full combat exchanges, scoring moments, match scenarios' },
  { id: 'attack',            name: 'Attack Techniques',      category: 'attack',            icon: '🥢',  color: '#f97316', description: 'Strike types, directions, legal targets, attack patterns' },
  { id: 'defense',           name: 'Defense Techniques',     category: 'defense',           icon: '🛡️',  color: '#00ff88', description: 'Blocks, parries, evasions, retreats, guard positions' },
  { id: 'counter_attack',    name: 'Counter Attack',         category: 'counter_attack',    icon: '↩️',  color: '#a855f7', description: 'Counter openings, timing, angle-step counters, follow-ups' },
  { id: 'footwork',          name: 'Footwork Skills',        category: 'footwork',          icon: '🦶',  color: '#eab308', description: 'Kaaladi patterns, triangles, pivots, positioning drills' },
  { id: 'distance',          name: 'Distance Management',    category: 'distance',          icon: '📏',  color: '#06b6d4', description: 'Range control, closing distance, creating space, timing' },
  { id: 'ring_control',      name: 'Ring Control',           category: 'ring_control',      icon: '🔵',  color: '#3b82f6', description: 'Ring positioning, exit penalties, boundary awareness, angles' },
  { id: 'mistake_correction',name: 'Mistakes & Corrections', category: 'mistake_correction', icon: '❌', color: '#ef4444', description: 'Common errors, rule violations, technique corrections, solutions' },
  { id: 'thanithiramai',     name: 'Thanithiramai Skills',   category: 'thanithiramai',     icon: '⭐',  color: '#f59e0b', description: 'Individual specialty techniques, unique personal skills' },
  { id: 'kuthuvarisai',      name: 'Kuthuvarisai Skills',    category: 'kuthuvarisai',      icon: '🤜',  color: '#ec4899', description: 'Kuthuvarisai unarmed combat techniques combined with Silambam' },
  { id: 'sandai_murai',      name: 'Sandai Murai Skills',    category: 'sandai_murai',      icon: '🏆',  color: '#8b5cf6', description: 'Competition rules, match strategies, point systems, tactics' },
  { id: 'saved_animations',  name: 'Saved Animation Clips',  category: 'combat',            icon: '🎬',  color: '#14b8a6', description: 'All animation clips saved from video analysis sessions' },
]
