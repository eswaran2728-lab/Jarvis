import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      videoTime, momentType,
      player1Tech, player2Tech,
      gapType, gapStickPos, gapBestTech,
      echoDetected, echoDirection,
      trapAvailable, trapFakeTarget, trapRealTarget,
      defenceThreat, defenceType,
      bavalaiQuality, bavalaiOpportunity,
      retreatResult,
      slideAvailable, zipAvailable,
      wristSpeed, player1Score, player2Score,
    } = body

    const prompt = `You are ORION — an expert Silambam AI coach watching two fighters spar.
You just paused the video at ${videoTime} because you detected an important training moment.

DETECTION DATA:
- Moment type: ${momentType}
- Red fighter (P1) technique: ${player1Tech || 'Unknown'}
- Blue fighter (P2) technique: ${player2Tech || 'Unknown'}
- Gap detected: ${gapType || 'NONE'} (opponent stick: ${gapStickPos || 'MIDDLE'}, best technique: ${gapBestTech || 'None'})
- Echo (counter window): ${echoDetected ? `YES — attack from ${echoDirection}` : 'NO'}
- Trap opportunity: ${trapAvailable ? `YES — fake ${trapFakeTarget} → real ${trapRealTarget}` : 'NO'}
- Defence threat: ${defenceThreat ? `YES — ${defenceType}` : 'NO'}
- Bavalai quality: ${bavalaiQuality || 'Not detected'}
- Best opportunity from Bavalai: ${bavalaiOpportunity || 'None'}
- Retreat result: ${retreatResult || 'None'}
- Slide opportunity: ${slideAvailable ? 'YES' : 'NO'}
- Zip opportunity: ${zipAvailable ? 'YES' : 'NO'}
- Stick entry speed: ${wristSpeed ? `${(wristSpeed * 100).toFixed(1)} units/frame` : 'Unknown'}
- Red score context: ${player1Score || 0}
- Blue score context: ${player2Score || 0}

Respond with a JSON coaching report for this exact moment. Write like a real coach stopping a sparring session — direct, clear, specific. Do NOT be vague. Name the technique, the target, and the exact correction.

Return ONLY valid JSON in this exact shape:
{
  "pauseReason": "Short 1-sentence reason ORION stopped playback",
  "red": {
    "mistakes": ["mistake 1", "mistake 2"],
    "fixes": ["fix 1", "fix 2"],
    "strengths": ["strength 1"]
  },
  "blue": {
    "mistakes": ["mistake 1", "mistake 2"],
    "fixes": ["fix 1", "fix 2"],
    "strengths": ["strength 1"]
  },
  "pointOpportunity": {
    "target": "Target zone (e.g. Blue stomach)",
    "reason": "Why it is open",
    "openDuration": "e.g. 0.8 seconds",
    "scoringPossibility": "HIGH",
    "bestAction": "Technique name",
    "confidence": 88
  },
  "counterAnalysis": {
    "attackAttempted": "What the attacker did",
    "defenderResponse": "How defender responded",
    "bestCounter": "Best counter technique name",
    "counterReason": "Why this counter works here",
    "confidence": 91
  },
  "stickSpeed": {
    "entryTimeSec": 0.42,
    "exitTimeSec": 0.31,
    "totalCycleSec": 0.73,
    "speedRating": "Fast",
    "fastEnoughToScore": true
  },
  "skillRecommendations": [
    { "skill": "Reverse ZIP", "confidence": 88, "reason": "Guard open on right side, straight path available" },
    { "skill": "Slide Entry", "confidence": 84, "reason": "Opponent stick low, upper body exposed" }
  ],
  "timelineNote": "Short note for timeline (e.g. Blue guard opened — point chance stomach)",
  "positiveNotes": ["One positive observation about either fighter"]
}

IMPORTANT RULES:
- skillRecommendations: ONLY include skills with confidence 80 or above. If none qualify, return an empty array.
- pointOpportunity.scoringPossibility must be HIGH, MEDIUM, or LOW.
- Be specific about target body zones. Use: chest, stomach, left shoulder, right shoulder, outer calf, outer thigh.
- All text must be short — coaches speak in bullets, not paragraphs.
- Do not invent data not supported by the detection. If unsure, reflect that honestly.`

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 900,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : '{}'
    const json = JSON.parse(text.replace(/```json\n?|```/g, '').trim())
    return NextResponse.json(json)
  } catch (err) {
    console.error('coaching-moment error:', err)
    return NextResponse.json({
      pauseReason: 'Important training moment detected.',
      red: { mistakes: [], fixes: [], strengths: [] },
      blue: { mistakes: [], fixes: [], strengths: [] },
      pointOpportunity: null,
      counterAnalysis: null,
      stickSpeed: null,
      skillRecommendations: [],
      timelineNote: 'Moment detected',
      positiveNotes: [],
    })
  }
}
