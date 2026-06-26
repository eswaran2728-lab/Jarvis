import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { attempt, opportunity, fighter, videoTime } = body

    const prompt = `You are ORION — Silambam AI coach. Analyse this Usi (Injection Strike) attempt and give deep coaching feedback.

Fighter: ${fighter}
Video Time: ${videoTime}

OPPORTUNITY DETECTED:
- Chest Open: ${opportunity?.chestOpen}
- Guard Low: ${opportunity?.guardLow}
- Counter Risk: ${opportunity?.counterRisk}
- Reason: ${opportunity?.reason}
- Suggestion: ${opportunity?.suggestion}

ATTEMPT RESULT:
- Detected: ${attempt?.detected}
- Touch Target: ${attempt?.touchTarget}
- Touch Result: ${attempt?.touchResult}
- Stick Path: ${attempt?.stickPath}
- Speed Rating: ${attempt?.speedRating} (${attempt?.speedNote})
- Recovery Speed: ${attempt?.recoverySpeed}
- Final Result: ${attempt?.finalResult}

Provide a JSON response with:
{
  "technicalBreakdown": "2-3 sentence technical analysis of the Usi straight-line tip entry",
  "alignmentAssessment": "Was the stick tip aligned with the chest? 1-2 sentences.",
  "speedAssessment": "Was the attack instant enough? 1-2 sentences.",
  "improvementDrills": ["drill 1", "drill 2", "drill 3"],
  "keyStrengths": ["strength 1", "strength 2"],
  "criticalFixes": ["fix 1", "fix 2"],
  "nextTechniqueToTry": "One Silambam technique to practice after mastering Usi",
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
    console.error('usi-analysis error:', err)
    return NextResponse.json({
      technicalBreakdown: 'Analysis unavailable.',
      alignmentAssessment: '',
      speedAssessment: '',
      improvementDrills: [],
      keyStrengths: [],
      criticalFixes: [],
      nextTechniqueToTry: '',
      overallScore: 0,
    })
  }
}
