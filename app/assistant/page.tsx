'use client'
import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import AppShell from '@/components/layout/AppShell'
import { Mic, MicOff, Volume2, VolumeX } from 'lucide-react'

type Status = 'idle' | 'listening' | 'processing' | 'speaking'

const statusColors: Record<Status, string> = {
  idle:       '#475569',
  listening:  '#00ff88',
  processing: '#00d4ff',
  speaking:   '#a855f7',
}

const statusLabels: Record<Status, string> = {
  idle:       'Tap mic to start',
  listening:  'Listening...',
  processing: 'Thinking...',
  speaking:   'Speaking...',
}

// App/URL commands ORION can open
function handleAppCommand(text: string): { handled: boolean; reply: string; action?: () => void } {
  const t = text.toLowerCase()

  const appMap: Array<{ keywords: string[]; url: string; name: string }> = [
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
    { keywords: ['camera', 'training'], url: '/training', name: 'Training', internal: true } as any,
    { keywords: ['silambam', 'coach'], url: '/training/silambam', name: 'Silambam Coach', internal: true } as any,
    { keywords: ['dashboard', 'home'], url: '/dashboard', name: 'Dashboard', internal: true } as any,
    { keywords: ['task', 'tasks', 'to do'], url: '/tasks', name: 'Tasks', internal: true } as any,
    { keywords: ['reminder', 'reminders'], url: '/reminders', name: 'Reminders', internal: true } as any,
    { keywords: ['progress'], url: '/progress', name: 'Progress', internal: true } as any,
    { keywords: ['settings', 'setting'], url: '/settings', name: 'Settings', internal: true } as any,
    { keywords: ['athlete plan', 'workout plan', 'training plan'], url: '/training/plan', name: 'Athlete Plan', internal: true } as any,
    { keywords: ['video analysis', 'video'], url: '/training/video', name: 'Video Analysis', internal: true } as any,
  ]

  // Must be an "open" command
  if (!/open|launch|go to|take me|show me|start|load/.test(t)) {
    return { handled: false, reply: '' }
  }

  for (const app of appMap) {
    if (app.keywords.some(k => t.includes(k))) {
      return {
        handled: true,
        reply: `Opening ${app.name} for you!`,
        action: () => {
          if ((app as any).internal) {
            window.location.href = app.url
          } else {
            window.open(app.url, '_blank')
          }
        },
      }
    }
  }

  return { handled: false, reply: '' }
}

export default function AssistantPage() {
  const [status, setStatus]         = useState<Status>('idle')
  const [voiceOn, setVoiceOn]       = useState(false)
  const [muted, setMuted]           = useState(false)
  const [userSaid, setUserSaid]     = useState('')
  const [orionReply, setOrionReply] = useState('ORION is online. Tap the mic and talk to me.')
  const [inputText, setInputText]   = useState('')
  const [supported, setSupported]   = useState(false)
  const [langCode, setLangCode]     = useState('en-US')

  const router = useRouter()
  const langRef = useRef('en-US')

  // Single refs — no closures capturing stale state
  const recRef       = useRef<any>(null)
  const statusRef    = useRef<Status>('idle')
  const voiceOnRef   = useRef(false)
  const mutedRef     = useRef(false)
  const timerRef     = useRef<any>(null)

  const setS = (s: Status) => { statusRef.current = s; setStatus(s) }

  useEffect(() => { voiceOnRef.current = voiceOn }, [voiceOn])
  useEffect(() => { mutedRef.current = muted }, [muted])
  useEffect(() => { langRef.current = langCode }, [langCode])

  useEffect(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    setSupported(!!SR)
    return () => {
      clearTimeout(timerRef.current)
      killMic()
      window.speechSynthesis?.cancel()
    }
  }, [])

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
    rec.continuous     = false
    rec.interimResults = false
    rec.lang           = langRef.current
    rec.maxAlternatives = 1
    recRef.current = rec

    rec.onresult = (e: any) => {
      const text = (e.results?.[0]?.[0]?.transcript || '').trim()
      killMic()
      if (text) processInput(text)
    }

    rec.onerror = () => {
      // Silently restart after short delay
      timerRef.current = setTimeout(() => startListening(), 500)
    }

    rec.onend = () => {
      // Restart only if still in listening state
      if (statusRef.current === 'listening') {
        timerRef.current = setTimeout(() => startListening(), 300)
      }
    }

    try { rec.start(); setS('listening') } catch {}
  }

  function processInput(text: string) {
    setUserSaid(text)
    setS('processing')

    // Check app-open commands first
    const cmd = handleAppCommand(text)
    if (cmd.handled) {
      setOrionReply(cmd.reply)
      speakAndResume(cmd.reply, () => {
        setTimeout(() => cmd.action?.(), 800)
      })
      return
    }

    // Real AI response
    fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: text, language: langRef.current }),
    })
      .then(r => r.json())
      .then(data => {
        const reply = data.reply || 'Sorry, I could not understand that.'
        setOrionReply(reply)
        speakAndResume(reply)
      })
      .catch(() => {
        const err = 'I had a connection issue. Please try again.'
        setOrionReply(err)
        speakAndResume(err)
      })
  }

  function speakAndResume(text: string, onDone?: () => void) {
    if (mutedRef.current || !window.speechSynthesis) {
      onDone?.()
      if (voiceOnRef.current) {
        setS('listening')
        startListening()
      } else {
        setS('idle')
      }
      return
    }

    setS('speaking')
    window.speechSynthesis.cancel()

    const u = new SpeechSynthesisUtterance(text)
    u.rate   = 1.05
    u.pitch  = 1.0
    u.volume = 1

    // Pick best available voice
    const voices = window.speechSynthesis.getVoices()
    const baseLang = langRef.current.split('-')[0]
    const preferred = voices.find(v => v.lang.startsWith(baseLang)) ||
      voices.find(v => v.lang.startsWith('en'))
    if (preferred) u.voice = preferred

    const resume = () => {
      onDone?.()
      if (voiceOnRef.current) {
        // Wait for echo to die before listening again
        timerRef.current = setTimeout(() => {
          setS('listening')
          startListening()
        }, 700)
      } else {
        setS('idle')
      }
    }

    u.onend   = resume
    u.onerror = resume

    window.speechSynthesis.speak(u)
  }

  function toggleVoice() {
    if (voiceOn) {
      clearTimeout(timerRef.current)
      killMic()
      window.speechSynthesis?.cancel()
      voiceOnRef.current = false
      setVoiceOn(false)
      setS('idle')
    } else {
      voiceOnRef.current = true
      setVoiceOn(true)
      startListening()
    }
  }

  function changeLang(code: string) {
    langRef.current = code
    setLangCode(code)
    if (voiceOnRef.current && statusRef.current === 'listening') {
      killMic()
      setTimeout(() => startListening(), 200)
    }
  }

  function sendText() {
    const text = inputText.trim()
    if (!text) return
    setInputText('')
    killMic()
    processInput(text)
  }

  const color = statusColors[status]

  return (
    <AppShell>
      <div className="flex flex-col items-center justify-between min-h-screen pb-24 lg:pb-6 px-6 py-8 relative overflow-hidden">

        {/* Background glow */}
        <div className="absolute inset-0 pointer-events-none transition-all duration-1000"
          style={{ background: `radial-gradient(ellipse 60% 50% at 50% 40%, ${color}08 0%, transparent 70%)` }} />

        {/* Header */}
        <div className="relative z-10 text-center flex flex-col items-center gap-2">
          <p className="text-orion-blue text-xs tracking-[0.3em] uppercase font-semibold">ORION AI</p>
          <p className="text-slate-500 text-xs">Speak any language — ORION understands all</p>
          <select
            value={langCode}
            onChange={e => changeLang(e.target.value)}
            className="text-xs px-3 py-1 rounded-full border border-orion-blue/40 bg-slate-900 text-orion-blue focus:outline-none cursor-pointer">
            <option value="en-US">🇬🇧 English</option>
            <option value="ta-IN">🇮🇳 Tamil / தமிழ்</option>
            <option value="hi-IN">🇮🇳 Hindi / हिंदी</option>
            <option value="ar-SA">🇸🇦 Arabic / عربي</option>
            <option value="zh-CN">🇨🇳 Chinese / 中文</option>
            <option value="fr-FR">🇫🇷 French / Français</option>
            <option value="es-ES">🇪🇸 Spanish / Español</option>
            <option value="de-DE">🇩🇪 German / Deutsch</option>
            <option value="ja-JP">🇯🇵 Japanese / 日本語</option>
            <option value="ko-KR">🇰🇷 Korean / 한국어</option>
            <option value="pt-BR">🇧🇷 Portuguese</option>
            <option value="ru-RU">🇷🇺 Russian / Русский</option>
            <option value="ml-IN">🇮🇳 Malayalam / മലയാളം</option>
            <option value="te-IN">🇮🇳 Telugu / తెలుగు</option>
            <option value="kn-IN">🇮🇳 Kannada / ಕನ್ನಡ</option>
            <option value="ur-PK">🇵🇰 Urdu / اردو</option>
            <option value="it-IT">🇮🇹 Italian / Italiano</option>
            <option value="tr-TR">🇹🇷 Turkish / Türkçe</option>
            <option value="vi-VN">🇻🇳 Vietnamese</option>
            <option value="th-TH">🇹🇭 Thai / ภาษาไทย</option>
          </select>
        </div>

        {/* Orb */}
        <div className="relative z-10 flex flex-col items-center gap-6 flex-1 justify-center w-full">
          <div className="relative flex items-center justify-center" style={{ width: 220, height: 220 }}>
            <div className="absolute inset-0 rounded-full border"
              style={{ borderColor: `${color}40`, animation: 'rotate-ring 8s linear infinite' }} />
            <div className="absolute rounded-full border"
              style={{ inset: 18, borderColor: `${color}30`, animation: 'rotate-ring 5s linear infinite reverse' }} />
            <div className="absolute rounded-full border"
              style={{ inset: 36, borderColor: `${color}50` }} />
            <div className="absolute rounded-full orb-pulse"
              style={{
                inset: 50,
                background: `radial-gradient(circle at 35% 35%, ${color}33, ${color}08, #050810)`,
                boxShadow: `0 0 40px ${color}44, inset 0 0 20px ${color}22`,
                border: `1px solid ${color}44`,
              }} />
            <div className="absolute rounded-full"
              style={{ width: 20, height: 20, background: color, boxShadow: `0 0 16px ${color}` }} />
            {(status === 'listening' || status === 'speaking') && (
              <>
                <div className="absolute rounded-full animate-ping opacity-20"
                  style={{ inset: 40, borderWidth: 2, borderStyle: 'solid', borderColor: color }} />
                <div className="absolute rounded-full animate-ping opacity-10"
                  style={{ inset: 20, borderWidth: 1, borderStyle: 'solid', borderColor: color, animationDelay: '0.5s' }} />
              </>
            )}
          </div>

          <p className="text-sm font-semibold" style={{ color }}>{statusLabels[status]}</p>

          {userSaid && (
            <p className="text-xs text-slate-400 italic text-center">You: "{userSaid}"</p>
          )}

          {/* ORION reply */}
          <div className="glass rounded-2xl border p-5 max-w-sm w-full text-center"
            style={{ borderColor: `${color}30` }}>
            <p className="text-xs mb-2 font-semibold uppercase tracking-widest" style={{ color }}>ORION</p>
            <p className="text-slate-200 text-sm leading-relaxed">{orionReply}</p>
          </div>

          {/* Example commands hint */}
          <div className="glass rounded-xl border border-slate-700/50 px-4 py-3 max-w-sm w-full">
            <p className="text-xs text-slate-500 text-center mb-2">Try asking anything...</p>
            <div className="flex flex-wrap gap-1 justify-center">
              {['"Diet plan for weight loss"', '"Silambam training tips"', '"Open WhatsApp"', '"Motivate me"', '"Workout for abs"'].map(e => (
                <span key={e} className="text-xs text-slate-400 bg-slate-800 px-2 py-1 rounded-lg">{e}</span>
              ))}
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="relative z-10 w-full max-w-sm space-y-3">
          {/* Text input */}
          <div className="flex gap-2">
            <input
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendText()}
              placeholder="Type a command or question..."
              className="flex-1 bg-slate-800/80 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-orion-blue/50"
            />
            <button onClick={sendText} disabled={!inputText.trim()}
              className="px-4 py-3 rounded-xl bg-orion-blue/20 border border-orion-blue/40 text-orion-blue text-sm font-medium hover:bg-orion-blue/30 disabled:opacity-30 transition-colors">
              Send
            </button>
          </div>

          {/* Mic + mute */}
          <div className="flex gap-3">
            {supported ? (
              <button onClick={toggleVoice}
                className="flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl border-2 font-semibold transition-all active:scale-95"
                style={{
                  borderColor: voiceOn ? color : '#334155',
                  background: voiceOn ? `${color}15` : 'transparent',
                  color: voiceOn ? color : '#64748b',
                }}>
                {voiceOn ? <Mic size={20} /> : <MicOff size={20} />}
                {voiceOn
                  ? status === 'speaking' ? 'ORION Speaking...'
                  : status === 'processing' ? 'Processing...'
                  : 'Listening — speak now'
                  : 'Tap to Talk'}
              </button>
            ) : (
              <div className="flex-1 py-4 rounded-2xl border border-slate-700 text-slate-600 text-sm text-center">
                Voice not supported on this browser
              </div>
            )}
            <button onClick={() => setMuted(m => !m)}
              className="p-4 rounded-2xl border border-slate-700 text-slate-500 hover:text-white transition-colors">
              {muted ? <VolumeX size={20} /> : <Volume2 size={20} />}
            </button>
          </div>

          {/* Quick chips */}
          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
            {['Motivate me', 'Diet plan', 'Silambam tips', 'Open YouTube', 'Workout plan', 'Mental focus'].map(p => (
              <button key={p} onClick={() => processInput(p)}
                className="flex-shrink-0 text-xs px-3 py-2 rounded-full bg-orion-blue/10 border border-orion-blue/20 text-orion-blue hover:bg-orion-blue/20 transition-colors">
                {p}
              </button>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  )
}
