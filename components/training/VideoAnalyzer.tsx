'use client'
import { useState, useRef, useCallback, useEffect } from 'react'
import { Upload, Play, Pause, SkipBack, Zap, ZapOff, ChevronDown, ChevronUp, Trash2, Trophy, Camera, Video, BookOpen } from 'lucide-react'
import { loadPoseLandmarker, detectPose, POSE_CONNECTIONS } from '@/lib/pose/poseDetector'
import { analyzePose, generateFeedback } from '@/lib/pose/poseAnalysis'
import { PoseMetrics } from '@/types'
import {
  calculateAttackSpeed, calculatePower, detectTechnique,
  estimateHeight, estimateWeight, generateMotionRemarks,
  SILAMBAM_TECHNIQUES, SilambamTechnique,
} from '@/lib/pose/motionAnalysis'
import SkillAnimation from './SkillAnimation'

type AnalysisRecord = {
  id: number
  timestamp: string
  videoTime: string
  metrics: PoseMetrics
  feedback: string[]
  attackSpeed: number
  power: number
  technique: string
  estimatedHeight: number
  estimatedWeight: number
  remarks: string[]
  suggestedSkill: SilambamTechnique
  landmarks: any[]
}

type Tab = 'analyze' | 'records' | 'library'
type Mode = 'video' | 'camera'

function formatTime(t: number) {
  const m = Math.floor(t / 60)
  const s = Math.floor(t % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

function getSkillForMetrics(metrics: PoseMetrics): SilambamTechnique {
  if (metrics.balance < 55) return SILAMBAM_TECHNIQUES.find(t => t.id === 'kaaladi')!
  if (metrics.kneeBend < 130) return SILAMBAM_TECHNIQUES.find(t => t.id === 'thadi')!
  if (metrics.shoulderTilt > 12) return SILAMBAM_TECHNIQUES.find(t => t.id === 'marappu')!
  if (metrics.overallScore > 75) return SILAMBAM_TECHNIQUES.find(t => t.id === 'sutru')!
  return SILAMBAM_TECHNIQUES.find(t => t.id === 'veechu')!
}

export default function VideoAnalyzer() {
  const [mode, setMode]               = useState<Mode>('video')
  const [tab, setTab]                 = useState<Tab>('analyze')
  const [videoSrc, setVideoSrc]       = useState<string | null>(null)
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
  const [selectedSkill, setSelectedSkill] = useState<SilambamTechnique>(SILAMBAM_TECHNIQUES[0])
  const [liveMetrics, setLiveMetrics] = useState<PoseMetrics | null>(null)
  const [liveAttackSpeed, setLiveAttackSpeed] = useState(0)

  const videoRef      = useRef<HTMLVideoElement>(null)
  const cameraRef     = useRef<HTMLVideoElement>(null)
  const canvasRef     = useRef<HTMLCanvasElement>(null)
  const cameraCanvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef  = useRef<HTMLInputElement>(null)
  const autoIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const cameraIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const prevLandmarksRef = useRef<any[] | null>(null)
  const prevTimestampRef = useRef<number>(0)

  const handleFile = (file: File) => {
    const url = URL.createObjectURL(file)
    setVideoSrc(url)
    setFullProgress(0)
    prevLandmarksRef.current = null
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setIsDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file && ['video/mp4', 'video/quicktime', 'video/webm'].includes(file.type)) handleFile(file)
  }

  const drawSkeleton = useCallback((landmarks: any[], canvasEl: HTMLCanvasElement, sourceEl: HTMLVideoElement) => {
    const ctx = canvasEl.getContext('2d')
    if (!ctx) return
    canvasEl.width = sourceEl.videoWidth || sourceEl.clientWidth
    canvasEl.height = sourceEl.videoHeight || sourceEl.clientHeight
    ctx.clearRect(0, 0, canvasEl.width, canvasEl.height)
    if (!landmarks?.length) return
    ctx.strokeStyle = '#00d4ff'; ctx.lineWidth = 2; ctx.globalAlpha = 0.85
    POSE_CONNECTIONS.forEach(([a, b]) => {
      if (landmarks[a]?.visibility > 0.5 && landmarks[b]?.visibility > 0.5) {
        ctx.beginPath()
        ctx.moveTo(landmarks[a].x * canvasEl.width, landmarks[a].y * canvasEl.height)
        ctx.lineTo(landmarks[b].x * canvasEl.width, landmarks[b].y * canvasEl.height)
        ctx.stroke()
      }
    })
    ctx.globalAlpha = 1
    landmarks.forEach((p: any, i: number) => {
      if (p.visibility > 0.5) {
        ctx.beginPath()
        ctx.arc(p.x * canvasEl.width, p.y * canvasEl.height, i === 0 ? 6 : 4, 0, Math.PI * 2)
        ctx.fillStyle = i === 0 ? '#ffffff' : '#00ffff'
        ctx.fill()
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; ctx.stroke()
      }
    })
    // Draw speed indicator on wrists
    const lw = landmarks[15]; const rw = landmarks[16]
    if (lw?.visibility > 0.5) {
      ctx.beginPath()
      ctx.arc(lw.x * canvasEl.width, lw.y * canvasEl.height, 10, 0, Math.PI * 2)
      ctx.strokeStyle = '#f97316'; ctx.lineWidth = 2; ctx.globalAlpha = 0.7; ctx.stroke()
    }
    if (rw?.visibility > 0.5) {
      ctx.beginPath()
      ctx.arc(rw.x * canvasEl.width, rw.y * canvasEl.height, 10, 0, Math.PI * 2)
      ctx.strokeStyle = '#f97316'; ctx.lineWidth = 2; ctx.globalAlpha = 0.7; ctx.stroke()
    }
    ctx.globalAlpha = 1
  }, [])

  const buildRecord = useCallback((lm: any[], videoTimeStr: string): AnalysisRecord => {
    const m = analyzePose(lm)
    const fb = generateFeedback(m)
    const now = performance.now()
    const dt = prevTimestampRef.current ? now - prevTimestampRef.current : 500
    const height = estimateHeight(lm, 480)
    const weight = estimateWeight(height, lm)
    const speed = calculateAttackSpeed(prevLandmarksRef.current, lm, dt, height, 480)
    const power = calculatePower(speed, weight)
    const technique = detectTechnique(lm)
    const skill = getSkillForMetrics(m)
    const motionMetrics = {
      attackSpeed: speed, reactionTime: dt, power, strikeCount: 0,
      estimatedHeight: height, estimatedWeight: weight,
      avgStrikeSpeed: speed, maxStrikeSpeed: speed,
      footworkScore: m.balance, guardScore: m.overallScore,
      combatReadiness: Math.round((m.overallScore + m.balance) / 2),
      techniqueType: technique, remarks: [] as string[],
    }
    motionMetrics.remarks = generateMotionRemarks(motionMetrics)
    prevLandmarksRef.current = lm
    prevTimestampRef.current = now
    return {
      id: Date.now() + Math.random(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      videoTime: videoTimeStr,
      metrics: m, feedback: fb, attackSpeed: speed, power, technique,
      estimatedHeight: height, estimatedWeight: weight,
      remarks: motionMetrics.remarks, suggestedSkill: skill, landmarks: lm,
    }
  }, [])

  const getCombatAdvice = useCallback(async (rec: AnalysisRecord) => {
    setLoadingAdvice(true)
    setCombatAdvice(null)
    try {
      const res = await fetch('/api/combat-advice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          technique: rec.technique,
          overallScore: rec.metrics.overallScore,
          balance: rec.metrics.balance,
          kneeBend: rec.metrics.kneeBend,
          shoulderTilt: rec.metrics.shoulderTilt,
          stanceWidth: rec.metrics.stanceWidth,
          handHeight: rec.metrics.handHeight,
          attackSpeed: rec.attackSpeed,
          power: rec.power,
        }),
      })
      const data = await res.json()
      setCombatAdvice(data.advice)
    } catch { setCombatAdvice('Could not get advice.') }
    setLoadingAdvice(false)
  }, [])

  const analyseFrame = useCallback(async (withAdvice = true) => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return
    setIsAnalysing(true); setLoadingModel(true)
    try {
      await loadPoseLandmarker()
      setLoadingModel(false)
      const result = detectPose(video, performance.now())
      if (result?.landmarks?.[0]) {
        const lm = result.landmarks[0]
        drawSkeleton(lm, canvas, video)
        const rec = buildRecord(lm, formatTime(video.currentTime))
        setRecords(prev => [rec, ...prev])
        setExpandedId(rec.id)
        if (withAdvice) getCombatAdvice(rec)
      }
    } catch (err) { console.error(err) }
    setIsAnalysing(false); setLoadingModel(false)
  }, [drawSkeleton, buildRecord, getCombatAdvice])

  const analyseFullVideo = useCallback(async () => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas || !video.duration) return
    setFullAnalysing(true); setFullProgress(0)
    video.pause(); setIsPlaying(false)
    try { await loadPoseLandmarker() } catch { setFullAnalysing(false); return }
    const step = Math.max(video.duration / 12, 0.4)
    let t = 0
    while (t <= video.duration) {
      await new Promise<void>(resolve => {
        video.currentTime = t
        const onSeeked = async () => {
          video.removeEventListener('seeked', onSeeked)
          const result = detectPose(video, performance.now())
          if (result?.landmarks?.[0]) {
            const lm = result.landmarks[0]
            drawSkeleton(lm, canvas, video)
            const rec = buildRecord(lm, formatTime(t))
            setRecords(prev => [rec, ...prev])
            setFullProgress(Math.round((t / video.duration) * 100))
          }
          resolve()
        }
        video.addEventListener('seeked', onSeeked)
      })
      await new Promise(r => setTimeout(r, 80))
      t += step
    }
    setFullProgress(100); setFullAnalysing(false)
  }, [drawSkeleton, buildRecord])

  // Auto-analyse when video is paused by user
  useEffect(() => {
    const video = videoRef.current
    if (!video || !videoSrc) return
    const onPause = () => {
      if (video.currentTime > 0 && video.currentTime < video.duration) {
        analyseFrame(true)
      }
    }
    video.addEventListener('pause', onPause)
    return () => video.removeEventListener('pause', onPause)
  }, [videoSrc, analyseFrame])

  // Auto analyse on video play
  useEffect(() => {
    if (autoAnalyse && isPlaying) {
      autoIntervalRef.current = setInterval(() => analyseFrame(false), 800)
    } else {
      if (autoIntervalRef.current) { clearInterval(autoIntervalRef.current); autoIntervalRef.current = null }
    }
    return () => { if (autoIntervalRef.current) clearInterval(autoIntervalRef.current) }
  }, [autoAnalyse, isPlaying, analyseFrame])

  // Camera mode
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: 640, height: 480 } })
      setCameraStream(stream)
      setCameraOn(true)
      if (cameraRef.current) {
        cameraRef.current.srcObject = stream
        cameraRef.current.play()
      }
      await loadPoseLandmarker()
      cameraIntervalRef.current = setInterval(async () => {
        const cam = cameraRef.current
        const canvas = cameraCanvasRef.current
        if (!cam || !canvas || cam.readyState < 2) return
        const result = detectPose(cam, performance.now())
        if (result?.landmarks?.[0]) {
          const lm = result.landmarks[0]
          drawSkeleton(lm, canvas, cam)
          const m = analyzePose(lm)
          const h = estimateHeight(lm, 480)
          const w = estimateWeight(h, lm)
          const dt = prevTimestampRef.current ? performance.now() - prevTimestampRef.current : 500
          const spd = calculateAttackSpeed(prevLandmarksRef.current, lm, dt, h, 480)
          prevLandmarksRef.current = lm
          prevTimestampRef.current = performance.now()
          setLiveMetrics(m)
          setLiveAttackSpeed(spd)
        }
      }, 300)
    } catch (err) { console.error('Camera error:', err) }
  }

  const stopCamera = () => {
    cameraStream?.getTracks().forEach(t => t.stop())
    setCameraStream(null); setCameraOn(false)
    if (cameraIntervalRef.current) { clearInterval(cameraIntervalRef.current); cameraIntervalRef.current = null }
    setLiveMetrics(null); setLiveAttackSpeed(0)
  }

  const saveCameraRecord = async () => {
    const cam = cameraRef.current
    if (!cam) return
    const result = detectPose(cam, performance.now())
    if (result?.landmarks?.[0]) {
      const lm = result.landmarks[0]
      const rec = buildRecord(lm, 'Live')
      setRecords(prev => [rec, ...prev])
      setExpandedId(rec.id)
      setTab('records')
    }
  }

  useEffect(() => {
    return () => { stopCamera(); if (autoIntervalRef.current) clearInterval(autoIntervalRef.current) }
  }, [])

  const avgScore = records.length ? Math.round(records.reduce((s, r) => s + r.metrics.overallScore, 0) / records.length) : 0
  const maxSpeed = records.length ? Math.max(...records.map(r => r.attackSpeed)) : 0

  return (
    <div className="space-y-4">
      {/* Mode toggle */}
      <div className="flex gap-2 p-1 bg-slate-800/60 rounded-2xl border border-slate-700">
        {(['video', 'camera'] as Mode[]).map(m => (
          <button key={m} onClick={() => { setMode(m); if (m === 'camera') startCamera(); else stopCamera() }}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all ${mode === m ? 'bg-orion-blue text-white' : 'text-slate-400 hover:text-white'}`}>
            {m === 'video' ? <><Video size={16} /> Video</> : <><Camera size={16} /> Live Camera</>}
          </button>
        ))}
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 p-1 bg-slate-800/40 rounded-xl border border-slate-700">
        {(['analyze', 'records', 'library'] as Tab[]).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all capitalize ${tab === t ? 'bg-slate-700 text-white' : 'text-slate-500 hover:text-white'}`}>
            {t === 'analyze' ? '⚡ Analyse' : t === 'records' ? `📋 Records ${records.length > 0 ? `(${records.length})` : ''}` : '📚 Skills'}
          </button>
        ))}
      </div>

      {/* ─── ANALYSE TAB ─── */}
      {tab === 'analyze' && (
        <>
          {/* VIDEO MODE */}
          {mode === 'video' && (
            <>
              {!videoSrc ? (
                <div className="space-y-3">
                  <div onDragOver={e => { e.preventDefault(); setIsDragOver(true) }} onDragLeave={() => setIsDragOver(false)} onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-3xl cursor-pointer transition-all active:scale-95 ${isDragOver ? 'border-orion-blue bg-orion-blue/15' : 'border-orion-blue/50 bg-orion-blue/5 hover:border-orion-blue'}`}
                    style={{ minHeight: 240 }}>
                    <div className="flex flex-col items-center justify-center h-full py-12 px-6 text-center">
                      <div className="w-18 h-18 rounded-full bg-orion-blue/15 border-2 border-orion-blue/40 flex items-center justify-center mb-4 p-5">
                        <Upload size={32} className="text-orion-blue" />
                      </div>
                      <p className="text-white font-bold text-lg mb-1">Upload Training Video</p>
                      <p className="text-slate-400 text-sm">MP4 · MOV · WebM</p>
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
                          {fullAnalysing ? `Analysing full video... ${fullProgress}%` : 'Loading AI model...'}
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
                        {records.length} frames
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
                      {fullAnalysing ? `⚡ Analysing... ${fullProgress}%` : '⚡ Analyse Full Video (All Moves)'}
                    </button>
                    <div className="grid grid-cols-2 gap-2">
                      <button onClick={() => analyseFrame()} disabled={isAnalysing || fullAnalysing}
                        className="py-2.5 rounded-xl bg-slate-700 border border-slate-600 text-slate-200 font-semibold text-sm disabled:opacity-50">
                        {isAnalysing ? 'Analysing...' : '📸 This Frame'}
                      </button>
                      <button onClick={() => setAutoAnalyse(v => !v)} disabled={fullAnalysing}
                        className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl border font-semibold text-sm ${autoAnalyse ? 'bg-yellow-400/20 border-yellow-400/30 text-yellow-400' : 'bg-slate-700 border-slate-600 text-slate-400'}`}>
                        {autoAnalyse ? <Zap size={14} /> : <ZapOff size={14} />}
                        {autoAnalyse ? 'Auto ON' : 'Auto OFF'}
                      </button>
                    </div>
                    <button onClick={() => { setVideoSrc(null); setRecords([]); setCombatAdvice(null) }}
                      className="w-full py-2 rounded-xl border border-red-400/20 text-red-400/60 text-xs hover:text-red-400 transition-all">
                      Remove Video
                    </button>
                  </div>

                  {/* ORION Combat Advice Panel — appears on pause */}
                  {(loadingAdvice || combatAdvice) && (
                    <div className="rounded-2xl border p-4 space-y-2" style={{ background: '#a855f708', borderColor: '#a855f730' }}>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full animate-pulse bg-purple-400" />
                        <p className="text-xs font-bold uppercase tracking-widest text-purple-400">ORION Combat Analysis</p>
                      </div>
                      {loadingAdvice ? (
                        <div className="flex items-center gap-2 text-slate-400 text-sm">
                          <span className="animate-spin text-purple-400">⚙</span> Analysing position...
                        </div>
                      ) : (
                        <div className="text-sm text-slate-200 whitespace-pre-line leading-relaxed">
                          {combatAdvice}
                        </div>
                      )}
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
                {/* Live metrics overlay */}
                {liveMetrics && (
                  <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80">
                    <div className="grid grid-cols-4 gap-1.5 text-center">
                      {[
                        { l: 'Score', v: liveMetrics.overallScore, u: '' },
                        { l: 'Balance', v: liveMetrics.balance, u: '%' },
                        { l: 'Speed', v: liveAttackSpeed, u: 'm/s' },
                        { l: 'Power', v: calculatePower(liveAttackSpeed, 70), u: '/100' },
                      ].map(({ l, v, u }) => (
                        <div key={l} className="bg-black/60 rounded-lg p-1.5">
                          <p className="text-orion-blue font-bold text-sm">{v}{u}</p>
                          <p className="text-slate-400 text-[10px]">{l}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button onClick={cameraOn ? stopCamera : startCamera}
                  className={`py-3 rounded-xl font-bold text-sm transition-all ${cameraOn ? 'bg-red-400/20 border border-red-400/40 text-red-400' : 'bg-orion-blue text-white'}`}>
                  {cameraOn ? '⏹ Stop Camera' : '📷 Start Camera'}
                </button>
                <button onClick={saveCameraRecord} disabled={!cameraOn || !liveMetrics}
                  className="py-3 rounded-xl bg-green-400/20 border border-green-400/40 text-green-400 font-bold text-sm disabled:opacity-40">
                  💾 Save Record
                </button>
              </div>

              {liveMetrics && (
                <div className="glass rounded-2xl border border-orion-border p-4 space-y-2">
                  <p className="text-xs text-slate-500 uppercase tracking-widest">Live Analysis</p>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: 'Technique', value: detectTechnique(prevLandmarksRef.current || []), unit: '', color: '#00d4ff' },
                      { label: 'Attack Speed', value: `${liveAttackSpeed}`, unit: 'm/s', color: '#f97316' },
                      { label: 'Height Est.', value: `${estimateHeight(prevLandmarksRef.current || [], 480)}`, unit: 'cm', color: '#a855f7' },
                    ].map(({ label, value, unit, color }) => (
                      <div key={label} className="bg-slate-800/60 rounded-xl p-2 text-center border border-slate-700/50">
                        <p className="text-[10px] text-slate-500 mb-0.5">{label}</p>
                        <p className="text-xs font-bold" style={{ color }}>{value}<span className="text-slate-500">{unit}</span></p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
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
              {/* Summary */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  { icon: <Trophy size={14} className="text-yellow-400" />, value: avgScore, label: 'Avg Score', color: '#eab308' },
                  { icon: <Zap size={14} className="text-orion-blue" />, value: records.length, label: 'Records', color: '#00d4ff' },
                  { icon: <Zap size={14} className="text-orange-400" />, value: `${maxSpeed}m/s`, label: 'Max Speed', color: '#f97316' },
                ].map(({ icon, value, label, color }) => (
                  <div key={label} className="glass rounded-2xl border border-orion-border p-3 text-center">
                    <div className="flex justify-center mb-1">{icon}</div>
                    <p className="font-bold" style={{ color }}>{value}</p>
                    <p className="text-slate-500 text-xs">{label}</p>
                  </div>
                ))}
              </div>

              <div className="flex justify-end">
                <button onClick={() => setRecords([])} className="text-xs text-red-400/60 hover:text-red-400 flex items-center gap-1">
                  <Trash2 size={12} /> Clear all
                </button>
              </div>

              {records.map((rec, idx) => (
                <div key={rec.id} className="glass rounded-2xl border border-orion-border overflow-hidden">
                  <button className="w-full flex items-center gap-3 p-3.5 hover:bg-white/5 transition-colors"
                    onClick={() => setExpandedId(expandedId === rec.id ? null : rec.id)}>
                    <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0"
                      style={{ background: '#00d4ff15', border: '1px solid #00d4ff30', color: '#00d4ff' }}>
                      #{records.length - idx}
                    </div>
                    <div className="flex-1 text-left min-w-0">
                      <p className="text-white text-sm font-semibold truncate">{rec.technique}</p>
                      <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                        <span>🏆 {rec.metrics.overallScore}/100</span>
                        <span>⚡ {rec.attackSpeed}m/s</span>
                        <span>💥 Power {rec.power}/100</span>
                        {rec.videoTime !== 'Live' && <span>⏱ {rec.videoTime}</span>}
                      </div>
                    </div>
                    {expandedId === rec.id ? <ChevronUp size={16} className="text-slate-500 flex-shrink-0" /> : <ChevronDown size={16} className="text-slate-500 flex-shrink-0" />}
                  </button>

                  {expandedId === rec.id && (
                    <div className="px-4 pb-4 space-y-4 border-t border-orion-border/40 pt-4">
                      {/* Full metrics */}
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { l: 'Overall', v: rec.metrics.overallScore, u: '/100', c: rec.metrics.overallScore > 70 ? '#00ff88' : rec.metrics.overallScore > 50 ? '#eab308' : '#f97316' },
                          { l: 'Balance', v: rec.metrics.balance, u: '%', c: '#00d4ff' },
                          { l: 'Knee Bend', v: rec.metrics.kneeBend, u: '°', c: '#a855f7' },
                          { l: 'Attack Speed', v: rec.attackSpeed, u: 'm/s', c: '#f97316' },
                          { l: 'Power', v: rec.power, u: '/100', c: '#eab308' },
                          { l: 'Stance', v: rec.metrics.stanceWidth, u: 'u', c: '#00d4ff' },
                          { l: 'Shoulder Tilt', v: rec.metrics.shoulderTilt, u: '°', c: '#a855f7' },
                          { l: 'Height Est.', v: rec.estimatedHeight, u: 'cm', c: '#00ff88' },
                          { l: 'Weight Est.', v: rec.estimatedWeight, u: 'kg', c: '#00ff88' },
                        ].map(({ l, v, u, c }) => (
                          <div key={l} className="bg-slate-800/60 rounded-xl p-2.5 text-center border border-slate-700/40">
                            <p className="text-[10px] text-slate-500 mb-0.5">{l}</p>
                            <p className="font-bold text-sm" style={{ color: c }}>{v}<span className="text-[10px] text-slate-500">{u}</span></p>
                          </div>
                        ))}
                      </div>

                      {/* ORION Remarks */}
                      <div>
                        <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">ORION Remarks</p>
                        <div className="space-y-1.5">
                          {rec.remarks.map((r, i) => (
                            <p key={i} className="text-sm text-slate-300 leading-snug">{r}</p>
                          ))}
                        </div>
                      </div>

                      {/* Feedback */}
                      <div>
                        <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">Pose Feedback</p>
                        {rec.feedback.map((fb, i) => (
                          <div key={i} className="flex gap-2 text-sm text-slate-300 mb-1">
                            <span className="text-orion-blue">›</span><span>{fb}</span>
                          </div>
                        ))}
                      </div>

                      {/* Skill suggestion with animation */}
                      <div className="rounded-2xl p-4 space-y-3" style={{ background: '#00d4ff08', border: '1px solid #00d4ff25' }}>
                        <p className="text-xs font-bold uppercase tracking-widest text-orion-blue">ORION Suggests — Practice This</p>
                        <div className="flex gap-4 items-start">
                          <SkillAnimation technique={rec.suggestedSkill} size={140} showLabel={false} />
                          <div className="flex-1 space-y-2">
                            <p className="font-bold text-white text-sm">{rec.suggestedSkill.name}</p>
                            <p className="text-slate-400 text-xs">{rec.suggestedSkill.tamilName} · {rec.suggestedSkill.difficulty}</p>
                            <p className="text-slate-400 text-xs">{rec.suggestedSkill.description}</p>
                            <div className="flex flex-wrap gap-1">
                              {rec.suggestedSkill.targetAreas.map(a => (
                                <span key={a} className="text-[10px] px-2 py-0.5 rounded-full bg-orion-blue/10 border border-orion-blue/20 text-orion-blue">{a}</span>
                              ))}
                            </div>
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <p className="text-xs text-slate-500 uppercase tracking-wide">Step-by-step:</p>
                          {rec.suggestedSkill.animationFrames.map((_, i) => (
                            <div key={i} className="flex items-start gap-2">
                              <div className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5 bg-orion-blue/15 text-orion-blue">{i + 1}</div>
                              <p className="text-slate-300 text-xs">{getStepText(rec.suggestedSkill.id, i)}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <button onClick={() => { getCombatAdvice(rec); setTab('analyze') }}
                          className="py-2 rounded-xl border border-purple-400/30 text-purple-400 text-xs font-semibold hover:bg-purple-400/10 transition-all">
                          ⚔️ Get Counter Moves
                        </button>
                        <button onClick={() => setRecords(prev => prev.filter(r => r.id !== rec.id))}
                          className="py-2 rounded-xl border border-red-400/20 text-red-400/50 text-xs hover:text-red-400 transition-all flex items-center justify-center gap-1">
                          <Trash2 size={11} /> Delete
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {/* ─── SKILLS LIBRARY TAB ─── */}
      {tab === 'library' && (
        <div className="space-y-4">
          <p className="text-xs text-slate-500 text-center">Tap any skill to see its animation and training guide</p>
          <div className="grid grid-cols-2 gap-3">
            {SILAMBAM_TECHNIQUES.map(skill => (
              <button key={skill.id} onClick={() => setSelectedSkill(skill)}
                className={`rounded-2xl border p-3 text-left transition-all ${selectedSkill.id === skill.id ? 'border-orion-blue/60 bg-orion-blue/10' : 'border-slate-700 bg-slate-800/40 hover:border-slate-600'}`}>
                <p className="text-white text-xs font-bold mb-0.5">{skill.name}</p>
                <p className="text-slate-500 text-[10px] mb-1">{skill.tamilName}</p>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
                  skill.difficulty === 'beginner' ? 'bg-green-400/15 text-green-400' :
                  skill.difficulty === 'intermediate' ? 'bg-yellow-400/15 text-yellow-400' :
                  skill.difficulty === 'advanced' ? 'bg-orange-400/15 text-orange-400' :
                  'bg-red-400/15 text-red-400'}`}>
                  {skill.difficulty}
                </span>
              </button>
            ))}
          </div>

          {selectedSkill && (
            <div className="glass rounded-2xl border border-orion-border p-5 space-y-4">
              <div className="flex gap-4 items-center">
                <SkillAnimation technique={selectedSkill} size={160} loop autoPlay />
                <div className="flex-1">
                  <p className="font-bold text-white">{selectedSkill.name}</p>
                  <p className="text-slate-400 text-sm">{selectedSkill.tamilName}</p>
                  <p className="text-xs text-orion-blue mt-1 capitalize">{selectedSkill.category} · {selectedSkill.difficulty}</p>
                  <p className="text-slate-400 text-xs mt-2">{selectedSkill.description}</p>
                </div>
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">Target Areas</p>
                <div className="flex flex-wrap gap-1">
                  {selectedSkill.targetAreas.map(a => (
                    <span key={a} className="text-xs px-2.5 py-1 rounded-full bg-orion-blue/10 border border-orion-blue/20 text-orion-blue">{a}</span>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">Training Steps</p>
                {Array.from({ length: selectedSkill.animationFrames.length }, (_, i) => (
                  <div key={i} className="flex items-start gap-3 mb-2">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 bg-orion-blue/15 text-orion-blue border border-orion-blue/30">{i + 1}</div>
                    <p className="text-slate-300 text-sm pt-0.5">{getStepText(selectedSkill.id, i)}</p>
                  </div>
                ))}
              </div>
            </div>
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

function getStepText(id: string, i: number): string {
  const steps: Record<string, string[]> = {
    veechu: ['Plant feet shoulder-width apart, knees slightly bent', 'Grip stick at 1/3 from bottom, raise to ready position', 'Drive from shoulder, rotate wrist outward in wide arc', 'Snap wrist at impact point for maximum force', 'Recover to guard position immediately'],
    kaaladi: ['Begin in fighting stance, weight on balls of feet', 'Step right foot diagonally forward-right', 'Bring left foot to new center position', 'Step right foot to complete triangle', 'Repeat in reverse — left side triangle'],
    sutru: ['Wide power stance, equal weight on both feet', 'Begin rotation — push from back foot', 'Keep stick horizontal and tight during spin', 'Drive hips first, shoulders follow, arms last', 'Extend strike at end of rotation — snap wrist'],
    marappu: ['Narrow guard stance — stick tip high, protecting head', 'Watch opponent\'s stick tip, not their body', 'Block incoming strike with middle section of your stick', 'Immediately pivot your rear foot inward', 'Counter-strike to the now-open zone in one motion'],
    thadi: ['Stand upright, hold stick vertical above head', 'Execute 10 full overhead downward strikes', 'Rotate for 10 side strikes left (horizontal)', 'Rotate for 10 side strikes right (horizontal)', 'Complete with 10 low upward strikes — all in continuous flow'],
    mael_veechu: ['Raise stick directly overhead with both hands', 'Step forward with dominant foot', 'Drive stick downward with full shoulder and back power', 'Keep wrists locked at impact, do not flick', 'Recover to guard immediately after contact'],
    keel_veechu: ['Lower guard stance, knees bent more than usual', 'Target opponent\'s lead leg with upward arc', 'Strike from below knee height, upward sweep motion', 'Use wrist snap at end of arc for speed', 'Return to stance — protect your own head during recovery'],
    iduppu_sutru: ['Wide stance, arms extended — activate core', 'Begin rotation from hips — do NOT lead with arms', 'Let the hip rotation pull the shoulders and arms', 'Stick follows the body momentum — add wrist snap at target', 'Complete rotation, re-establish guard quickly'],
  }
  return steps[id]?.[i] || `Step ${i + 1}: Follow the animation above`
}
