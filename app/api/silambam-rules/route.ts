import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'
import { buildRuleContext, checkTargetArea, ORION_DISCLAIMER } from '@/lib/silambam/ruleEngine'

const client = new Anthropic()

const RULE_SYSTEM = `You are ORION, a Silambam Combat Rule Assistant.

YOUR ROLE:
- Explain Silambam rules clearly
- Check whether an action follows the rules
- Identify valid and invalid target areas
- Explain scoring rules for combat, Thanithiramai, and Kuthuvarisai
- Explain tournament court rules
- Help coaches and students understand the rulebook

YOU MUST NOT:
- Declare official winners
- Replace real judges or referees
- Give final referee decisions
- Overrule tournament officials
- Claim official authority

RESPONSE FORMAT — always follow this structure:
📋 RULE: [state the relevant rule]
✅ ALLOWED: [what is permitted]
❌ NOT ALLOWED: [what is prohibited]
📌 EXAMPLE: [practical example]
🛡️ SAFETY NOTE: [injury or safety concern if relevant]
⚖️ OFFICIAL DECISION: [remind that final call belongs to official referee/judges]

Keep each section to 1-2 sentences. Be direct and clear.
Always end with: "${ORION_DISCLAIMER}"

${buildRuleContext()}`

// Cache for repeated rule questions
const cache = new Map<string, { reply: string; time: number }>()
const CACHE_TTL = 6 * 60 * 60 * 1000 // 6 hours — rules don't change

export async function POST(req: NextRequest) {
  try {
    const { question, targetArea } = await req.json()

    // Quick target area check without AI
    if (targetArea) {
      const result = checkTargetArea(targetArea)
      return NextResponse.json({ result, type: 'target_check' })
    }

    if (!question?.trim()) {
      return NextResponse.json({ reply: 'Please ask a Silambam rule question.' })
    }

    const key = question.toLowerCase().trim()
    const cached = cache.get(key)
    if (cached && Date.now() - cached.time < CACHE_TTL) {
      return NextResponse.json({ reply: cached.reply, cached: true })
    }

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 400,
      system: RULE_SYSTEM,
      messages: [{ role: 'user', content: question }],
    })

    const reply = (response.content[0] as any).text || 'Unable to find rule. Please consult official Silambam rulebook.'

    cache.set(key, { reply, time: Date.now() })
    if (cache.size > 300) {
      Array.from(cache.keys()).slice(0, 50).forEach(k => cache.delete(k))
    }

    return NextResponse.json({ reply, type: 'rule_explanation' })
  } catch (err: any) {
    console.error('Silambam rules API error:', err?.message)
    return NextResponse.json(
      { reply: 'Rule lookup failed. Please consult official Silambam rulebook directly.' },
      { status: 500 }
    )
  }
}
