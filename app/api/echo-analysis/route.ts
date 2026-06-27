import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { attempt, opportunity, fighter, videoTime } = body

    const prompt = `You are ORION — Silambam AI coach. Analyse this Echo counter-combination attempt and give deep coaching feedback.

Fighter: ${fighter}
Video Time: ${videoTime}

OPPORTUNITY:
- Attack Detected: ${opportunity?.opponentAttackDetected}
- Attack Direction: ${opportunity?.attackDirection}
- Counter Target: ${opportunity?.counterTarget}
- Counter Risk: ${opportunity?.counterRisk}
- Second Echo Available: ${opportunity?.secondEchoAvailable}

ATTEMPT:
- Echo Number: ${attempt?.echoNumber}
- Intercept Result: ${attempt?.interceptResult}
- Redirect Result: ${attempt?.redirectResult}
- Counter Target: ${attempt?.counterTarget}
- Counter Result: ${attempt?.counterResult}
- Footwork: ${attempt?.footwork}
- Body Movement: ${attempt?.bodyMovement}
- Timing: ${attempt?.timing}
- Final Result: ${attempt?.finalResult}

Provide a JSON response with:
{
  "technicalBreakdown": "2-3 sentence technical analysis of the Echo intercept-redirect-counter sequence",
  "interceptAnalysis": "How clean was the interception? Was it timed before the attack landed? 1-2 sentences.",
  "footworkNote": "Did the rear leg advance or did the fighter step backward? Echo requires closing distance. 1-2 sentences.",
  "improvementDrills": ["drill 1", "drill 2", "drill 3"],
  "keyStrengths": ["strength 1", "strength 2"],
  "criticalFixes": ["fix 1", "fix 2"],
  "nextTechniqueToTry": "One Silambam technique that pairs well with Echo",
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
    console.error('echo-analysis error:', err)
    return NextResponse.json({
      technicalBreakdown: 'Analysis unavailable.',
      interceptAnalysis: '', footworkNote: '',
      improvementDrills: [], keyStrengths: [], criticalFixes: [],
      nextTechniqueToTry: '', overallScore: 0,
    })
  }
}
