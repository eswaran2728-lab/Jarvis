'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
import AppShell from '@/components/layout/AppShell'
import { Mic, MicOff, Volume2, VolumeX } from 'lucide-react'
import { getOrionReply } from '@/lib/mockData'

type Status = 'idle' | 'listening' | 'processing' | 'speaking'

const statusColors: Record<Status, string> = {
  idle:       '#475569',
  listening:  '#00ff88',
  processing: '#00d4ff',
  speaking:   '#a855f7',
}

const statusLabels: Record<Status, string> = {
  idle:       'Tap mic to talk',
  listening:  'Listening — speak now',
  processing: 'ORION is thinking...',
  speaking:   'ORION is speaking...',
}

export default function AssistantPage() {
  const [status, setStatus]         = useState<Status>('idle')
  const [voiceOn, setVoiceOn]       = useState(false)
  const [muteReply, setMuteReply]   = useState(false)
  const [userSaid, setUserSaid]     = useState('')
  const [orionReply, setOrionReply] = useState('ORION is online. Your Personal AI Command Center is ready. How can I help you?')
  const [inputText, setInputText]   = useState('')
  const [supported, setSupported]   = useState(false)

  const recRef      = useRef<any>(null)
  const isSpeaking  = useRef(false)   // true while TTS is running — block mic restarts
  const wantListen  = useRef(false)   // user wants mic ON

  const color = statusColors[status]

  // Stop mic completely
  const stopMic = useCallback(() => {
    try { recRef.current?.abort() } catch {}
    recRef.current = null
  }, [])

  // Start one listening session
  const startMic = useCallback(() => {
    if (!wantListen.current || isSpeaking.current) return
    if (typeof window === 'undefined') return
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) return

    const rec = new SR()
    rec.continuous     = false
    rec.interimResults = false
    rec.lang           = 'en-US'
    recRef.current     = rec

    rec.onresult = (e: any) => {
      const text = (e.results[0][0].transcript || '').trim()
      if (!text) return
      // Stop mic immediately before processing so ORION voice isn't re-captured
      stopMic()
      respond(text)
    }

    rec.onend = () => {
      // Only restart if user wants listening AND ORION is not speaking
      if (wantListen.current && !isSpeaking.current) {
        setTimeout(() => startMic(), 350)
      }
    }

    rec.onerror = (e: any) => {
      if (e.error === 'no-speech' && wantListen.current && !isSpeaking.current) {
        setTimeout(() => startMic(), 350)
      }
    }

    try { rec.start() } catch {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stopMic])

  // ORION replies
  const respond = useCallback((question: string) => {
    setStatus('processing')
    setUserSaid(question)

    setTimeout(() => {
      const reply = getOrionReply(question)
      setOrionReply(reply)

      if (!muteReply && typeof window !== 'undefined' && window.speechSynthesis) {
        // --- SPEAKING: mic must stay OFF until TTS finishes ---
        isSpeaking.current = true
        setStatus('speaking')
        window.speechSynthesis.cancel()

        const u = new SpeechSynthesisUtterance(reply)
        u.rate   = 1.05   // slightly faster = more natural
        u.pitch  = 1.0    // natural pitch
        u.volume = 1

        // Pick a natural-sounding voice if available
        const voices = window.speechSynthesis.getVoices()
        const preferred = voices.find(v =>
          v.name.includes('Google UK English Male') ||
          v.name.includes('Daniel') ||
          v.name.includes('Alex') ||
          v.name.includes('en-GB') ||
          (v.lang.startsWith('en') && !v.name.includes('Google'))
        )
        if (preferred) u.voice = preferred

        u.onend = () => {
          isSpeaking.current = false
          if (wantListen.current) {
            // Wait a beat so microphone doesn't catch room echo
            setTimeout(() => {
              setStatus('listening')
              startMic()
            }, 600)
          } else {
            setStatus('idle')
          }
        }

        u.onerror = () => {
          isSpeaking.current = false
          if (wantListen.current) {
            setTimeout(() => { setStatus('listening'); startMic() }, 600)
          } else {
            setStatus('idle')
          }
        }

        window.speechSynthesis.speak(u)
      } else {
        // Muted — go straight back to listening
        setStatus(wantListen.current ? 'listening' : 'idle')
        if (wantListen.current) startMic()
      }
    }, 800)
  }, [muteReply, startMic])

  // Check browser support
  useEffect(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    setSupported(!!SR)
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      wantListen.current = false
      isSpeaking.current = false
      stopMic()
      window.speechSynthesis?.cancel()
    }
  }, [stopMic])

  function toggleVoice() {
    if (voiceOn) {
      wantListen.current = false
      isSpeaking.current = false
      window.speechSynthesis?.cancel()
      stopMic()
      setVoiceOn(false)
      setStatus('idle')
    } else {
      wantListen.current = true
      setVoiceOn(true)
      setStatus('listening')
      startMic()
    }
  }

  function sendText() {
    const text = inputText.trim()
    if (!text) return
    setInputText('')
    // Stop mic while processing typed input too
    stopMic()
    respond(text)
  }

  return (
    <AppShell>
      <div className="flex flex-col items-center justify-between min-h-screen pb-24 lg:pb-6 px-6 py-8 relative overflow-hidden">

        {/* Background glow */}
        <div className="absolute inset-0 pointer-events-none transition-all duration-1000"
          style={{ background: `radial-gradient(ellipse 60% 50% at 50% 40%, ${color}08 0%, transparent 70%)` }}
        />

        {/* Top label */}
        <div className="relative z-10 text-center">
          <p className="text-orion-blue text-xs tracking-[0.3em] uppercase font-semibold">ORION AI</p>
          <p className="text-slate-500 text-xs mt-1">Personal AI Command Center</p>
        </div>

        {/* Orb */}
        <div className="relative z-10 flex flex-col items-center gap-8 flex-1 justify-center">
          <div className="relative flex items-center justify-center" style={{ width: 220, height: 220 }}>
            <div className="absolute inset-0 rounded-full border transition-all duration-700"
              style={{ borderColor: `${color}40`, animation: 'rotate-ring 8s linear infinite' }} />
            <div className="absolute rounded-full border transition-all duration-700"
              style={{ inset: 18, borderColor: `${color}30`, animation: 'rotate-ring 5s linear infinite reverse' }} />
            <div className="absolute rounded-full border transition-all duration-700"
              style={{ inset: 36, borderColor: `${color}50` }} />
            <div className="absolute rounded-full transition-all duration-700 orb-pulse"
              style={{
                inset: 50,
                background: `radial-gradient(circle at 35% 35%, ${color}33, ${color}08, #050810)`,
                boxShadow: `0 0 40px ${color}44, inset 0 0 20px ${color}22`,
                border: `1px solid ${color}44`,
              }}
            />
            <div className="absolute rounded-full transition-all duration-700"
              style={{ width: 20, height: 20, background: color, boxShadow: `0 0 16px ${color}` }}
            />
            {(status === 'listening' || status === 'speaking') && (
              <>
                <div className="absolute rounded-full animate-ping opacity-20"
                  style={{ inset: 40, borderWidth: 2, borderStyle: 'solid', borderColor: color }} />
                <div className="absolute rounded-full animate-ping opacity-10"
                  style={{ inset: 20, borderWidth: 1, borderStyle: 'solid', borderColor: color, animationDelay: '0.5s' }} />
              </>
            )}
          </div>

          {/* Status */}
          <p className="text-sm font-semibold transition-all duration-500" style={{ color }}>
            {statusLabels[status]}
          </p>

          {/* What user said */}
          {userSaid && (
            <div className="text-center max-w-xs">
              <p className="text-xs text-slate-500 mb-1">You said</p>
              <p className="text-sm text-slate-300 italic">"{userSaid}"</p>
            </div>
          )}

          {/* ORION reply bubble */}
          <div className="glass rounded-2xl border p-5 max-w-sm w-full text-center transition-all duration-500"
            style={{ borderColor: `${color}30` }}>
            <p className="text-xs mb-2 font-semibold uppercase tracking-widest" style={{ color }}>ORION</p>
            <p className="text-slate-200 text-sm leading-relaxed">{orionReply}</p>
          </div>
        </div>

        {/* Controls */}
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
            <button onClick={sendText} disabled={!inputText.trim()}
              className="px-4 py-3 rounded-xl bg-orion-blue/20 border border-orion-blue/40 text-orion-blue text-sm font-medium hover:bg-orion-blue/30 transition-colors disabled:opacity-30">
              Send
            </button>
          </div>

          {/* Voice + mute */}
          <div className="flex gap-3">
            {supported ? (
              <button onClick={toggleVoice}
                className="flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl border-2 font-semibold transition-all"
                style={{
                  borderColor: voiceOn ? color : '#334155',
                  background: voiceOn ? `${color}15` : 'transparent',
                  color: voiceOn ? color : '#64748b',
                }}>
                {voiceOn ? <Mic size={20} /> : <MicOff size={20} />}
                {voiceOn ? (status === 'speaking' ? 'ORION Speaking...' : 'Listening') : 'Tap to Talk'}
              </button>
            ) : (
              <div className="flex-1 py-4 rounded-2xl border border-slate-700 text-slate-600 text-sm text-center">
                Voice not supported on this browser
              </div>
            )}
            <button onClick={() => setMuteReply(m => !m)}
              className="p-4 rounded-2xl border border-slate-700 text-slate-500 hover:text-white hover:border-slate-500 transition-colors">
              {muteReply ? <VolumeX size={20} /> : <Volume2 size={20} />}
            </button>
          </div>

          {/* Prompt chips */}
          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
            {['How are you?', 'Motivate me', 'My progress', 'Training plan', "Tell me a joke"].map(p => (
              <button key={p} onClick={() => respond(p)}
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
