import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { attempt, opportunity, fighter, videoTime } = body

    const prompt = `You are ORION — Silambam AI coach. Analyse this Slide combination attempt and give deep coaching feedback.

Fighter: ${fighter}
Video Time: ${videoTime}

OPPORTUNITY:
- Upper Target Open: ${opportunity?.upperTargetOpen}
- Lower Target Open: ${opportunity?.lowerTargetOpen}
- Upper Target: ${opportunity?.upperTarget}
- Lower Target: ${opportunity?.lowerTarget}

ATTEMPT:
- Current Phase: ${attempt?.currentPhase}
- Upper Touch Result: ${attempt?.upperTouchResult}
- Lower Touch Result: ${attempt?.lowerTouchResult}
- U Path Detected: ${attempt?.uPathDetected}
- Slide Speed Rating: ${attempt?.slideSpeedRating}
- Continuous Flow: ${attempt?.continuousFlow}
- Final Result: ${attempt?.finalResult}

Provide a JSON response with:
{
  "technicalBreakdown": "2-3 sentence technical analysis of the Slide combination (Trap + U + upper touch + slide to lower)",
  "flowAssessment": "Was the transition from upper to lower touch seamless and continuous? 1-2 sentences.",
  "uPathNote": "Was the U movement present and correctly executed under the guard? 1-2 sentences.",
  "improvementDrills": ["drill 1", "drill 2", "drill 3"],
  "keyStrengths": ["strength 1", "strength 2"],
  "criticalFixes": ["fix 1", "fix 2"],
  "nextTechniqueToTry": "One Silambam technique to build on Slide",
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
    console.error('slide-analysis error:', err)
    return NextResponse.json({
      technicalBreakdown: 'Analysis unavailable.',
      flowAssessment: '', uPathNote: '',
      improvementDrills: [], keyStrengths: [], criticalFixes: [],
      nextTechniqueToTry: '', overallScore: 0,
    })
  }
}
