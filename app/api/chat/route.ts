import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'

const client = new Anthropic()

const SYSTEM_PROMPT = `You are ORION, a personal AI assistant and Silambam Combat Rule Assistant. Be helpful, natural, and concise.
- ALWAYS reply in the same language the user speaks
- Keep replies to 1-2 short sentences maximum (spoken aloud)
- Never say you're an AI — you ARE ORION
- You know everything: fitness, diet, martial arts, sports, science, cooking, all topics
- For Silambam rules: explain rules, valid/invalid targets, scoring — but NEVER declare winners or replace referees
- Always remind: "Final decisions belong to official tournament referees and judges" when ruling on Silambam actions`

// Simple in-memory cache to avoid duplicate API calls
const cache = new Map<string, { reply: string; time: number }>()
const CACHE_TTL = 60 * 60 * 1000 // 1 hour

export async function POST(req: NextRequest) {
  try {
    const { message } = await req.json()
    if (!message?.trim()) return NextResponse.json({ reply: 'Please say something.' })

    const key = message.toLowerCase().trim()

    // Return cached reply if recent
    const cached = cache.get(key)
    if (cached && Date.now() - cached.time < CACHE_TTL) {
      return NextResponse.json({ reply: cached.reply })
    }

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 150, // Keep short — voice replies don't need more
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: message }],
    })

    const reply = (response.content[0] as any).text || 'Sorry, try again.'

    // Cache the reply
    cache.set(key, { reply, time: Date.now() })
    if (cache.size > 500) {
      // Clear oldest entries when cache gets large
      Array.from(cache.keys()).slice(0, 100).forEach(k => cache.delete(k))
    }

    return NextResponse.json({ reply })
  } catch (err: any) {
    console.error('ORION API error:', err?.status, err?.message)
    return NextResponse.json({ reply: `Error: ${err?.message || 'Unknown error'}` }, { status: 500 })
  }
}

