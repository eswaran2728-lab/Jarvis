'use client'
import { useState, useRef, useCallback, useEffect } from 'react'
import { Upload, Play, Pause, SkipBack, Zap, ZapOff } from 'lucide-react'
import { loadPoseLandmarker, detectPose, POSE_CONNECTIONS } from '@/lib/pose/poseDetector'
import { analyzePose, generateFeedback } from '@/lib/pose/poseAnalysis'
import { PoseMetrics } from '@/types'

export default function VideoAnalyzer() {
  const [videoSrc, setVideoSrc] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isAnalysing, setIsAnalysing] = useState(false)
  const [autoAnalyse, setAutoAnalyse] = useState(false)
  const [metrics, setMetrics] = useState<PoseMetrics | null>(null)
  const [feedback, setFeedback] = useState<string[]>([])
  const [progress, setProgress] = useState(0)
  const [loadingModel, setLoadingModel] = useState(false)
  const [isDragOver, setIsDragOver] = useState(false)
  const [analysisProgress, setAnalysisProgress] = useState(0)

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const autoIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFile = (file: File) => {
    if (!file) return
    const url = URL.createObjectURL(file)
    setVideoSrc(url)
    setMetrics(null)
    setFeedback([])
    setAnalysisProgress(0)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file && (file.type === 'video/mp4' || file.type === 'video/quicktime' || file.type === 'video/webm')) {
      handleFile(file)
    }
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

    if (!landmarks || landmarks.length === 0) return

    const lm = landmarks

    // Draw connections
    ctx.strokeStyle = '#00d4ff'
    ctx.lineWidth = 2
    ctx.globalAlpha = 0.8
    POSE_CONNECTIONS.forEach(([a, b]) => {
      if (lm[a] && lm[b] && lm[a].visibility > 0.5 && lm[b].visibility > 0.5) {
        ctx.beginPath()
        ctx.moveTo(lm[a].x * canvas.width, lm[a].y * canvas.height)
        ctx.lineTo(lm[b].x * canvas.width, lm[b].y * canvas.height)
        ctx.stroke()
      }
    })

    // Draw keypoints
    ctx.globalAlpha = 1
    lm.forEach((point: any) => {
      if (point.visibility > 0.5) {
        ctx.beginPath()
        ctx.arc(point.x * canvas.width, point.y * canvas.height, 4, 0, Math.PI * 2)
        ctx.fillStyle = '#00ffff'
        ctx.fill()
        ctx.strokeStyle = '#ffffff'
        ctx.lineWidth = 1
        ctx.stroke()
      }
    })
  }, [])

  const analyseFrame = useCallback(async () => {
    const video = videoRef.current
    if (!video) return
    setIsAnalysing(true)
    setLoadingModel(true)
    try {
      await loadPoseLandmarker()
      setLoadingModel(false)
      const result = detectPose(video, performance.now())
      if (result && result.landmarks && result.landmarks.length > 0) {
        const lm = result.landmarks[0]
        drawSkeleton(lm)
        const m = analyzePose(lm)
        const fb = generateFeedback(m)
        setMetrics(m)
        setFeedback(fb)
        if (video.duration > 0) {
          setAnalysisProgress(Math.round((video.currentTime / video.duration) * 100))
        }
      } else {
        setFeedback(['Sir, no pose detected in this frame. Please ensure the full body is visible.'])
        const canvas = canvasRef.current
        if (canvas) {
          const ctx = canvas.getContext('2d')
          ctx?.clearRect(0, 0, canvas.width, canvas.height)
        }
      }
    } catch (err) {
      console.error(err)
      setFeedback(['Sir, pose detection encountered an error. Please try again.'])
      setLoadingModel(false)
    }
    setIsAnalysing(false)
  }, [drawSkeleton])

  // Auto analyse interval
  useEffect(() => {
    if (autoAnalyse && isPlaying) {
      autoIntervalRef.current = setInterval(() => {
        analyseFrame()
      }, 500)
    } else {
      if (autoIntervalRef.current) {
        clearInterval(autoIntervalRef.current)
        autoIntervalRef.current = null
      }
    }
    return () => {
      if (autoIntervalRef.current) clearInterval(autoIntervalRef.current)
    }
  }, [autoAnalyse, isPlaying, analyseFrame])

  const togglePlay = () => {
    const video = videoRef.current
    if (!video) return
    if (isPlaying) {
      video.pause()
      setIsPlaying(false)
    } else {
      video.play()
      setIsPlaying(true)
    }
  }

  const resetVideo = () => {
    const video = videoRef.current
    if (!video) return
    video.currentTime = 0
    video.pause()
    setIsPlaying(false)
    setCurrentTime(0)
    const canvas = canvasRef.current
    if (canvas) {
      const ctx = canvas.getContext('2d')
      ctx?.clearRect(0, 0, canvas.width, canvas.height)
    }
  }

  const formatTime = (t: number) => {
    const m = Math.floor(t / 60)
    const s = Math.floor(t % 60)
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  return (
    <div className="space-y-6">
      {/* Upload area */}
      {!videoSrc ? (
        <div className="space-y-4">
          {/* Big tap-to-upload button */}
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragOver(true) }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-3xl cursor-pointer transition-all active:scale-95 ${
              isDragOver
                ? 'border-orion-blue bg-orion-blue/15'
                : 'border-orion-blue/50 bg-orion-blue/5 hover:border-orion-blue hover:bg-orion-blue/10'
            }`}
            style={{ minHeight: 280 }}
          >
            <div className="flex flex-col items-center justify-center h-full py-16 px-6 text-center">
              {/* Icon */}
              <div className="w-24 h-24 rounded-full bg-orion-blue/15 border-2 border-orion-blue/40 flex items-center justify-center mb-6">
                <Upload size={40} className="text-orion-blue" />
              </div>
              <p className="text-white font-bold text-xl mb-2">Tap to Upload Video</p>
              <p className="text-slate-400 text-sm mb-1">Or drag and drop your file here</p>
              <p className="text-slate-500 text-xs">MP4 · MOV · WebM</p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="video/mp4,video/quicktime,video/webm"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
          </div>

          {/* Explicit button for mobile */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full py-4 rounded-2xl bg-orion-blue text-white font-bold text-base hover:bg-orion-blue/90 transition-all active:scale-95"
            style={{ boxShadow: '0 0 20px rgba(0,212,255,0.3)' }}
          >
            Choose Video File
          </button>
          <p className="text-xs text-slate-500 text-center">
            Upload your Silambam training video — ORION will analyse your technique
          </p>
        </div>
      ) : (
        <>
          {/* Video + Canvas overlay */}
          <div className="relative rounded-2xl overflow-hidden bg-black border border-orion-border" style={{ aspectRatio: '16/9' }}>
            <video
              ref={videoRef}
              src={videoSrc}
              className="w-full h-full object-contain"
              onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
              onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
              onEnded={() => setIsPlaying(false)}
            />
            <canvas
              ref={canvasRef}
              className="absolute inset-0 w-full h-full pointer-events-none"
              style={{ objectFit: 'contain' }}
            />
            {loadingModel && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                <div className="text-orion-blue text-sm font-medium animate-pulse">Loading AI Model...</div>
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="glass rounded-2xl border border-orion-border p-4 space-y-3">
            <div className="flex items-center gap-3">
              <button onClick={resetVideo} className="p-2 text-slate-400 hover:text-white transition-colors">
                <SkipBack size={18} />
              </button>
              <button
                onClick={togglePlay}
                className="p-2 rounded-lg bg-orion-blue/20 border border-orion-blue/30 text-orion-blue hover:bg-orion-blue/30 transition-colors"
              >
                {isPlaying ? <Pause size={20} /> : <Play size={20} />}
              </button>
              <span className="text-xs text-slate-400 min-w-[80px]">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
              <input
                type="range"
                min={0}
                max={duration || 1}
                step={0.1}
                value={currentTime}
                onChange={(e) => {
                  const v = parseFloat(e.target.value)
                  if (videoRef.current) videoRef.current.currentTime = v
                  setCurrentTime(v)
                }}
                className="flex-1 accent-[#00d4ff] cursor-pointer"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={analyseFrame}
                disabled={isAnalysing}
                className="flex-1 py-2 px-4 rounded-xl bg-orion-blue/20 border border-orion-blue/30 text-orion-blue font-semibold text-sm hover:bg-orion-blue/30 transition-all disabled:opacity-50"
              >
                {isAnalysing ? 'Analysing...' : 'Analyse Frame'}
              </button>
              <button
                onClick={() => setAutoAnalyse(v => !v)}
                className={`flex items-center gap-2 py-2 px-4 rounded-xl border font-semibold text-sm transition-all ${
                  autoAnalyse
                    ? 'bg-yellow-400/20 border-yellow-400/30 text-yellow-400 hover:bg-yellow-400/30'
                    : 'bg-white/5 border-orion-border text-slate-400 hover:border-orion-blue/30 hover:text-orion-blue'
                }`}
              >
                {autoAnalyse ? <Zap size={16} /> : <ZapOff size={16} />}
                {autoAnalyse ? 'Auto On' : 'Auto Off'}
              </button>
              <button
                onClick={() => { setVideoSrc(null); setMetrics(null); setFeedback([]) }}
                className="py-2 px-4 rounded-xl border border-orion-border text-slate-400 text-sm hover:border-red-400/30 hover:text-red-400 transition-all"
              >
                Remove
              </button>
            </div>
          </div>

          {/* Analysis progress */}
          {analysisProgress > 0 && (
            <div className="glass rounded-2xl border border-orion-border p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-slate-400">Analysis Progress</span>
                <span className="text-xs text-orion-blue font-semibold">{analysisProgress}%</span>
              </div>
              <div className="w-full h-1.5 bg-orion-border rounded-full">
                <div
                  className="h-full bg-orion-blue rounded-full transition-all"
                  style={{ width: `${analysisProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Feedback panel */}
          {(metrics || feedback.length > 0) && (
            <div className="glass rounded-2xl border border-orion-border p-5 space-y-4">
              <h3 className="text-orion-blue font-semibold tracking-wide uppercase text-xs">ORION Analysis</h3>

              {metrics && metrics.overallScore > 0 && (
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Overall', value: metrics.overallScore, unit: '/100' },
                    { label: 'Balance', value: metrics.balance, unit: '%' },
                    { label: 'Stance Width', value: metrics.stanceWidth, unit: 'u' },
                    { label: 'Knee Bend', value: metrics.kneeBend, unit: '°' },
                    { label: 'Shoulder Tilt', value: metrics.shoulderTilt, unit: '°' },
                    { label: 'Hip Tilt', value: metrics.hipTilt, unit: '°' },
                  ].map(({ label, value, unit }) => (
                    <div key={label} className="bg-orion-navy/30 rounded-xl p-3 border border-orion-border">
                      <div className="text-xs text-slate-400 mb-1">{label}</div>
                      <div className="text-orion-blue font-bold text-lg">{value}<span className="text-xs text-slate-500 ml-1">{unit}</span></div>
                    </div>
                  ))}
                </div>
              )}

              <div className="space-y-2">
                <p className="text-xs text-slate-500 uppercase tracking-wide">Silambam Feedback</p>
                {feedback.map((fb, i) => (
                  <div key={i} className="flex gap-2 text-sm text-slate-300">
                    <span className="text-orion-blue mt-0.5">›</span>
                    <span>{fb}</span>
                  </div>
                ))}
              </div>

              {metrics && (
                <div className="pt-3 border-t border-orion-border space-y-1">
                  <p className="text-xs text-slate-500 uppercase tracking-wide">Stick & Technique Notes</p>
                  <p className="text-sm text-slate-300">
                    {metrics.handHeight > 10 ? '› Sir, hands are raised — good for overhead strikes.' : metrics.handHeight < -10 ? '› Sir, keep hands higher for better guard.' : '› Hand position is in neutral guard.'}
                  </p>
                  <p className="text-sm text-slate-300">
                    {metrics.stanceWidth >= 20 && metrics.stanceWidth <= 40 ? '› Footwork stance is optimal for Silambam mobility.' : '› Adjust foot placement to shoulder-width for Silambam form.'}
                  </p>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Safety disclaimer */}
      <div className="rounded-xl border border-yellow-400/20 bg-yellow-400/5 p-4">
        <p className="text-yellow-400 text-xs font-semibold mb-1">Safety Notice</p>
        <p className="text-slate-400 text-xs">AI pose analysis is for training feedback only. Always train under qualified supervision. Do not attempt advanced techniques without proper instruction.</p>
      </div>
    </div>
  )
}
