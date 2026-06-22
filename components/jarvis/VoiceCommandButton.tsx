'use client'
import { useState, useEffect, useRef } from 'react'
import { Mic, MicOff } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function VoiceCommandButton() {
  const [listening, setListening] = useState(false)
  const [supported, setSupported] = useState(true)
  const [transcript, setTranscript] = useState('')
  const recognitionRef = useRef<any>(null)
  const router = useRouter()

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      if (!SR) { setSupported(false); return }
      const rec = new SR()
      rec.continuous = false
      rec.lang = 'en-US'
      rec.onresult = (e: any) => {
        const text = e.results[0][0].transcript.toLowerCase()
        setTranscript(text)
        handleCommand(text)
      }
      rec.onend = () => setListening(false)
      recognitionRef.current = rec
    }
  }, [])

  function handleCommand(text: string) {
    if (text.includes('start training') || text.includes('training mode')) router.push('/training')
    else if (text.includes('dashboard') || text.includes('open dashboard')) router.push('/dashboard')
    else if (text.includes('silambam')) router.push('/training/silambam')
    else if (text.includes('tasks') || text.includes('show tasks')) router.push('/tasks')
    else if (text.includes('reminders')) router.push('/reminders')
    else if (text.includes('jarvis') || text.includes('ask jarvis')) router.push('/assistant')
    setTimeout(() => setTranscript(''), 3000)
  }

  function toggleListening() {
    if (!recognitionRef.current) return
    if (listening) {
      recognitionRef.current.stop()
    } else {
      setTranscript('')
      recognitionRef.current.start()
      setListening(true)
    }
  }

  if (!supported) {
    return (
      <div className="text-xs text-slate-500 text-center p-2">
        Voice command not supported on this browser.
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        onClick={toggleListening}
        className={`p-4 rounded-full transition-all border-2 ${
          listening
            ? 'bg-green-500/20 border-green-400 text-green-400 animate-pulse'
            : 'bg-jarvis-blue/10 border-jarvis-blue/50 text-jarvis-blue hover:bg-jarvis-blue/20'
        }`}
      >
        {listening ? <Mic size={24} /> : <MicOff size={24} />}
      </button>
      <span className="text-xs text-slate-400">
        {listening ? 'Listening...' : 'Voice Command'}
      </span>
      {transcript && (
        <div className="text-xs text-jarvis-blue bg-jarvis-blue/10 rounded px-3 py-1 border border-jarvis-blue/30">
          &quot;{transcript}&quot;
        </div>
      )}
    </div>
  )
}
