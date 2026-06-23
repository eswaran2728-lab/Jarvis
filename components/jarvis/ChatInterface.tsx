'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
import { Send, Mic, MicOff, Volume2 } from 'lucide-react'
import { ChatMessage } from '@/types'
import { mockChatMessages, orionResponses } from '@/lib/mockData'
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
  const [isListening, setIsListening] = useState(false)
  const [voiceSupported, setVoiceSupported] = useState(false)
  const [voiceStatus, setVoiceStatus] = useState<'idle' | 'listening' | 'processing'>('idle')
  const [transcript, setTranscript] = useState('')

  const bottomRef = useRef<HTMLDivElement>(null)
  const recognitionRef = useRef<any>(null)
  const restartTimerRef = useRef<any>(null)
  const messagesRef = useRef<ChatMessage[]>(mockChatMessages)

  // Keep messagesRef in sync so we can use it inside callbacks
  useEffect(() => {
    messagesRef.current = messages
  }, [messages])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

  // Send message and get ORION reply
  const sendMessage = useCallback((text?: string) => {
    const content = (text || input).trim()
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
    setVoiceStatus('processing')

    // ORION replies after 1.2 seconds
    setTimeout(() => {
      const reply = getRandomResponse(orionResponses)
      const orionMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'orion',
        content: reply,
        timestamp: new Date().toISOString(),
      }
      setMessages(prev => [...prev, orionMsg])
      setIsTyping(false)
      setVoiceStatus('listening')

      // Speak reply using browser TTS
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel()
        const utterance = new SpeechSynthesisUtterance(reply)
        utterance.rate = 0.95
        utterance.pitch = 0.9
        utterance.volume = 1
        window.speechSynthesis.speak(utterance)
      }
    }, 1200)
  }, [input])

  // Setup always-on voice recognition
  const setupRecognition = useCallback(() => {
    if (typeof window === 'undefined') return
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) return

    setVoiceSupported(true)
    const rec = new SR()
    rec.continuous = true        // Keep listening continuously
    rec.interimResults = true    // Show live transcript
    rec.lang = 'en-US'

    rec.onstart = () => {
      setIsListening(true)
      setVoiceStatus('listening')
    }

    rec.onresult = (e: any) => {
      let interimText = ''
      let finalText = ''

      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript
        if (e.results[i].isFinal) {
          finalText += t
        } else {
          interimText += t
        }
      }

      // Show live transcript
      setTranscript(interimText || finalText)

      // When speech is final — send it
      if (finalText.trim()) {
        setTranscript('')
        sendMessage(finalText.trim())
      }
    }

    rec.onerror = (e: any) => {
      if (e.error === 'no-speech' || e.error === 'audio-capture') {
        // Silently restart — normal behaviour
        return
      }
      setIsListening(false)
    }

    rec.onend = () => {
      // Auto-restart to keep always listening (like Siri)
      if (recognitionRef.current) {
        restartTimerRef.current = setTimeout(() => {
          try { recognitionRef.current?.start() } catch {}
        }, 300)
      }
    }

    recognitionRef.current = rec
    return rec
  }, [sendMessage])

  // Start always-on listening automatically when page loads
  useEffect(() => {
    const rec = setupRecognition()
    if (rec) {
      setTimeout(() => {
        try { rec.start() } catch {}
      }, 800)
    }

    return () => {
      clearTimeout(restartTimerRef.current)
      if (recognitionRef.current) {
        const r = recognitionRef.current
        recognitionRef.current = null // Stop auto-restart
        try { r.stop() } catch {}
      }
    }
  }, [setupRecognition])

  // Toggle listening on/off manually
  function toggleListening() {
    if (isListening) {
      // Stop
      recognitionRef.current = null
      clearTimeout(restartTimerRef.current)
      try { recognitionRef.current?.stop() } catch {}
      setIsListening(false)
      setVoiceStatus('idle')
      setTranscript('')
    } else {
      // Restart
      const rec = setupRecognition()
      if (rec) {
        try { rec.start() } catch {}
      }
    }
  }

  return (
    <div className="flex flex-col h-full min-h-0">

      {/* Voice status bar */}
      {voiceSupported && (
        <div className={`flex items-center gap-2 px-4 py-2 border-b border-orion-border flex-shrink-0 transition-all ${
          voiceStatus === 'listening' ? 'bg-green-500/5' :
          voiceStatus === 'processing' ? 'bg-orion-blue/5' : 'bg-transparent'
        }`}>
          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
            voiceStatus === 'listening' ? 'bg-green-400 animate-pulse' :
            voiceStatus === 'processing' ? 'bg-orion-blue animate-pulse' :
            'bg-slate-600'
          }`} />
          <span className="text-xs text-slate-400 flex-1">
            {voiceStatus === 'listening' && (transcript ? `"${transcript}"` : 'ORION is listening... speak now')}
            {voiceStatus === 'processing' && 'ORION is thinking...'}
            {voiceStatus === 'idle' && 'Voice is off'}
          </span>
          <button
            onClick={toggleListening}
            className={`p-1.5 rounded-lg transition-colors ${
              isListening ? 'text-green-400 hover:bg-green-400/10' : 'text-slate-500 hover:bg-white/5'
            }`}
          >
            {isListening ? <Mic size={14} /> : <MicOff size={14} />}
          </button>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto scrollbar-hide p-4 space-y-4 min-h-0">
        {messages.map(msg => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'orion' && (
              <div className="w-8 h-8 rounded-full bg-orion-blue/20 border border-orion-blue/40 flex items-center justify-center mr-2 flex-shrink-0 mt-1">
                <span className="text-orion-blue text-xs font-bold">O</span>
              </div>
            )}
            <div className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
              msg.role === 'user'
                ? 'bg-orion-blue/20 border border-orion-blue/40 text-white rounded-tr-sm'
                : 'bg-slate-800/80 border border-slate-700 text-slate-200 rounded-tl-sm'
            }`}>
              {msg.content}
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {isTyping && (
          <div className="flex justify-start">
            <div className="w-8 h-8 rounded-full bg-orion-blue/20 border border-orion-blue/40 flex items-center justify-center mr-2 flex-shrink-0">
              <span className="text-orion-blue text-xs font-bold">O</span>
            </div>
            <div className="bg-slate-800/80 border border-slate-700 px-4 py-3 rounded-2xl rounded-tl-sm">
              <div className="flex gap-1 items-center">
                {[0,1,2].map(i => (
                  <div key={i} className="w-2 h-2 rounded-full bg-orion-blue animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                ))}
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Suggested prompts */}
      <div className="px-4 pb-2 flex gap-2 overflow-x-auto scrollbar-hide flex-shrink-0">
        {suggestedPrompts.map(p => (
          <button
            key={p}
            onClick={() => sendMessage(p)}
            className="flex-shrink-0 text-xs px-3 py-2 rounded-full bg-orion-blue/10 border border-orion-blue/30 text-orion-blue hover:bg-orion-blue/20 transition-colors"
          >
            {p}
          </button>
        ))}
      </div>

      {/* Text input */}
      <div className="p-4 border-t border-orion-border flex-shrink-0">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && input.trim()) sendMessage() }}
            placeholder="Type or just speak to ORION..."
            className="flex-1 bg-slate-800/80 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-orion-blue/60 transition-colors"
          />
          <button
            onClick={() => sendMessage()}
            disabled={!input.trim()}
            className="p-3 rounded-xl bg-orion-blue/20 border border-orion-blue/40 text-orion-blue hover:bg-orion-blue/30 transition-colors disabled:opacity-40"
          >
            <Send size={18} />
          </button>
        </div>
        {!voiceSupported && (
          <p className="text-xs text-slate-600 mt-2 text-center">Voice not supported on this browser. Use text input.</p>
        )}
      </div>
    </div>
  )
}
