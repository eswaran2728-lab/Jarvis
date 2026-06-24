'use client'
// ORION Skill Library Store — localStorage
// TODO: Replace with Supabase client for persistent cloud storage

import { SkillClip, VideoAnalysisSession, ReferenceClip } from '@/types/skillLibrary'
import { MOCK_CLIPS, MOCK_SESSION } from './mockData'

const CLIPS_KEY = 'orion_skill_clips'
const SESSIONS_KEY = 'orion_sessions'
const INITIALIZED_KEY = 'orion_library_initialized'
const REF_CLIPS_KEY = 'orion_reference_clips'

function isClient() { return typeof window !== 'undefined' }

export function initializeLibrary() {
  if (!isClient()) return
  if (localStorage.getItem(INITIALIZED_KEY)) return
  localStorage.setItem(CLIPS_KEY, JSON.stringify(MOCK_CLIPS))
  localStorage.setItem(SESSIONS_KEY, JSON.stringify([MOCK_SESSION]))
  localStorage.setItem(INITIALIZED_KEY, 'true')
}

export function getAllClips(): SkillClip[] {
  if (!isClient()) return MOCK_CLIPS
  try {
    const raw = localStorage.getItem(CLIPS_KEY)
    return raw ? JSON.parse(raw) : MOCK_CLIPS
  } catch { return MOCK_CLIPS }
}

export function getClipsByCategory(category: string): SkillClip[] {
  return getAllClips().filter(c => c.category === category)
}

export function getSessions(): VideoAnalysisSession[] {
  if (!isClient()) return [MOCK_SESSION]
  try {
    const raw = localStorage.getItem(SESSIONS_KEY)
    return raw ? JSON.parse(raw) : [MOCK_SESSION]
  } catch { return [MOCK_SESSION] }
}

export function saveClips(clips: SkillClip[]) {
  if (!isClient()) return
  const existing = getAllClips()
  const merged = [...existing, ...clips]
  localStorage.setItem(CLIPS_KEY, JSON.stringify(merged))
}

export function saveSession(session: VideoAnalysisSession) {
  if (!isClient()) return
  const existing = getSessions()
  localStorage.setItem(SESSIONS_KEY, JSON.stringify([session, ...existing]))
}

export function deleteClip(id: string) {
  if (!isClient()) return
  const clips = getAllClips().filter(c => c.id !== id)
  localStorage.setItem(CLIPS_KEY, JSON.stringify(clips))
}

export function searchClips(query: string, category?: string): SkillClip[] {
  const q = query.toLowerCase()
  return getAllClips().filter(c => {
    const matchCat = !category || category === 'all' || c.category === category
    const matchQ = !q || [c.title, c.skillType, c.attackDescription, c.tags.join(' '),
      c.fighterAAction, c.fighterBAction, c.coachNote].some(f => f.toLowerCase().includes(q))
    return matchCat && matchQ
  })
}

// TODO: Connect to real AI video analysis pipeline
// Future: upload video → extract frames → MediaPipe pose → detect exchanges → auto-generate SkillClips
export async function analyzeVideoMock(
  videoFile: File,
  onProgress: (pct: number, msg: string) => void
): Promise<VideoAnalysisSession> {
  const stages = [
    [10, 'Reading video metadata...'],
    [20, 'Loading ORION AI models...'],
    [35, 'Scanning for fighter positions...'],
    [50, 'Detecting attack sequences...'],
    [65, 'Identifying defense patterns...'],
    [75, 'Extracting key exchanges...'],
    [85, 'Generating animation previews...'],
    [92, 'Writing coaching notes...'],
    [98, 'Saving to Skill Library...'],
    [100, 'Analysis complete!'],
  ] as [number, string][]

  for (const [pct, msg] of stages) {
    await new Promise(r => setTimeout(r, 400 + Math.random() * 300))
    onProgress(pct, msg)
  }

  // Generate clips based on video filename and duration
  const videoUrl = URL.createObjectURL(videoFile)
  const baseClips: SkillClip[] = [
    {
      id: `clip-${Date.now()}-1`,
      title: `Attack Exchange — ${videoFile.name}`,
      originalVideoName: videoFile.name,
      originalVideoUrl: videoUrl,
      timestampStart: '00:05', timestampEnd: '00:11',
      category: 'attack', skillType: 'Veechu Strike',
      fighterAAction: 'Right diagonal overhead strike', fighterBAction: 'Late block response',
      attackDescription: 'ORION detected diagonal attack pattern with full shoulder rotation.',
      defenseDescription: 'Block response was delayed by ~0.3 seconds. Stick angle sub-optimal.',
      counterAttackSuggestion: 'Pivot outside, parry outward, counter to body zone with both hands.',
      footworkExplanation: 'Both fighters in static stance. Neither used angular footwork during exchange.',
      mistakeDetected: 'Defender used linear backward retreat. No angle change.',
      correctSolution: 'Angle-step 45° outside. Removes target and creates counter lane.',
      coachNote: 'ORION recommends 20 minutes of Kaaladi drill before next sparring session.',
      ruleDecision: 'Exchange legal. No contact scored.', pointDecision: 'No point',
      difficulty: 'intermediate', tags: ['attack', 'diagonal', 'counter opportunity'],
      savedFolder: 'Attack Techniques', createdAt: new Date().toISOString(),
      attackDirection: 'right', impactZone: 'body', reactionTimeMs: 310,
      poseKeyframes: MOCK_CLIPS[0].poseKeyframes,
    },
    {
      id: `clip-${Date.now()}-2`,
      title: `Defense Pattern — ${videoFile.name}`,
      originalVideoName: videoFile.name,
      originalVideoUrl: videoUrl,
      timestampStart: '00:18', timestampEnd: '00:24',
      category: 'defense', skillType: 'Block and Recover',
      fighterAAction: 'Double attack combination — high then low', fighterBAction: 'Single block only — missed low attack',
      attackDescription: 'Fighter A uses high-low combination. Common pattern when opponent guard is fixed high.',
      defenseDescription: 'Fighter B blocked high attack successfully but did not adjust guard for low follow-up.',
      counterAttackSuggestion: 'After blocking high: immediately drop stick tip to cover low zone. Do not hold high block position.',
      footworkExplanation: 'After high block, step forward diagonally — closes Fighter A\'s low strike angle.',
      mistakeDetected: 'Static guard after first block. Not reading combination continuation.',
      correctSolution: 'Guard must be fluid. After each block, check opponent\'s hip rotation for next attack direction.',
      coachNote: 'Drill: Practice double-block (high-low) with partner. 50 reps each side daily.',
      ruleDecision: 'Second contact — low touch landed. Referee review needed.', pointDecision: 'Under review',
      difficulty: 'intermediate', tags: ['defense', 'combination', 'guard', 'low zone'],
      savedFolder: 'Defense Techniques', createdAt: new Date().toISOString(),
      attackDirection: 'overhead', impactZone: 'body', reactionTimeMs: 390,
      poseKeyframes: MOCK_CLIPS[1].poseKeyframes,
    },
    {
      id: `clip-${Date.now()}-3`,
      title: `Counter Opening — ${videoFile.name}`,
      originalVideoName: videoFile.name,
      originalVideoUrl: videoUrl,
      timestampStart: '00:35', timestampEnd: '00:42',
      category: 'counter_attack', skillType: 'Post-Strike Counter',
      fighterAAction: 'Full commitment overhead strike — over-extended after follow-through',
      fighterBAction: 'Absorbed strike — did not exploit over-extension window',
      attackDescription: 'Fighter A commits fully to overhead strike. After follow-through, Fighter A body is forward-leaning with stick low — vulnerable for 0.4 seconds.',
      defenseDescription: 'Fighter B absorbed or blocked but hesitated to counter. Missed 0.4-second window.',
      counterAttackSuggestion: 'The instant Fighter A\'s stick passes — pivot inside, both hands counter to ribs or back while Fighter A recovers.',
      footworkExplanation: 'Pivot foot: drive right foot into ground, rotate body left 90°. This positions you inside Fighter A\'s guard with clear body target.',
      mistakeDetected: 'Hesitation after block. Counter requires no thinking — must be trained as automatic response.',
      correctSolution: 'Drill: Block + immediate counter as single motion. Never pause between block and counter. They are one movement.',
      coachNote: 'Counter timing is everything. 0.4-second window means counter must begin DURING the block, not after it.',
      ruleDecision: 'No counter — legal attack by Fighter A only.', pointDecision: 'No point scored',
      difficulty: 'advanced', tags: ['counter', 'timing', 'over-extension', 'window'],
      savedFolder: 'Counter Attack Techniques', createdAt: new Date().toISOString(),
      attackDirection: 'overhead', impactZone: 'body', reactionTimeMs: 420,
      poseKeyframes: MOCK_CLIPS[2].poseKeyframes,
    },
  ]

  const session: VideoAnalysisSession = {
    id: `session-${Date.now()}`,
    videoName: videoFile.name,
    videoUrl,
    uploadedAt: new Date().toISOString(),
    status: 'completed',
    totalClipsDetected: baseClips.length,
    categoriesDetected: ['attack', 'defense', 'counter_attack'],
    summary: `ORION analysed "${videoFile.name}" and detected ${baseClips.length} key exchanges. Main patterns: diagonal attacks, defense hesitation, missed counter windows. Priority: counter-timing drills and Kaaladi footwork.`,
    clips: baseClips,
  }

  saveClips(baseClips)
  saveSession(session)
  return session
}

// ─── Reference Clips (short analyzed clips ORION learns from) ─────────────────

export function getReferenceClips(): ReferenceClip[] {
  if (!isClient()) return []
  try {
    const raw = localStorage.getItem(REF_CLIPS_KEY)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

export function saveReferenceClip(clip: ReferenceClip) {
  if (!isClient()) return
  const existing = getReferenceClips()
  localStorage.setItem(REF_CLIPS_KEY, JSON.stringify([clip, ...existing]))
}

export function deleteReferenceClip(id: string) {
  if (!isClient()) return
  const updated = getReferenceClips().filter(c => c.id !== id)
  localStorage.setItem(REF_CLIPS_KEY, JSON.stringify(updated))
}

// Match new video's detected techniques against saved reference clips
// Returns the top matching reference clips sorted by relevance score
export function getSuggestedClips(techniques: string[], tags: string[] = []): ReferenceClip[] {
  const refs = getReferenceClips()
  if (!refs.length) return []

  const newTechSet = new Set([...techniques, ...tags].map(t => t.toLowerCase()))

  return refs
    .map(ref => {
      const refSet = new Set([...ref.techniques, ...ref.tags].map(t => t.toLowerCase()))
      let score = 0
      newTechSet.forEach(t => { if (refSet.has(t)) score++ })
      return { clip: ref, score }
    })
    .filter(r => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(r => r.clip)
}
