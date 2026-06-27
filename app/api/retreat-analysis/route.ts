import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { retreatState, fighter, videoTime } = body

    const prompt = `You are ORION — Silambam AI coach. Analyse this Retreat and give coaching feedback.

Fighter: ${fighter}
Video Time: ${videoTime}

RETREAT STATE:
- Speed: ${retreatState?.speed}
- Stick Status: ${retreatState?.stickStatus}
- Balance: ${retreatState?.balance}
- Returned to Bavalai: ${retreatState?.returnedToBavalai}
- Result: ${retreatState?.result}

Provide a JSON response with:
{
  "technicalBreakdown": "2-3 sentence analysis of the retreat quality",
  "stickNote": "Was the stick kept active and defensive during the retreat? 1-2 sentences.",
  "balanceAssessment": "Did the fighter maintain fighting balance while retreating? 1-2 sentences.",
  "improvementDrills": ["drill 1", "drill 2", "drill 3"],
  "keyStrengths": ["strength 1"],
  "criticalFixes": ["fix 1", "fix 2"],
  "nextTechniqueToTry": "One technique to launch immediately after a successful retreat",
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
    console.error('retreat-analysis error:', err)
    return NextResponse.json({
      technicalBreakdown: 'Analysis unavailable.',
      stickNote: '', balanceAssessment: '',
      improvementDrills: [], keyStrengths: [], criticalFixes: [],
      nextTechniqueToTry: '', overallScore: 0,
    })
  }
}
