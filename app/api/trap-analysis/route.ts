import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { attempt, opportunity, fighter, videoTime } = body

    const prompt = `You are ORION — Silambam AI coach. Analyse this Trap technique attempt and give deep coaching feedback.

Fighter: ${fighter}
Video Time: ${videoTime}

OPPORTUNITY:
- Defender Guard Bias: ${opportunity?.defenderGuardBias}
- Suggested Fake Target: ${opportunity?.suggestedFakeTarget}
- Suggested Real Target: ${opportunity?.suggestedRealTarget}
- Counter Risk: ${opportunity?.counterRisk}

ATTEMPT:
- Phase: ${attempt?.phase}
- Fake Target: ${attempt?.fakeTarget}
- Real Target: ${attempt?.realTarget}
- Hands During Fake: ${attempt?.handsDuringFake}
- Hands During Real: ${attempt?.handsDuringReal}
- Transition Speed: ${attempt?.transitionSpeed}
- Touch Result: ${attempt?.touchResult}
- Defender Reacted: ${attempt?.defenderReacted}
- Final Result: ${attempt?.finalResult}

Provide a JSON response with:
{
  "technicalBreakdown": "2-3 sentence technical analysis of the Trap deception execution",
  "deceptionAssessment": "Did the fake convincingly draw the defender? Was the direction change sharp and fast? 1-2 sentences.",
  "transitionAnalysis": "How clean was the transition from fake to real attack? 1-2 sentences.",
  "improvementDrills": ["drill 1", "drill 2", "drill 3"],
  "keyStrengths": ["strength 1", "strength 2"],
  "criticalFixes": ["fix 1", "fix 2"],
  "nextTechniqueToTry": "One Silambam technique to complement Trap",
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
    console.error('trap-analysis error:', err)
    return NextResponse.json({
      technicalBreakdown: 'Analysis unavailable.',
      deceptionAssessment: '', transitionAnalysis: '',
      improvementDrills: [], keyStrengths: [], criticalFixes: [],
      nextTechniqueToTry: '', overallScore: 0,
    })
  }
}
