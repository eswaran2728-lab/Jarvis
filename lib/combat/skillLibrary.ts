export type CombatSkill = {
  id: string
  name: string
  tagline: string
  description: string
  whenToUse: string
  keyPoints: string[]
  triggerMistakes: string[]
}

export const SKILL_LIBRARY: Record<string, CombatSkill> = {
  ZIP: {
    id: 'ZIP',
    name: 'ZIP',
    tagline: 'Fast in → touch → fast out',
    description: 'Straight double-touch. Enter fast, hit two legal targets, exit immediately. Both hands together throughout.',
    whenToUse: 'When opponent leaves an open point and you are in range.',
    keyPoints: ['Both hands together', 'Both touches under 200ms', 'Exit immediately after second touch', 'No pause between touches'],
    triggerMistakes: ['open_point', 'missing_point_opportunity', 'no_follow_up'],
  },
  SLIDE: {
    id: 'SLIDE',
    name: 'SLIDE',
    tagline: 'Side movement → touch from angle',
    description: 'Step diagonally off the straight line, attack from angle. Avoids straight counters and opens opponent body.',
    whenToUse: 'When opponent is set up for straight counter. Avoid their line and touch from the side.',
    keyPoints: ['Step diagonally, not straight', 'Touch during the slide step', 'Follow with immediate exit', 'Keep stick active during slide'],
    triggerMistakes: ['straight_entry', 'over_commit', 'poor_angle'],
  },
  RETREAT: {
    id: 'RETREAT',
    name: 'RETREAT',
    tagline: 'Immediate exit after every action',
    description: 'Backward movement out of counter range immediately after attack or touch. Stick stays active during retreat.',
    whenToUse: 'After every attack or touch attempt. Also when pressure is too high to counter effectively.',
    keyPoints: ['Exit immediately — no pause after touch', 'Stick stays moving during retreat', 'Return to Bavalai guard', 'Never turn back'],
    triggerMistakes: ['late_retreat', 'slow_exit', 'weak_exit', 'turning_back'],
  },
  COUNTER_TOUCH: {
    id: 'COUNTER_TOUCH',
    name: 'COUNTER TOUCH',
    tagline: 'Wait → avoid → touch open hand/body',
    description: 'Let opponent commit to attack, step aside, then immediately touch exposed wrist, hand or body during their recovery.',
    whenToUse: 'When opponent over-commits or attacks without angle. Their recovery opens a window.',
    keyPoints: ['Do not react too early', 'Intercept and redirect (Echo principle)', 'Touch during their recovery', 'Exit before they reset'],
    triggerMistakes: ['over_commit', 'no_angle', 'open_hand'],
  },
  DOUBLE_TOUCH: {
    id: 'DOUBLE_TOUCH',
    name: 'DOUBLE TOUCH',
    tagline: 'Two targets quickly before exit',
    description: 'Strike upper then lower (or reverse) in one continuous motion before opponent can reset guard. Slide variant flows upper to lower.',
    whenToUse: 'When opponent guard is low or rhythm is broken and two zones are exposed simultaneously.',
    keyPoints: ['Upper touch first, lower second', 'No pause between', 'Continuous flowing motion', 'Exit after second touch'],
    triggerMistakes: ['open_point', 'poor_guard', 'lost_rhythm'],
  },
  ANGLE_ENTRY: {
    id: 'ANGLE_ENTRY',
    name: 'ANGLE ENTRY',
    tagline: 'Enter diagonally — never straight',
    description: 'Approach from a diagonal or side angle instead of the straight centre line. Removes straight counter threat.',
    whenToUse: 'Whenever preparing to close distance for attack. Straight-line entries are always countered.',
    keyPoints: ['Lead foot diagonal step', 'Attack from the angle', 'Keep stick between you and opponent', 'Angle changes required guard response'],
    triggerMistakes: ['straight_entry', 'attacking_without_angle', 'predictable_approach'],
  },
  GUARD_RESET: {
    id: 'GUARD_RESET',
    name: 'GUARD RESET',
    tagline: 'Return stick to safe guard immediately',
    description: 'After any action — attack, defence, miss — bring stick back to Bavalai guard before doing anything else.',
    whenToUse: 'After every action. Especially when Bavalai rhythm is lost or hand/body is exposed.',
    keyPoints: ['Never leave stick down', 'Restart Bavalai after every action', 'Compact Bavalai is faster to reset', 'Guard reset = counter prevention'],
    triggerMistakes: ['poor_guard', 'lost_rhythm', 'exposed_hand', 'open_hand'],
  },
}

export function getSkillsForMistakes(mistakeCodes: string[]): CombatSkill[] {
  const found = new Set<string>()
  const result: CombatSkill[] = []
  for (const skill of Object.values(SKILL_LIBRARY)) {
    if (skill.triggerMistakes.some(m => mistakeCodes.includes(m))) {
      if (!found.has(skill.id)) { found.add(skill.id); result.push(skill) }
    }
  }
  return result
}
