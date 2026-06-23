'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
import AppShell from '@/components/layout/AppShell'
import { Mic, MicOff, Volume2, VolumeX } from 'lucide-react'
import { orionResponses } from '@/lib/mockData'
import { getRandomResponse } from '@/lib/utils'

type Status = 'idle' | 'listening' | 'processing' | 'speaking'

const statusColors: Record<Status, string> = {
  idle:       '#475569',
  listening:  '#00ff88',
  processing: '#00d4ff',
  speaking:   '#a855f7',
}

const statusLabels: Record<Status, string> = {
  idle:       'ORION is standby',
  listening:  'Listening...',
  processing: 'ORION is thinking...',
  speaking:   'ORION is speaking...',
}

export default function AssistantPage() {
  const [status, setStatus]           = useState<Status>('idle')
  const [voiceOn, setVoiceOn]         = useState(false)
  const [muteReply, setMuteReply]     = useState(false)
  const [userSaid, setUserSaid]       = useState('')
  const [orionReply, setOrionReply]   = useState('Sir, ORION is online. Your Personal AI Command Center is ready.')
  const [inputText, setInputText]     = useState('')
  const [voiceSupported, setVoiceSupported] = useState(false)

  const recRef       = useRef<any>(null)
  const restartRef   = useRef<ReturnType<typeof setTimeout> | null>(null)
  const activeRef    = useRef(false)   // true while we want listening to be ON

  const color = statusColors[status]

  // Speak reply via browser TTS
  const speak = useCallback((text: string) => {
    if (muteReply || typeof window === 'undefined' || !window.speechSynthesis) return
    window.speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(text)
    u.rate  = 0.92
    u.pitch = 0.85
    u.volume = 1
    u.onstart = () => setStatus('speaking')
    u.onend   = () => {
      setStatus(activeRef.current ? 'listening' : 'idle')
    }
    window.speechSynthesis.speak(u)
  }, [muteReply])

  // Reply from ORION
  const orionRespond = useCallback((question: string) => {
    setStatus('processing')
    setUserSaid(question)
    setTimeout(() => {
      const reply = getRandomResponse(orionResponses)
      setOrionReply(reply)
      if (!muteReply) {
        speak(reply)
      } else {
        setStatus(activeRef.current ? 'listening' : 'idle')
      }
    }, 900)
  }, [muteReply, speak])

  // Build recognition instance
  const buildRec = useCallback(() => {
    if (typeof window === 'undefined') return null
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) return null

    const rec = new SR()
    rec.continuous      = false   // single utterance — stops glitching
    rec.interimResults  = false
    rec.lang            = 'en-US'

    rec.onresult = (e: any) => {
      const text = e.results[0][0].transcript.trim()
      if (text) orionRespond(text)
    }

    rec.onend = () => {
      // Auto-restart only if we still want to listen and not speaking
      if (activeRef.current && status !== 'speaking') {
        restartRef.current = setTimeout(() => {
          if (activeRef.current && recRef.current) {
            try { recRef.current.start() } catch {}
          }
        }, 400)
      }
    }

    rec.onerror = (e: any) => {
      if (e.error === 'no-speech') {
        // normal — just restart quietly
        if (activeRef.current) {
          restartRef.current = setTimeout(() => {
            if (activeRef.current && recRef.current) {
              try { recRef.current.start() } catch {}
            }
          }, 400)
        }
      }
    }

    return rec
  }, [orionRespond, status])

  // Check support on mount
  useEffect(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    setVoiceSupported(!!SR)
  }, [])

  // Toggle voice on/off
  function toggleVoice() {
    if (voiceOn) {
      // Turn off
      activeRef.current = false
      if (restartRef.current) clearTimeout(restartRef.current)
      try { recRef.current?.stop() } catch {}
      recRef.current = null
      setVoiceOn(false)
      setStatus('idle')
    } else {
      // Turn on
      const rec = buildRec()
      if (!rec) return
      recRef.current = rec
      activeRef.current = true
      setVoiceOn(true)
      setStatus('listening')
      try { rec.start() } catch {}
    }
  }

  // Send text manually
  function sendText() {
    const text = inputText.trim()
    if (!text) return
    setInputText('')
    orionRespond(text)
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      activeRef.current = false
      if (restartRef.current) clearTimeout(restartRef.current)
      try { recRef.current?.stop() } catch {}
      window.speechSynthesis?.cancel()
    }
  }, [])

  return (
    <AppShell>
      <div className="flex flex-col items-center justify-between min-h-screen pb-24 lg:pb-6 px-6 py-8 relative overflow-hidden">

        {/* Background glow */}
        <div
          className="absolute inset-0 pointer-events-none transition-all duration-1000"
          style={{
            background: `radial-gradient(ellipse 60% 50% at 50% 40%, ${color}08 0%, transparent 70%)`
          }}
        />

        {/* Top label */}
        <div className="relative z-10 text-center">
          <p className="text-orion-blue text-xs tracking-[0.3em] uppercase font-semibold">ORION AI</p>
          <p className="text-slate-500 text-xs mt-1">Personal AI Command Center</p>
        </div>

        {/* Central Orb */}
        <div className="relative z-10 flex flex-col items-center gap-8 flex-1 justify-center">

          {/* Orb rings */}
          <div className="relative flex items-center justify-center" style={{ width: 220, height: 220 }}>
            {/* Outer ring */}
            <div className="absolute inset-0 rounded-full border transition-all duration-700"
              style={{ borderColor: `${color}40`, animation: 'rotate-ring 8s linear infinite' }} />
            {/* Mid ring */}
            <div className="absolute rounded-full border transition-all duration-700"
              style={{ inset: 18, borderColor: `${color}30`, animation: 'rotate-ring 5s linear infinite reverse' }} />
            {/* Inner glow ring */}
            <div className="absolute rounded-full border transition-all duration-700"
              style={{ inset: 36, borderColor: `${color}50` }} />
            {/* Core */}
            <div className="absolute rounded-full transition-all duration-700 orb-pulse"
              style={{
                inset: 50,
                background: `radial-gradient(circle at 35% 35%, ${color}33, ${color}08, #050810)`,
                boxShadow: `0 0 40px ${color}44, inset 0 0 20px ${color}22`,
                border: `1px solid ${color}44`,
              }}
            />
            {/* Center dot */}
            <div className="absolute rounded-full transition-all duration-700"
              style={{ width: 20, height: 20, background: color, boxShadow: `0 0 16px ${color}` }}
            />
            {/* Pulse rings when listening */}
            {(status === 'listening' || status === 'speaking') && (
              <>
                <div className="absolute rounded-full animate-ping opacity-20"
                  style={{ inset: 40, borderWidth: 2, borderStyle: 'solid', borderColor: color }} />
                <div className="absolute rounded-full animate-ping opacity-10"
                  style={{ inset: 20, borderWidth: 1, borderStyle: 'solid', borderColor: color, animationDelay: '0.5s' }} />
              </>
            )}
          </div>

          {/* Status label */}
          <div className="text-center">
            <p className="text-sm font-semibold transition-all duration-500" style={{ color }}>
              {statusLabels[status]}
            </p>
          </div>

          {/* What user said */}
          {userSaid && (
            <div className="text-center max-w-xs">
              <p className="text-xs text-slate-500 mb-1">You said</p>
              <p className="text-sm text-slate-300 italic">"{userSaid}"</p>
            </div>
          )}

          {/* ORION reply */}
          <div className="glass rounded-2xl border p-5 max-w-sm w-full text-center transition-all duration-500"
            style={{ borderColor: `${color}30` }}>
            <p className="text-xs mb-2 font-semibold uppercase tracking-widest" style={{ color }}>
              ORION
            </p>
            <p className="text-slate-200 text-sm leading-relaxed">{orionReply}</p>
          </div>
        </div>

        {/* Bottom controls */}
        <div className="relative z-10 w-full max-w-sm space-y-4">

          {/* Text input */}
          <div className="flex gap-2">
            <input
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendText()}
              placeholder="Type to ORION..."
              className="flex-1 bg-slate-800/80 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-orion-blue/50 transition-colors"
            />
            <button
              onClick={sendText}
              disabled={!inputText.trim()}
              className="px-4 py-3 rounded-xl bg-orion-blue/20 border border-orion-blue/40 text-orion-blue text-sm font-medium hover:bg-orion-blue/30 transition-colors disabled:opacity-30"
            >
              Send
            </button>
          </div>

          {/* Voice toggle + mute */}
          <div className="flex gap-3">
            {voiceSupported ? (
              <button
                onClick={toggleVoice}
                className="flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl border-2 font-semibold transition-all"
                style={{
                  borderColor: voiceOn ? color : '#334155',
                  background: voiceOn ? `${color}15` : 'transparent',
                  color: voiceOn ? color : '#64748b',
                }}
              >
                {voiceOn ? <Mic size={20} /> : <MicOff size={20} />}
                {voiceOn ? 'ORION Listening' : 'Tap to Talk'}
              </button>
            ) : (
              <div className="flex-1 py-4 rounded-2xl border border-slate-700 text-slate-600 text-sm text-center">
                Voice not supported on this browser
              </div>
            )}

            <button
              onClick={() => setMuteReply(m => !m)}
              className="p-4 rounded-2xl border border-slate-700 text-slate-500 hover:text-white hover:border-slate-500 transition-colors"
            >
              {muteReply ? <VolumeX size={20} /> : <Volume2 size={20} />}
            </button>
          </div>

          {/* Suggested prompts */}
          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
            {['What to practice?', 'Give me a plan', 'Check my balance', 'Silambam tips', 'Motivate me'].map(p => (
              <button key={p} onClick={() => orionRespond(p)}
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
