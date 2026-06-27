import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      timestamp, player, detectedTechniques,
      gapType, gapStickPos, gapBestTech,
      echoDetected, echoDirection,
      trapAvailable, trapFakeTarget, trapRealTarget,
      defenceThreat, defenceType,
      bavalaiQuality, bavalaiOpportunity,
      retreatResult, slideAvailable, zipAvailable,
      uStrikeAvailable, hookAvailable, usiAvailable, sweepAvailable,
      wristSpeed,
    } = body

    const prompt = `You are ORION — an expert Silambam coach watching two fighters spar.
You paused the video at ${timestamp}. The focused players are Red P1 and Blue P2.

DETECTION DATA:
- Player flagged: ${player || 'Both'}
- Techniques detected: ${detectedTechniques || 'Unknown'}
- Gap: ${gapType || 'NONE'} (stick pos: ${gapStickPos || 'MIDDLE'}, best: ${gapBestTech || 'None'})
- Echo counter window: ${echoDetected ? `YES from ${echoDirection}` : 'NO'}
- Trap available: ${trapAvailable ? `YES — fake ${trapFakeTarget} → real ${trapRealTarget}` : 'NO'}
- Defence threat: ${defenceThreat ? `YES — ${defenceType}` : 'NO'}
- Bavalai quality: ${bavalaiQuality || 'Unknown'}
- Bavalai opportunity: ${bavalaiOpportunity || 'None'}
- Retreat result: ${retreatResult || 'None'}
- Slide available: ${slideAvailable ? 'YES' : 'NO'}
- Zip available: ${zipAvailable ? 'YES' : 'NO'}
- U Strike available: ${uStrikeAvailable ? 'YES' : 'NO'}
- Hook available: ${hookAvailable ? 'YES' : 'NO'}
- Usi available: ${usiAvailable ? 'YES' : 'NO'}
- Sweep available: ${sweepAvailable ? 'YES' : 'NO'}
- Wrist speed: ${wristSpeed ? `${(wristSpeed * 100).toFixed(1)} units/frame` : 'Unknown'}

Respond as a Silambam coach who just stopped sparring to give feedback. Be direct and specific.
Use simple language. Talk to the student, not about them.

Return ONLY valid JSON in this exact shape:
{
  "player": "Red P1 or Blue P2 or Both",
  "action": "One sentence: what happened at this moment",
  "mistake": "One sentence: what went wrong (if any). null if good action.",
  "whyRisky": "One sentence: why this is dangerous",
  "correction": "One clear instruction: what to do instead",
  "bestCounter": "Technique name and description",
  "relatedSkills": ["ZIP", "SLIDE"],
  "mistakeCodes": ["late_retreat", "open_point"],
  "positiveNote": "One positive if any, otherwise null",
  "autoPause": true,
  "timelineNote": "Short note for timeline e.g. Blue missed open ZIP chance"
}

MISTAKE CODES (use exact strings):
late_retreat, poor_guard, lost_rhythm, open_point, over_commit, straight_entry,
missing_point_opportunity, no_follow_up, weak_exit, turning_back, attacking_without_angle,
exposed_hand, open_hand, poor_angle, no_angle, predictable_approach

IMPORTANT: relatedSkills must only contain: ZIP, SLIDE, RETREAT, COUNTER_TOUCH, DOUBLE_TOUCH, ANGLE_ENTRY, GUARD_RESET`

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 700,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : '{}'
    const json = JSON.parse(text.replace(/```json\n?|```/g, '').trim())
    return NextResponse.json(json)
  } catch (err) {
    console.error('combat-moment error:', err)
    return NextResponse.json({
      player: 'Both',
      action: 'Combat exchange detected.',
      mistake: null,
      whyRisky: 'Monitor spacing and guard position.',
      correction: 'Maintain Bavalai and exit after every action.',
      bestCounter: 'RETREAT — exit immediately after any touch.',
      relatedSkills: ['RETREAT', 'GUARD_RESET'],
      mistakeCodes: [],
      positiveNote: null,
      autoPause: true,
      timelineNote: 'Moment detected',
    })
  }
}
