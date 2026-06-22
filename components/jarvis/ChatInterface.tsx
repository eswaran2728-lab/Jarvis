'use client'
import { useState, useRef, useEffect } from 'react'
import { Send } from 'lucide-react'
import { ChatMessage } from '@/types'
import { mockChatMessages, jarvisResponses } from '@/lib/mockData'
import { getRandomResponse } from '@/lib/utils'

const suggestedPrompts = [
  'What should I practice today?',
  'Explain basic Silambam stance',
  'How do I improve balance?',
  'Give me a training plan',
  'What is my progress?',
]

export default function ChatInterface() {
  const [messages, setMessages] = useState<ChatMessage[]>(mockChatMessages)
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

  function sendMessage(text?: string) {
    const content = text || input.trim()
    if (!content) return
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: new Date().toISOString(),
    }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setIsTyping(true)
    setTimeout(() => {
      const jarvisMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'jarvis',
        content: getRandomResponse(jarvisResponses),
        timestamp: new Date().toISOString(),
      }
      setMessages(prev => [...prev, jarvisMsg])
      setIsTyping(false)
    }, 1200)
  }

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto scrollbar-hide p-4 space-y-4">
        {messages.map(msg => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'jarvis' && (
              <div className="w-8 h-8 rounded-full bg-jarvis-blue/20 border border-jarvis-blue/40 flex items-center justify-center mr-2 flex-shrink-0 mt-1">
                <span className="text-jarvis-blue text-xs font-bold">J</span>
              </div>
            )}
            <div
              className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-jarvis-blue/20 border border-jarvis-blue/40 text-white rounded-tr-sm'
                  : 'glass border border-jarvis-border text-slate-200 rounded-tl-sm'
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex justify-start">
            <div className="w-8 h-8 rounded-full bg-jarvis-blue/20 border border-jarvis-blue/40 flex items-center justify-center mr-2 flex-shrink-0">
              <span className="text-jarvis-blue text-xs font-bold">J</span>
            </div>
            <div className="glass border border-jarvis-border px-4 py-3 rounded-2xl rounded-tl-sm">
              <div className="flex gap-1">
                {[0,1,2].map(i => (
                  <div key={i} className="w-2 h-2 rounded-full bg-jarvis-blue animate-bounce" style={{ animationDelay: `${i * 0.2}s` }} />
                ))}
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Suggested prompts */}
      <div className="px-4 pb-2 flex gap-2 overflow-x-auto scrollbar-hide">
        {suggestedPrompts.map(p => (
          <button
            key={p}
            onClick={() => sendMessage(p)}
            className="flex-shrink-0 text-xs px-3 py-2 rounded-full bg-jarvis-blue/10 border border-jarvis-blue/30 text-jarvis-blue hover:bg-jarvis-blue/20 transition-colors"
          >
            {p}
          </button>
        ))}
      </div>

      {/* Input */}
      <div className="p-4 border-t border-jarvis-border">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendMessage()}
            placeholder="Ask JARVIS anything..."
            className="flex-1 bg-jarvis-card border border-jarvis-border rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-jarvis-blue/50 transition-colors"
          />
          <button
            onClick={() => sendMessage()}
            className="p-3 rounded-xl bg-jarvis-blue/20 border border-jarvis-blue/40 text-jarvis-blue hover:bg-jarvis-blue/30 transition-colors"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  )
}
