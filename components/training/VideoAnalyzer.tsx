'use client'
import { useState, useRef, useCallback, useEffect } from 'react'
import { Upload, Play, Pause, SkipBack, Zap, ZapOff, ChevronDown, ChevronUp, Trash2, Camera, Video, FlipHorizontal, Circle, Square, Download, BookmarkPlus, Lightbulb } from 'lucide-react'
import { loadPoseLandmarker, detectPose, POSE_CONNECTIONS, PLAYER_COLORS, PLAYER_LABELS } from '@/lib/pose/poseDetector'
import { analyzePose, generateFeedback } from '@/lib/pose/poseAnalysis'
import { PoseMetrics } from '@/types'
import { calculateAttackSpeed, calculatePower, detectTechnique, estimateHeight, estimateWeight, generateMotionRemarks, detectSpinScore, calcReflexScore, powerScore } from '@/lib/pose/motionAnalysis'
import { saveReferenceClip, getReferenceClips, deleteReferenceClip, getSuggestedClips } from '@/lib/skillLibrary/store'
import { ReferenceClip } from '@/types/skillLibrary'

type PlayerData = {
  landmarks: any[]
  metrics: PoseMetrics
  feedback: string[]
  attackSpeed: number
  power: number
  powerScore: number   // 0-10
  spinScore: number    // 0-10
  reflexScore: number  // 0-10
  technique: string
  estimatedHeight: number
  estimatedWeight: number
  remarks: string[]
  color: string
  label: string
}

type AnalysisRecord = {
  id: number
  timestamp: string
  videoTime: string
  videoTimeSec?: number
  videoSrc?: string
  players: PlayerData[]
  snapshot?: string
  pros?: string[]
  cons?: string[]
  coachTip?: string
  tags?: string[]
  savedAsRef?: boolean
  videoName?: string
}

type Tab = 'analyze' | 'records' | 'references' | 'recordings'
type Mode = 'video' | 'camera'
type FacingMode = 'user' | 'environment'

function formatTime(t: number) {
  const m = Math.floor(t / 60); const s = Math.floor(t % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

function formatDur(s: number) {
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`
}

function ScoreBar({ score, max = 10, color }: { score: number; max?: number; color: string }) {
  const pct = Math.round((score / max) * 100)
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-[10px] font-bold w-8 text-right" style={{ color }}>{score}/{max}</span>
    </div>
  )
}

export default function VideoAnalyzer() {
  const [mode, setMode]               = useState<Mode>('video')
  const [tab, setTab]                 = useState<Tab>('analyze')
  const [videoSrc, setVideoSrc]       = useState<string | null>(null)
  const [videoName, setVideoName]     = useState('')
  const [isPlaying, setIsPlaying]     = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration]       = useState(0)
  const [isAnalysing, setIsAnalysing] = useState(false)
  const [loadingModel, setLoadingModel] = useState(false)
  const [isDragOver, setIsDragOver]   = useState(false)
  const [records, setRecords]         = useState<AnalysisRecord[]>([])
  const [expandedId, setExpandedId]   = useState<number | null>(null)
  const [fullAnalysing, setFullAnalysing] = useState(false)
  const [fullProgress, setFullProgress] = useState(0)
  const [autoAnalyse, setAutoAnalyse] = useState(false)
  const [combatAdvice, setCombatAdvice] = useState<string | null>(null)
  const [loadingAdvice, setLoadingAdvice] = useState(false)
  const [cameraOn, setCameraOn]       = useState(false)
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null)
  const [facingMode, setFacingMode]   = useState<FacingMode>('user')
  const [livePlayers, setLivePlayers] = useState<PlayerData[]>([])
  const [refClips, setRefClips]       = useState<ReferenceClip[]>([])
  const [suggestions, setSuggestions] = useState<ReferenceClip[]>([])
  const [loadingAnalysis, setLoadingAnalysis] = useState<number | null>(null)

  // Recording
  const [isRecording, setIsRecording]     = useState(false)
  const [recordedVideos, setRecordedVideos] = useState<{ url: string; name: string; time: string }[]>([])
  const [recordDuration, setRecordDuration] = useState(0)

  const videoRef         = useRef<HTMLVideoElement>(null)
  const cameraRef        = useRef<HTMLVideoElement>(null)
  const canvasRef        = useRef<HTMLCanvasElement>(null)
  const cameraCanvasRef  = useRef<HTMLCanvasElement>(null)
  const snapshotCanvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef     = useRef<HTMLInputElement>(null)
  const autoIntervalRef  = useRef<ReturnType<typeof setInterval> | null>(null)
  const cameraIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const prevLandmarksRef = useRef<any[][]>([])
  const prevTimestampRef = useRef<number>(0)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const recordTimerRef   = useRef<ReturnType<typeof setInterval> | null>(null)
  const blobsRef         = useRef<Blob[]>([])
  const videoSrcRef      = useRef<string | null>(null)
  const videoNameRef     = useRef<string>('')

  useEffect(() => { setRefClips(getReferenceClips()) }, [])
  useEffect(() => { videoSrcRef.current = videoSrc; videoNameRef.current = videoName }, [videoSrc, videoName])

  const handleFile = (file: File) => {
    const url = URL.createObjectURL(file)
    setVideoSrc(url); setVideoName(file.name)
    setFullProgress(0); prevLandmarksRef.current = []
    const tags = file.name.toLowerCase().replace(/[^a-z0-9]/g, ' ').split(' ').filter(Boolean)
    setSuggestions(getSuggestedClips([], tags))
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setIsDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file?.type.startsWith('video/')) handleFile(file)
  }

  const drawAllPlayers = useCallback((allLandmarks: any[][], canvasEl: HTMLCanvasElement, sourceEl: HTMLVideoElement) => {
    const ctx = canvasEl.getContext('2d')
    if (!ctx) return
    canvasEl.width = sourceEl.videoWidth || sourceEl.clientWidth
    canvasEl.height = sourceEl.videoHeight || sourceEl.clientHeight
    ctx.clearRect(0, 0, canvasEl.width, canvasEl.height)
    const W = canvasEl.width; const H = canvasEl.height

    allLandmarks.forEach((landmarks, pIdx) => {
      const color = PLAYER_COLORS[pIdx] || '#ffffff'
      ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.globalAlpha = 0.85
      POSE_CONNECTIONS.forEach(([a, b]) => {
        if (landmarks[a]?.visibility > 0.5 && landmarks[b]?.visibility > 0.5) {
          ctx.beginPath()
          ctx.moveTo(landmarks[a].x * W, landmarks[a].y * H)
          ctx.lineTo(landmarks[b].x * W, landmarks[b].y * H)
          ctx.stroke()
        }
      })
      ctx.globalAlpha = 1
      landmarks.forEach((p: any, i: number) => {
        if (p.visibility > 0.5) {
          ctx.beginPath()
          ctx.arc(p.x * W, p.y * H, i === 0 ? 6 : 3, 0, Math.PI * 2)
          ctx.fillStyle = color; ctx.fill()
        }
      })
      const nose = landmarks[0]
      if (nose?.visibility > 0.5) {
        ctx.globalAlpha = 0.9
        ctx.fillStyle = color
        ctx.font = 'bold 12px sans-serif'
        ctx.fillText(PLAYER_LABELS[pIdx] || `P${pIdx + 1}`, nose.x * W - 24, nose.y * H - 14)
        ctx.globalAlpha = 1
      }
      // Wrist spin circles — larger when spin is higher
      ;[15, 16].forEach(wi => {
        const w = landmarks[wi]
        if (w?.visibility > 0.5) {
          ctx.beginPath(); ctx.arc(w.x * W, w.y * H, 10, 0, Math.PI * 2)
          ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.globalAlpha = 0.6; ctx.stroke()
          ctx.globalAlpha = 1
        }
      })
    })
  }, [])

  const captureSnapshot = useCallback((sourceEl: HTMLVideoElement, canvasEl: HTMLCanvasElement): string => {
    const snap = snapshotCanvasRef.current; if (!snap) return ''
    snap.width = sourceEl.videoWidth || sourceEl.clientWidth || 640
    snap.height = sourceEl.videoHeight || sourceEl.clientHeight || 480
    const ctx = snap.getContext('2d'); if (!ctx) return ''
    ctx.drawImage(sourceEl, 0, 0, snap.width, snap.height)
    ctx.drawImage(canvasEl, 0, 0, snap.width, snap.height)
    return snap.toDataURL('image/jpeg', 0.75)
  }, [])

  const buildPlayerData = useCallback((lm: any[], pIdx: number): PlayerData => {
    const m = analyzePose(lm)
    const now = performance.now()
    const dt = prevTimestampRef.current ? now - prevTimestampRef.current : 500
    const h = estimateHeight(lm, 480)
    const w = estimateWeight(h, lm)
    const speed = calculateAttackSpeed(prevLandmarksRef.current[pIdx] || null, lm, dt, h, 480)
    const power = calculatePower(speed, w)
    const spin = detectSpinScore(prevLandmarksRef.current[pIdx] || null, lm, dt)
    const reflex = calcReflexScore(speed, dt)
    const pScore = powerScore(power)
    const technique = detectTechnique(lm)
    const motionM = {
      attackSpeed: speed, reactionTime: dt, power, strikeCount: 0,
      estimatedHeight: h, estimatedWeight: w,
      avgStrikeSpeed: speed, maxStrikeSpeed: speed,
      footworkScore: m.balance, guardScore: m.overallScore,
      combatReadiness: Math.round((m.overallScore + m.balance) / 2),
      techniqueType: technique, remarks: [] as string[],
    }
    motionM.remarks = generateMotionRemarks(motionM)
    return {
      landmarks: lm, metrics: m, feedback: generateFeedback(m),
      attackSpeed: speed, power, powerScore: pScore, spinScore: spin, reflexScore: reflex,
      technique, estimatedHeight: h, estimatedWeight: w,
      remarks: motionM.remarks,
      color: PLAYER_COLORS[pIdx] || '#ffffff',
      label: PLAYER_LABELS[pIdx] || `Player ${pIdx + 1}`,
    }
  }, [])

  const buildRecord = useCallback((
    allLandmarks: any[][], videoTimeStr: string, snapshot?: string,
    timeSec?: number
  ): AnalysisRecord => {
    const now = performance.now()
    const players = allLandmarks.map((lm, i) => buildPlayerData(lm, i))
    prevLandmarksRef.current = allLandmarks
    prevTimestampRef.current = now
    return {
      id: Date.now() + Math.random(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      videoTime: videoTimeStr,
      videoTimeSec: timeSec,
      videoSrc: videoSrcRef.current || undefined,
      players, snapshot, videoName: videoNameRef.current,
    }
  }, [buildPlayerData])

  const getCombatAdvice = useCallback(async (rec: AnalysisRecord) => {
    if (!rec.players.length) return
    setLoadingAdvice(true); setCombatAdvice(null)
    const p = rec.players[0]
    try {
      const res = await fetch('/api/combat-advice', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          technique: p.technique, overallScore: p.metrics.overallScore,
          balance: p.metrics.balance, kneeBend: p.metrics.kneeBend,
          shoulderTilt: p.metrics.shoulderTilt, stanceWidth: p.metrics.stanceWidth,
          handHeight: p.metrics.handHeight, attackSpeed: p.attackSpeed, power: p.power,
        }),
      })
      const data = await res.json()
      setCombatAdvice(data.advice)
    } catch { setCombatAdvice('Could not get advice.') }
    setLoadingAdvice(false)
  }, [])

  // Receives the record directly (avoids stale-closure issue with records state)
  const analyseClipProscons = useCallback(async (rec: AnalysisRecord) => {
    setLoadingAnalysis(rec.id)
    try {
      const res = await fetch('/api/clip-analysis', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          players: rec.players.map(p => ({
            overallScore: p.metrics.overallScore,
            balance: p.metrics.balance,
            attackSpeed: p.attackSpeed,
            power: p.power,
            powerScore: p.powerScore,
            spinScore: p.spinScore,
            reflexScore: p.reflexScore,
            kneeBend: p.metrics.kneeBend,
            technique: p.technique,
          })),
          videoName: rec.videoName || 'Unknown',
          techniques: rec.players.map(p => p.technique),
        }),
      })
      const data = await res.json()
      setRecords(prev => prev.map(r => r.id === rec.id
        ? { ...r, pros: data.pros, cons: data.cons, coachTip: data.coachTip, tags: data.tags }
        : r
      ))
      const techniques = rec.players.map(p => p.technique)
      setSuggestions(getSuggestedClips(techniques, data.tags || []))
    } catch { /* silent */ }
    setLoadingAnalysis(null)
  }, [])

  const saveAsReference = useCallback((rec: AnalysisRecord) => {
    if (!rec.snapshot || !rec.pros) return
    const refClip: ReferenceClip = {
      id: `ref-${rec.id}`,
      title: `${rec.players.map(p => p.technique).join(' vs ')} — ${rec.videoName || 'Clip'}`,
      videoName: rec.videoName || 'Unknown',
      snapshot: rec.snapshot,
      createdAt: new Date().toISOString(),
      techniques: Array.from(new Set(rec.players.map(p => p.technique))),
      playerCount: rec.players.length,
      pros: rec.pros || [],
      cons: rec.cons || [],
      coachTip: rec.coachTip || '',
      tags: rec.tags || [],
      metrics: {
        avgScore: Math.round(rec.players.reduce((s, p) => s + p.metrics.overallScore, 0) / (rec.players.length || 1)),
        avgBalance: Math.round(rec.players.reduce((s, p) => s + p.metrics.balance, 0) / (rec.players.length || 1)),
        avgSpeed: Math.round(rec.players.reduce((s, p) => s + p.attackSpeed, 0) / (rec.players.length || 1)),
        avgPower: Math.round(rec.players.reduce((s, p) => s + p.power, 0) / (rec.players.length || 1)),
      },
    }
    saveReferenceClip(refClip)
    setRefClips(getReferenceClips())
    setRecords(prev => prev.map(r => r.id === rec.id ? { ...r, savedAsRef: true } : r))
  }, [])

  const analyseFrame = useCallback(async (withAdvice = true) => {
    const video = videoRef.current; const canvas = canvasRef.current
    if (!video || !canvas) return
    setIsAnalysing(true); setLoadingModel(true)
    try {
      await loadPoseLandmarker(); setLoadingModel(false)
      const result = detectPose(video, performance.now())
      const allLandmarks = result?.landmarks || []
      if (allLandmarks.length > 0) {
        drawAllPlayers(allLandmarks, canvas, video)
        const snapshot = captureSnapshot(video, canvas)
        const timeSec = video.currentTime
        const rec = buildRecord(allLandmarks, formatTime(timeSec), snapshot, timeSec)
        setRecords(prev => [rec, ...prev])
        setExpandedId(rec.id)
        if (withAdvice) getCombatAdvice(rec)
        analyseClipProscons(rec)
        const techniques = allLandmarks.map((_: any, i: number) => {
          try { return detectTechnique(allLandmarks[i]) } catch { return '' }
        }).filter(Boolean)
        setSuggestions(getSuggestedClips(techniques))
      }
    } catch (err) { console.error(err) }
    setIsAnalysing(false); setLoadingModel(false)
  }, [drawAllPlayers, buildRecord, getCombatAdvice, captureSnapshot, analyseClipProscons])

  const analyseFullVideo = useCallback(async () => {
    const video = videoRef.current; const canvas = canvasRef.current
    if (!video || !canvas || !video.duration) return
    setFullAnalysing(true); setFullProgress(0)
    video.pause(); setIsPlaying(false)
    try { await loadPoseLandmarker() } catch { setFullAnalysing(false); return }
    const step = Math.max(video.duration / 12, 0.4)
    let t = 0
    while (t <= video.duration) {
      await new Promise<void>(resolve => {
        video.currentTime = t
        const onSeeked = () => {
          video.removeEventListener('seeked', onSeeked)
          const result = detectPose(video, performance.now())
          const allLandmarks = result?.landmarks || []
          if (allLandmarks.length > 0) {
            drawAllPlayers(allLandmarks, canvas, video)
            const snapshot = captureSnapshot(video, canvas)
            const rec = buildRecord(allLandmarks, formatTime(t), snapshot, t)
            setRecords(prev => [rec, ...prev])
            setFullProgress(Math.round((t / video.duration) * 100))
            analyseClipProscons(rec)
          }
          resolve()
        }
        video.addEventListener('seeked', onSeeked)
      })
      await new Promise(r => setTimeout(r, 80))
      t += step
    }
    setFullProgress(100); setFullAnalysing(false)
  }, [drawAllPlayers, buildRecord, captureSnapshot, analyseClipProscons])

  useEffect(() => {
    const video = videoRef.current
    if (!video || !videoSrc) return
    const onPause = () => {
      if (video.currentTime > 0 && video.currentTime < video.duration) analyseFrame(true)
    }
    video.addEventListener('pause', onPause)
    return () => video.removeEventListener('pause', onPause)
  }, [videoSrc, analyseFrame])

  useEffect(() => {
    if (autoAnalyse && isPlaying) {
      autoIntervalRef.current = setInterval(() => analyseFrame(false), 800)
    } else {
      if (autoIntervalRef.current) { clearInterval(autoIntervalRef.current); autoIntervalRef.current = null }
    }
    return () => { if (autoIntervalRef.current) clearInterval(autoIntervalRef.current) }
  }, [autoAnalyse, isPlaying, analyseFrame])

  const startCamera = async (facing: FacingMode = facingMode) => {
    if (cameraStream) { cameraStream.getTracks().forEach(t => t.stop()); setCameraStream(null) }
    if (cameraIntervalRef.current) clearInterval(cameraIntervalRef.current)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: facing, width: 640, height: 480 }, audio: true })
      setCameraStream(stream); setCameraOn(true)
      if (cameraRef.current) { cameraRef.current.srcObject = stream; cameraRef.current.play() }
      await loadPoseLandmarker()
      cameraIntervalRef.current = setInterval(async () => {
        const cam = cameraRef.current; const canvas = cameraCanvasRef.current
        if (!cam || !canvas || cam.readyState < 2) return
        const result = detectPose(cam, performance.now())
        const allLandmarks = result?.landmarks || []
        if (allLandmarks.length > 0) {
          drawAllPlayers(allLandmarks, canvas, cam)
          const players = allLandmarks.map((lm: any, i: number) => buildPlayerData(lm, i))
          prevLandmarksRef.current = allLandmarks
          prevTimestampRef.current = performance.now()
          setLivePlayers(players)
        }
      }, 300)
    } catch (err) { console.error('Camera error:', err) }
  }

  const stopCamera = () => {
    if (isRecording) stopRecording()
    cameraStream?.getTracks().forEach(t => t.stop())
    setCameraStream(null); setCameraOn(false)
    if (cameraIntervalRef.current) { clearInterval(cameraIntervalRef.current); cameraIntervalRef.current = null }
    setLivePlayers([])
  }

  const flipCamera = async () => {
    const next: FacingMode = facingMode === 'user' ? 'environment' : 'user'
    setFacingMode(next); await startCamera(next)
  }

  const startRecording = () => {
    const stream = cameraStream; if (!stream) return
    blobsRef.current = []
    const mr = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp8,opus' })
    mr.ondataavailable = e => { if (e.data.size > 0) blobsRef.current.push(e.data) }
    mr.onstop = () => {
      const blob = new Blob(blobsRef.current, { type: 'video/webm' })
      const url = URL.createObjectURL(blob)
      const name = `ORION_${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}.webm`
      const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      setRecordedVideos(prev => [{ url, name, time }, ...prev])
    }
    mr.start(500)
    mediaRecorderRef.current = mr; setIsRecording(true); setRecordDuration(0)
    recordTimerRef.current = setInterval(() => setRecordDuration(d => d + 1), 1000)
  }

  const stopRecording = () => {
    mediaRecorderRef.current?.stop(); mediaRecorderRef.current = null; setIsRecording(false)
    if (recordTimerRef.current) { clearInterval(recordTimerRef.current); recordTimerRef.current = null }
  }

  const saveCameraRecord = async () => {
    const cam = cameraRef.current; const canvas = cameraCanvasRef.current; if (!cam || !canvas) return
    const result = detectPose(cam, performance.now())
    const allLandmarks = result?.landmarks || []
    if (allLandmarks.length > 0) {
      const snapshot = captureSnapshot(cam, canvas)
      const rec = buildRecord(allLandmarks, 'Live', snapshot)
      setRecords(prev => [rec, ...prev]); setExpandedId(rec.id); setTab('records')
      analyseClipProscons(rec)
    }
  }

  useEffect(() => {
    return () => {
      stopCamera()
      if (autoIntervalRef.current) clearInterval(autoIntervalRef.current)
      if (recordTimerRef.current) clearInterval(recordTimerRef.current)
    }
  }, [])

  return (
    <div className="space-y-4">
      <canvas ref={snapshotCanvasRef} className="hidden" />

      {/* Mode toggle */}
      <div className="flex gap-2 p-1 bg-slate-800/60 rounded-2xl border border-slate-700">
        {(['video', 'camera'] as Mode[]).map(m => (
          <button key={m} onClick={() => { setMode(m); if (m === 'camera') startCamera(); else stopCamera() }}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all ${mode === m ? 'bg-orion-blue text-white' : 'text-slate-400 hover:text-white'}`}>
            {m === 'video' ? <><Video size={16} /> Video</> : <><Camera size={16} /> Live Camera</>}
          </button>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-slate-800/40 rounded-xl border border-slate-700 overflow-x-auto scrollbar-hide">
        {([
          { id: 'analyze', label: '⚡ Analyse' },
          { id: 'records', label: `📋 Records${records.length > 0 ? ` (${records.length})` : ''}` },
          { id: 'references', label: `🔖 Saved${refClips.length > 0 ? ` (${refClips.length})` : ''}` },
          { id: 'recordings', label: `🎬 Videos${recordedVideos.length > 0 ? ` (${recordedVideos.length})` : ''}` },
        ] as { id: Tab; label: string }[]).map(t => (
          <button key={t.id} onClick={() => setTab(t.id as Tab)}
            className={`flex-shrink-0 flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${tab === t.id ? 'bg-slate-700 text-white' : 'text-slate-500 hover:text-white'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ─── ANALYSE TAB ─── */}
      {tab === 'analyze' && (
        <>
          {/* ORION suggestions banner */}
          {suggestions.length > 0 && (
            <div className="rounded-2xl border border-yellow-400/30 bg-yellow-400/5 p-3 space-y-2">
              <div className="flex items-center gap-2 text-yellow-400 text-xs font-bold">
                <Lightbulb size={13} /> ORION suggests reviewing these saved clips first:
              </div>
              {suggestions.map(s => (
                <div key={s.id} className="flex items-center gap-2 rounded-xl bg-yellow-400/5 border border-yellow-400/15 p-2">
                  {s.snapshot && <img src={s.snapshot} className="w-12 h-8 rounded-lg object-cover" alt="ref" />}
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-xs font-semibold truncate">{s.title}</p>
                    <p className="text-yellow-400/70 text-[10px]">{s.techniques.join(', ')} · {s.playerCount} player{s.playerCount > 1 ? 's' : ''}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* VIDEO MODE */}
          {mode === 'video' && (
            <>
              {!videoSrc ? (
                <div className="space-y-3">
                  <div onDragOver={e => { e.preventDefault(); setIsDragOver(true) }} onDragLeave={() => setIsDragOver(false)} onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-3xl cursor-pointer transition-all active:scale-95 ${isDragOver ? 'border-orion-blue bg-orion-blue/15' : 'border-orion-blue/50 bg-orion-blue/5 hover:border-orion-blue'}`}
                    style={{ minHeight: 220 }}>
                    <div className="flex flex-col items-center justify-center h-full py-12 px-6 text-center">
                      <Upload size={32} className="text-orion-blue mb-3" />
                      <p className="text-white font-bold text-lg mb-1">Upload Training Video</p>
                      <p className="text-slate-400 text-sm">MP4 · MOV · WebM — detects all players</p>
                    </div>
                    <input ref={fileInputRef} type="file" accept="video/mp4,video/quicktime,video/webm" className="hidden"
                      onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
                  </div>
                  <button onClick={() => fileInputRef.current?.click()}
                    className="w-full py-4 rounded-2xl bg-orion-blue text-white font-bold text-base active:scale-95 transition-all"
                    style={{ boxShadow: '0 0 20px rgba(0,212,255,0.3)' }}>
                    Choose Video File
                  </button>
                </div>
              ) : (
                <>
                  <div className="relative rounded-2xl overflow-hidden bg-black border border-orion-border" style={{ aspectRatio: '16/9' }}>
                    <video ref={videoRef} src={videoSrc} className="w-full h-full object-contain"
                      onTimeUpdate={e => setCurrentTime(e.currentTarget.currentTime)}
                      onLoadedMetadata={e => setDuration(e.currentTarget.duration)}
                      onEnded={() => setIsPlaying(false)} />
                    <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />
                    {(loadingModel || fullAnalysing) && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 gap-3">
                        <p className="text-orion-blue text-sm font-medium animate-pulse">
                          {fullAnalysing ? `Analysing all players... ${fullProgress}%` : 'Loading AI model...'}
                        </p>
                        {fullAnalysing && (
                          <div className="w-48 h-1.5 bg-slate-700 rounded-full">
                            <div className="h-full bg-orion-blue rounded-full transition-all" style={{ width: `${fullProgress}%` }} />
                          </div>
                        )}
                      </div>
                    )}
                    {records.length > 0 && (
                      <div className="absolute top-2 right-2 bg-orion-blue/90 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                        {records.length} captured
                      </div>
                    )}
                  </div>

                  <div className="glass rounded-2xl border border-orion-border p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <button onClick={() => { const v = videoRef.current; if (!v) return; v.currentTime = 0; v.pause(); setIsPlaying(false) }} className="p-2 text-slate-400 hover:text-white">
                        <SkipBack size={16} />
                      </button>
                      <button onClick={() => { const v = videoRef.current; if (!v) return; isPlaying ? v.pause() : v.play(); setIsPlaying(!isPlaying) }}
                        className="p-2 rounded-lg bg-orion-blue/20 border border-orion-blue/30 text-orion-blue">
                        {isPlaying ? <Pause size={18} /> : <Play size={18} />}
                      </button>
                      <span className="text-xs text-slate-400 w-20">{formatTime(currentTime)} / {formatTime(duration)}</span>
                      <input type="range" min={0} max={duration || 1} step={0.1} value={currentTime}
                        onChange={e => { const v = parseFloat(e.target.value); if (videoRef.current) videoRef.current.currentTime = v; setCurrentTime(v) }}
                        className="flex-1 accent-[#00d4ff] cursor-pointer" />
                    </div>
                    <button onClick={analyseFullVideo} disabled={isAnalysing || fullAnalysing}
                      className="w-full py-3 rounded-xl font-bold text-sm disabled:opacity-50 active:scale-95 transition-all"
                      style={{ background: 'linear-gradient(135deg, #00d4ff22, #a855f722)', border: '1px solid #00d4ff55', color: '#00d4ff' }}>
                      {fullAnalysing ? `⚡ Analysing all players... ${fullProgress}%` : '⚡ Analyse Full Video — All Players'}
                    </button>
                    <div className="grid grid-cols-2 gap-2">
                      <button onClick={() => analyseFrame()} disabled={isAnalysing || fullAnalysing}
                        className="py-2.5 rounded-xl bg-slate-700 border border-slate-600 text-slate-200 font-semibold text-sm disabled:opacity-50">
                        {isAnalysing ? 'Analysing...' : '📸 Capture Frame'}
                      </button>
                      <button onClick={() => setAutoAnalyse(v => !v)} disabled={fullAnalysing}
                        className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl border font-semibold text-sm ${autoAnalyse ? 'bg-yellow-400/20 border-yellow-400/30 text-yellow-400' : 'bg-slate-700 border-slate-600 text-slate-400'}`}>
                        {autoAnalyse ? <Zap size={14} /> : <ZapOff size={14} />}
                        {autoAnalyse ? 'Auto ON' : 'Auto OFF'}
                      </button>
                    </div>
                    <button onClick={() => { setVideoSrc(null); setRecords([]); setCombatAdvice(null); setSuggestions([]) }}
                      className="w-full py-2 rounded-xl border border-red-400/20 text-red-400/60 text-xs hover:text-red-400 transition-all">
                      Remove Video
                    </button>
                  </div>

                  {(loadingAdvice || combatAdvice) && (
                    <div className="rounded-2xl border p-4 space-y-2" style={{ background: '#a855f708', borderColor: '#a855f730' }}>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full animate-pulse bg-purple-400" />
                        <p className="text-xs font-bold uppercase tracking-widest text-purple-400">ORION Combat Analysis</p>
                      </div>
                      {loadingAdvice
                        ? <div className="flex items-center gap-2 text-slate-400 text-sm"><span className="animate-spin text-purple-400">⚙</span> Analysing players...</div>
                        : <div className="text-sm text-slate-200 whitespace-pre-line leading-relaxed">{combatAdvice}</div>
                      }
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {/* CAMERA MODE */}
          {mode === 'camera' && (
            <div className="space-y-3">
              <div className="relative rounded-2xl overflow-hidden bg-black border border-orion-border" style={{ aspectRatio: '4/3' }}>
                <video ref={cameraRef} className="w-full h-full object-cover" autoPlay playsInline muted />
                <canvas ref={cameraCanvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />
                {!cameraOn && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/80">
                    <p className="text-slate-500 text-sm">Camera not started</p>
                  </div>
                )}
                {isRecording && (
                  <div className="absolute top-3 left-3 flex items-center gap-2 bg-black/70 rounded-full px-3 py-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                    <span className="text-red-400 text-xs font-bold">{formatDur(recordDuration)}</span>
                  </div>
                )}
                {cameraOn && (
                  <button onClick={flipCamera}
                    className="absolute top-3 right-3 p-2 rounded-full bg-black/60 border border-white/20 text-white hover:bg-black/80 transition-all">
                    <FlipHorizontal size={18} />
                  </button>
                )}
                {livePlayers.length > 0 && (
                  <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-black/70 rounded-full px-3 py-1">
                    <span className="text-white text-xs font-bold">{livePlayers.length} player{livePlayers.length > 1 ? 's' : ''} detected</span>
                  </div>
                )}
                {livePlayers.length > 0 && (
                  <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/90">
                    <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
                      {livePlayers.map((p, i) => (
                        <div key={i} className="flex-shrink-0 rounded-xl p-2 bg-black/60 border min-w-[130px]"
                          style={{ borderColor: `${p.color}40` }}>
                          <p className="text-[10px] font-bold mb-1" style={{ color: p.color }}>{p.label}</p>
                          <div className="space-y-0.5">
                            <div className="flex justify-between text-[9px]"><span className="text-slate-400">Spin</span></div>
                            <ScoreBar score={p.spinScore} color={p.color} />
                            <div className="flex justify-between text-[9px]"><span className="text-slate-400">Power</span></div>
                            <ScoreBar score={p.powerScore} color={p.color} />
                            <div className="flex justify-between text-[9px]"><span className="text-slate-400">Reflex</span></div>
                            <ScoreBar score={p.reflexScore} color={p.color} />
                            <div className="flex justify-between text-[9px]"><span className="text-slate-400">Speed</span></div>
                            <ScoreBar score={Math.min(10, Math.round(p.attackSpeed / 2.5))} color={p.color} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button onClick={cameraOn ? stopCamera : () => startCamera()}
                  className={`py-3 rounded-xl font-bold text-sm transition-all ${cameraOn ? 'bg-red-400/20 border border-red-400/40 text-red-400' : 'bg-orion-blue text-white'}`}>
                  {cameraOn ? '⏹ Stop' : '📷 Start Camera'}
                </button>
                <button onClick={flipCamera} disabled={!cameraOn}
                  className="py-3 rounded-xl bg-slate-700 border border-slate-600 text-slate-200 font-bold text-sm disabled:opacity-40 flex items-center justify-center gap-2">
                  <FlipHorizontal size={16} /> Flip
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={isRecording ? stopRecording : startRecording} disabled={!cameraOn}
                  className={`py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-40 ${isRecording ? 'bg-red-500/20 border border-red-500/50 text-red-400' : 'bg-green-400/15 border border-green-400/30 text-green-400'}`}>
                  {isRecording ? <><Square size={14} /> Stop Rec</> : <><Circle size={14} /> Record</>}
                </button>
                <button onClick={saveCameraRecord} disabled={!cameraOn || !livePlayers.length}
                  className="py-3 rounded-xl bg-orion-blue/15 border border-orion-blue/30 text-orion-blue font-bold text-sm disabled:opacity-40">
                  📸 Snapshot
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* ─── RECORDS TAB ─── */}
      {tab === 'records' && (
        <div className="space-y-3">
          {records.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-sm">No records yet. Analyse a video or use live camera.</div>
          ) : (
            <>
              <div className="flex justify-between items-center">
                <p className="text-xs text-slate-500">{records.length} captures · {records.reduce((s, r) => s + r.players.length, 0)} total players</p>
                <button onClick={() => setRecords([])} className="text-xs text-red-400/60 hover:text-red-400 flex items-center gap-1"><Trash2 size={12} /> Clear all</button>
              </div>

              {records.map((rec, idx) => (
                <div key={rec.id} className="glass rounded-2xl border border-orion-border overflow-hidden">
                  <button className="w-full flex items-center gap-3 p-3.5 hover:bg-white/5 transition-colors"
                    onClick={() => setExpandedId(expandedId === rec.id ? null : rec.id)}>
                    {rec.snapshot
                      ? <img src={rec.snapshot} alt="frame" className="w-14 h-10 rounded-lg object-cover border border-slate-700 flex-shrink-0" />
                      : <div className="w-14 h-10 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center flex-shrink-0"><span className="text-slate-500 text-xs">#{records.length - idx}</span></div>
                    }
                    <div className="flex-1 text-left min-w-0">
                      <p className="text-white text-sm font-semibold">
                        {rec.players.length} player{rec.players.length > 1 ? 's' : ''} · {rec.players.map(p => p.technique).join(' vs ')}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5 flex-wrap">
                        {rec.players.map((p, i) => (
                          <span key={i} style={{ color: p.color }}>P{i + 1}: {p.metrics.overallScore}/100</span>
                        ))}
                        {rec.videoTime !== 'Live' && <span>⏱ {rec.videoTime}</span>}
                        {rec.pros && <span className="text-green-400">✓ Analysed</span>}
                        {rec.savedAsRef && <span className="text-yellow-400">🔖</span>}
                      </div>
                    </div>
                    {expandedId === rec.id ? <ChevronUp size={16} className="text-slate-500 flex-shrink-0" /> : <ChevronDown size={16} className="text-slate-500 flex-shrink-0" />}
                  </button>

                  {expandedId === rec.id && (
                    <div className="px-4 pb-4 space-y-4 border-t border-orion-border/40 pt-4">

                      {/* Video Clip — shows ±3s around capture point */}
                      {rec.videoSrc && rec.videoTimeSec !== undefined && (
                        <div className="space-y-2">
                          <p className="text-xs text-slate-500 uppercase tracking-wide">📹 Highlighted Clip</p>
                          <div className="relative rounded-xl overflow-hidden border border-orion-blue/30 bg-black">
                            <video
                              src={`${rec.videoSrc}#t=${Math.max(0, rec.videoTimeSec - 2)},${rec.videoTimeSec + 3}`}
                              controls
                              loop
                              className="w-full"
                              style={{ maxHeight: 220 }}
                            />
                            <div className="absolute top-2 left-2 bg-orion-blue/90 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                              ⏱ {rec.videoTime} · clip ±3s
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Skeleton snapshot */}
                      {rec.snapshot && (
                        <div className="space-y-2">
                          <p className="text-xs text-slate-500 uppercase tracking-wide">🦴 Skeleton Frame</p>
                          <img src={rec.snapshot} alt="frame" className="w-full rounded-xl border border-slate-700" />
                          <a href={rec.snapshot} download={`orion_${rec.timestamp.replace(/:/g, '-')}.jpg`}
                            className="flex items-center justify-center gap-2 py-2 rounded-xl border border-slate-700 text-slate-400 text-xs hover:text-white transition-all">
                            <Download size={12} /> Download Frame
                          </a>
                        </div>
                      )}

                      {/* Pros / Cons */}
                      {loadingAnalysis === rec.id ? (
                        <div className="flex items-center gap-2 text-orion-blue text-xs animate-pulse py-2">
                          <span className="animate-spin">⚙</span> ORION analysing clip pros &amp; cons...
                        </div>
                      ) : rec.pros ? (
                        <div className="space-y-2">
                          <div className="rounded-xl bg-green-400/5 border border-green-400/20 p-3 space-y-1.5">
                            <p className="text-green-400 text-xs font-bold uppercase tracking-widest">✅ Pros</p>
                            {rec.pros.map((p, i) => <p key={i} className="text-slate-300 text-xs">• {p}</p>)}
                          </div>
                          <div className="rounded-xl bg-red-400/5 border border-red-400/20 p-3 space-y-1.5">
                            <p className="text-red-400 text-xs font-bold uppercase tracking-widest">❌ Cons</p>
                            {rec.cons?.map((c, i) => <p key={i} className="text-slate-300 text-xs">• {c}</p>)}
                          </div>
                          {rec.coachTip && (
                            <div className="rounded-xl bg-orion-blue/5 border border-orion-blue/20 p-3">
                              <p className="text-orion-blue text-xs font-bold mb-1">🎓 ORION Coach Tip</p>
                              <p className="text-slate-300 text-xs">{rec.coachTip}</p>
                            </div>
                          )}
                          {rec.tags && rec.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {rec.tags.map((t, i) => (
                                <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-slate-700 text-slate-400">{t}</span>
                              ))}
                            </div>
                          )}
                        </div>
                      ) : (
                        <button onClick={() => analyseClipProscons(rec)}
                          className="w-full py-2.5 rounded-xl border border-orion-blue/30 text-orion-blue text-xs font-bold hover:bg-orion-blue/10 transition-all">
                          ⚡ Get Pros &amp; Cons from ORION
                        </button>
                      )}

                      {/* Per-player metrics with /10 scores */}
                      {rec.players.map((p, pIdx) => (
                        <div key={pIdx} className="rounded-xl border p-3 space-y-3" style={{ borderColor: `${p.color}30`, background: `${p.color}05` }}>
                          <p className="text-xs font-bold" style={{ color: p.color }}>{p.label} — {p.technique}</p>

                          {/* /10 scores */}
                          <div className="space-y-2">
                            <div>
                              <div className="flex justify-between mb-0.5">
                                <span className="text-[10px] text-slate-400">🌀 Stick Spin</span>
                                <span className="text-[10px]" style={{ color: p.color }}>{p.spinScore}/10</span>
                              </div>
                              <ScoreBar score={p.spinScore} color={p.color} />
                            </div>
                            <div>
                              <div className="flex justify-between mb-0.5">
                                <span className="text-[10px] text-slate-400">💥 Power</span>
                                <span className="text-[10px]" style={{ color: p.color }}>{p.powerScore}/10</span>
                              </div>
                              <ScoreBar score={p.powerScore} color={p.color} />
                            </div>
                            <div>
                              <div className="flex justify-between mb-0.5">
                                <span className="text-[10px] text-slate-400">⚡ Reflex</span>
                                <span className="text-[10px]" style={{ color: p.color }}>{p.reflexScore}/10</span>
                              </div>
                              <ScoreBar score={p.reflexScore} color={p.color} />
                            </div>
                            <div>
                              <div className="flex justify-between mb-0.5">
                                <span className="text-[10px] text-slate-400">🏃 Speed</span>
                                <span className="text-[10px]" style={{ color: p.color }}>{Math.min(10, Math.round(p.attackSpeed / 2.5))}/10 ({p.attackSpeed}m/s)</span>
                              </div>
                              <ScoreBar score={Math.min(10, Math.round(p.attackSpeed / 2.5))} color={p.color} />
                            </div>
                          </div>

                          {/* Other metrics grid */}
                          <div className="grid grid-cols-3 gap-1.5">
                            {[
                              { l: 'Score', v: p.metrics.overallScore, u: '/100' },
                              { l: 'Balance', v: p.metrics.balance, u: '%' },
                              { l: 'Speed', v: p.attackSpeed, u: 'm/s' },
                              { l: 'Height', v: p.estimatedHeight, u: 'cm' },
                              { l: 'Weight', v: p.estimatedWeight, u: 'kg' },
                              { l: 'Knee', v: p.metrics.kneeBend, u: '°' },
                            ].map(({ l, v, u }) => (
                              <div key={l} className="bg-slate-800/60 rounded-lg p-2 text-center border border-slate-700/40">
                                <p className="text-[10px] text-slate-500 mb-0.5">{l}</p>
                                <p className="text-xs font-bold" style={{ color: p.color }}>{v}<span className="text-[10px] text-slate-500">{u}</span></p>
                              </div>
                            ))}
                          </div>
                          {p.remarks.slice(0, 2).map((r, i) => <p key={i} className="text-xs text-slate-400">• {r}</p>)}
                        </div>
                      ))}

                      {/* Actions */}
                      <div className="grid grid-cols-2 gap-2">
                        <button onClick={() => { getCombatAdvice(rec); setTab('analyze') }}
                          className="py-2 rounded-xl border border-purple-400/30 text-purple-400 text-xs font-semibold hover:bg-purple-400/10 transition-all">
                          ⚔️ Counter Moves
                        </button>
                        <button
                          onClick={() => saveAsReference(rec)}
                          disabled={!rec.pros || rec.savedAsRef}
                          className={`py-2 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1 transition-all disabled:opacity-40 ${rec.savedAsRef ? 'border-yellow-400/40 text-yellow-400' : 'border-orion-blue/30 text-orion-blue hover:bg-orion-blue/10'}`}>
                          <BookmarkPlus size={12} />
                          {rec.savedAsRef ? 'Saved as Ref' : 'Save as Ref'}
                        </button>
                      </div>
                      <button onClick={() => setRecords(prev => prev.filter(r => r.id !== rec.id))}
                        className="w-full py-2 rounded-xl border border-red-400/20 text-red-400/50 text-xs hover:text-red-400 transition-all flex items-center justify-center gap-1">
                        <Trash2 size={11} /> Delete Record
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {/* ─── REFERENCE CLIPS TAB ─── */}
      {tab === 'references' && (
        <div className="space-y-3">
          <div className="glass rounded-2xl border border-yellow-400/20 p-4 space-y-1">
            <p className="text-yellow-400 text-xs font-bold">🔖 How Reference Clips Work</p>
            <p className="text-slate-400 text-xs">Analyse a clip → get pros/cons → tap "Save as Ref". ORION uses these to suggest relevant past clips whenever you upload a new video.</p>
          </div>

          {refClips.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-sm">
              No reference clips saved yet.<br />Analyse a clip and save it as a reference.
            </div>
          ) : (
            <>
              <p className="text-xs text-slate-500">{refClips.length} reference clip{refClips.length > 1 ? 's' : ''} saved</p>
              {refClips.map(ref => (
                <div key={ref.id} className="glass rounded-2xl border border-yellow-400/15 overflow-hidden">
                  <div className="flex gap-3 p-3.5">
                    {ref.snapshot && <img src={ref.snapshot} alt="ref" className="w-14 h-10 rounded-lg object-cover border border-slate-700 flex-shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-semibold truncate">{ref.title}</p>
                      <p className="text-slate-500 text-xs">{ref.playerCount} player{ref.playerCount > 1 ? 's' : ''} · {ref.techniques.join(', ')}</p>
                      <div className="flex gap-2 mt-1 text-[10px]">
                        <span className="text-orion-blue">Score {ref.metrics.avgScore}</span>
                        <span className="text-orange-400">Speed {ref.metrics.avgSpeed}m/s</span>
                        <span className="text-green-400">Power {ref.metrics.avgPower}</span>
                      </div>
                    </div>
                    <button onClick={() => { deleteReferenceClip(ref.id); setRefClips(getReferenceClips()) }}
                      className="p-2 text-red-400/40 hover:text-red-400 transition-all flex-shrink-0">
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <div className="px-3.5 pb-3.5 grid grid-cols-2 gap-2">
                    <div className="rounded-xl bg-green-400/5 border border-green-400/15 p-2.5 space-y-1">
                      <p className="text-green-400 text-[10px] font-bold">✅ PROS</p>
                      {ref.pros.map((p, i) => <p key={i} className="text-slate-400 text-[10px]">• {p}</p>)}
                    </div>
                    <div className="rounded-xl bg-red-400/5 border border-red-400/15 p-2.5 space-y-1">
                      <p className="text-red-400 text-[10px] font-bold">❌ CONS</p>
                      {ref.cons.map((c, i) => <p key={i} className="text-slate-400 text-[10px]">• {c}</p>)}
                    </div>
                  </div>
                  {ref.coachTip && (
                    <div className="px-3.5 pb-3.5">
                      <p className="text-orion-blue text-xs">🎓 {ref.coachTip}</p>
                    </div>
                  )}
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {/* ─── RECORDINGS TAB ─── */}
      {tab === 'recordings' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500 uppercase tracking-widest">Recorded Videos</p>
            {recordedVideos.length > 0 && (
              <button onClick={() => setRecordedVideos([])} className="text-xs text-red-400/60 hover:text-red-400 flex items-center gap-1"><Trash2 size={12} /> Clear all</button>
            )}
          </div>
          {recordedVideos.length === 0 ? (
            <div className="text-center py-16 text-slate-500 text-sm">No recordings yet.<br />Switch to Live Camera → press Record.</div>
          ) : (
            recordedVideos.map(v => (
              <div key={v.url} className="glass rounded-2xl border border-orion-border p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div><p className="text-white text-sm font-semibold">{v.name}</p><p className="text-slate-500 text-xs">{v.time}</p></div>
                  <a href={v.url} download={v.name}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-orion-blue/15 border border-orion-blue/30 text-orion-blue text-xs font-bold hover:bg-orion-blue/25 transition-all">
                    <Download size={13} /> Save
                  </a>
                </div>
                <video src={v.url} controls className="w-full rounded-xl border border-slate-700" style={{ maxHeight: 300 }} />
              </div>
            ))
          )}
        </div>
      )}

      <div className="rounded-xl border border-yellow-400/20 bg-yellow-400/5 p-3">
        <p className="text-yellow-400 text-xs font-semibold mb-0.5">Safety Notice</p>
        <p className="text-slate-400 text-xs">AI analysis for training feedback only. Always train under qualified supervision.</p>
      </div>
    </div>
  )
}
