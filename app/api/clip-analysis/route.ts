import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'

const client = new Anthropic()

const SYSTEM = `You are ORION, a Silambam AI coach. Analyse the given player metrics and give clear, practical pros and cons.

Reply ONLY in this exact JSON format (no markdown, no extra text):
{
  "pros": ["pro 1", "pro 2", "pro 3"],
  "cons": ["con 1", "con 2", "con 3"],
  "coachTip": "One key coaching point in 1 sentence.",
  "tags": ["tag1", "tag2", "tag3", "tag4"]
}

Rules:
- pros: what the player(s) are doing well — be specific, mention spin/power/reflex if scores are high
- cons: what needs improvement — be specific and actionable, mention if spin/reflex/power is low
- coachTip: the single most important thing to fix or keep doing
- tags: technique names, patterns, or keywords that describe this clip (for future matching)
- Keep each point short — max 10 words
- Always reply in easy simple English
- Spin score 7+/10 = great spinning technique, mention it
- Reflex score below 5/10 = tell them to react faster
- Power score 8+/10 = strong strike power, mention it`

export async function POST(req: NextRequest) {
  try {
    const { players, videoName, techniques } = await req.json()

    const playerSummary = (players as any[]).map((p: any, i: number) =>
      `Player ${i + 1}: score=${p.overallScore}/100, balance=${p.balance}%, speed=${p.attackSpeed}m/s, power=${p.powerScore}/10, spin=${p.spinScore}/10, reflex=${p.reflexScore}/10, knee=${p.kneeBend}°, technique=${p.technique}`
    ).join('\n')

    const msg = `Video: "${videoName}"
Detected techniques: ${techniques?.join(', ') || 'unknown'}
Players detected: ${players.length}

${playerSummary}

Give pros, cons, coach tip, and tags for this clip.`

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 400,
      system: SYSTEM,
      messages: [{ role: 'user', content: msg }],
    })

    const text = (response.content[0] as any).text || '{}'
    const parsed = JSON.parse(text)
    return NextResponse.json(parsed)
  } catch (err: any) {
    console.error('Clip analysis error:', err?.message)
    return NextResponse.json({
      pros: ['Could not analyse'],
      cons: ['Check your API key and try again'],
      coachTip: 'Manual review needed.',
      tags: [],
    }, { status: 500 })
  }
}
