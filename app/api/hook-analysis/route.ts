import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { attempt, opportunity, fighter, videoTime } = body

    const prompt = `You are ORION — Silambam AI coach. Analyse this Hook / Reverse Hook attempt and give deep coaching feedback.

Fighter: ${fighter}
Video Time: ${videoTime}

OPPORTUNITY DETECTED:
- Type: ${opportunity?.type}
- Open Targets: ${opportunity?.openTargets?.join(', ') || 'none'}
- Counter Risk: ${opportunity?.counterRisk}
- Path Too Wide: ${opportunity?.pathTooWide}
- Suggestion: ${opportunity?.suggestion}

ATTEMPT RESULT:
- Detected: ${attempt?.detected}
- Hook Type: ${attempt?.type}
- First Touch → ${attempt?.firstTouchTarget}: ${attempt?.firstTouchResult}
- Path Compactness: ${attempt?.pathCompactness}
- Continuous Flow: ${attempt?.continuousFlow}
- Second Touch → ${attempt?.secondTouchTarget}: ${attempt?.secondTouchResult}
- Speed Rating: ${attempt?.speedRating} (${attempt?.speedNote})
- Final Result: ${attempt?.finalResult}

Provide a JSON response with:
{
  "technicalBreakdown": "2-3 sentence technical analysis of the Hook C-path execution",
  "compactnessAssessment": "Was the C-path compact or too wide? 1-2 sentences.",
  "flowAnalysis": "Was the movement continuous? 1-2 sentences.",
  "improvementDrills": ["drill 1", "drill 2", "drill 3"],
  "keyStrengths": ["strength 1", "strength 2"],
  "criticalFixes": ["fix 1", "fix 2"],
  "nextTechniqueToTry": "One Silambam technique to practice next",
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
    console.error('hook-analysis error:', err)
    return NextResponse.json({
      technicalBreakdown: 'Analysis unavailable.',
      compactnessAssessment: '',
      flowAnalysis: '',
      improvementDrills: [],
      keyStrengths: [],
      criticalFixes: [],
      nextTechniqueToTry: '',
      overallScore: 0,
    })
  }
}
