'use client'
import { useState, useRef, useCallback, useEffect } from 'react'
import { Upload, Play, Pause, SkipBack, Zap, ZapOff, ChevronDown, ChevronUp, Trash2, Trophy, Clock, Flame } from 'lucide-react'
import { loadPoseLandmarker, detectPose, POSE_CONNECTIONS } from '@/lib/pose/poseDetector'
import { analyzePose, generateFeedback } from '@/lib/pose/poseAnalysis'
import { PoseMetrics } from '@/types'

type AnalysisRecord = {
  id: number
  timestamp: string
  videoTime: string
  metrics: PoseMetrics
  feedback: string[]
  speed: string
  reactionScore: number
  suggestedSkill: SuggestedSkill
}

type SuggestedSkill = {
  name: string
  description: string
  steps: string[]
  color: string
}

function getSkillSuggestion(metrics: PoseMetrics): SuggestedSkill {
  const skills: SuggestedSkill[] = [
    {
      name: 'Veechu (Basic Strike)',
      description: 'Fundamental Silambam swing — improves arm speed and wrist control',
      steps: ['Plant feet shoulder-width', 'Grip stick at 1/3 from bottom', 'Rotate wrist outward', 'Strike through the target line', 'Snap wrist at impact'],
      color: '#00d4ff',
    },
    {
      name: 'Kaaladi (Footwork)',
      description: 'Silambam foot pattern — improves stance and balance score',
      steps: ['Start in fighting stance', 'Step right-left-right in triangle', 'Keep knees bent at 30°', 'Stay on balls of feet', 'Repeat 10x each direction'],
      color: '#00ff88',
    },
    {
      name: 'Sutru (Spinning Strike)',
      description: 'Full rotation strike — builds power and coordination',
      steps: ['Wide stance, weight centered', 'Begin 360° body rotation', 'Keep stick horizontal during spin', 'Drive hips before shoulders', 'Finish with stick extended forward'],
      color: '#a855f7',
    },
    {
      name: 'Marappu (Block & Counter)',
      description: 'Defensive technique — improve reaction time and hip tilt',
      steps: ['Narrow guard stance', 'Watch opponent\'s stick tip', 'Block with middle of your stick', 'Pivot foot immediately', 'Counter-strike to open zone'],
      color: '#f97316',
    },
    {
      name: 'Thadi Payirchi (Core Drill)',
      description: 'Power training — fix shoulder tilt and overall score',
      steps: ['Stand upright, stick vertical', 'Full overhead swing x10', 'Side swing left x10', 'Side swing right x10', 'Low strike x10 — all in one flow'],
      color: '#eab308',
    },
  ]
  // Pick based on weakest area
  if (metrics.balance < 60) return skills[1]       // footwork
  if (metrics.kneeBend < 20) return skills[4]       // core drill
  if (metrics.shoulderTilt > 15) return skills[3]   // block & counter
  if (metrics.overallScore < 60) return skills[0]   // basic strike
  return skills[2]                                   // spinning strike (advanced)
}

function estimateSpeed(prev: PoseMetrics | null, curr: PoseMetrics): string {
  if (!prev) return 'N/A'
  const delta = Math.abs(curr.handHeight - prev.handHeight) + Math.abs(curr.stanceWidth - prev.stanceWidth)
  if (delta > 30) return 'Fast ⚡'
  if (delta > 15) return 'Medium 🟡'
  return 'Slow 🔴'
}

function formatTime(t: number) {
  const m = Math.floor(t / 60)
  const s = Math.floor(t % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

export default function VideoAnalyzer() {
  const [videoSrc, setVideoSrc]         = useState<string | null>(null)
  const [isPlaying, setIsPlaying]       = useState(false)
  const [currentTime, setCurrentTime]   = useState(0)
  const [duration, setDuration]         = useState(0)
  const [isAnalysing, setIsAnalysing]   = useState(false)
  const [autoAnalyse, setAutoAnalyse]   = useState(false)
  const [loadingModel, setLoadingModel] = useState(false)
  const [isDragOver, setIsDragOver]     = useState(false)
  const [records, setRecords]           = useState<AnalysisRecord[]>([])
  const [expandedId, setExpandedId]     = useState<number | null>(null)
  const [analysisCount, setAnalysisCount] = useState(0)
  const [fullAnalysing, setFullAnalysing] = useState(false)
  const [fullProgress, setFullProgress]   = useState(0)

  const videoRef        = useRef<HTMLVideoElement>(null)
  const canvasRef       = useRef<HTMLCanvasElement>(null)
  const fileInputRef    = useRef<HTMLInputElement>(null)
  const autoIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const lastMetricsRef  = useRef<PoseMetrics | null>(null)

  const handleFile = (file: File) => {
    if (!file) return
    const url = URL.createObjectURL(file)
    setVideoSrc(url)
    setRecords([])
    setAnalysisCount(0)
    setFullProgress(0)
    lastMetricsRef.current = null
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file && ['video/mp4', 'video/quicktime', 'video/webm'].includes(file.type)) handleFile(file)
  }

  const drawSkeleton = useCallback((landmarks: any[]) => {
    const canvas = canvasRef.current
    const video = videoRef.current
    if (!canvas || !video) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    canvas.width = video.videoWidth || video.clientWidth
    canvas.height = video.videoHeight || video.clientHeight
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    if (!landmarks?.length) return
    ctx.strokeStyle = '#00d4ff'; ctx.lineWidth = 2; ctx.globalAlpha = 0.8
    POSE_CONNECTIONS.forEach(([a, b]) => {
      if (landmarks[a]?.visibility > 0.5 && landmarks[b]?.visibility > 0.5) {
        ctx.beginPath()
        ctx.moveTo(landmarks[a].x * canvas.width, landmarks[a].y * canvas.height)
        ctx.lineTo(landmarks[b].x * canvas.width, landmarks[b].y * canvas.height)
        ctx.stroke()
      }
    })
    ctx.globalAlpha = 1
    landmarks.forEach((p: any) => {
      if (p.visibility > 0.5) {
        ctx.beginPath()
        ctx.arc(p.x * canvas.width, p.y * canvas.height, 4, 0, Math.PI * 2)
        ctx.fillStyle = '#00ffff'; ctx.fill()
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; ctx.stroke()
      }
    })
  }, [])

  // Single frame analysis — adds to records
  const analyseFrame = useCallback(async (silent = false) => {
    const video = videoRef.current
    if (!video) return
    if (!silent) setIsAnalysing(true)
    setLoadingModel(true)
    try {
      await loadPoseLandmarker()
      setLoadingModel(false)
      const result = detectPose(video, performance.now())
      if (result?.landmarks?.[0]) {
        const lm = result.landmarks[0]
        drawSkeleton(lm)
        const m = analyzePose(lm)
        const fb = generateFeedback(m)
        const speed = estimateSpeed(lastMetricsRef.current, m)
        const reactionScore = Math.min(100, Math.round(m.overallScore * 0.7 + (m.balance * 0.3)))
        const skill = getSkillSuggestion(m)
        lastMetricsRef.current = m

        const record: AnalysisRecord = {
          id: Date.now(),
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          videoTime: formatTime(video.currentTime),
          metrics: m,
          feedback: fb,
          speed,
          reactionScore,
          suggestedSkill: skill,
        }
        setRecords(prev => [record, ...prev])
        setAnalysisCount(c => c + 1)
        setExpandedId(record.id)
      }
    } catch (err) {
      console.error(err)
    }
    if (!silent) setIsAnalysing(false)
    setLoadingModel(false)
  }, [drawSkeleton])

  // Full video analysis — scrubs through entire video
  const analyseFullVideo = useCallback(async () => {
    const video = videoRef.current
    if (!video || !video.duration) return
    setFullAnalysing(true)
    setFullProgress(0)
    video.pause()
    setIsPlaying(false)

    try {
      await loadPoseLandmarker()
    } catch { setFullAnalysing(false); return }

    const step = Math.max(video.duration / 10, 0.5) // ~10 snapshots across video
    let t = 0

    const analyseAt = (time: number): Promise<void> => new Promise(resolve => {
      video.currentTime = time
      const onSeeked = async () => {
        video.removeEventListener('seeked', onSeeked)
        const result = detectPose(video, performance.now())
        if (result?.landmarks?.[0]) {
          const lm = result.landmarks[0]
          drawSkeleton(lm)
          const m = analyzePose(lm)
          const fb = generateFeedback(m)
          const speed = estimateSpeed(lastMetricsRef.current, m)
          const reactionScore = Math.min(100, Math.round(m.overallScore * 0.7 + m.balance * 0.3))
          const skill = getSkillSuggestion(m)
          lastMetricsRef.current = m
          const record: AnalysisRecord = {
            id: Date.now() + Math.random(),
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            videoTime: formatTime(time),
            metrics: m, feedback: fb, speed, reactionScore, suggestedSkill: skill,
          }
          setRecords(prev => [record, ...prev])
          setAnalysisCount(c => c + 1)
          setFullProgress(Math.round((time / video.duration) * 100))
        }
        resolve()
      }
      video.addEventListener('seeked', onSeeked)
    })

    while (t <= video.duration) {
      await analyseAt(t)
      await new Promise(r => setTimeout(r, 100))
      t += step
    }

    setFullProgress(100)
    setFullAnalysing(false)
  }, [drawSkeleton])

  useEffect(() => {
    if (autoAnalyse && isPlaying) {
      autoIntervalRef.current = setInterval(() => analyseFrame(true), 800)
    } else {
      if (autoIntervalRef.current) { clearInterval(autoIntervalRef.current); autoIntervalRef.current = null }
    }
    return () => { if (autoIntervalRef.current) clearInterval(autoIntervalRef.current) }
  }, [autoAnalyse, isPlaying, analyseFrame])

  const togglePlay = () => {
    const video = videoRef.current
    if (!video) return
    if (isPlaying) { video.pause(); setIsPlaying(false) }
    else { video.play(); setIsPlaying(true) }
  }

  const resetVideo = () => {
    const video = videoRef.current
    if (!video) return
    video.currentTime = 0; video.pause(); setIsPlaying(false); setCurrentTime(0)
    const ctx = canvasRef.current?.getContext('2d')
    if (ctx && canvasRef.current) ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)
  }

  const deleteRecord = (id: number) => setRecords(prev => prev.filter(r => r.id !== id))

  const avgScore = records.length ? Math.round(records.reduce((s, r) => s + r.metrics.overallScore, 0) / records.length) : 0

  return (
    <div className="space-y-5">
      {/* Upload */}
      {!videoSrc ? (
        <div className="space-y-3">
          <div onDragOver={(e) => { e.preventDefault(); setIsDragOver(true) }} onDragLeave={() => setIsDragOver(false)} onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-3xl cursor-pointer transition-all active:scale-95 ${isDragOver ? 'border-orion-blue bg-orion-blue/15' : 'border-orion-blue/50 bg-orion-blue/5 hover:border-orion-blue hover:bg-orion-blue/10'}`}
            style={{ minHeight: 260 }}>
            <div className="flex flex-col items-center justify-center h-full py-14 px-6 text-center">
              <div className="w-20 h-20 rounded-full bg-orion-blue/15 border-2 border-orion-blue/40 flex items-center justify-center mb-5">
                <Upload size={36} className="text-orion-blue" />
              </div>
              <p className="text-white font-bold text-xl mb-1">Upload Training Video</p>
              <p className="text-slate-400 text-sm mb-1">Tap or drag & drop</p>
              <p className="text-slate-500 text-xs">MP4 · MOV · WebM</p>
            </div>
            <input ref={fileInputRef} type="file" accept="video/mp4,video/quicktime,video/webm" className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
          </div>
          <button onClick={() => fileInputRef.current?.click()}
            className="w-full py-4 rounded-2xl bg-orion-blue text-white font-bold text-base hover:bg-orion-blue/90 transition-all active:scale-95"
            style={{ boxShadow: '0 0 20px rgba(0,212,255,0.3)' }}>
            Choose Video File
          </button>
        </div>
      ) : (
        <>
          {/* Video player */}
          <div className="relative rounded-2xl overflow-hidden bg-black border border-orion-border" style={{ aspectRatio: '16/9' }}>
            <video ref={videoRef} src={videoSrc} className="w-full h-full object-contain"
              onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
              onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
              onEnded={() => setIsPlaying(false)} />
            <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" style={{ objectFit: 'contain' }} />
            {(loadingModel || fullAnalysing) && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 gap-3">
                <div className="text-orion-blue text-sm font-medium animate-pulse">
                  {fullAnalysing ? `Analysing full video... ${fullProgress}%` : 'Loading AI Model...'}
                </div>
                {fullAnalysing && (
                  <div className="w-48 h-1.5 bg-slate-700 rounded-full">
                    <div className="h-full bg-orion-blue rounded-full transition-all" style={{ width: `${fullProgress}%` }} />
                  </div>
                )}
              </div>
            )}
            {/* Analysis count badge */}
            {analysisCount > 0 && (
              <div className="absolute top-3 right-3 bg-orion-blue/90 text-white text-xs font-bold px-2.5 py-1 rounded-full">
                {analysisCount} analyses
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="glass rounded-2xl border border-orion-border p-4 space-y-3">
            <div className="flex items-center gap-3">
              <button onClick={resetVideo} className="p-2 text-slate-400 hover:text-white transition-colors"><SkipBack size={18} /></button>
              <button onClick={togglePlay} className="p-2 rounded-lg bg-orion-blue/20 border border-orion-blue/30 text-orion-blue hover:bg-orion-blue/30 transition-colors">
                {isPlaying ? <Pause size={20} /> : <Play size={20} />}
              </button>
              <span className="text-xs text-slate-400 min-w-[80px]">{formatTime(currentTime)} / {formatTime(duration)}</span>
              <input type="range" min={0} max={duration || 1} step={0.1} value={currentTime}
                onChange={(e) => { const v = parseFloat(e.target.value); if (videoRef.current) videoRef.current.currentTime = v; setCurrentTime(v) }}
                className="flex-1 accent-[#00d4ff] cursor-pointer" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              {/* Analyse full video */}
              <button onClick={analyseFullVideo} disabled={isAnalysing || fullAnalysing}
                className="col-span-2 py-3 px-4 rounded-xl font-bold text-sm transition-all disabled:opacity-50 active:scale-95"
                style={{ background: 'linear-gradient(135deg, #00d4ff22, #a855f722)', border: '1px solid #00d4ff44', color: '#00d4ff' }}>
                {fullAnalysing ? `Analysing... ${fullProgress}%` : '⚡ Analyse Full Video'}
              </button>
              {/* Analyse current frame */}
              <button onClick={() => analyseFrame()} disabled={isAnalysing || fullAnalysing}
                className="py-2.5 px-4 rounded-xl bg-slate-700 border border-slate-600 text-slate-200 font-semibold text-sm hover:bg-slate-600 transition-all disabled:opacity-50">
                {isAnalysing ? 'Analysing...' : '📸 Analyse Frame'}
              </button>
              {/* Auto */}
              <button onClick={() => setAutoAnalyse(v => !v)} disabled={fullAnalysing}
                className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border font-semibold text-sm transition-all ${autoAnalyse ? 'bg-yellow-400/20 border-yellow-400/30 text-yellow-400' : 'bg-white/5 border-orion-border text-slate-400'}`}>
                {autoAnalyse ? <Zap size={14} /> : <ZapOff size={14} />}
                {autoAnalyse ? 'Auto ON' : 'Auto OFF'}
              </button>
            </div>
            <button onClick={() => { setVideoSrc(null); setRecords([]) }}
              className="w-full py-2 rounded-xl border border-red-400/20 text-red-400/70 text-xs hover:border-red-400/40 hover:text-red-400 transition-all">
              Remove Video
            </button>
          </div>

          {/* Summary bar */}
          {records.length > 0 && (
            <div className="grid grid-cols-3 gap-3">
              <div className="glass rounded-2xl border border-orion-border p-3 text-center">
                <Trophy size={16} className="text-yellow-400 mx-auto mb-1" />
                <p className="text-yellow-400 font-bold text-lg">{avgScore}</p>
                <p className="text-slate-500 text-xs">Avg Score</p>
              </div>
              <div className="glass rounded-2xl border border-orion-border p-3 text-center">
                <Zap size={16} className="text-orion-blue mx-auto mb-1" />
                <p className="text-orion-blue font-bold text-lg">{records.length}</p>
                <p className="text-slate-500 text-xs">Analyses</p>
              </div>
              <div className="glass rounded-2xl border border-orion-border p-3 text-center">
                <Flame size={16} className="text-orange-400 mx-auto mb-1" />
                <p className="text-orange-400 font-bold text-lg">{records[0]?.reactionScore ?? '--'}</p>
                <p className="text-slate-500 text-xs">Last React.</p>
              </div>
            </div>
          )}

          {/* Analysis records */}
          {records.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-400 uppercase tracking-widest font-semibold">Analysis Records ({records.length})</p>
                <button onClick={() => setRecords([])} className="text-xs text-red-400/60 hover:text-red-400 transition-colors flex items-center gap-1">
                  <Trash2 size={12} /> Clear all
                </button>
              </div>

              {records.map((rec, idx) => (
                <div key={rec.id} className="glass rounded-2xl border border-orion-border overflow-hidden">
                  {/* Record header */}
                  <button className="w-full flex items-center gap-3 p-4 hover:bg-white/5 transition-colors"
                    onClick={() => setExpandedId(expandedId === rec.id ? null : rec.id)}>
                    <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0"
                      style={{ background: `${rec.suggestedSkill.color}20`, border: `1px solid ${rec.suggestedSkill.color}40`, color: rec.suggestedSkill.color }}>
                      #{records.length - idx}
                    </div>
                    <div className="flex-1 text-left">
                      <div className="flex items-center gap-2">
                        <span className="text-white text-sm font-semibold">Score: {rec.metrics.overallScore}/100</span>
                        <span className="text-xs text-slate-500">{rec.speed}</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
                        <span>⏱ {rec.videoTime}</span>
                        <span>🕐 {rec.timestamp}</span>
                        <span>⚡ React: {rec.reactionScore}%</span>
                      </div>
                    </div>
                    {expandedId === rec.id ? <ChevronUp size={16} className="text-slate-500" /> : <ChevronDown size={16} className="text-slate-500" />}
                  </button>

                  {/* Expanded detail */}
                  {expandedId === rec.id && (
                    <div className="px-4 pb-4 space-y-4 border-t border-orion-border/50 pt-4">
                      {/* Metrics grid */}
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { label: 'Overall', value: rec.metrics.overallScore, unit: '/100', color: rec.metrics.overallScore >= 75 ? '#00ff88' : rec.metrics.overallScore >= 50 ? '#eab308' : '#f97316' },
                          { label: 'Balance', value: rec.metrics.balance, unit: '%', color: '#00d4ff' },
                          { label: 'Knee Bend', value: rec.metrics.kneeBend, unit: '°', color: '#a855f7' },
                          { label: 'Stance', value: rec.metrics.stanceWidth, unit: 'u', color: '#00d4ff' },
                          { label: 'Shoulder', value: rec.metrics.shoulderTilt, unit: '°', color: '#eab308' },
                          { label: 'React', value: rec.reactionScore, unit: '%', color: '#f97316' },
                        ].map(({ label, value, unit, color }) => (
                          <div key={label} className="bg-slate-800/60 rounded-xl p-2.5 border border-slate-700/50 text-center">
                            <p className="text-xs text-slate-500 mb-1">{label}</p>
                            <p className="font-bold text-base" style={{ color }}>{value}<span className="text-xs text-slate-500">{unit}</span></p>
                          </div>
                        ))}
                      </div>

                      {/* Speed & timing */}
                      <div className="flex gap-2 flex-wrap">
                        <span className="text-xs px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-slate-300">
                          🏃 Speed: {rec.speed}
                        </span>
                        <span className="text-xs px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-slate-300">
                          ⏱ At {rec.videoTime} in video
                        </span>
                        <span className="text-xs px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-slate-300">
                          ⚡ Reaction: {rec.reactionScore}%
                        </span>
                      </div>

                      {/* Feedback */}
                      <div>
                        <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">ORION Feedback</p>
                        <div className="space-y-1">
                          {rec.feedback.map((fb, i) => (
                            <div key={i} className="flex gap-2 text-sm text-slate-300">
                              <span style={{ color: '#00d4ff' }}>›</span><span>{fb}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Skill suggestion with animation steps */}
                      <div className="rounded-2xl p-4 space-y-3" style={{ background: `${rec.suggestedSkill.color}08`, border: `1px solid ${rec.suggestedSkill.color}30` }}>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: rec.suggestedSkill.color }} />
                          <p className="text-xs font-bold uppercase tracking-widest" style={{ color: rec.suggestedSkill.color }}>
                            ORION Suggests
                          </p>
                        </div>
                        <p className="font-bold text-white">{rec.suggestedSkill.name}</p>
                        <p className="text-slate-400 text-xs">{rec.suggestedSkill.description}</p>
                        <div className="space-y-2">
                          <p className="text-xs text-slate-500 uppercase tracking-wide">How to do it:</p>
                          {rec.suggestedSkill.steps.map((step, i) => (
                            <div key={i} className="flex items-start gap-3">
                              <div className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5"
                                style={{ background: `${rec.suggestedSkill.color}20`, color: rec.suggestedSkill.color }}>
                                {i + 1}
                              </div>
                              <p className="text-slate-300 text-sm">{step}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      <button onClick={() => deleteRecord(rec.id)}
                        className="w-full py-2 rounded-xl border border-red-400/20 text-red-400/60 text-xs hover:border-red-400/40 hover:text-red-400 transition-all flex items-center justify-center gap-1">
                        <Trash2 size={12} /> Delete this record
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      <div className="rounded-xl border border-yellow-400/20 bg-yellow-400/5 p-4">
        <p className="text-yellow-400 text-xs font-semibold mb-1">Safety Notice</p>
        <p className="text-slate-400 text-xs">AI pose analysis is for training feedback only. Always train under qualified supervision.</p>
      </div>
    </div>
  )
}
