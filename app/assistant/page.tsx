'use client'
import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import AppShell from '@/components/layout/AppShell'
import { Mic, MicOff, Send, Volume2, VolumeX, Globe } from 'lucide-react'

type Status = 'idle' | 'listening' | 'processing' | 'speaking'

type Message = {
  id: string
  role: 'user' | 'orion'
  text: string
  time: string
}

function handleAppCommand(text: string): { handled: boolean; reply: string; action?: () => void } {
  const t = text.toLowerCase()
  const appMap: Array<{ keywords: string[]; url: string; name: string; internal?: boolean }> = [
    { keywords: ['whatsapp', 'what app', 'whats app'], url: 'https://web.whatsapp.com', name: 'WhatsApp' },
    { keywords: ['youtube', 'you tube'], url: 'https://youtube.com', name: 'YouTube' },
    { keywords: ['instagram', 'insta'], url: 'https://instagram.com', name: 'Instagram' },
    { keywords: ['facebook', 'fb'], url: 'https://facebook.com', name: 'Facebook' },
    { keywords: ['twitter', 'x app'], url: 'https://twitter.com', name: 'Twitter' },
    { keywords: ['google'], url: 'https://google.com', name: 'Google' },
    { keywords: ['maps', 'google maps', 'navigation'], url: 'https://maps.google.com', name: 'Google Maps' },
    { keywords: ['gmail', 'email'], url: 'https://mail.google.com', name: 'Gmail' },
    { keywords: ['spotify', 'music'], url: 'https://open.spotify.com', name: 'Spotify' },
    { keywords: ['netflix'], url: 'https://netflix.com', name: 'Netflix' },
    { keywords: ['tiktok', 'tik tok'], url: 'https://tiktok.com', name: 'TikTok' },
    { keywords: ['training', 'camera'], url: '/training', name: 'Training', internal: true },
    { keywords: ['silambam', 'coach'], url: '/training/silambam', name: 'Silambam Coach', internal: true },
    { keywords: ['dashboard', 'home'], url: '/dashboard', name: 'Dashboard', internal: true },
    { keywords: ['task', 'tasks', 'to do'], url: '/tasks', name: 'Tasks', internal: true },
    { keywords: ['video analysis', 'video'], url: '/training/video', name: 'Video Analysis', internal: true },
    { keywords: ['athlete plan', 'workout plan', 'training plan'], url: '/training/plan', name: 'Athlete Plan', internal: true },
  ]
  if (!/open|launch|go to|take me|show me|start|load/.test(t)) return { handled: false, reply: '' }
  for (const app of appMap) {
    if (app.keywords.some(k => t.includes(k))) {
      return {
        handled: true,
        reply: `Opening ${app.name} for you!`,
        action: () => app.internal ? (window.location.href = app.url) : window.open(app.url, '_blank'),
      }
    }
  }
  return { handled: false, reply: '' }
}

const LANGUAGES = [
  { code: 'en-US', label: 'English', flag: '🇬🇧' },
  { code: 'ta-IN', label: 'Tamil', flag: '🇮🇳' },
  { code: 'hi-IN', label: 'Hindi', flag: '🇮🇳' },
  { code: 'ar-SA', label: 'Arabic', flag: '🇸🇦' },
  { code: 'zh-CN', label: 'Chinese', flag: '🇨🇳' },
  { code: 'fr-FR', label: 'French', flag: '🇫🇷' },
  { code: 'es-ES', label: 'Spanish', flag: '🇪🇸' },
  { code: 'de-DE', label: 'German', flag: '🇩🇪' },
  { code: 'ja-JP', label: 'Japanese', flag: '🇯🇵' },
  { code: 'ko-KR', label: 'Korean', flag: '🇰🇷' },
  { code: 'ml-IN', label: 'Malayalam', flag: '🇮🇳' },
  { code: 'te-IN', label: 'Telugu', flag: '🇮🇳' },
]

export default function AssistantPage() {
  const [messages, setMessages]       = useState<Message[]>([
    { id: '0', role: 'orion', text: 'Hi! I\'m ORION — your personal AI. Ask me anything about fitness, diet, martial arts, or anything in the world. You can type or use voice.', time: now() }
  ])
  const [input, setInput]             = useState('')
  const [status, setStatus]           = useState<Status>('idle')
  const [voiceOn, setVoiceOn]         = useState(false)
  const [muted, setMuted]             = useState(false)
  const [supported, setSupported]     = useState(false)
  const [langCode, setLangCode]       = useState('en-US')
  const [showLang, setShowLang]       = useState(false)

  const bottomRef   = useRef<HTMLDivElement>(null)
  const recRef      = useRef<any>(null)
  const statusRef   = useRef<Status>('idle')
  const voiceOnRef  = useRef(false)
  const mutedRef    = useRef(false)
  const langRef     = useRef('en-US')
  const timerRef    = useRef<any>(null)

  const setS = (s: Status) => { statusRef.current = s; setStatus(s) }

  useEffect(() => { voiceOnRef.current = voiceOn }, [voiceOn])
  useEffect(() => { mutedRef.current = muted }, [muted])
  useEffect(() => { langRef.current = langCode }, [langCode])

  useEffect(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    setSupported(!!SR)
    return () => { clearTimeout(timerRef.current); killMic(); window.speechSynthesis?.cancel() }
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  function now() {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  function addMessage(role: 'user' | 'orion', text: string) {
    setMessages(prev => [...prev, { id: Date.now().toString(), role, text, time: now() }])
  }

  function killMic() {
    try { recRef.current?.abort() } catch {}
    recRef.current = null
  }

  function startListening() {
    if (!voiceOnRef.current) return
    if (statusRef.current === 'processing' || statusRef.current === 'speaking') return
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) return
    killMic()
    const rec = new SR()
    rec.continuous = false
    rec.interimResults = false
    rec.lang = langRef.current
    rec.maxAlternatives = 1
    recRef.current = rec
    rec.onresult = (e: any) => {
      const text = (e.results?.[0]?.[0]?.transcript || '').trim()
      killMic()
      if (text) processInput(text)
    }
    rec.onerror = () => { timerRef.current = setTimeout(() => startListening(), 500) }
    rec.onend = () => { if (statusRef.current === 'listening') timerRef.current = setTimeout(() => startListening(), 300) }
    try { rec.start(); setS('listening') } catch {}
  }

  function processInput(text: string) {
    addMessage('user', text)
    setS('processing')

    const cmd = handleAppCommand(text)
    if (cmd.handled) {
      addMessage('orion', cmd.reply)
      speakAndResume(cmd.reply, () => setTimeout(() => cmd.action?.(), 800))
      return
    }

    fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: text }),
    })
      .then(r => r.json())
      .then(data => {
        const reply = data.reply || 'Sorry, try again.'
        addMessage('orion', reply)
        speakAndResume(reply)
      })
      .catch(() => {
        const err = 'Connection issue. Please try again.'
        addMessage('orion', err)
        speakAndResume(err)
      })
  }

  function speakAndResume(text: string, onDone?: () => void) {
    if (mutedRef.current || !window.speechSynthesis) {
      onDone?.()
      if (voiceOnRef.current) { setS('listening'); startListening() } else setS('idle')
      return
    }
    setS('speaking')
    window.speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(text)
    u.rate = 1.05; u.pitch = 1.0; u.volume = 1
    const voices = window.speechSynthesis.getVoices()
    const base = langRef.current.split('-')[0]
    const preferred = voices.find(v => v.lang.startsWith(base)) || voices.find(v => v.lang.startsWith('en'))
    if (preferred) u.voice = preferred
    const resume = () => {
      onDone?.()
      if (voiceOnRef.current) {
        timerRef.current = setTimeout(() => { setS('listening'); startListening() }, 700)
      } else setS('idle')
    }
    u.onend = resume; u.onerror = resume
    window.speechSynthesis.speak(u)
  }

  function toggleVoice() {
    if (voiceOn) {
      clearTimeout(timerRef.current); killMic(); window.speechSynthesis?.cancel()
      voiceOnRef.current = false; setVoiceOn(false); setS('idle')
    } else {
      voiceOnRef.current = true; setVoiceOn(true); startListening()
    }
  }

  function sendMessage() {
    const text = input.trim()
    if (!text || status === 'processing') return
    setInput('')
    killMic()
    processInput(text)
  }

  const currentLang = LANGUAGES.find(l => l.code === langCode) || LANGUAGES[0]

  return (
    <AppShell>
      <div className="flex flex-col h-screen pb-20 lg:pb-0">

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-orion-dark/80 backdrop-blur sticky top-0 z-20">
          <div>
            <p className="text-orion-blue text-sm font-bold tracking-widest uppercase">ORION AI</p>
            <p className="text-slate-500 text-xs">
              {status === 'listening' ? '🟢 Listening...' :
               status === 'processing' ? '🔵 Thinking...' :
               status === 'speaking' ? '🟣 Speaking...' : 'Your personal AI'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* Language picker */}
            <div className="relative">
              <button onClick={() => setShowLang(v => !v)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-full border border-slate-700 text-xs text-slate-300 hover:border-orion-blue/50 transition-colors">
                <Globe size={12} />
                {currentLang.flag} {currentLang.label}
              </button>
              {showLang && (
                <div className="absolute right-0 top-9 z-50 bg-slate-900 border border-slate-700 rounded-2xl shadow-xl overflow-hidden w-44">
                  {LANGUAGES.map(l => (
                    <button key={l.code} onClick={() => { setLangCode(l.code); langRef.current = l.code; setShowLang(false); if (voiceOnRef.current) { killMic(); setTimeout(() => startListening(), 200) } }}
                      className={`w-full flex items-center gap-2 px-4 py-2.5 text-xs hover:bg-slate-800 transition-colors ${langCode === l.code ? 'text-orion-blue' : 'text-slate-300'}`}>
                      {l.flag} {l.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button onClick={() => setMuted(m => !m)} className="p-2 rounded-full text-slate-500 hover:text-white transition-colors">
              {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {messages.map(msg => (
            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'orion' && (
                <div className="w-7 h-7 rounded-full bg-orion-blue/20 border border-orion-blue/40 flex items-center justify-center mr-2 mt-1 flex-shrink-0">
                  <span className="text-orion-blue text-[10px] font-bold">O</span>
                </div>
              )}
              <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                msg.role === 'user'
                  ? 'bg-orion-blue text-white rounded-br-sm'
                  : 'bg-slate-800 text-slate-100 rounded-bl-sm border border-slate-700'
              }`}>
                <p className="text-sm leading-relaxed">{msg.text}</p>
                <p className="text-[10px] mt-1 opacity-50 text-right">{msg.time}</p>
              </div>
            </div>
          ))}
          {status === 'processing' && (
            <div className="flex justify-start">
              <div className="w-7 h-7 rounded-full bg-orion-blue/20 border border-orion-blue/40 flex items-center justify-center mr-2 flex-shrink-0">
                <span className="text-orion-blue text-[10px] font-bold">O</span>
              </div>
              <div className="bg-slate-800 border border-slate-700 rounded-2xl rounded-bl-sm px-4 py-3">
                <div className="flex gap-1 items-center">
                  <span className="w-2 h-2 bg-orion-blue rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 bg-orion-blue rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 bg-orion-blue rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Quick chips */}
        <div className="px-4 pb-2 flex gap-2 overflow-x-auto scrollbar-hide">
          {['Motivate me 💪', 'Diet plan 🥗', 'Silambam tips 🥢', 'Workout for abs', 'Mental focus 🧠'].map(p => (
            <button key={p} onClick={() => processInput(p)}
              className="flex-shrink-0 text-xs px-3 py-1.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300 hover:border-orion-blue/50 hover:text-orion-blue transition-colors whitespace-nowrap">
              {p}
            </button>
          ))}
        </div>

        {/* Input bar */}
        <div className="px-4 pb-4 pt-1">
          <div className="flex items-center gap-2 bg-slate-800 border border-slate-700 rounded-2xl px-3 py-2 focus-within:border-orion-blue/50 transition-colors">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
              placeholder="Message ORION..."
              className="flex-1 bg-transparent text-sm text-white placeholder-slate-500 focus:outline-none"
            />
            {/* Voice toggle — secondary, inside input bar */}
            {supported && (
              <button onClick={toggleVoice}
                className={`p-2 rounded-xl transition-all ${voiceOn ? 'text-green-400 bg-green-400/10' : 'text-slate-500 hover:text-slate-300'}`}
                title={voiceOn ? 'Voice ON — tap to stop' : 'Tap for voice'}>
                {voiceOn ? <Mic size={18} /> : <MicOff size={18} />}
              </button>
            )}
            <button onClick={sendMessage} disabled={!input.trim() || status === 'processing'}
              className="p-2 rounded-xl bg-orion-blue text-white disabled:opacity-30 hover:bg-orion-blue/80 transition-all">
              <Send size={16} />
            </button>
          </div>
          {voiceOn && (
            <p className="text-center text-xs mt-1.5" style={{ color: status === 'listening' ? '#00ff88' : status === 'speaking' ? '#a855f7' : '#00d4ff' }}>
              {status === 'listening' ? '🎤 Listening — speak now' : status === 'speaking' ? '🔊 Speaking...' : '⏳ Processing...'}
            </p>
          )}
        </div>

      </div>
    </AppShell>
  )
}
