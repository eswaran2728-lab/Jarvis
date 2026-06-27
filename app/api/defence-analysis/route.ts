import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { attempt, opportunity, fighter, videoTime } = body

    const prompt = `You are ORION — Silambam AI coach. Analyse this Defence attempt and give deep coaching feedback.

Fighter: ${fighter}
Video Time: ${videoTime}

OPPORTUNITY:
- Threat Detected: ${opportunity?.threatDetected}
- Threat Direction: ${opportunity?.threatDirection}
- Recommended Defence: ${opportunity?.recommendedDefence}
- Body Line Status: ${opportunity?.bodyLineStatus}

ATTEMPT:
- Defence Type: ${attempt?.defenceType}
- Stick Active: ${attempt?.stickActive}
- Body Line Covered: ${attempt?.bodyLineCovered}
- Block Contact: ${attempt?.blockContact}
- Bavalai Maintained: ${attempt?.bavalaiMaintained}
- Result: ${attempt?.result}

Provide a JSON response with:
{
  "technicalBreakdown": "2-3 sentence technical analysis of the defence execution",
  "bavalaiDefenceNote": "For Active Bavalai Defence: was the stick kept moving throughout? 1-2 sentences.",
  "blockAssessment": "For Emergency Block: was the intercept timed correctly? 1-2 sentences.",
  "improvementDrills": ["drill 1", "drill 2", "drill 3"],
  "keyStrengths": ["strength 1", "strength 2"],
  "criticalFixes": ["fix 1", "fix 2"],
  "nextTechniqueToTry": "One Silambam technique that should follow a successful defence",
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
    console.error('defence-analysis error:', err)
    return NextResponse.json({
      technicalBreakdown: 'Analysis unavailable.',
      bavalaiDefenceNote: '', blockAssessment: '',
      improvementDrills: [], keyStrengths: [], criticalFixes: [],
      nextTechniqueToTry: '', overallScore: 0,
    })
  }
}
