import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { attempt, opportunity, fighter, videoTime } = body

    const prompt = `You are ORION — Silambam AI coach. Analyse this Zip double-touch attempt and give deep coaching feedback.

Fighter: ${fighter}
Video Time: ${videoTime}

OPPORTUNITY:
- Zip Type: ${opportunity?.zipType}
- First Target: ${opportunity?.firstTarget}
- Second Target: ${opportunity?.secondTarget}
- Counter Risk: ${opportunity?.counterRisk}

ATTEMPT:
- Zip Type: ${attempt?.zipType}
- First Touch Result: ${attempt?.firstTouchResult}
- Second Touch Result: ${attempt?.secondTouchResult}
- Hands Together: ${attempt?.handsTogethery}
- Path Straightness: ${attempt?.pathStraightness}
- Speed Rating: ${attempt?.speedRating}
- Time Between Touches: ${attempt?.timeBetweenTouches}ms
- Final Result: ${attempt?.finalResult}

Provide a JSON response with:
{
  "technicalBreakdown": "2-3 sentence technical analysis of the Zip straight double-touch execution",
  "speedAssessment": "Was the time between touches fast enough? Zip Speed is under 200ms. 1-2 sentences.",
  "pathNote": "Was the stick path straight between targets? 1-2 sentences.",
  "improvementDrills": ["drill 1", "drill 2", "drill 3"],
  "keyStrengths": ["strength 1", "strength 2"],
  "criticalFixes": ["fix 1", "fix 2"],
  "nextTechniqueToTry": "One Silambam technique to chain after a successful Zip",
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
    console.error('zip-analysis error:', err)
    return NextResponse.json({
      technicalBreakdown: 'Analysis unavailable.',
      speedAssessment: '', pathNote: '',
      improvementDrills: [], keyStrengths: [], criticalFixes: [],
      nextTechniqueToTry: '', overallScore: 0,
    })
  }
}
