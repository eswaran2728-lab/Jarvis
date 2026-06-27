import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { gapState, fighter, videoTime } = body

    const prompt = `You are ORION — Silambam AI coach. Analyse this Gap detection event and give coaching feedback.

Fighter: ${fighter}
Video Time: ${videoTime}

GAP STATE:
- Gap Type: ${gapState?.gapType}
- Opponent Stick Position: ${gapState?.opponentStickPosition}
- Best Recommendation: ${gapState?.bestRecommendation?.technique}
- Recommendation Reason: ${gapState?.bestRecommendation?.reason}
- Counter Risk: ${gapState?.counterRisk}
- Distance OK: ${gapState?.distanceOk}
- Attacker Balanced: ${gapState?.attackerBalanced}
- Timing Window: ${gapState?.timingWindow}

Provide a JSON response with:
{
  "technicalBreakdown": "2-3 sentence analysis of the gap and how the fighter should exploit it",
  "timingNote": "How long does this gap typically stay open? What is the urgency? 1-2 sentences.",
  "techniqueRationale": "Why is the recommended technique best for this gap? 1-2 sentences.",
  "improvementDrills": ["drill 1", "drill 2", "drill 3"],
  "keyStrengths": ["strength 1"],
  "criticalFixes": ["fix 1", "fix 2"],
  "nextTechniqueToTry": "One follow-up technique after exploiting this gap",
  "overallScore": <number 0-100>
}

Respond ONLY with valid JSON.`

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 600,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : '{}'
    const json = JSON.parse(text.replace(/```json\n?|```/g, '').trim())
    return NextResponse.json(json)
  } catch (err) {
    console.error('gap-analysis error:', err)
    return NextResponse.json({
      technicalBreakdown: 'Analysis unavailable.',
      timingNote: '', techniqueRationale: '',
      improvementDrills: [], keyStrengths: [], criticalFixes: [],
      nextTechniqueToTry: '', overallScore: 0,
    })
  }
}
