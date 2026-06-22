'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
import { Camera, CameraOff, Play, Square, Loader } from 'lucide-react'
import { loadPoseLandmarker, detectPose } from '@/lib/pose/poseDetector'
import { analyzePose } from '@/lib/pose/poseAnalysis'
import { PoseMetrics } from '@/types'
import PoseCanvasOverlay from './PoseCanvasOverlay'
import TrainingFeedbackPanel from './TrainingFeedbackPanel'

export default function CameraPoseAnalyzer() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [landmarks, setLandmarks] = useState<any[]>([])
  const [metrics, setMetrics] = useState<PoseMetrics>({ shoulderTilt:0, hipTilt:0, kneeBend:0, stanceWidth:0, balance:0, handHeight:0, overallScore:0 })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [dims, setDims] = useState({ w: 640, h: 480 })
  const animFrameRef = useRef<number>(0)
  const lastTimeRef = useRef(0)

  useEffect(() => {
    return () => {
      stopCamera()
      cancelAnimationFrame(animFrameRef.current)
    }
  }, [])

  async function startCamera() {
    setError('')
    setLoading(true)
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } }
      })
      setStream(s)
      if (videoRef.current) {
        videoRef.current.srcObject = s
        videoRef.current.onloadedmetadata = () => {
          const v = videoRef.current!
          setDims({ w: v.videoWidth || 640, h: v.videoHeight || 480 })
          v.play()
        }
      }
      setLoading(false)
    } catch {
      setError('Camera access denied. Please allow camera permission.')
      setLoading(false)
    }
  }

  function stopCamera() {
    stream?.getTracks().forEach(t => t.stop())
    setStream(null)
    setIsAnalyzing(false)
    cancelAnimationFrame(animFrameRef.current)
  }

  async function startAnalysis() {
    if (!stream) { setError('Start camera first.'); return }
    setLoading(true)
    try {
      await loadPoseLandmarker()
      setIsAnalyzing(true)
      setLoading(false)
      runLoop()
    } catch {
      setError('Failed to load pose model. Check internet connection.')
      setLoading(false)
    }
  }

  const runLoop = useCallback(() => {
    const video = videoRef.current
    if (!video || video.paused || video.ended) return
    const now = performance.now()
    if (now - lastTimeRef.current > 200) { // analyze ~5fps
      lastTimeRef.current = now
      try {
        const result = detectPose(video, now)
        if (result?.landmarks?.[0]) {
          setLandmarks(result.landmarks[0])
          setMetrics(analyzePose(result.landmarks[0]))
        }
      } catch {}
    }
    animFrameRef.current = requestAnimationFrame(runLoop)
  }, [])

  function stopAnalysis() {
    setIsAnalyzing(false)
    cancelAnimationFrame(animFrameRef.current)
    setLandmarks([])
  }

  return (
    <div className="space-y-4">
      <div className="text-xs text-yellow-400 bg-yellow-400/10 border border-yellow-400/30 rounded-lg px-3 py-2">
        Camera processing runs in browser only. No video is uploaded or stored.
      </div>

      {error && (
        <div className="text-xs text-red-400 bg-red-400/10 border border-red-400/30 rounded-lg px-3 py-2">{error}</div>
      )}

      {/* Video area */}
      <div className="relative rounded-2xl overflow-hidden bg-black border border-jarvis-border" style={{ aspectRatio: '4/3' }}>
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          playsInline
          muted
          style={{ transform: 'scaleX(-1)' }}
        />
        {isAnalyzing && (
          <PoseCanvasOverlay
            landmarks={landmarks}
            width={dims.w}
            height={dims.h}
          />
        )}
        {!stream && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
            <CameraOff size={48} className="text-slate-600" />
            <p className="text-slate-500 text-sm">Camera off</p>
          </div>
        )}
        {loading && (
          <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-2">
            <Loader size={32} className="text-jarvis-blue animate-spin" />
            <p className="text-jarvis-blue text-sm">Loading...</p>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex gap-3 flex-wrap">
        {!stream ? (
          <button onClick={startCamera} disabled={loading} className="flex items-center gap-2 px-5 py-3 rounded-xl bg-jarvis-blue/20 border border-jarvis-blue/40 text-jarvis-blue hover:bg-jarvis-blue/30 transition-colors text-sm font-medium">
            <Camera size={18} /> Start Camera
          </button>
        ) : (
          <button onClick={stopCamera} className="flex items-center gap-2 px-5 py-3 rounded-xl bg-red-500/20 border border-red-500/40 text-red-400 hover:bg-red-500/30 transition-colors text-sm font-medium">
            <CameraOff size={18} /> Stop Camera
          </button>
        )}

        {stream && !isAnalyzing && (
          <button onClick={startAnalysis} disabled={loading} className="flex items-center gap-2 px-5 py-3 rounded-xl bg-green-500/20 border border-green-500/40 text-green-400 hover:bg-green-500/30 transition-colors text-sm font-medium">
            <Play size={18} /> Start Analysis
          </button>
        )}

        {isAnalyzing && (
          <button onClick={stopAnalysis} className="flex items-center gap-2 px-5 py-3 rounded-xl bg-orange-500/20 border border-orange-500/40 text-orange-400 hover:bg-orange-500/30 transition-colors text-sm font-medium">
            <Square size={18} /> Stop Analysis
          </button>
        )}
      </div>

      {/* Feedback panel (shown when analyzing) */}
      {isAnalyzing && <TrainingFeedbackPanel metrics={metrics} />}
    </div>
  )
}
