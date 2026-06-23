// ORION Silambam Rule Engine
// ORION AI provides rule-based guidance only.
// Final decisions must be made by official tournament referees and judges.

export const ORION_DISCLAIMER =
  'ORION AI provides rule-based guidance only. Final decisions must be made by official tournament referees and judges.'

// ─── Valid / Invalid Target Areas ────────────────────────────────────────────

export const VALID_TARGETS = [
  { area: 'Head', note: 'Top and back of head — legal touch with soft stick' },
  { area: 'Shoulder', note: 'Both shoulders — legal scoring zone' },
  { area: 'Upper Arm', note: 'Between shoulder and elbow — legal zone' },
  { area: 'Forearm', note: 'Between elbow and wrist — legal zone' },
  { area: 'Chest', note: 'Front chest area — legal scoring zone' },
  { area: 'Side Body', note: 'Ribcage and side torso — legal zone' },
  { area: 'Back', note: 'Upper and mid back — legal scoring zone' },
  { area: 'Thigh', note: 'Upper leg — legal scoring zone' },
  { area: 'Calf', note: 'Lower leg — legal scoring zone' },
]

export const INVALID_TARGETS = [
  { area: 'Face', reason: 'Risk of serious injury to eyes, nose, teeth' },
  { area: 'Eyes', reason: 'Extremely dangerous — strictly prohibited' },
  { area: 'Neck', reason: 'Risk of severe injury to throat and spine' },
  { area: 'Groin', reason: 'Prohibited — causes severe pain and injury' },
  { area: 'Spine', reason: 'Risk of spinal damage — strictly prohibited' },
  { area: 'Knee Joint', reason: 'Risk of ligament damage — strictly prohibited' },
]

// ─── Combat Rules ─────────────────────────────────────────────────────────────

export const COMBAT_RULES = {
  format: {
    round1Duration: '1.5 minutes',
    breakDuration: '1 minute',
    round2Duration: '1.5 minutes',
  },
  scoring: {
    method: 'Valid soft-stick touch on legal target area scores a point',
    winner: 'Fighter with most accumulated points after both rounds as decided by official judges',
    stickType: 'Soft padded stick — hard stick strikes are penalised',
  },
  generalRules: [
    'Both fighters must stay within the inner circle (6.1m) during active exchange',
    'Stepping outside the boundary results in a penalty point to the opponent',
    'Excessive force or dangerous strikes result in warning or disqualification',
    'Only official judges score points — ORION does not score officially',
    'Coach may not enter court during rounds',
  ],
}

// ─── Court Dimensions ─────────────────────────────────────────────────────────

export const COURT_RULES = {
  totalSize: '10m × 10m',
  safetyArea: '7.4m',
  innerCircle: '6.1m',
  boundaryWidth: '5cm',
  officials: [
    { role: 'Chief Referee', duty: 'Controls the bout, calls start/stop, issues warnings' },
    { role: 'Judges', duty: 'Score valid touches — minimum 3 judges per bout' },
    { role: 'Timekeeper', duty: 'Controls round timer, signals start/end of rounds and break' },
    { role: 'Scorekeeper', duty: 'Records all judge scores and maintains official scoreboard' },
    { role: 'Assistants', duty: 'Support chief referee with boundary and rule enforcement' },
    { role: 'Coaches', duty: 'Stay outside court — may advise between rounds only' },
  ],
}

// ─── Thanithiramai Rules ──────────────────────────────────────────────────────

export const THANITHIRAMAI_RULES = {
  description: 'Individual performance event — solo Silambam skill display, not combat',
  duration: '2 minutes',
  totalScore: 20,
  scoringCriteria: [
    { criterion: 'Speed', marks: 4, description: 'Execution pace and transition speed between techniques' },
    { criterion: 'Skill', marks: 4, description: 'Technical correctness and precision of each technique' },
    { criterion: 'Style', marks: 4, description: 'Personal expression, aesthetics, and presentation' },
    { criterion: 'Variety', marks: 4, description: 'Range of different techniques shown in the performance' },
    { criterion: 'Power', marks: 4, description: 'Strength and force demonstrated in strikes and movements' },
  ],
  techniques: [
    { name: 'Varal', description: 'Spinning and rotating stick movements' },
    { name: 'Aruppu', description: 'Cutting or slicing strike patterns' },
    { name: 'Vettu', description: 'Chopping downward strikes' },
    { name: 'Kuthu', description: 'Thrusting or stabbing movements' },
    { name: 'Veechu', description: 'Sweeping and swinging patterns' },
    { name: 'Udan / Turning / Spring / Pivot', description: 'Dynamic footwork, jumps, spins, and weight transfers' },
  ],
  notes: [
    'No opponent — solo performance only',
    'Judges assess all 5 criteria simultaneously',
    'Each criterion scored out of 4 marks = 20 total',
    'Performance must show clear transitions between different techniques',
  ],
}

// ─── Kuthuvarisai Rules ───────────────────────────────────────────────────────

export const KUTHUVARISAI_RULES = {
  description: 'Empty-hand Silambam — unarmed combat skill event, no stick used',
  techniques: [
    { name: 'Punches', description: 'Straight, hook, and circular hand strikes' },
    { name: 'Kicks', description: 'Front, side, round, and spinning kicks' },
    { name: 'Blocks', description: 'Deflections and interceptions of incoming strikes' },
    { name: 'Dodges', description: 'Evasive body movements to avoid contact' },
    { name: 'Sweeps', description: 'Low kicks or foot movements to unbalance opponent' },
    { name: 'Stances', description: 'Base positions that control balance and movement' },
    { name: 'Flow Movements', description: 'Continuous chained sequences without pause' },
  ],
  scoringCriteria: [
    { criterion: 'Technique', description: 'Correct form and execution of each move' },
    { criterion: 'Speed', description: 'Reaction time and movement pace' },
    { criterion: 'Balance', description: 'Stability throughout all movements and transitions' },
    { criterion: 'Power', description: 'Force and control in strikes and blocks' },
    { criterion: 'Flow', description: 'Smooth, connected transitions between techniques' },
  ],
  notes: [
    'Unarmed — no weapon of any kind is used',
    'Combines elements of Silambam footwork with hand and leg techniques',
    'Rooted in traditional Tamil martial arts — related to Varma Kalai and Kalaripayattu',
  ],
}

// ─── Rule Checker ─────────────────────────────────────────────────────────────

export function checkTargetArea(area: string): {
  valid: boolean
  area: string
  reason: string
  penalty?: string
  disclaimer: string
} {
  const normalized = area.toLowerCase().trim()

  const invalid = INVALID_TARGETS.find(t => t.area.toLowerCase() === normalized)
  if (invalid) {
    return {
      valid: false,
      area: invalid.area,
      reason: invalid.reason,
      penalty: 'Warning or disqualification — decided by official referee',
      disclaimer: ORION_DISCLAIMER,
    }
  }

  const valid = VALID_TARGETS.find(t => t.area.toLowerCase() === normalized)
  if (valid) {
    return {
      valid: true,
      area: valid.area,
      reason: valid.note,
      disclaimer: ORION_DISCLAIMER,
    }
  }

  return {
    valid: false,
    area,
    reason: 'Area not found in Silambam rulebook. Treat as invalid until confirmed by official.',
    disclaimer: ORION_DISCLAIMER,
  }
}

export function buildRuleContext(): string {
  const validList = VALID_TARGETS.map(t => t.area).join(', ')
  const invalidList = INVALID_TARGETS.map(t => `${t.area} (${t.reason})`).join('; ')
  const thanithiramaiCriteria = THANITHIRAMAI_RULES.scoringCriteria.map(c => `${c.criterion} (${c.marks} marks)`).join(', ')
  const thanithiramaiTech = THANITHIRAMAI_RULES.techniques.map(t => t.name).join(', ')
  const kuthuTech = KUTHUVARISAI_RULES.techniques.map(t => t.name).join(', ')
  const officials = COURT_RULES.officials.map(o => `${o.role}: ${o.duty}`).join('\n')

  return `
=== SILAMBAM COMBAT RULES (ORION Rule Engine) ===

COMBAT FORMAT:
- Round 1: ${COMBAT_RULES.format.round1Duration}
- Break: ${COMBAT_RULES.format.breakDuration}
- Round 2: ${COMBAT_RULES.format.round2Duration}
- Scoring: ${COMBAT_RULES.scoring.method}
- Winner: ${COMBAT_RULES.scoring.winner}

VALID TARGET AREAS: ${validList}

INVALID TARGET AREAS (prohibited): ${invalidList}

GENERAL RULES:
${COMBAT_RULES.generalRules.map(r => `- ${r}`).join('\n')}

TOURNAMENT COURT:
- Total size: ${COURT_RULES.totalSize}
- Safety area: ${COURT_RULES.safetyArea}
- Inner circle: ${COURT_RULES.innerCircle}
- Boundary width: ${COURT_RULES.boundaryWidth}

COURT OFFICIALS:
${officials}

THANITHIRAMAI (Individual Performance):
- Duration: ${THANITHIRAMAI_RULES.duration}
- Total score: ${THANITHIRAMAI_RULES.totalScore} marks
- Criteria: ${thanithiramaiCriteria}
- Techniques: ${thanithiramaiTech}

KUTHUVARISAI (Empty-Hand):
- Description: ${KUTHUVARISAI_RULES.description}
- Techniques: ${kuthuTech}
- Scoring based on: Technique, Speed, Balance, Power, Flow

IMPORTANT — ORION ROLE:
ORION is a Silambam Combat RULE ASSISTANT only.
ORION explains rules, checks target validity, and guides understanding.
ORION does NOT declare winners, replace referees, or give final decisions.
${ORION_DISCLAIMER}
`.trim()
}
