import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'

const client = new Anthropic()

const COMBAT_SYSTEM = `You are ORION, a Silambam AI coach. Talk in easy simple English — short words, like a coach talking to a student. If student talks Tanglish (Tamil + English), you also reply in Tanglish naturally.

When given a pose snapshot, give:
1. What technique they are doing now
2. What counter-moves they can do RIGHT NOW
3. What the opponent will likely do
4. What to do NEXT (1-2 moves)
5. Any weakness in their position

Format:
🥢 TECHNIQUE: [what they're doing]
⚔️ COUNTER NOW: [2-3 counter options]
🛡️ OPPONENT THREAT: [what opponent will do]
➡️ NEXT MOVE: [what to do next]
⚠️ WEAKNESS: [current weak point]

Keep each point 1 line. Be direct, simple, practical.`

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
