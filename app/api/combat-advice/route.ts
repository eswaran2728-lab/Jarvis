import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'

const client = new Anthropic()

const COMBAT_SYSTEM = `You are ORION, an expert Silambam martial arts AI coach with deep knowledge of all Indian and global martial arts.

When given a pose snapshot (metrics), you must provide:
1. What technique the player is currently doing
2. What COUNTER-ATTACKS or COUNTER-MOVES they can do RIGHT NOW from this position
3. What their OPPONENT would likely do against this position
4. What they should do NEXT (1-2 moves ahead)
5. Any weakness in their current position

Format your response as:
🥢 TECHNIQUE: [what they're doing]
⚔️ COUNTER NOW: [2-3 immediate counter options]
🛡️ OPPONENT THREAT: [what opponent would do]
➡️ NEXT MOVE: [recommended next action]
⚠️ WEAKNESS: [current vulnerability]

Keep each point brief — 1 line each. Be specific to Silambam but also reference Kalaripayattu, Varma Kalai, or other traditions if relevant.`

export async function POST(req: NextRequest) {
  try {
    const { technique, overallScore, balance, kneeBend, shoulderTilt, stanceWidth, handHeight, attackSpeed, power } = await req.json()

    const userMsg = `Current pose snapshot:
- Detected technique: ${technique}
- Overall score: ${overallScore}/100
- Balance: ${balance}%
- Knee bend angle: ${kneeBend}°
- Shoulder tilt: ${shoulderTilt}°
- Stance width: ${stanceWidth}
- Hand height (relative): ${handHeight}
- Attack speed: ${attackSpeed} m/s
- Power: ${power}/100

What should this player do right now? Give counters and next moves.`

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 400,
      system: COMBAT_SYSTEM,
      messages: [{ role: 'user', content: userMsg }],
    })

    const advice = (response.content[0] as any).text || 'Unable to analyse position.'
    return NextResponse.json({ advice })
  } catch (err: any) {
    console.error('Combat advice error:', err?.message)
    return NextResponse.json({ advice: 'Could not get combat advice. Check API key.' }, { status: 500 })
  }
}
