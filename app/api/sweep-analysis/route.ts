import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { attempt, opportunity, fighter, videoTime } = body

    const prompt = `You are ORION — Silambam AI coach. Analyse this Sweep technique attempt and give deep coaching feedback.

Fighter: ${fighter}
Video Time: ${videoTime}

OPPORTUNITY:
- Open Target: ${opportunity?.openTarget}
- Low Line Open: ${opportunity?.lowLineOpen}
- Guard High: ${opportunity?.guardHigh}
- From Bavalai: ${opportunity?.fromBavalai}
- Counter Risk: ${opportunity?.counterRisk}
- Suggestion: ${opportunity?.suggestion}

ATTEMPT:
- Target: ${attempt?.target}
- Touch Result: ${attempt?.touchResult}
- Hands Together: ${attempt?.handsTogether}
- Bavalai Flow: ${attempt?.bavalaFlowDetected}
- Stick Path: ${attempt?.stickPath}
- Speed Rating: ${attempt?.speedRating}
- Recovery: ${attempt?.recovery}
- Final Result: ${attempt?.finalResult}

Provide a JSON response with:
{
  "technicalBreakdown": "2-3 sentence technical analysis of the Sweep execution",
  "bavalaFlowAssessment": "How well did the fighter transition from Bavalai into the low strike? 1-2 sentences.",
  "handPositionNote": "Were both hands together at the strike? 1-2 sentences.",
  "improvementDrills": ["drill 1", "drill 2", "drill 3"],
  "keyStrengths": ["strength 1", "strength 2"],
  "criticalFixes": ["fix 1", "fix 2"],
  "nextTechniqueToTry": "One Silambam technique to practice after Sweep",
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
    console.error('sweep-analysis error:', err)
    return NextResponse.json({
      technicalBreakdown: 'Analysis unavailable.',
      bavalaFlowAssessment: '',
      handPositionNote: '',
      improvementDrills: [],
      keyStrengths: [],
      criticalFixes: [],
      nextTechniqueToTry: '',
      overallScore: 0,
    })
  }
}
