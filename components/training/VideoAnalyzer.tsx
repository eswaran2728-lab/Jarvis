'use client'
import { useState, useRef, useCallback, useEffect, memo } from 'react'
import { Upload, Play, Pause, SkipBack, Zap, ZapOff, ChevronDown, ChevronUp, Trash2, Camera, Video, FlipHorizontal, Circle, Square, Download, Scissors, Lightbulb, Filter } from 'lucide-react'
import { loadPoseLandmarker, detectPose, POSE_CONNECTIONS, PLAYER_COLORS, PLAYER_LABELS } from '@/lib/pose/poseDetector'
import { analyzePose, generateFeedback } from '@/lib/pose/poseAnalysis'
import { PoseMetrics } from '@/types'
import { calculateAttackSpeed, calculatePower, detectTechnique, estimateHeight, estimateWeight, generateMotionRemarks, detectSpinScore, calcReflexScore, powerScore } from '@/lib/pose/motionAnalysis'
import { getSuggestedClips } from '@/lib/skillLibrary/store'
import { ReferenceClip } from '@/types/skillLibrary'
import {
  detectUStrikeOpportunity, analyzeUStrikeAttempt, drawUStrikeOverlay, estimateStickTip,
  UStrikeOpportunity, UStrikeAttemptResult, TipPoint,
} from '@/lib/pose/uStrikeDetection'
import {
  detectHookOpportunity, analyzeHookAttempt, drawHookOverlay, estimateHookStickTip,
  HookOpportunity, HookAttemptResult, HookPoint,
} from '@/lib/pose/hookDetection'
import {
  detectUsiOpportunity, analyzeUsiAttempt, drawUsiOverlay, estimateUsiStickTip,
  UsiOpportunity, UsiAttemptResult, UsiPoint,
} from '@/lib/pose/usiDetection'

// ─── Types ────────────────────────────────────────────────────────────────────

type PlayerData = {
  landmarks: any[]
  metrics: PoseMetrics
  feedback: string[]
  attackSpeed: number
  power: number
  powerScore: number
  spinScore: number
  reflexScore: number
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
  uStrikeOpportunity?: UStrikeOpportunity
  uStrikeAttempt?: UStrikeAttemptResult
  uStrikeDeepAnalysis?: any
  hookOpportunity?: HookOpportunity
  hookAttempt?: HookAttemptResult
  hookDeepAnalysis?: any
  usiOpportunity?: UsiOpportunity
  usiAttempt?: UsiAttemptResult
  usiDeepAnalysis?: any
}

type HighlightCategory = 'strike' | 'defense' | 'counter' | 'acha'

type HighlightClip = {
  id: string
  category: HighlightCategory
  title: string
  clipUrl: string
  snapshot: string
  videoName: string
  videoTime: string
  playerCount: number
  techniques: string[]
  pros?: string[]
  cons?: string[]
  coachTip?: string
  spinScore: number
  powerScore: number
  reflexScore: number
  speedScore: number
  createdAt: string
  playerLandmarks?: any[][]   // pose landmarks per player for arrow overlay
  playerColors?: string[]
}

type Tab = 'analyze' | 'records' | 'highlights' | 'recordings'
type Mode = 'video' | 'camera'
type FacingMode = 'user' | 'environment'

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORY_META: Record<HighlightCategory, { icon: string; label: string; color: string; desc: string }> = {
  strike:  { icon: '⚔️',  label: 'Strike',  color: '#f97316', desc: 'Direct attacks and striking moves' },
  defense: { icon: '🛡️',  label: 'Defense', color: '#00ff88', desc: 'Blocks, parries and evasions' },
  counter: { icon: '↩️',  label: 'Counter', color: '#a855f7', desc: 'Counter strikes after blocking' },
  acha:    { icon: '🎭',  label: 'Acha',    color: '#f59e0b', desc: 'Feint, deceive, attack different place' },
}

const HL_KEY = 'orion_highlights'

function loadHighlights(): HighlightClip[] {
  if (typeof window === 'undefined') return []
  try { return JSON.parse(localStorage.getItem(HL_KEY) || '[]') } catch { return [] }
}

function saveHighlights(clips: HighlightClip[]) {
  if (typeof window === 'undefined') return
  // Don't persist blob URLs (they expire), just metadata
  const toSave = clips.map(c => ({ ...c, clipUrl: '' }))
  localStorage.setItem(HL_KEY, JSON.stringify(toSave))
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(t: number) {
  const m = Math.floor(t / 60); const s = Math.floor(t % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}
function formatDur(s: number) {
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`
}
function speedScore10(mps: number) { return Math.min(10, Math.round(mps / 2.5)) }

function ScoreBar({ score, max = 10, color }: { score: number; max?: number; color: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${Math.round(score / max * 100)}%`, background: color }} />
      </div>
      <span className="text-[10px] font-bold w-8 text-right tabular-nums" style={{ color }}>{score}/{max}</span>
    </div>
  )
}

// ─── Arrow drawing ────────────────────────────────────────────────────────────

function drawArrowhead(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, color: string, size = 14) {
  const angle = Math.atan2(y2 - y1, x2 - x1)
  ctx.save()
  ctx.fillStyle = color
  ctx.strokeStyle = color
  ctx.lineWidth = 2
  ctx.translate(x2, y2)
  ctx.rotate(angle)
  ctx.beginPath()
  ctx.moveTo(0, 0)
  ctx.lineTo(-size, -size / 2.2)
  ctx.lineTo(-size, size / 2.2)
  ctx.closePath()
  ctx.fill()
  ctx.restore()
}

function drawStickTrajectories(canvas: HTMLCanvasElement, playerLandmarks: any[][], playerColors: string[]) {
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  const W = canvas.width; const H = canvas.height

  playerLandmarks.forEach((lm, pIdx) => {
    if (!lm?.length) return
    const color = playerColors[pIdx] || PLAYER_COLORS[pIdx] || '#00d4ff'

    const rS = lm[12]; const lS = lm[11]   // shoulders
    const rE = lm[14]; const lE = lm[13]   // elbows
    const rW = lm[16]; const lW = lm[15]   // wrists (stick hands)
    const rH = lm[24]; const lH = lm[23]   // hips
    const rK = lm[26]; const lK = lm[25]   // knees
    const rA = lm[28]; const lA = lm[27]   // ankles

    if (!rS || !lS || !rW || !lW) return

    // Dominant hand = whichever wrist is higher (lower y = higher)
    const domW = rW.y < lW.y ? rW : lW
    const domS = rW.y < lW.y ? rS : lS
    const domE = rW.y < lW.y ? rE : lE

    // ── Path: stick origin (wrist) → target zone ──────────────────────────
    // Direction vector: elbow→wrist extended
    const dx = domW.x - domE.x
    const dy = domW.y - domE.y
    const len = Math.sqrt(dx * dx + dy * dy) || 0.001
    const nx = dx / len; const ny = dy / len

    // Stick tip (half arm-length past wrist along the same direction)
    const armLen = Math.sqrt(
      Math.pow(domW.x - domS.x, 2) + Math.pow(domW.y - domS.y, 2)
    )
    const tipX = (domW.x + nx * armLen * 0.9) * W
    const tipY = (domW.y + ny * armLen * 0.9) * H

    // Origin: shoulder
    const originX = domS.x * W
    const originY = domS.y * H

    // Wrist / grip point
    const gripX = domW.x * W
    const gripY = domW.y * H

    // Infer target zone based on tip direction
    const avgAnkleY = ((rA?.y || 0.9) + (lA?.y || 0.9)) / 2
    const avgHipY = ((rH?.y || 0.5) + (lH?.y || 0.5)) / 2
    const avgKneeY = ((rK?.y || 0.7) + (lK?.y || 0.7)) / 2

    // Classify strike zone
    let zoneLabel = ''
    let zoneX = tipX, zoneY = tipY
    if (ny > 0.3) {
      // Downward strike
      if (tipY / H > avgAnkleY - 0.1) { zoneLabel = 'Calf / Feet'; zoneY = avgAnkleY * H - 10 }
      else if (tipY / H > avgKneeY)   { zoneLabel = 'Knee / Shin'; zoneY = avgKneeY * H }
      else                              { zoneLabel = 'Body / Hip';  zoneY = avgHipY * H }
      zoneX = (domS.x * 0.6 + (rW.y < lW.y ? (lS.x) : (rS.x)) * 0.4) * W
    } else if (ny < -0.3) {
      zoneLabel = 'Head / Shoulder'; zoneY = domS.y * H - 30; zoneX = (1 - domS.x) * W
    } else {
      // Horizontal / diagonal
      zoneLabel = 'Body / Ribs'
      zoneX = (1 - domW.x) * W  // opposite side
      zoneY = avgHipY * H
    }

    // ── Draw: origin dot ──────────────────────────────────────────────────
    ctx.beginPath()
    ctx.arc(originX, originY, 7, 0, Math.PI * 2)
    ctx.fillStyle = color; ctx.globalAlpha = 0.9; ctx.fill()
    ctx.globalAlpha = 1

    // ── Draw: grip dot ────────────────────────────────────────────────────
    ctx.beginPath()
    ctx.arc(gripX, gripY, 5, 0, Math.PI * 2)
    ctx.fillStyle = '#fff'; ctx.globalAlpha = 0.8; ctx.fill()
    ctx.globalAlpha = 1

    // ── Draw: trajectory line (origin → tip) ──────────────────────────────
    ctx.setLineDash([10, 6])
    ctx.strokeStyle = color; ctx.lineWidth = 3; ctx.globalAlpha = 0.9
    ctx.beginPath(); ctx.moveTo(originX, originY); ctx.lineTo(tipX, tipY); ctx.stroke()
    ctx.setLineDash([]); ctx.globalAlpha = 1

    // ── Draw: arrowhead at tip ────────────────────────────────────────────
    drawArrowhead(ctx, gripX, gripY, tipX, tipY, color, 16)

    // ── Draw: target zone ring ────────────────────────────────────────────
    ctx.beginPath(); ctx.arc(zoneX, zoneY, 18, 0, Math.PI * 2)
    ctx.strokeStyle = color; ctx.lineWidth = 2.5; ctx.globalAlpha = 0.75; ctx.stroke()
    ctx.beginPath(); ctx.arc(zoneX, zoneY, 8, 0, Math.PI * 2)
    ctx.fillStyle = color; ctx.globalAlpha = 0.5; ctx.fill()
    ctx.globalAlpha = 1

    // ── Draw: dashed line from tip → target ──────────────────────────────
    ctx.setLineDash([6, 8])
    ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.globalAlpha = 0.5
    ctx.beginPath(); ctx.moveTo(tipX, tipY); ctx.lineTo(zoneX, zoneY); ctx.stroke()
    ctx.setLineDash([]); ctx.globalAlpha = 1
    drawArrowhead(ctx, tipX, tipY, zoneX, zoneY, color, 12)

    // ── Labels ────────────────────────────────────────────────────────────
    ctx.font = 'bold 11px sans-serif'; ctx.fillStyle = color; ctx.globalAlpha = 0.95
    ctx.fillText(`P${pIdx + 1}`, originX + 9, originY - 5)
    if (zoneLabel) {
      ctx.font = 'bold 10px sans-serif'
      ctx.fillStyle = '#fff'; ctx.globalAlpha = 0.85
      const tw = ctx.measureText(zoneLabel).width
      ctx.fillRect(zoneX - tw / 2 - 4, zoneY + 22, tw + 8, 14)
      ctx.fillStyle = '#000'; ctx.globalAlpha = 1
      ctx.fillText(zoneLabel, zoneX - tw / 2, zoneY + 32)
    }
    ctx.globalAlpha = 1
  })
}

// ─── Highlight Video Player ───────────────────────────────────────────────────

const HighlightPlayer = memo(function HighlightPlayer({ hl }: { hl: HighlightClip }) {
  const videoRef  = useRef<HTMLVideoElement>(null)
  const imgRef    = useRef<HTMLImageElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [rate, setRate]           = useState(1)
  const [showArrows, setShowArrows] = useState(true)
  const [playing, setPlaying]     = useState(false)
  const meta = CATEGORY_META[hl.category]

  // Sync playback rate
  useEffect(() => {
    if (videoRef.current) videoRef.current.playbackRate = rate
  }, [rate])

  // Draw arrows on canvas — works for both video and snapshot image
  const renderArrows = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || !hl.playerLandmarks?.length) return
    const video = videoRef.current
    const img   = imgRef.current
    const w = video?.videoWidth || video?.clientWidth || img?.naturalWidth || img?.clientWidth || 640
    const h = video?.videoHeight || video?.clientHeight || img?.naturalHeight || img?.clientHeight || 360
    canvas.width  = w
    canvas.height = h
    if (showArrows) {
      drawStickTrajectories(canvas, hl.playerLandmarks, hl.playerColors || PLAYER_COLORS)
    } else {
      const ctx = canvas.getContext('2d')
      ctx?.clearRect(0, 0, canvas.width, canvas.height)
    }
  }, [showArrows, hl.playerLandmarks, hl.playerColors])

  useEffect(() => { renderArrows() }, [renderArrows])

  const togglePlay = () => {
    const v = videoRef.current; if (!v) return
    playing ? v.pause() : v.play()
    setPlaying(!playing)
  }

  return (
    <div className="space-y-2">
      {/* Video + canvas overlay */}
      <div className="relative rounded-xl overflow-hidden bg-black border" style={{ borderColor: `${meta.color}40` }}>
        {hl.clipUrl ? (
          <video
            ref={videoRef}
            src={hl.clipUrl}
            loop
            className="w-full"
            style={{ maxHeight: 240 }}
            onLoadedMetadata={renderArrows}
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
          />
        ) : hl.snapshot ? (
          <img ref={imgRef} src={hl.snapshot} alt="highlight" className="w-full" style={{ maxHeight: 240, objectFit: 'contain' }} onLoad={renderArrows} />
        ) : null}

        {/* Arrow canvas overlay */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full pointer-events-none"
          style={{ mixBlendMode: 'screen' }}
        />

        {/* Play button overlay (if video) */}
        {hl.clipUrl && (
          <button
            onClick={togglePlay}
            className="absolute inset-0 flex items-center justify-center bg-black/0 hover:bg-black/20 transition-all"
          >
            {!playing && (
              <div className="w-12 h-12 rounded-full bg-black/60 flex items-center justify-center border border-white/30">
                <Play size={20} className="text-white ml-1" />
              </div>
            )}
          </button>
        )}

        {/* Speed badge */}
        <div className="absolute top-2 left-2 bg-black/70 rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ color: meta.color }}>
          {rate}x
        </div>
      </div>

      {/* Controls row */}
      <div className="flex items-center gap-2">
        {/* Speed buttons */}
        <div className="flex gap-1 flex-1">
          {([1, 0.5, 0.25] as const).map(r => (
            <button key={r} onClick={() => setRate(r)}
              className="flex-1 py-1.5 rounded-lg text-xs font-bold transition-all"
              style={rate === r
                ? { background: meta.color, color: '#000' }
                : { background: '#1e293b', color: '#64748b' }}>
              {r === 1 ? '1× Normal' : r === 0.5 ? '½× Slow' : '¼× Super Slow'}
            </button>
          ))}
        </div>

        {/* Arrow toggle */}
        {hl.playerLandmarks?.length ? (
          <button onClick={() => setShowArrows(v => !v)}
            className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex-shrink-0"
            style={showArrows
              ? { background: `${meta.color}30`, border: `1px solid ${meta.color}60`, color: meta.color }
              : { background: '#1e293b', border: '1px solid #334155', color: '#64748b' }}>
            🏹 Arrows
          </button>
        ) : null}
      </div>

      {/* Legend */}
      {showArrows && hl.playerLandmarks?.length ? (
        <div className="flex flex-wrap gap-2 text-[10px] text-slate-400">
          <span>● Origin (shoulder)</span>
          <span>──▶ Stick path</span>
          <span>◎ Target zone</span>
        </div>
      ) : null}
    </div>
  )
})

// ─── Component ────────────────────────────────────────────────────────────────

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
  const [suggestions, setSuggestions] = useState<ReferenceClip[]>([])
  const [loadingAnalysis, setLoadingAnalysis] = useState<number | null>(null)
  const [highlights, setHighlights]   = useState<HighlightClip[]>([])
  const [hlFilter, setHlFilter]       = useState<HighlightCategory | 'all'>('all')
  const [counterClips, setCounterClips] = useState<HighlightClip[]>([])
  const [cuttingClip, setCuttingClip] = useState<{ id: number; category: HighlightCategory } | null>(null)
  const [savedFlash, setSavedFlash]   = useState<string | null>(null)
  const [liveUStrike, setLiveUStrike] = useState<UStrikeOpportunity | null>(null)
  const [liveHook, setLiveHook]       = useState<HookOpportunity | null>(null)
  const [liveUsi, setLiveUsi]         = useState<UsiOpportunity | null>(null)
  const [loadingUStrike, setLoadingUStrike] = useState<number | null>(null)
  const [loadingHook, setLoadingHook] = useState<number | null>(null)
  const [loadingUsi, setLoadingUsi]   = useState<number | null>(null)

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
  const recordsRef       = useRef<AnalysisRecord[]>([])
  const tipHistoryRef    = useRef<TipPoint[][]>([[], [], [], []])
  const hookHistoryRef   = useRef<HookPoint[][]>([[], [], [], []])
  const usiHistoryRef    = useRef<UsiPoint[][]>([[], [], [], []])

  useEffect(() => {
    // Load highlight metadata from localStorage (clip URLs are blob: and expire)
    setHighlights(loadHighlights())
  }, [])

  useEffect(() => { videoSrcRef.current = videoSrc; videoNameRef.current = videoName }, [videoSrc, videoName])
  useEffect(() => { recordsRef.current = records }, [records])

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

  // ─── Pose drawing ──────────────────────────────────────────────────────────

  const drawAllPlayers = useCallback((allLandmarks: any[][], canvasEl: HTMLCanvasElement, sourceEl: HTMLVideoElement) => {
    const ctx = canvasEl.getContext('2d'); if (!ctx) return
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
          ctx.beginPath(); ctx.arc(p.x * W, p.y * H, i === 0 ? 6 : 3, 0, Math.PI * 2)
          ctx.fillStyle = color; ctx.fill()
        }
      })
      const nose = landmarks[0]
      if (nose?.visibility > 0.5) {
        ctx.globalAlpha = 0.9; ctx.fillStyle = color; ctx.font = 'bold 12px sans-serif'
        ctx.fillText(PLAYER_LABELS[pIdx] || `P${pIdx + 1}`, nose.x * W - 24, nose.y * H - 14)
        ctx.globalAlpha = 1
      }
      ;[15, 16].forEach(wi => {
        const w = landmarks[wi]
        if (w?.visibility > 0.5) {
          ctx.beginPath(); ctx.arc(w.x * W, w.y * H, 10, 0, Math.PI * 2)
          ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.globalAlpha = 0.6; ctx.stroke(); ctx.globalAlpha = 1
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

  // ─── Player data ───────────────────────────────────────────────────────────

  const buildPlayerData = useCallback((lm: any[], pIdx: number): PlayerData => {
    const m = analyzePose(lm)
    const now = performance.now()
    const dt = prevTimestampRef.current ? now - prevTimestampRef.current : 500
    const h = estimateHeight(lm, 480); const w = estimateWeight(h, lm)
    const speed = calculateAttackSpeed(prevLandmarksRef.current[pIdx] || null, lm, dt, h, 480)
    const power = calculatePower(speed, w)
    const spin = detectSpinScore(prevLandmarksRef.current[pIdx] || null, lm, dt)
    const reflex = calcReflexScore(speed, dt)
    const pScore = powerScore(power)
    const technique = detectTechnique(lm)
    const motionM = {
      attackSpeed: speed, reactionTime: dt, power, strikeCount: 0,
      estimatedHeight: h, estimatedWeight: w, avgStrikeSpeed: speed, maxStrikeSpeed: speed,
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

  const buildRecord = useCallback((allLandmarks: any[][], videoTimeStr: string, snapshot?: string, timeSec?: number): AnalysisRecord => {
    const now = performance.now()
    const players = allLandmarks.map((lm, i) => buildPlayerData(lm, i))
    prevLandmarksRef.current = allLandmarks; prevTimestampRef.current = now
    return {
      id: Date.now() + Math.random(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      videoTime: videoTimeStr, videoTimeSec: timeSec,
      videoSrc: videoSrcRef.current || undefined,
      players, snapshot, videoName: videoNameRef.current,
    }
  }, [buildPlayerData])

  // ─── AI analysis ───────────────────────────────────────────────────────────

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
      const data = await res.json(); setCombatAdvice(data.advice)
    } catch { setCombatAdvice('Could not get advice.') }
    setLoadingAdvice(false)
  }, [])

  const analyseClipProscons = useCallback(async (rec: AnalysisRecord) => {
    setLoadingAnalysis(rec.id)
    try {
      const res = await fetch('/api/clip-analysis', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          players: rec.players.map(p => ({
            overallScore: p.metrics.overallScore, balance: p.metrics.balance,
            attackSpeed: p.attackSpeed, power: p.power,
            powerScore: p.powerScore, spinScore: p.spinScore, reflexScore: p.reflexScore,
            kneeBend: p.metrics.kneeBend, technique: p.technique,
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
      setSuggestions(getSuggestedClips(rec.players.map(p => p.technique), data.tags || []))
    } catch { /* silent */ }
    setLoadingAnalysis(null)
  }, [])

  const getUStrikeDeepAnalysis = useCallback(async (rec: AnalysisRecord) => {
    if (!rec.uStrikeOpportunity) return
    setLoadingUStrike(rec.id)
    try {
      const res = await fetch('/api/u-strike-analysis', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          opportunity: rec.uStrikeOpportunity,
          attempt: rec.uStrikeAttempt || null,
          fighter: rec.players[0]?.label || 'Player 1',
          videoTime: rec.videoTime,
        }),
      })
      const data = await res.json()
      setRecords(prev => prev.map(r => r.id === rec.id ? { ...r, uStrikeDeepAnalysis: data } : r))
    } catch { /* silent */ }
    setLoadingUStrike(null)
  }, [])

  const getHookDeepAnalysis = useCallback(async (rec: AnalysisRecord) => {
    if (!rec.hookOpportunity) return
    setLoadingHook(rec.id)
    try {
      const res = await fetch('/api/hook-analysis', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          opportunity: rec.hookOpportunity,
          attempt: rec.hookAttempt || null,
          fighter: rec.players[0]?.label || 'Player 1',
          videoTime: rec.videoTime,
        }),
      })
      const data = await res.json()
      setRecords(prev => prev.map(r => r.id === rec.id ? { ...r, hookDeepAnalysis: data } : r))
    } catch { /* silent */ }
    setLoadingHook(null)
  }, [])

  const getUsiDeepAnalysis = useCallback(async (rec: AnalysisRecord) => {
    if (!rec.usiOpportunity) return
    setLoadingUsi(rec.id)
    try {
      const res = await fetch('/api/usi-analysis', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          opportunity: rec.usiOpportunity,
          attempt: rec.usiAttempt || null,
          fighter: rec.players[0]?.label || 'Player 1',
          videoTime: rec.videoTime,
        }),
      })
      const data = await res.json()
      setRecords(prev => prev.map(r => r.id === rec.id ? { ...r, usiDeepAnalysis: data } : r))
    } catch { /* silent */ }
    setLoadingUsi(null)
  }, [])

  // ─── Clip cutting ──────────────────────────────────────────────────────────

  const cutAndSaveHighlight = useCallback(async (rec: AnalysisRecord, category: HighlightCategory) => {
    if (!rec.videoSrc || rec.videoTimeSec === undefined) return
    setCuttingClip({ id: rec.id, category })

    const startSec = Math.max(0, rec.videoTimeSec - 2)
    const clipDuration = 6

    try {
      // Use a temporary video element — does NOT depend on the DOM tab being visible
      const tempVideo = document.createElement('video')
      tempVideo.src = rec.videoSrc
      tempVideo.preload = 'auto'
      tempVideo.muted = true  // required for captureStream on some browsers

      await new Promise<void>((resolve, reject) => {
        tempVideo.onloadedmetadata = () => resolve()
        tempVideo.onerror = () => reject(new Error('video load failed'))
        setTimeout(() => reject(new Error('timeout')), 10000)
      })

      tempVideo.currentTime = startSec
      await new Promise<void>(r => tempVideo.addEventListener('seeked', () => r(), { once: true }))

      const stream: MediaStream | undefined =
        (tempVideo as any).captureStream?.() || (tempVideo as any).mozCaptureStream?.()

      if (!stream) {
        saveHighlightMeta(rec, category, '')
        setCuttingClip(null)
        return
      }

      const blobs: Blob[] = []
      const mimeType = ['video/webm;codecs=vp9','video/webm;codecs=vp8','video/webm','video/mp4',''].find(t => !t || MediaRecorder.isTypeSupported(t)) || ''
      const mr = new MediaRecorder(stream, mimeType ? { mimeType } : {})
      mr.ondataavailable = e => { if (e.data.size > 0) blobs.push(e.data) }

      await new Promise<void>(resolve => {
        mr.onstop = () => resolve()
        mr.start(200)
        tempVideo.play()

        const checkTimer = setInterval(() => {
          if (tempVideo.currentTime >= startSec + clipDuration || tempVideo.ended) {
            clearInterval(checkTimer)
            tempVideo.pause()
            mr.stop()
          }
        }, 100)

        setTimeout(() => {
          if (mr.state === 'recording') { clearInterval(checkTimer); tempVideo.pause(); mr.stop() }
        }, (clipDuration + 3) * 1000)
      })

      const blob = new Blob(blobs, { type: mimeType || 'video/webm' })
      const clipUrl = URL.createObjectURL(blob)
      saveHighlightMeta(rec, category, clipUrl)
    } catch (err) {
      console.error('Clip cut error:', err)
      saveHighlightMeta(rec, category, '')
    }
    setCuttingClip(null)
  }, [])

  const saveHighlightMeta = useCallback((rec: AnalysisRecord, category: HighlightCategory, clipUrl: string) => {
    const avgP = (fn: (p: PlayerData) => number) =>
      rec.players.length ? Math.round(rec.players.reduce((s, p) => s + fn(p), 0) / rec.players.length) : 0

    // Look up the latest version of this record from state ref (pros/cons may have arrived async)
    const latestRec = recordsRef.current.find(r => r.id === rec.id) || rec

    const hl: HighlightClip = {
      id: `hl-${rec.id}-${Date.now()}`,
      category,
      title: `${CATEGORY_META[category].icon} ${rec.players.map(p => p.technique).join(' vs ')} @ ${rec.videoTime}`,
      clipUrl,
      snapshot: rec.snapshot || '',
      videoName: rec.videoName || 'Unknown',
      videoTime: rec.videoTime,
      playerCount: rec.players.length,
      techniques: Array.from(new Set(rec.players.map(p => p.technique))),
      pros: latestRec.pros,
      cons: latestRec.cons,
      coachTip: latestRec.coachTip,
      spinScore: avgP(p => p.spinScore),
      powerScore: avgP(p => p.powerScore),
      reflexScore: avgP(p => p.reflexScore),
      speedScore: avgP(p => speedScore10(p.attackSpeed)),
      createdAt: new Date().toISOString(),
      playerLandmarks: rec.players.map(p => p.landmarks),
      playerColors: rec.players.map(p => p.color),
    }
    setHighlights(prev => {
      const next = [hl, ...prev]
      saveHighlights(next)
      return next
    })
    setRecords(prev => prev.map(r => r.id === rec.id ? { ...r, savedAsRef: true } : r))
    setSavedFlash(`${CATEGORY_META[category].icon} ${CATEGORY_META[category].label} highlight saved!`)
    setTimeout(() => setSavedFlash(null), 3000)
    setTab('highlights')
  }, [])

  // ─── Frame analysis ────────────────────────────────────────────────────────

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

        const attackerLm = allLandmarks[0]
        const defenderLm = allLandmarks[1] || null
        const now = performance.now()

        // U Strike detection
        const uStrikeOpp = detectUStrikeOpportunity(attackerLm, defenderLm)
        setLiveUStrike(uStrikeOpp)
        const uTip = estimateStickTip(attackerLm)
        if (uTip) tipHistoryRef.current[0] = [...tipHistoryRef.current[0].slice(-29), { ...uTip, ts: now }]

        // Hook detection
        const hookOpp = detectHookOpportunity(attackerLm, defenderLm)
        setLiveHook(hookOpp)
        const hTip = estimateHookStickTip(attackerLm)
        if (hTip) hookHistoryRef.current[0] = [...hookHistoryRef.current[0].slice(-29), { ...hTip, ts: now }]

        // Usi detection
        const usiOpp = detectUsiOpportunity(attackerLm, defenderLm)
        setLiveUsi(usiOpp)
        const iTip = estimateUsiStickTip(attackerLm)
        if (iTip) usiHistoryRef.current[0] = [...usiHistoryRef.current[0].slice(-29), { ...iTip, ts: now }]

        // Draw overlays on canvas (U Strike, Hook, Usi)
        const ctx = canvas.getContext('2d')
        if (ctx) {
          const W = canvas.width; const H = canvas.height
          drawUStrikeOverlay(ctx, W, H, attackerLm, defenderLm, uStrikeOpp, tipHistoryRef.current[0])
          drawHookOverlay(ctx, W, H, attackerLm, defenderLm, hookOpp, hookHistoryRef.current[0])
          drawUsiOverlay(ctx, W, H, attackerLm, defenderLm, usiOpp, usiHistoryRef.current[0])
        }

        // Attempt analyses
        const uStrikeAttempt = analyzeUStrikeAttempt(attackerLm, defenderLm, tipHistoryRef.current[0], uStrikeOpp)
        const hookAttempt    = analyzeHookAttempt(attackerLm, defenderLm, hookHistoryRef.current[0], hookOpp)
        const usiAttempt     = analyzeUsiAttempt(attackerLm, defenderLm, usiHistoryRef.current[0], usiOpp)

        const snapshot = captureSnapshot(video, canvas)
        const timeSec = video.currentTime
        const rec: AnalysisRecord = {
          ...buildRecord(allLandmarks, formatTime(timeSec), snapshot, timeSec),
          uStrikeOpportunity: uStrikeOpp,
          uStrikeAttempt: uStrikeAttempt.detected ? uStrikeAttempt : undefined,
          hookOpportunity: hookOpp,
          hookAttempt: hookAttempt.detected ? hookAttempt : undefined,
          usiOpportunity: usiOpp,
          usiAttempt: usiAttempt.detected ? usiAttempt : undefined,
        }
        setRecords(prev => [rec, ...prev])
        setExpandedId(rec.id)
        if (withAdvice) getCombatAdvice(rec)
        analyseClipProscons(rec)
        setSuggestions(getSuggestedClips(allLandmarks.map((_: any, i: number) => {
          try { return detectTechnique(allLandmarks[i]) } catch { return '' }
        }).filter(Boolean)))
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

  // ─── Camera ────────────────────────────────────────────────────────────────

  const startCamera = async (facing: FacingMode = facingMode) => {
    if (cameraStream) { cameraStream.getTracks().forEach(t => t.stop()); setCameraStream(null) }
    if (cameraIntervalRef.current) clearInterval(cameraIntervalRef.current)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: facing, width: 640, height: 480 }, audio: true })
      setCameraStream(stream); setCameraOn(true)
      if (cameraRef.current) { cameraRef.current.srcObject = stream; cameraRef.current.play() }
      await loadPoseLandmarker()
      cameraIntervalRef.current = setInterval(() => {
        const cam = cameraRef.current; const canvas = cameraCanvasRef.current
        if (!cam || !canvas || cam.readyState < 2) return
        const result = detectPose(cam, performance.now())
        const allLandmarks = result?.landmarks || []
        if (allLandmarks.length > 0) {
          drawAllPlayers(allLandmarks, canvas, cam)
          const players = allLandmarks.map((lm: any, i: number) => buildPlayerData(lm, i))
          prevLandmarksRef.current = allLandmarks; prevTimestampRef.current = performance.now()
          setLivePlayers(players)

          // Live technique detection for camera mode
          const camAtk = allLandmarks[0]
          const camDef = allLandmarks[1] || null
          const camNow = performance.now()

          const camUStrikeOpp = detectUStrikeOpportunity(camAtk, camDef)
          setLiveUStrike(camUStrikeOpp)
          const uTipCam = estimateStickTip(camAtk)
          if (uTipCam) tipHistoryRef.current[0] = [...tipHistoryRef.current[0].slice(-29), { ...uTipCam, ts: camNow }]

          const camHookOpp = detectHookOpportunity(camAtk, camDef)
          setLiveHook(camHookOpp)
          const hTipCam = estimateHookStickTip(camAtk)
          if (hTipCam) hookHistoryRef.current[0] = [...hookHistoryRef.current[0].slice(-29), { ...hTipCam, ts: camNow }]

          const camUsiOpp = detectUsiOpportunity(camAtk, camDef)
          setLiveUsi(camUsiOpp)
          const iTipCam = estimateUsiStickTip(camAtk)
          if (iTipCam) usiHistoryRef.current[0] = [...usiHistoryRef.current[0].slice(-29), { ...iTipCam, ts: camNow }]

          const ctx = canvas.getContext('2d')
          if (ctx) {
            const cW = canvas.width; const cH = canvas.height
            drawUStrikeOverlay(ctx, cW, cH, camAtk, camDef, camUStrikeOpp, tipHistoryRef.current[0])
            drawHookOverlay(ctx, cW, cH, camAtk, camDef, camHookOpp, hookHistoryRef.current[0])
            drawUsiOverlay(ctx, cW, cH, camAtk, camDef, camUsiOpp, usiHistoryRef.current[0])
          }
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
    const mimeType = ['video/webm;codecs=vp9,opus','video/webm;codecs=vp8,opus','video/webm','video/mp4',''].find(t => !t || MediaRecorder.isTypeSupported(t)) || ''
    const mr = new MediaRecorder(stream, mimeType ? { mimeType } : {})
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

  // ─── Derived ───────────────────────────────────────────────────────────────

  const filteredHighlights = hlFilter === 'all'
    ? highlights
    : highlights.filter(h => h.category === hlFilter)

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      <canvas ref={snapshotCanvasRef} className="hidden" />

      {/* Global cutting / saved banner — visible on any tab */}
      {cuttingClip && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-900 border border-orion-blue/50 shadow-xl">
          <Scissors size={16} className="text-orion-blue animate-bounce flex-shrink-0" />
          <span className="text-orion-blue text-sm font-bold">Cutting {CATEGORY_META[cuttingClip.category].label} clip… please wait</span>
        </div>
      )}
      {savedFlash && !cuttingClip && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-900 border border-green-400/50 shadow-xl">
          <span className="text-green-400 text-sm font-bold">{savedFlash} → see Highlights tab 🎬</span>
        </div>
      )}

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
          { id: 'analyze',    label: '⚡ Analyse' },
          { id: 'records',    label: `📋 Records${records.length > 0 ? ` (${records.length})` : ''}` },
          { id: 'highlights', label: `🎬 Highlights${highlights.length > 0 ? ` (${highlights.length})` : ''}` },
          { id: 'recordings', label: `🎥 Recorded${recordedVideos.length > 0 ? ` (${recordedVideos.length})` : ''}` },
        ] as { id: Tab; label: string }[]).map(t => (
          <button key={t.id} onClick={() => setTab(t.id as Tab)}
            className={`flex-shrink-0 flex-1 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${tab === t.id ? 'bg-slate-700 text-white' : 'text-slate-500 hover:text-white'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ─── ANALYSE TAB ─── */}
      {tab === 'analyze' && (
        <>
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
                    <p className="text-yellow-400/70 text-[10px]">{s.techniques.join(', ')}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

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
                      <p className="text-white font-bold text-lg mb-1">Upload Match Video</p>
                      <p className="text-slate-400 text-sm">MP4 · MOV · WebM — cut highlights per match</p>
                    </div>
                    <input ref={fileInputRef} type="file" accept="video/mp4,video/quicktime,video/webm" className="hidden"
                      onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
                  </div>
                  <button onClick={() => fileInputRef.current?.click()}
                    className="w-full py-4 rounded-2xl bg-orion-blue text-white font-bold text-base active:scale-95 transition-all"
                    style={{ boxShadow: '0 0 20px rgba(0,212,255,0.3)' }}>
                    Choose Match Video
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
                          {fullAnalysing ? `Scanning all players... ${fullProgress}%` : 'Loading AI model...'}
                        </p>
                        {fullAnalysing && (
                          <div className="w-48 h-1.5 bg-slate-700 rounded-full">
                            <div className="h-full bg-orion-blue rounded-full transition-all" style={{ width: `${fullProgress}%` }} />
                          </div>
                        )}
                      </div>
                    )}
{records.length > 0 && !cuttingClip && (
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
                      <span className="text-xs text-slate-400 w-20 tabular-nums">{formatTime(currentTime)} / {formatTime(duration)}</span>
                      <input type="range" min={0} max={duration || 1} step={0.1} value={currentTime}
                        onChange={e => { const v = parseFloat(e.target.value); if (videoRef.current) videoRef.current.currentTime = v; setCurrentTime(v) }}
                        className="flex-1 accent-[#00d4ff] cursor-pointer" />
                    </div>
                    <button onClick={analyseFullVideo} disabled={isAnalysing || fullAnalysing || !!cuttingClip}
                      className="w-full py-3 rounded-xl font-bold text-sm disabled:opacity-50 active:scale-95 transition-all"
                      style={{ background: 'linear-gradient(135deg, #00d4ff22, #a855f722)', border: '1px solid #00d4ff55', color: '#00d4ff' }}>
                      {fullAnalysing ? `⚡ Scanning... ${fullProgress}%` : '⚡ Scan Full Match — All Players'}
                    </button>
                    <div className="grid grid-cols-2 gap-2">
                      <button onClick={() => analyseFrame()} disabled={isAnalysing || fullAnalysing || !!cuttingClip}
                        className="py-2.5 rounded-xl bg-slate-700 border border-slate-600 text-slate-200 font-semibold text-sm disabled:opacity-50">
                        {isAnalysing ? 'Analysing...' : '📸 Capture Frame'}
                      </button>
                      <button onClick={() => setAutoAnalyse(v => !v)} disabled={fullAnalysing || !!cuttingClip}
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

                  {/* Live U Strike suggestion banner */}
                  {liveUStrike && liveUStrike.type !== 'NONE' && (
                    <div className="rounded-2xl border p-3 space-y-1.5" style={{
                      background: `${liveUStrike.overlayColor}10`,
                      borderColor: `${liveUStrike.overlayColor}50`,
                    }}>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: liveUStrike.overlayColor }} />
                        <p className="text-xs font-bold uppercase tracking-widest" style={{ color: liveUStrike.overlayColor }}>
                          {liveUStrike.available ? '🎯 U Strike Opening!' : '⚠️ U Strike Risk'}
                        </p>
                        <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full font-bold"
                          style={{ background: `${liveUStrike.overlayColor}20`, color: liveUStrike.overlayColor }}>
                          {liveUStrike.type.replace('_', ' ')}
                        </span>
                      </div>
                      <p className="text-slate-200 text-xs leading-relaxed">{liveUStrike.suggestion}</p>
                      {liveUStrike.openTargets.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {liveUStrike.openTargets.map(t => (
                            <span key={t} className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-white/70">{t}</span>
                          ))}
                        </div>
                      )}
                      {liveUStrike.warning && (
                        <p className="text-yellow-400 text-[10px]">⚠ {liveUStrike.warning}</p>
                      )}
                      <p className="text-slate-500 text-[10px]">
                        Counter risk: <span className="font-bold" style={{
                          color: liveUStrike.counterRisk === 'LOW' ? '#00ff88' : liveUStrike.counterRisk === 'HIGH' ? '#f97316' : '#f59e0b'
                        }}>{liveUStrike.counterRisk}</span>
                      </p>
                    </div>
                  )}

                  {/* Hook live suggestion banner */}
                  {liveHook && liveHook.type !== 'NONE' && (
                    <div className="rounded-2xl border p-3 space-y-1.5" style={{
                      background: `${liveHook.overlayColor}10`,
                      borderColor: `${liveHook.overlayColor}50`,
                    }}>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: liveHook.overlayColor }} />
                        <p className="text-xs font-bold uppercase tracking-widest" style={{ color: liveHook.overlayColor }}>
                          {liveHook.available ? '🔵 Hook Opening!' : '⚠️ Hook Risk'}
                        </p>
                        <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full font-bold"
                          style={{ background: `${liveHook.overlayColor}20`, color: liveHook.overlayColor }}>
                          {liveHook.type.replace('_', ' ')}
                        </span>
                      </div>
                      <p className="text-slate-200 text-xs leading-relaxed">{liveHook.suggestion}</p>
                      {liveHook.openTargets.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {liveHook.openTargets.map(t => (
                            <span key={t} className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-white/70">{t}</span>
                          ))}
                        </div>
                      )}
                      {liveHook.pathTooWide && (
                        <p className="text-yellow-400 text-[10px]">⚠ Hook path is too wide. Shorten the movement.</p>
                      )}
                      {liveHook.warning && <p className="text-yellow-400 text-[10px]">⚠ {liveHook.warning}</p>}
                      <p className="text-slate-500 text-[10px]">
                        Counter risk: <span className="font-bold" style={{
                          color: liveHook.counterRisk === 'LOW' ? '#00ff88' : liveHook.counterRisk === 'HIGH' ? '#f97316' : '#f59e0b'
                        }}>{liveHook.counterRisk}</span>
                      </p>
                    </div>
                  )}

                  {/* Usi live suggestion banner */}
                  {liveUsi && liveUsi.available && (
                    <div className="rounded-2xl border p-3 space-y-1.5" style={{
                      background: `${liveUsi.overlayColor}10`,
                      borderColor: `${liveUsi.overlayColor}50`,
                    }}>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: liveUsi.overlayColor }} />
                        <p className="text-xs font-bold uppercase tracking-widest" style={{ color: liveUsi.overlayColor }}>
                          💉 Usi Opportunity!
                        </p>
                        <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full font-bold bg-blue-400/20 text-orion-blue">
                          Chest Open
                        </span>
                      </div>
                      <p className="text-slate-200 text-xs leading-relaxed">{liveUsi.suggestion}</p>
                      {liveUsi.warning && <p className="text-yellow-400 text-[10px]">⚠ {liveUsi.warning}</p>}
                      <p className="text-slate-500 text-[10px]">
                        Counter risk: <span className="font-bold" style={{
                          color: liveUsi.counterRisk === 'LOW' ? '#00ff88' : liveUsi.counterRisk === 'HIGH' ? '#f97316' : '#f59e0b'
                        }}>{liveUsi.counterRisk}</span>
                      </p>
                    </div>
                  )}

                  {(loadingAdvice || combatAdvice) && (
                    <div className="rounded-2xl border p-4 space-y-2" style={{ background: '#a855f708', borderColor: '#a855f730' }}>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full animate-pulse bg-purple-400" />
                        <p className="text-xs font-bold uppercase tracking-widest text-purple-400">ORION Combat Analysis</p>
                      </div>
                      {loadingAdvice
                        ? <div className="flex items-center gap-2 text-slate-400 text-sm"><span className="animate-spin text-purple-400">⚙</span> Analysing...</div>
                        : <div className="text-sm text-slate-200 whitespace-pre-line leading-relaxed">{combatAdvice}</div>
                      }
                    </div>
                  )}

                  {counterClips.length > 0 && (
                    <div className="rounded-2xl border border-purple-400/30 bg-purple-400/5 p-3 space-y-2">
                      <p className="text-purple-400 text-xs font-bold uppercase tracking-widest">📼 Relevant Saved Highlights</p>
                      {counterClips.map(hl => {
                        const m = CATEGORY_META[hl.category]
                        return (
                          <div key={hl.id} className="flex items-center gap-2 rounded-xl bg-slate-800/60 border border-slate-700 p-2">
                            {hl.snapshot && <img src={hl.snapshot} className="w-14 h-9 rounded-lg object-cover flex-shrink-0 border border-slate-700" alt="clip" />}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 mb-0.5">
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: `${m.color}20`, color: m.color }}>{m.icon} {m.label}</span>
                              </div>
                              <p className="text-white text-[11px] font-semibold truncate">{hl.techniques.join(' vs ')}</p>
                              <p className="text-slate-500 text-[10px] truncate">{hl.videoName} · {hl.videoTime}</p>
                            </div>
                          </div>
                        )
                      })}
                      <button onClick={() => setCounterClips([])} className="text-[10px] text-slate-600 hover:text-slate-400 w-full text-center">Dismiss</button>
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {mode === 'camera' && (
            <div className="space-y-3">
              <div className="relative rounded-2xl overflow-hidden bg-black border border-orion-border" style={{ aspectRatio: '4/3' }}>
                <video ref={cameraRef} className="w-full h-full object-cover" autoPlay playsInline muted />
                <canvas ref={cameraCanvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />
                {!cameraOn && <div className="absolute inset-0 flex items-center justify-center bg-black/80"><p className="text-slate-500 text-sm">Camera not started</p></div>}
                {isRecording && (
                  <div className="absolute top-3 left-3 flex items-center gap-2 bg-black/70 rounded-full px-3 py-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                    <span className="text-red-400 text-xs font-bold">{formatDur(recordDuration)}</span>
                  </div>
                )}
                {cameraOn && <button onClick={flipCamera} className="absolute top-3 right-3 p-2 rounded-full bg-black/60 border border-white/20 text-white"><FlipHorizontal size={18} /></button>}
                {livePlayers.length > 0 && (
                  <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-black/70 rounded-full px-3 py-1">
                    <span className="text-white text-xs font-bold">{livePlayers.length} player{livePlayers.length > 1 ? 's' : ''}</span>
                  </div>
                )}
                {livePlayers.length > 0 && (
                  <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/90">
                    <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
                      {livePlayers.map((p, i) => (
                        <div key={i} className="flex-shrink-0 rounded-xl p-2 bg-black/60 border min-w-[130px]" style={{ borderColor: `${p.color}40` }}>
                          <p className="text-[10px] font-bold mb-1" style={{ color: p.color }}>{p.label}</p>
                          <div className="space-y-0.5">
                            {[
                              { l: '🌀 Spin',   v: p.spinScore },
                              { l: '💥 Power',  v: p.powerScore },
                              { l: '⚡ Reflex', v: p.reflexScore },
                              { l: '🏃 Speed',  v: speedScore10(p.attackSpeed) },
                            ].map(({ l, v }) => (
                              <div key={l}>
                                <p className="text-[8px] text-slate-500 mb-0.5">{l}</p>
                                <ScoreBar score={v} color={p.color} />
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={cameraOn ? stopCamera : () => startCamera()}
                  className={`py-3 rounded-xl font-bold text-sm ${cameraOn ? 'bg-red-400/20 border border-red-400/40 text-red-400' : 'bg-orion-blue text-white'}`}>
                  {cameraOn ? '⏹ Stop' : '📷 Start Camera'}
                </button>
                <button onClick={flipCamera} disabled={!cameraOn}
                  className="py-3 rounded-xl bg-slate-700 border border-slate-600 text-slate-200 font-bold text-sm disabled:opacity-40 flex items-center justify-center gap-2">
                  <FlipHorizontal size={16} /> Flip
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={isRecording ? stopRecording : startRecording} disabled={!cameraOn}
                  className={`py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-40 ${isRecording ? 'bg-red-500/20 border border-red-500/50 text-red-400' : 'bg-green-400/15 border border-green-400/30 text-green-400'}`}>
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
            <div className="text-center py-12 text-slate-500 text-sm">No records yet.<br />Upload a match video and scan it.</div>
          ) : (
            <>
              <div className="flex justify-between items-center">
                <p className="text-xs text-slate-500">{records.length} captures · {records.reduce((s, r) => s + r.players.length, 0)} players detected</p>
                <button onClick={() => setRecords([])} className="text-xs text-red-400/60 hover:text-red-400 flex items-center gap-1"><Trash2 size={12} /> Clear</button>
              </div>

              {records.map((rec, idx) => (
                <div key={rec.id} className="glass rounded-2xl border border-orion-border overflow-hidden">
                  <button className="w-full flex items-center gap-3 p-3.5 hover:bg-white/5 transition-colors"
                    onClick={() => setExpandedId(expandedId === rec.id ? null : rec.id)}>
                    {rec.snapshot
                      ? <img src={rec.snapshot} alt="frame" className="w-14 h-10 rounded-lg object-cover border border-slate-700 flex-shrink-0" />
                      : <div className="w-14 h-10 rounded-lg bg-slate-800 flex items-center justify-center flex-shrink-0"><span className="text-slate-500 text-xs">#{records.length - idx}</span></div>
                    }
                    <div className="flex-1 text-left min-w-0">
                      <p className="text-white text-sm font-semibold truncate">
                        {rec.players.length}P · {rec.players.map(p => p.technique).join(' vs ')}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5 flex-wrap">
                        {rec.players.map((p, i) => <span key={i} style={{ color: p.color }}>P{i + 1}:{p.metrics.overallScore}</span>)}
                        {rec.videoTime !== 'Live' && <span>⏱ {rec.videoTime}</span>}
                        {rec.pros && <span className="text-green-400">✓</span>}
                        {rec.savedAsRef && <span className="text-yellow-400">🎬</span>}
                      </div>
                    </div>
                    {expandedId === rec.id ? <ChevronUp size={16} className="text-slate-500 flex-shrink-0" /> : <ChevronDown size={16} className="text-slate-500 flex-shrink-0" />}
                  </button>

                  {expandedId === rec.id && (
                    <div className="px-4 pb-4 space-y-4 border-t border-orion-border/40 pt-4">

                      {/* Video clip ±3s */}
                      {rec.videoSrc && rec.videoTimeSec !== undefined && (
                        <div className="space-y-1.5">
                          <p className="text-xs text-slate-500 uppercase tracking-wide">📹 Clip Preview</p>
                          <div className="relative rounded-xl overflow-hidden border border-orion-blue/30 bg-black">
                            <video
                              src={`${rec.videoSrc}#t=${Math.max(0, rec.videoTimeSec - 2)},${rec.videoTimeSec + 4}`}
                              controls loop className="w-full" style={{ maxHeight: 200 }} />
                            <div className="absolute top-2 left-2 bg-black/80 text-orion-blue text-[10px] font-bold px-2 py-0.5 rounded-full">
                              ⏱ {rec.videoTime}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Skeleton snapshot */}
                      {rec.snapshot && (
                        <div className="space-y-1.5">
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
                          <span className="animate-spin">⚙</span> ORION analysing clip...
                        </div>
                      ) : rec.pros ? (
                        <div className="space-y-2">
                          <div className="grid grid-cols-1 gap-2">
                            <div className="rounded-xl bg-green-400/5 border border-green-400/20 p-3 space-y-1.5">
                              <p className="text-green-400 text-xs font-bold">✅ Pros</p>
                              {rec.pros.map((p, i) => <p key={i} className="text-slate-300 text-xs">• {p}</p>)}
                            </div>
                            <div className="rounded-xl bg-red-400/5 border border-red-400/20 p-3 space-y-1.5">
                              <p className="text-red-400 text-xs font-bold">❌ Cons</p>
                              {rec.cons?.map((c, i) => <p key={i} className="text-slate-300 text-xs">• {c}</p>)}
                            </div>
                          </div>
                          {rec.coachTip && (
                            <div className="rounded-xl bg-orion-blue/5 border border-orion-blue/20 p-3">
                              <p className="text-orion-blue text-xs font-bold mb-1">🎓 Coach Tip</p>
                              <p className="text-slate-300 text-xs">{rec.coachTip}</p>
                            </div>
                          )}
                        </div>
                      ) : (
                        <button onClick={() => analyseClipProscons(rec)}
                          className="w-full py-2.5 rounded-xl border border-orion-blue/30 text-orion-blue text-xs font-bold hover:bg-orion-blue/10 transition-all">
                          ⚡ Get Pros &amp; Cons
                        </button>
                      )}

                      {/* U Strike Analysis */}
                      {rec.uStrikeOpportunity && (
                        <div className="space-y-2">
                          <div className="rounded-xl border p-3 space-y-2" style={{
                            borderColor: `${rec.uStrikeOpportunity.overlayColor}40`,
                            background: `${rec.uStrikeOpportunity.overlayColor}08`,
                          }}>
                            <div className="flex items-center gap-2">
                              <p className="text-xs font-bold" style={{ color: rec.uStrikeOpportunity.overlayColor }}>
                                🌀 U Strike Detection
                              </p>
                              <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full font-bold"
                                style={{ background: `${rec.uStrikeOpportunity.overlayColor}20`, color: rec.uStrikeOpportunity.overlayColor }}>
                                {rec.uStrikeOpportunity.type.replace(/_/g, ' ')}
                              </span>
                            </div>
                            <p className="text-slate-300 text-xs">{rec.uStrikeOpportunity.reason}</p>
                            {rec.uStrikeOpportunity.openTargets.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                <span className="text-[10px] text-slate-500">Open targets:</span>
                                {rec.uStrikeOpportunity.openTargets.map(t => (
                                  <span key={t} className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/10 text-white/70">{t}</span>
                                ))}
                              </div>
                            )}
                            <div className="flex items-center gap-2 text-[10px]">
                              <span className="text-slate-500">Counter risk:</span>
                              <span className="font-bold" style={{
                                color: rec.uStrikeOpportunity.counterRisk === 'LOW' ? '#00ff88' : rec.uStrikeOpportunity.counterRisk === 'HIGH' ? '#f97316' : '#f59e0b'
                              }}>{rec.uStrikeOpportunity.counterRisk}</span>
                            </div>
                            {rec.uStrikeOpportunity.warning && (
                              <p className="text-yellow-400 text-[10px]">⚠ {rec.uStrikeOpportunity.warning}</p>
                            )}
                          </div>

                          {rec.uStrikeAttempt && (
                            <div className="rounded-xl border border-slate-700 p-3 space-y-1.5 bg-slate-800/40">
                              <p className="text-xs font-bold text-slate-300">🎯 Attempt Analysis</p>
                              <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                                <div className="bg-slate-900/60 rounded-lg p-2">
                                  <p className="text-slate-500 mb-0.5">1st Touch</p>
                                  <p className="text-white font-bold">{rec.uStrikeAttempt.firstTouchTarget}</p>
                                  <p style={{ color: rec.uStrikeAttempt.firstTouchResult === 'Clean Touch' ? '#00ff88' : '#f59e0b' }}>
                                    {rec.uStrikeAttempt.firstTouchResult}
                                  </p>
                                </div>
                                <div className="bg-slate-900/60 rounded-lg p-2">
                                  <p className="text-slate-500 mb-0.5">2nd Touch</p>
                                  <p className="text-white font-bold">{rec.uStrikeAttempt.secondTouchTarget}</p>
                                  <p style={{ color: rec.uStrikeAttempt.secondTouchResult === 'Clean Touch' ? '#00ff88' : '#f59e0b' }}>
                                    {rec.uStrikeAttempt.secondTouchResult}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center justify-between text-[10px]">
                                <span className="text-slate-500">Speed: <span className="text-white">{rec.uStrikeAttempt.speedRating}</span></span>
                                <span className="text-slate-500">Path: <span className="text-white">{rec.uStrikeAttempt.pathClarity}</span></span>
                              </div>
                              <div className="text-center py-1">
                                <span className="text-xs font-bold px-3 py-1 rounded-full" style={{
                                  background: rec.uStrikeAttempt.finalResult === 'Successful U Strike' ? '#00ff8820' : rec.uStrikeAttempt.finalResult === 'Partial U Strike' ? '#f59e0b20' : '#f9731620',
                                  color: rec.uStrikeAttempt.finalResult === 'Successful U Strike' ? '#00ff88' : rec.uStrikeAttempt.finalResult === 'Partial U Strike' ? '#f59e0b' : '#f97316',
                                }}>{rec.uStrikeAttempt.finalResult}</span>
                              </div>
                              <p className="text-slate-400 text-[10px] leading-relaxed">{rec.uStrikeAttempt.coachingFeedback}</p>
                            </div>
                          )}

                          {rec.uStrikeDeepAnalysis ? (
                            <div className="rounded-xl border border-orion-blue/20 bg-orion-blue/5 p-3 space-y-2">
                              <div className="flex items-center gap-2">
                                <p className="text-xs font-bold text-orion-blue">🤖 ORION Deep Analysis</p>
                                {rec.uStrikeDeepAnalysis.overallScore > 0 && (
                                  <span className="ml-auto text-xs font-bold text-orion-blue">{rec.uStrikeDeepAnalysis.overallScore}/100</span>
                                )}
                              </div>
                              {rec.uStrikeDeepAnalysis.technicalBreakdown && (
                                <p className="text-slate-300 text-xs">{rec.uStrikeDeepAnalysis.technicalBreakdown}</p>
                              )}
                              {rec.uStrikeDeepAnalysis.keyStrengths?.length > 0 && (
                                <div>
                                  <p className="text-green-400 text-[10px] font-bold mb-1">Strengths</p>
                                  {rec.uStrikeDeepAnalysis.keyStrengths.map((s: string, i: number) => (
                                    <p key={i} className="text-slate-300 text-[10px]">✓ {s}</p>
                                  ))}
                                </div>
                              )}
                              {rec.uStrikeDeepAnalysis.criticalFixes?.length > 0 && (
                                <div>
                                  <p className="text-red-400 text-[10px] font-bold mb-1">Fix These</p>
                                  {rec.uStrikeDeepAnalysis.criticalFixes.map((f: string, i: number) => (
                                    <p key={i} className="text-slate-300 text-[10px]">• {f}</p>
                                  ))}
                                </div>
                              )}
                              {rec.uStrikeDeepAnalysis.improvementDrills?.length > 0 && (
                                <div>
                                  <p className="text-yellow-400 text-[10px] font-bold mb-1">Drills</p>
                                  {rec.uStrikeDeepAnalysis.improvementDrills.map((d: string, i: number) => (
                                    <p key={i} className="text-slate-300 text-[10px]">{i + 1}. {d}</p>
                                  ))}
                                </div>
                              )}
                              {rec.uStrikeDeepAnalysis.nextTechniqueToTry && (
                                <p className="text-orion-blue text-[10px]">Next: {rec.uStrikeDeepAnalysis.nextTechniqueToTry}</p>
                              )}
                            </div>
                          ) : (
                            <button
                              onClick={() => getUStrikeDeepAnalysis(rec)}
                              disabled={loadingUStrike === rec.id}
                              className="w-full py-2.5 rounded-xl border border-orion-blue/30 text-orion-blue text-xs font-bold hover:bg-orion-blue/10 transition-all disabled:opacity-50">
                              {loadingUStrike === rec.id ? '⚙ ORION analysing U Strike...' : '🌀 Get U Strike Deep Analysis'}
                            </button>
                          )}
                        </div>
                      )}

                      {/* Hook Analysis */}
                      {rec.hookOpportunity && rec.hookOpportunity.type !== 'NONE' && (
                        <div className="space-y-2">
                          <div className="rounded-xl border p-3 space-y-2" style={{
                            borderColor: `${rec.hookOpportunity.overlayColor}40`,
                            background: `${rec.hookOpportunity.overlayColor}08`,
                          }}>
                            <div className="flex items-center gap-2">
                              <p className="text-xs font-bold" style={{ color: rec.hookOpportunity.overlayColor }}>
                                🔵 Hook Detection
                              </p>
                              <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full font-bold"
                                style={{ background: `${rec.hookOpportunity.overlayColor}20`, color: rec.hookOpportunity.overlayColor }}>
                                {rec.hookOpportunity.type.replace('_', ' ')}
                              </span>
                            </div>
                            <p className="text-slate-300 text-xs">{rec.hookOpportunity.reason}</p>
                            {rec.hookOpportunity.openTargets.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                <span className="text-[10px] text-slate-500">Open targets:</span>
                                {rec.hookOpportunity.openTargets.map(t => (
                                  <span key={t} className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/10 text-white/70">{t}</span>
                                ))}
                              </div>
                            )}
                            {rec.hookOpportunity.pathTooWide && (
                              <p className="text-yellow-400 text-[10px]">⚠ Hook path was too wide. Shorten the C-movement.</p>
                            )}
                            <div className="flex items-center gap-2 text-[10px]">
                              <span className="text-slate-500">Counter risk:</span>
                              <span className="font-bold" style={{
                                color: rec.hookOpportunity.counterRisk === 'LOW' ? '#00ff88' : rec.hookOpportunity.counterRisk === 'HIGH' ? '#f97316' : '#f59e0b'
                              }}>{rec.hookOpportunity.counterRisk}</span>
                            </div>
                          </div>

                          {rec.hookAttempt && (
                            <div className="rounded-xl border border-slate-700 p-3 space-y-1.5 bg-slate-800/40">
                              <p className="text-xs font-bold text-slate-300">🔵 Hook Attempt</p>
                              <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                                <div className="bg-slate-900/60 rounded-lg p-2">
                                  <p className="text-slate-500 mb-0.5">1st Touch</p>
                                  <p className="text-white font-bold">{rec.hookAttempt.firstTouchTarget}</p>
                                  <p style={{ color: rec.hookAttempt.firstTouchResult === 'Clean Touch' ? '#00ff88' : '#f59e0b' }}>
                                    {rec.hookAttempt.firstTouchResult}
                                  </p>
                                </div>
                                <div className="bg-slate-900/60 rounded-lg p-2">
                                  <p className="text-slate-500 mb-0.5">2nd Touch</p>
                                  <p className="text-white font-bold">{rec.hookAttempt.secondTouchTarget}</p>
                                  <p style={{ color: rec.hookAttempt.secondTouchResult === 'Clean Touch' ? '#00ff88' : '#f59e0b' }}>
                                    {rec.hookAttempt.secondTouchResult}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center justify-between text-[10px]">
                                <span className="text-slate-500">Path: <span className="text-white">{rec.hookAttempt.pathCompactness}</span></span>
                                <span className="text-slate-500">Flow: <span className={rec.hookAttempt.continuousFlow ? 'text-green-400' : 'text-red-400'}>{rec.hookAttempt.continuousFlow ? 'Continuous' : 'Broken'}</span></span>
                              </div>
                              <div className="text-center py-1">
                                <span className="text-xs font-bold px-3 py-1 rounded-full" style={{
                                  background: rec.hookAttempt.finalResult.startsWith('Successful') ? '#00ff8820' : rec.hookAttempt.finalResult.startsWith('Partial') ? '#f59e0b20' : '#f9731620',
                                  color: rec.hookAttempt.finalResult.startsWith('Successful') ? '#00ff88' : rec.hookAttempt.finalResult.startsWith('Partial') ? '#f59e0b' : '#f97316',
                                }}>{rec.hookAttempt.finalResult}</span>
                              </div>
                              <p className="text-slate-400 text-[10px] leading-relaxed">{rec.hookAttempt.coachingFeedback}</p>
                            </div>
                          )}

                          {rec.hookDeepAnalysis ? (
                            <div className="rounded-xl border border-blue-400/20 bg-blue-400/5 p-3 space-y-2">
                              <div className="flex items-center gap-2">
                                <p className="text-xs font-bold text-blue-400">🤖 Hook Deep Analysis</p>
                                {rec.hookDeepAnalysis.overallScore > 0 && (
                                  <span className="ml-auto text-xs font-bold text-blue-400">{rec.hookDeepAnalysis.overallScore}/100</span>
                                )}
                              </div>
                              {rec.hookDeepAnalysis.technicalBreakdown && (
                                <p className="text-slate-300 text-xs">{rec.hookDeepAnalysis.technicalBreakdown}</p>
                              )}
                              {rec.hookDeepAnalysis.keyStrengths?.length > 0 && (
                                <div>
                                  <p className="text-green-400 text-[10px] font-bold mb-1">Strengths</p>
                                  {rec.hookDeepAnalysis.keyStrengths.map((s: string, i: number) => (
                                    <p key={i} className="text-slate-300 text-[10px]">✓ {s}</p>
                                  ))}
                                </div>
                              )}
                              {rec.hookDeepAnalysis.criticalFixes?.length > 0 && (
                                <div>
                                  <p className="text-red-400 text-[10px] font-bold mb-1">Fix These</p>
                                  {rec.hookDeepAnalysis.criticalFixes.map((f: string, i: number) => (
                                    <p key={i} className="text-slate-300 text-[10px]">• {f}</p>
                                  ))}
                                </div>
                              )}
                              {rec.hookDeepAnalysis.improvementDrills?.length > 0 && (
                                <div>
                                  <p className="text-yellow-400 text-[10px] font-bold mb-1">Drills</p>
                                  {rec.hookDeepAnalysis.improvementDrills.map((d: string, i: number) => (
                                    <p key={i} className="text-slate-300 text-[10px]">{i + 1}. {d}</p>
                                  ))}
                                </div>
                              )}
                            </div>
                          ) : (
                            <button
                              onClick={() => getHookDeepAnalysis(rec)}
                              disabled={loadingHook === rec.id}
                              className="w-full py-2.5 rounded-xl border border-blue-400/30 text-blue-400 text-xs font-bold hover:bg-blue-400/10 transition-all disabled:opacity-50">
                              {loadingHook === rec.id ? '⚙ ORION analysing Hook...' : '🔵 Get Hook Deep Analysis'}
                            </button>
                          )}
                        </div>
                      )}

                      {/* Usi Analysis */}
                      {rec.usiOpportunity && (
                        <div className="space-y-2">
                          <div className="rounded-xl border p-3 space-y-2" style={{
                            borderColor: `${rec.usiOpportunity.overlayColor}40`,
                            background: `${rec.usiOpportunity.overlayColor}08`,
                          }}>
                            <div className="flex items-center gap-2">
                              <p className="text-xs font-bold" style={{ color: rec.usiOpportunity.overlayColor }}>
                                💉 Usi Detection
                              </p>
                              <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full font-bold"
                                style={{ background: rec.usiOpportunity.available ? '#00ff8820' : '#f9731620',
                                  color: rec.usiOpportunity.available ? '#00ff88' : '#f97316' }}>
                                {rec.usiOpportunity.available ? 'Chest Open' : 'Chest Guarded'}
                              </span>
                            </div>
                            <p className="text-slate-300 text-xs">{rec.usiOpportunity.reason}</p>
                            {rec.usiOpportunity.warning && (
                              <p className="text-yellow-400 text-[10px]">⚠ {rec.usiOpportunity.warning}</p>
                            )}
                            <div className="flex items-center gap-2 text-[10px]">
                              <span className="text-slate-500">Counter risk:</span>
                              <span className="font-bold" style={{
                                color: rec.usiOpportunity.counterRisk === 'LOW' ? '#00ff88' : rec.usiOpportunity.counterRisk === 'HIGH' ? '#f97316' : '#f59e0b'
                              }}>{rec.usiOpportunity.counterRisk}</span>
                            </div>
                          </div>

                          {rec.usiAttempt && (
                            <div className="rounded-xl border border-slate-700 p-3 space-y-1.5 bg-slate-800/40">
                              <p className="text-xs font-bold text-slate-300">💉 Usi Attempt</p>
                              <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                                <div className="bg-slate-900/60 rounded-lg p-2">
                                  <p className="text-slate-500 mb-0.5">Target</p>
                                  <p className="text-white font-bold">{rec.usiAttempt.touchTarget}</p>
                                  <p style={{ color: rec.usiAttempt.touchResult === 'Clean Touch' ? '#00ff88' : '#f59e0b' }}>
                                    {rec.usiAttempt.touchResult}
                                  </p>
                                </div>
                                <div className="bg-slate-900/60 rounded-lg p-2">
                                  <p className="text-slate-500 mb-0.5">Recovery</p>
                                  <p className="text-white font-bold">{rec.usiAttempt.recoverySpeed}</p>
                                  <p className="text-slate-400">{rec.usiAttempt.speedRating}</p>
                                </div>
                              </div>
                              <p className="text-slate-400 text-[10px]">Path: {rec.usiAttempt.stickPath}</p>
                              <div className="text-center py-1">
                                <span className="text-xs font-bold px-3 py-1 rounded-full" style={{
                                  background: rec.usiAttempt.finalResult === 'Successful Usi' ? '#00ff8820' : rec.usiAttempt.finalResult === 'Partial Usi' ? '#f59e0b20' : '#f9731620',
                                  color: rec.usiAttempt.finalResult === 'Successful Usi' ? '#00ff88' : rec.usiAttempt.finalResult === 'Partial Usi' ? '#f59e0b' : '#f97316',
                                }}>{rec.usiAttempt.finalResult}</span>
                              </div>
                              <p className="text-slate-400 text-[10px] leading-relaxed">{rec.usiAttempt.coachingFeedback}</p>
                            </div>
                          )}

                          {rec.usiDeepAnalysis ? (
                            <div className="rounded-xl border border-orion-blue/20 bg-orion-blue/5 p-3 space-y-2">
                              <div className="flex items-center gap-2">
                                <p className="text-xs font-bold text-orion-blue">🤖 Usi Deep Analysis</p>
                                {rec.usiDeepAnalysis.overallScore > 0 && (
                                  <span className="ml-auto text-xs font-bold text-orion-blue">{rec.usiDeepAnalysis.overallScore}/100</span>
                                )}
                              </div>
                              {rec.usiDeepAnalysis.technicalBreakdown && (
                                <p className="text-slate-300 text-xs">{rec.usiDeepAnalysis.technicalBreakdown}</p>
                              )}
                              {rec.usiDeepAnalysis.keyStrengths?.length > 0 && (
                                <div>
                                  <p className="text-green-400 text-[10px] font-bold mb-1">Strengths</p>
                                  {rec.usiDeepAnalysis.keyStrengths.map((s: string, i: number) => (
                                    <p key={i} className="text-slate-300 text-[10px]">✓ {s}</p>
                                  ))}
                                </div>
                              )}
                              {rec.usiDeepAnalysis.criticalFixes?.length > 0 && (
                                <div>
                                  <p className="text-red-400 text-[10px] font-bold mb-1">Fix These</p>
                                  {rec.usiDeepAnalysis.criticalFixes.map((f: string, i: number) => (
                                    <p key={i} className="text-slate-300 text-[10px]">• {f}</p>
                                  ))}
                                </div>
                              )}
                              {rec.usiDeepAnalysis.improvementDrills?.length > 0 && (
                                <div>
                                  <p className="text-yellow-400 text-[10px] font-bold mb-1">Drills</p>
                                  {rec.usiDeepAnalysis.improvementDrills.map((d: string, i: number) => (
                                    <p key={i} className="text-slate-300 text-[10px]">{i + 1}. {d}</p>
                                  ))}
                                </div>
                              )}
                              {rec.usiDeepAnalysis.nextTechniqueToTry && (
                                <p className="text-orion-blue text-[10px]">Next: {rec.usiDeepAnalysis.nextTechniqueToTry}</p>
                              )}
                            </div>
                          ) : (
                            <button
                              onClick={() => getUsiDeepAnalysis(rec)}
                              disabled={loadingUsi === rec.id}
                              className="w-full py-2.5 rounded-xl border border-orion-blue/30 text-orion-blue text-xs font-bold hover:bg-orion-blue/10 transition-all disabled:opacity-50">
                              {loadingUsi === rec.id ? '⚙ ORION analysing Usi...' : '💉 Get Usi Deep Analysis'}
                            </button>
                          )}
                        </div>
                      )}

                      {/* Per-player scores */}
                      {rec.players.map((p, pIdx) => (
                        <div key={pIdx} className="rounded-xl border p-3 space-y-3" style={{ borderColor: `${p.color}30`, background: `${p.color}05` }}>
                          <p className="text-xs font-bold" style={{ color: p.color }}>{p.label} — {p.technique}</p>
                          <div className="space-y-2">
                            {[
                              { l: '🌀 Spin',   v: p.spinScore },
                              { l: '💥 Power',  v: p.powerScore },
                              { l: '⚡ Reflex', v: p.reflexScore },
                              { l: '🏃 Speed',  v: speedScore10(p.attackSpeed), extra: `${p.attackSpeed}m/s` },
                            ].map(({ l, v, extra }) => (
                              <div key={l}>
                                <div className="flex justify-between mb-0.5">
                                  <span className="text-[10px] text-slate-400">{l}</span>
                                  <span className="text-[10px]" style={{ color: p.color }}>{v}/10{extra ? ` (${extra})` : ''}</span>
                                </div>
                                <ScoreBar score={v} color={p.color} />
                              </div>
                            ))}
                          </div>
                          <div className="grid grid-cols-3 gap-1.5">
                            {[
                              { l: 'Score', v: p.metrics.overallScore, u: '/100' },
                              { l: 'Balance', v: p.metrics.balance, u: '%' },
                              { l: 'Height', v: p.estimatedHeight, u: 'cm' },
                            ].map(({ l, v, u }) => (
                              <div key={l} className="bg-slate-800/60 rounded-lg p-2 text-center border border-slate-700/40">
                                <p className="text-[10px] text-slate-500 mb-0.5">{l}</p>
                                <p className="text-xs font-bold" style={{ color: p.color }}>{v}<span className="text-[10px] text-slate-500">{u}</span></p>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}

                      {/* Save as Highlight — 4 categories */}
                      {rec.videoSrc && rec.videoTimeSec !== undefined && (
                        <div className="space-y-2">
                          <p className="text-xs text-slate-400 font-semibold flex items-center gap-1.5">
                            <Scissors size={12} /> Save as Highlight — choose type:
                          </p>
                          <div className="grid grid-cols-2 gap-2">
                            {(Object.entries(CATEGORY_META) as [HighlightCategory, typeof CATEGORY_META[HighlightCategory]][]).map(([cat, meta]) => (
                              <button key={cat}
                                onClick={() => cutAndSaveHighlight(rec, cat)}
                                disabled={!!cuttingClip}
                                className="py-2.5 px-2 rounded-xl border font-semibold text-xs flex flex-col items-center gap-1 transition-all disabled:opacity-40 hover:opacity-90 active:scale-95"
                                style={{ borderColor: `${meta.color}40`, background: `${meta.color}10`, color: meta.color }}>
                                <span className="text-base">{meta.icon}</span>
                                <span>{meta.label}</span>
                                <span className="text-[9px] opacity-70 text-center leading-tight">{meta.desc}</span>
                              </button>
                            ))}
                          </div>
                          {cuttingClip?.id === rec.id && (
                            <p className="text-orion-blue text-xs text-center animate-pulse">
                              ✂️ Cutting {CATEGORY_META[cuttingClip.category].label} clip... video is playing for 6s
                            </p>
                          )}
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-2">
                        <button onClick={() => {
                          const techs = new Set(rec.players.map(p => p.technique))
                          const related = highlights.filter(h =>
                            h.category === 'counter' ||
                            h.techniques.some(t => techs.has(t))
                          )
                          setCounterClips(related)
                          getCombatAdvice(rec)
                          setTab('analyze')
                        }}
                          className="py-2 rounded-xl border border-purple-400/30 text-purple-400 text-xs font-semibold hover:bg-purple-400/10">
                          ⚔️ Counter Moves
                        </button>
                        <button onClick={() => setRecords(prev => prev.filter(r => r.id !== rec.id))}
                          className="py-2 rounded-xl border border-red-400/20 text-red-400/50 text-xs hover:text-red-400 flex items-center justify-center gap-1">
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

      {/* ─── HIGHLIGHTS TAB ─── */}
      {tab === 'highlights' && (
        <div className="space-y-3">
          {/* Category legend */}
          <div className="grid grid-cols-2 gap-2">
            {(Object.entries(CATEGORY_META) as [HighlightCategory, typeof CATEGORY_META[HighlightCategory]][]).map(([cat, meta]) => (
              <div key={cat} className="rounded-xl border p-2.5 flex items-start gap-2" style={{ borderColor: `${meta.color}30`, background: `${meta.color}08` }}>
                <span className="text-base flex-shrink-0">{meta.icon}</span>
                <div className="min-w-0">
                  <p className="text-xs font-bold" style={{ color: meta.color }}>{meta.label}</p>
                  <p className="text-[10px] text-slate-500 leading-tight">{meta.desc}</p>
                  <p className="text-[10px] mt-0.5" style={{ color: meta.color }}>
                    {highlights.filter(h => h.category === cat).length} clip{highlights.filter(h => h.category === cat).length !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Filter chips */}
          <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-1">
            <button onClick={() => setHlFilter('all')}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${hlFilter === 'all' ? 'bg-orion-blue text-white' : 'bg-slate-700 text-slate-400'}`}>
              <Filter size={10} className="inline mr-1" />All
            </button>
            {(Object.entries(CATEGORY_META) as [HighlightCategory, typeof CATEGORY_META[HighlightCategory]][]).map(([cat, meta]) => (
              <button key={cat} onClick={() => setHlFilter(cat)}
                className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
                style={hlFilter === cat ? { background: meta.color, color: '#000' } : { background: '#1e293b', color: meta.color }}>
                {meta.icon} {meta.label}
              </button>
            ))}
          </div>

          {filteredHighlights.length === 0 ? (
            <div className="text-center py-12 space-y-2">
              <p className="text-slate-500 text-sm">No {hlFilter === 'all' ? '' : CATEGORY_META[hlFilter as HighlightCategory].label + ' '}highlights yet.</p>
              <p className="text-slate-600 text-xs">Go to Records → open a capture → tap a highlight type to cut a clip.</p>
            </div>
          ) : (
            <>
              <p className="text-xs text-slate-500">{filteredHighlights.length} highlight{filteredHighlights.length !== 1 ? 's' : ''}</p>
              {filteredHighlights.map(hl => {
                const meta = CATEGORY_META[hl.category]
                return (
                  <div key={hl.id} className="glass rounded-2xl border overflow-hidden" style={{ borderColor: `${meta.color}30` }}>
                    {/* Header */}
                    <div className="flex items-center gap-2 px-3.5 pt-3.5 pb-2">
                      <span className="text-xl flex-shrink-0">{meta.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: `${meta.color}20`, color: meta.color }}>{meta.label}</span>
                          <span className="text-[10px] text-slate-500">{hl.videoTime} · {hl.playerCount}P</span>
                        </div>
                        <p className="text-white text-xs font-semibold truncate">{hl.techniques.join(' vs ')}</p>
                        <p className="text-slate-500 text-[10px] truncate">{hl.videoName}</p>
                      </div>
                      <button onClick={() => {
                        setHighlights(prev => {
                          const next = prev.filter(h => h.id !== hl.id)
                          saveHighlights(next)
                          return next
                        })
                      }} className="p-1.5 text-red-400/40 hover:text-red-400 flex-shrink-0">
                        <Trash2 size={13} />
                      </button>
                    </div>

                    {/* Video + speed + arrows */}
                    <div className="px-3.5 pb-2">
                      <HighlightPlayer hl={hl} />
                    </div>

                    {/* Score bars */}
                    <div className="px-3.5 pb-2 grid grid-cols-2 gap-x-4 gap-y-1.5">
                      {[
                        { l: '🌀 Spin',   v: hl.spinScore },
                        { l: '💥 Power',  v: hl.powerScore },
                        { l: '⚡ Reflex', v: hl.reflexScore },
                        { l: '🏃 Speed',  v: hl.speedScore },
                      ].map(({ l, v }) => (
                        <div key={l}>
                          <div className="flex justify-between mb-0.5">
                            <span className="text-[9px] text-slate-500">{l}</span>
                            <span className="text-[9px]" style={{ color: meta.color }}>{v}/10</span>
                          </div>
                          <ScoreBar score={v} color={meta.color} />
                        </div>
                      ))}
                    </div>

                    {/* Pros/Cons */}
                    {(hl.pros || hl.cons) && (
                      <div className="px-3.5 pb-3.5 grid grid-cols-2 gap-2">
                        {hl.pros && (
                          <div className="rounded-xl bg-green-400/5 border border-green-400/15 p-2 space-y-1">
                            <p className="text-green-400 text-[10px] font-bold">✅ Pros</p>
                            {hl.pros.slice(0, 2).map((p, i) => <p key={i} className="text-slate-400 text-[10px]">• {p}</p>)}
                          </div>
                        )}
                        {hl.cons && (
                          <div className="rounded-xl bg-red-400/5 border border-red-400/15 p-2 space-y-1">
                            <p className="text-red-400 text-[10px] font-bold">❌ Cons</p>
                            {hl.cons.slice(0, 2).map((c, i) => <p key={i} className="text-slate-400 text-[10px]">• {c}</p>)}
                          </div>
                        )}
                      </div>
                    )}
                    {hl.coachTip && (
                      <div className="px-3.5 pb-3.5">
                        <p className="text-orion-blue text-xs">🎓 {hl.coachTip}</p>
                      </div>
                    )}

                    {/* Download */}
                    {hl.clipUrl && (
                      <div className="px-3.5 pb-3.5">
                        <a href={hl.clipUrl} download={`orion_${hl.category}_${hl.videoTime.replace(/:/g, '-')}.webm`}
                          className="flex items-center justify-center gap-2 py-2 rounded-xl border border-slate-700 text-slate-400 text-xs hover:text-white transition-all">
                          <Download size={12} /> Download Clip
                        </a>
                      </div>
                    )}
                  </div>
                )
              })}
            </>
          )}
        </div>
      )}

      {/* ─── RECORDINGS TAB ─── */}
      {tab === 'recordings' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500 uppercase tracking-widest">Live Camera Recordings</p>
            {recordedVideos.length > 0 && (
              <button onClick={() => setRecordedVideos([])} className="text-xs text-red-400/60 hover:text-red-400 flex items-center gap-1"><Trash2 size={12} /> Clear</button>
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
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-orion-blue/15 border border-orion-blue/30 text-orion-blue text-xs font-bold">
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
