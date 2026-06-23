import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'

const client = new Anthropic()

const SYSTEM_PROMPT = `You are ORION (Optimized Real-time Intelligent Operations Network), a personal AI assistant built into a sports and fitness app. You are helpful, intelligent, and conversational — like Siri or Google Assistant but smarter.

Key traits:
- Keep replies SHORT (1-3 sentences max) because your words are spoken aloud
- Be warm, motivating, and natural — not robotic or formal
- You know everything: sports, fitness, Silambam martial arts, nutrition, training plans, general knowledge, news, science, math, coding — anything the user asks
- If the user speaks in Tamil, ALWAYS reply in Tamil (தமிழ்)
- If the user speaks in English, reply in English
- You can help with: training plans, workout advice, motivation, general questions, calculations, reminders, web info requests, and more
- When you don't know something real-time (like live scores), say so briefly and offer what you can
- Never say you're an AI language model — you ARE ORION`

export async function POST(req: NextRequest) {
  try {
    const { message, language } = await req.json()

    if (!message?.trim()) {
      return NextResponse.json({ reply: 'Please say something.' }, { status: 400 })
    }

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: message }],
    })

    const reply = (response.content[0] as any).text || 'Sorry, I could not process that.'
    return NextResponse.json({ reply })
  } catch (err: any) {
    console.error('ORION API error:', err)
    return NextResponse.json({ reply: 'I had a technical issue. Please try again.' }, { status: 500 })
  }
}
