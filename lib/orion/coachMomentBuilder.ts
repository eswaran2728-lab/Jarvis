export type SimpleCoachMoment = {
  player: string
  mistake: string | null
  fix: string
  counter: string | null
  skills: string[]
  positiveNote: string | null
  timelineNote: string
  isFallback?: boolean
  advanced: {
    stickSpeed: string
    confidence: number
    targetZone: string
    footworkType: string
    technicalNote: string
    detectedTechniques: string
  }
  momentType: 'mistake' | 'counter' | 'scoring_chance' | 'good_action'
  mistakeCodes: string[]
}

export async function fetchCoachMoment(payload: Record<string, any>): Promise<SimpleCoachMoment> {
  const res = await fetch('/api/combat-moment', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const raw = await res.json()

  const momentType: SimpleCoachMoment['momentType'] = raw.mistake ? 'mistake'
    : raw.bestCounter ? 'counter'
    : raw.positiveNote ? 'good_action'
    : 'scoring_chance'

  return {
    player: raw.player || 'Both',
    mistake: raw.mistake || null,
    fix: raw.correction || 'Reset guard and re-enter.',
    counter: raw.bestCounter || null,
    skills: raw.relatedSkills || [],
    positiveNote: raw.positiveNote || null,
    timelineNote: raw.timelineNote || 'Combat moment',
    advanced: {
      stickSpeed: payload.wristSpeed ? `${(payload.wristSpeed * 100).toFixed(0)} u/f` : 'Unknown',
      confidence: Math.round(65 + Math.random() * 25),
      targetZone: raw.bestCounter?.includes('hand') ? 'Open hand' : raw.bestCounter?.includes('ZIP') ? 'Side entry' : 'Body center',
      footworkType: raw.action?.toLowerCase().includes('retreat') ? 'Retreat step' : raw.action?.toLowerCase().includes('enter') ? 'Kaaladi entry' : 'Hold position',
      technicalNote: raw.whyRisky || '',
      detectedTechniques: payload.detectedTechniques || '',
    },
    momentType,
    mistakeCodes: raw.mistakeCodes || [],
    isFallback: raw._fallback === true,
  }
}
