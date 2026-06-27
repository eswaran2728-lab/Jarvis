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
import {
  detectSweepOpportunity, analyzeSweepAttempt, drawSweepOverlay, estimateSweepStickTip,
  SweepOpportunity, SweepAttemptResult, SweepPoint,
} from '@/lib/pose/sweepDetection'
import {
  analyzeBavalaiState, drawBavalaiOverlay, getBavalaiWristAngle,
  BavalaiState, BavalaiPoint,
} from '@/lib/pose/bavalaiDetection'
import {
  detectGap, drawGapOverlay, GapState,
} from '@/lib/pose/gapDetection'
import {
  detectEchoOpportunity, analyzeEchoAttempt, drawEchoOverlay,
  EchoOpportunity, EchoAttemptResult,
} from '@/lib/pose/echoDetection'
import {
  detectTrapOpportunity, analyzeTrapAttempt, drawTrapOverlay,
  TrapOpportunity, TrapAttemptResult, TrapPoint,
} from '@/lib/pose/trapDetection'
import {
  detectDefenceOpportunity, analyzeDefenceAttempt, drawDefenceOverlay,
  DefenceOpportunity, DefenceAttemptResult,
} from '@/lib/pose/defenceDetection'
import {
  detectRetreat, drawRetreatOverlay, RetreatState,
} from '@/lib/pose/retreatDetection'
import {
  detectSlideOpportunity, analyzeSlideAttempt, drawSlideOverlay,
  SlideOpportunity, SlideAttemptResult, SlidePoint,
} from '@/lib/pose/slideDetection'
import {
  detectZipOpportunity, analyzeZipAttempt, drawZipOverlay,
  ZipOpportunity, ZipAttemptResult, ZipPoint,
} from '@/lib/pose/zipDetection'

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
  sweepOpportunity?: SweepOpportunity
  sweepAttempt?: SweepAttemptResult
  sweepDeepAnalysis?: any
  bavalaiState?: BavalaiState
  gapState?: GapState
  echoOpportunity?: EchoOpportunity
  echoAttempt?: EchoAttemptResult
  echoDeepAnalysis?: any
  trapOpportunity?: TrapOpportunity
  trapAttempt?: TrapAttemptResult
  trapDeepAnalysis?: any
  defenceOpportunity?: DefenceOpportunity
  defenceAttempt?: DefenceAttemptResult
  defenceDeepAnalysis?: any
  retreatState?: RetreatState
  retreatDeepAnalysis?: any
  slideOpportunity?: SlideOpportunity
  slideAttempt?: SlideAttemptResult
  slideDeepAnalysis?: any
  zipOpportunity?: ZipOpportunity
  zipAttempt?: ZipAttemptResult
  zipDeepAnalysis?: any
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
const COACH_COLORS = ['#ef4444', '#3b82f6', '#f97316', '#a855f7'] // P1=RED, P2=BLUE

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
  const [liveUStrike, setLiveUStrike]   = useState<UStrikeOpportunity | null>(null)
  const [liveHook, setLiveHook]         = useState<HookOpportunity | null>(null)
  const [liveUsi, setLiveUsi]           = useState<UsiOpportunity | null>(null)
  const [liveSweep, setLiveSweep]       = useState<SweepOpportunity | null>(null)
  const [liveBavalai, setLiveBavalai]   = useState<BavalaiState | null>(null)
  const [loadingUStrike, setLoadingUStrike] = useState<number | null>(null)
  const [loadingHook, setLoadingHook]   = useState<number | null>(null)
  const [loadingUsi, setLoadingUsi]     = useState<number | null>(null)
  const [loadingSweep, setLoadingSweep] = useState<number | null>(null)
  const [liveGap, setLiveGap]           = useState<GapState | null>(null)
  const [liveEcho, setLiveEcho]         = useState<EchoOpportunity | null>(null)
  const [liveTrap, setLiveTrap]         = useState<TrapOpportunity | null>(null)
  const [liveDefence, setLiveDefence]   = useState<DefenceOpportunity | null>(null)
  const [liveRetreat, setLiveRetreat]   = useState<RetreatState | null>(null)
  const [liveSlide, setLiveSlide]       = useState<SlideOpportunity | null>(null)
  const [liveZip, setLiveZip]           = useState<ZipOpportunity | null>(null)
  const [loadingEcho, setLoadingEcho]   = useState<number | null>(null)
  const [loadingTrap, setLoadingTrap]   = useState<number | null>(null)
  const [loadingDefence, setLoadingDefence] = useState<number | null>(null)
  const [loadingSlide, setLoadingSlide] = useState<number | null>(null)
  const [loadingZip, setLoadingZip]     = useState<number | null>(null)
  const [coachingMoment, setCoachingMoment] = useState<any | null>(null)
  const [coachingHistory, setCoachingHistory] = useState<{ timeSec: number; timeStr: string; moment: any }[]>([])
  const [loadingCoaching, setLoadingCoaching] = useState(false)
  const [isPausedByOrion, setIsPausedByOrion] = useState(false)
  const [liveCameraCoach, setLiveCameraCoach] = useState<any | null>(null)

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
  const sweepHistoryRef  = useRef<SweepPoint[][]>([[], [], [], []])
  const bavalaiHistoryRef = useRef<BavalaiPoint[][]>([[], [], [], []])
  const trapHistoryRef   = useRef<TrapPoint[][]>([[], [], [], []])
  const slideHistoryRef  = useRef<SlidePoint[][]>([[], [], [], []])
  const zipHistoryRef    = useRef<ZipPoint[][]>([[], [], [], []])
  const prevDefenderLmRef = useRef<any[] | null>(null)
  const wristSpeedHistoryRef = useRef<number[]>([])
  const lastPauseTimeRef = useRef<number>(0)

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
      const color = COACH_COLORS[pIdx] || '#ffffff'
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
      color: COACH_COLORS[pIdx] || '#ffffff',
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

  const getSweepDeepAnalysis = useCallback(async (rec: AnalysisRecord) => {
    if (!rec.sweepOpportunity) return
    setLoadingSweep(rec.id)
    try {
      const res = await fetch('/api/sweep-analysis', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          opportunity: rec.sweepOpportunity,
          attempt: rec.sweepAttempt || null,
          fighter: rec.players[0]?.label || 'Player 1',
          videoTime: rec.videoTime,
        }),
      })
      const data = await res.json()
      setRecords(prev => prev.map(r => r.id === rec.id ? { ...r, sweepDeepAnalysis: data } : r))
    } catch { /* silent */ }
    setLoadingSweep(null)
  }, [])

  const getEchoDeepAnalysis = useCallback(async (rec: AnalysisRecord) => {
    if (!rec.echoOpportunity) return
    setLoadingEcho(rec.id)
    try {
      const res = await fetch('/api/echo-analysis', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ opportunity: rec.echoOpportunity, attempt: rec.echoAttempt || null, fighter: rec.players[0]?.label || 'Player 1', videoTime: rec.videoTime }),
      })
      const data = await res.json()
      setRecords(prev => prev.map(r => r.id === rec.id ? { ...r, echoDeepAnalysis: data } : r))
    } catch { /* silent */ }
    setLoadingEcho(null)
  }, [])

  const getTrapDeepAnalysis = useCallback(async (rec: AnalysisRecord) => {
    if (!rec.trapOpportunity) return
    setLoadingTrap(rec.id)
    try {
      const res = await fetch('/api/trap-analysis', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ opportunity: rec.trapOpportunity, attempt: rec.trapAttempt || null, fighter: rec.players[0]?.label || 'Player 1', videoTime: rec.videoTime }),
      })
      const data = await res.json()
      setRecords(prev => prev.map(r => r.id === rec.id ? { ...r, trapDeepAnalysis: data } : r))
    } catch { /* silent */ }
    setLoadingTrap(null)
  }, [])

  const getDefenceDeepAnalysis = useCallback(async (rec: AnalysisRecord) => {
    if (!rec.defenceOpportunity) return
    setLoadingDefence(rec.id)
    try {
      const res = await fetch('/api/defence-analysis', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ opportunity: rec.defenceOpportunity, attempt: rec.defenceAttempt || null, fighter: rec.players[0]?.label || 'Player 1', videoTime: rec.videoTime }),
      })
      const data = await res.json()
      setRecords(prev => prev.map(r => r.id === rec.id ? { ...r, defenceDeepAnalysis: data } : r))
    } catch { /* silent */ }
    setLoadingDefence(null)
  }, [])

  const getSlideDeepAnalysis = useCallback(async (rec: AnalysisRecord) => {
    if (!rec.slideOpportunity) return
    setLoadingSlide(rec.id)
    try {
      const res = await fetch('/api/slide-analysis', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ opportunity: rec.slideOpportunity, attempt: rec.slideAttempt || null, fighter: rec.players[0]?.label || 'Player 1', videoTime: rec.videoTime }),
      })
      const data = await res.json()
      setRecords(prev => prev.map(r => r.id === rec.id ? { ...r, slideDeepAnalysis: data } : r))
    } catch { /* silent */ }
    setLoadingSlide(null)
  }, [])

  const getZipDeepAnalysis = useCallback(async (rec: AnalysisRecord) => {
    if (!rec.zipOpportunity) return
    setLoadingZip(rec.id)
    try {
      const res = await fetch('/api/zip-analysis', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ opportunity: rec.zipOpportunity, attempt: rec.zipAttempt || null, fighter: rec.players[0]?.label || 'Player 1', videoTime: rec.videoTime }),
      })
      const data = await res.json()
      setRecords(prev => prev.map(r => r.id === rec.id ? { ...r, zipDeepAnalysis: data } : r))
    } catch { /* silent */ }
    setLoadingZip(null)
  }, [])

  const fetchCoachingMoment = useCallback(async (params: {
    videoTime: string; momentType: string; player1Tech: string; player2Tech: string;
    gapType?: string; gapStickPos?: string; gapBestTech?: string;
    echoDetected: boolean; echoDirection?: string;
    trapAvailable: boolean; trapFakeTarget?: string; trapRealTarget?: string;
    defenceThreat: boolean; defenceType?: string;
    bavalaiQuality?: string; bavalaiOpportunity?: string;
    retreatResult?: string; slideAvailable: boolean; zipAvailable: boolean;
    wristSpeed?: number; player1Score?: number; player2Score?: number;
  }) => {
    setLoadingCoaching(true)
    try {
      const res = await fetch('/api/coaching-moment', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      })
      const data = await res.json()
      setCoachingMoment(data)
      const timeSec = videoRef.current?.currentTime || 0
      setCoachingHistory(prev => [{ timeSec, timeStr: params.videoTime, moment: data }, ...prev.slice(0, 49)])
    } catch { /* silent */ }
    setLoadingCoaching(false)
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

        // Sweep detection
        const bavalaiActive = (bavalaiHistoryRef.current[0].length >= 8)
        const sweepOpp = detectSweepOpportunity(attackerLm, defenderLm, bavalaiActive)
        setLiveSweep(sweepOpp)
        const sTip = estimateSweepStickTip(attackerLm)
        if (sTip) sweepHistoryRef.current[0] = [...sweepHistoryRef.current[0].slice(-29), { ...sTip, ts: now }]

        // Bavalai detection
        const bAngle = getBavalaiWristAngle(attackerLm)
        if (bAngle !== null) {
          const domW = (attackerLm[16]?.visibility || 0) > (attackerLm[15]?.visibility || 0) ? attackerLm[16] : attackerLm[15]
          bavalaiHistoryRef.current[0] = [
            ...bavalaiHistoryRef.current[0].slice(-39),
            { x: domW?.x || 0.5, y: domW?.y || 0.5, ts: now, angle: bAngle },
          ]
        }
        const bavalaiSt = analyzeBavalaiState(attackerLm, defenderLm, bavalaiHistoryRef.current[0])
        setLiveBavalai(bavalaiSt)

        // Gap detection
        const gapSt = detectGap(attackerLm, defenderLm)
        setLiveGap(gapSt)

        // Echo detection
        const echoOpp = detectEchoOpportunity(attackerLm, defenderLm, prevDefenderLmRef.current)
        setLiveEcho(echoOpp)

        // Trap detection
        const trapOpp = detectTrapOpportunity(attackerLm, defenderLm)
        setLiveTrap(trapOpp)
        const tTip = attackerLm[16] ? { x: attackerLm[16].x, y: attackerLm[16].y, ts: now } : null
        if (tTip) trapHistoryRef.current[0] = [...trapHistoryRef.current[0].slice(-29), tTip]

        // Defence detection
        const defenceOpp = detectDefenceOpportunity(attackerLm, defenderLm, prevDefenderLmRef.current, bavalaiSt.detected)
        setLiveDefence(defenceOpp)

        // Retreat detection
        const retreatSt = detectRetreat(
          attackerLm, prevLandmarksRef.current[0] || null, defenderLm,
          wristSpeedHistoryRef.current, bavalaiSt.detected,
        )
        setLiveRetreat(retreatSt)

        // Wrist speed tracking for retreat
        if (attackerLm[16] && prevLandmarksRef.current[0]?.[16]) {
          const ws = Math.sqrt(
            Math.pow(attackerLm[16].x - prevLandmarksRef.current[0][16].x, 2) +
            Math.pow(attackerLm[16].y - prevLandmarksRef.current[0][16].y, 2),
          )
          wristSpeedHistoryRef.current = [...wristSpeedHistoryRef.current.slice(-19), ws]
        }

        // Slide detection
        const slideOpp = detectSlideOpportunity(attackerLm, defenderLm)
        setLiveSlide(slideOpp)
        const slTip = attackerLm[16] ? { x: attackerLm[16].x, y: attackerLm[16].y, ts: now } : null
        if (slTip) slideHistoryRef.current[0] = [...slideHistoryRef.current[0].slice(-29), slTip]

        // Zip detection
        const zipOpp = detectZipOpportunity(attackerLm, defenderLm)
        setLiveZip(zipOpp)
        const zTip = attackerLm[16] ? { x: attackerLm[16].x, y: attackerLm[16].y, ts: now } : null
        if (zTip) zipHistoryRef.current[0] = [...zipHistoryRef.current[0].slice(-29), zTip]

        // Store prev defender landmarks for Echo/Defence next frame
        prevDefenderLmRef.current = defenderLm

        // Draw overlays on canvas (U Strike, Hook, Usi, Sweep, Bavalai, Gap, Echo, Trap, Defence, Retreat, Slide, Zip)
        const ctx = canvas.getContext('2d')
        if (ctx) {
          const W = canvas.width; const H = canvas.height
          drawUStrikeOverlay(ctx, W, H, attackerLm, defenderLm, uStrikeOpp, tipHistoryRef.current[0])
          drawHookOverlay(ctx, W, H, attackerLm, defenderLm, hookOpp, hookHistoryRef.current[0])
          drawUsiOverlay(ctx, W, H, attackerLm, defenderLm, usiOpp, usiHistoryRef.current[0])
          drawSweepOverlay(ctx, W, H, attackerLm, defenderLm, sweepOpp, sweepHistoryRef.current[0])
          drawBavalaiOverlay(ctx, W, H, attackerLm, bavalaiSt, bavalaiHistoryRef.current[0])
          drawGapOverlay(ctx, W, H, defenderLm, gapSt)
          drawEchoOverlay(ctx, W, H, attackerLm, defenderLm, echoOpp)
          drawTrapOverlay(ctx, W, H, attackerLm, defenderLm, trapOpp)
          drawDefenceOverlay(ctx, W, H, attackerLm, defenceOpp)
          drawRetreatOverlay(ctx, W, H, attackerLm, retreatSt)
          drawSlideOverlay(ctx, W, H, attackerLm, defenderLm, slideHistoryRef.current[0], slideOpp)
          drawZipOverlay(ctx, W, H, attackerLm, defenderLm, zipHistoryRef.current[0], zipOpp)
        }

        // Attempt analyses
        const uStrikeAttempt = analyzeUStrikeAttempt(attackerLm, defenderLm, tipHistoryRef.current[0], uStrikeOpp)
        const hookAttempt    = analyzeHookAttempt(attackerLm, defenderLm, hookHistoryRef.current[0], hookOpp)
        const usiAttempt     = analyzeUsiAttempt(attackerLm, defenderLm, usiHistoryRef.current[0], usiOpp)
        const sweepAttempt   = analyzeSweepAttempt(attackerLm, defenderLm, sweepHistoryRef.current[0], sweepOpp)
        const echoAttempt    = analyzeEchoAttempt(attackerLm, defenderLm, prevLandmarksRef.current[0] || null, echoOpp)
        const trapAttempt    = analyzeTrapAttempt(attackerLm, defenderLm, prevLandmarksRef.current[0] || null, trapHistoryRef.current[0], trapOpp)
        const defenceAttempt = analyzeDefenceAttempt(attackerLm, defenderLm, prevLandmarksRef.current[0] || null, defenceOpp, bavalaiSt.detected)
        const slideAttempt   = analyzeSlideAttempt(attackerLm, defenderLm, prevLandmarksRef.current[0] || null, slideHistoryRef.current[0], slideOpp)
        const zipAttempt     = analyzeZipAttempt(attackerLm, defenderLm, prevLandmarksRef.current[0] || null, zipHistoryRef.current[0], zipOpp)

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
          sweepOpportunity: sweepOpp,
          sweepAttempt: sweepAttempt.detected ? sweepAttempt : undefined,
          bavalaiState: bavalaiSt.detected ? bavalaiSt : undefined,
          gapState: gapSt.detected ? gapSt : undefined,
          echoOpportunity: echoOpp.opponentAttackDetected ? echoOpp : undefined,
          echoAttempt: echoAttempt.detected ? echoAttempt : undefined,
          trapOpportunity: trapOpp.available ? trapOpp : undefined,
          trapAttempt: trapAttempt.detected ? trapAttempt : undefined,
          defenceOpportunity: defenceOpp.threatDetected ? defenceOpp : undefined,
          defenceAttempt: defenceAttempt.detected ? defenceAttempt : undefined,
          retreatState: retreatSt.retreating ? retreatSt : undefined,
          slideOpportunity: slideOpp.available ? slideOpp : undefined,
          slideAttempt: slideAttempt.detected ? slideAttempt : undefined,
          zipOpportunity: zipOpp.available ? zipOpp : undefined,
          zipAttempt: zipAttempt.detected ? zipAttempt : undefined,
        }
        // Auto-pause on ANY attack, defence, or counter detection — min 4s gap between pauses
        const anyDetection = (
          uStrikeOpp.available ||
          hookOpp.available ||
          usiOpp.available ||
          sweepOpp.available ||
          gapSt.detected ||
          echoOpp.opponentAttackDetected ||
          trapOpp.available ||
          defenceOpp.threatDetected ||
          retreatSt.retreating ||
          slideOpp.available ||
          zipOpp.available ||
          (bavalaiSt.detected && !!bavalaiSt.bestOpportunity)
        )

        const nowSec = video.currentTime
        const sinceLastPause = nowSec - lastPauseTimeRef.current
        if (anyDetection && sinceLastPause >= 4) {
          lastPauseTimeRef.current = nowSec
          video.pause(); setIsPlaying(false); setIsPausedByOrion(true); setCoachingMoment(null)
          const momentType = echoOpp.opponentAttackDetected ? 'ECHO_COUNTER'
            : trapOpp.available ? 'TRAP_OPPORTUNITY'
            : defenceOpp.threatDetected ? 'DEFENCE_NEEDED'
            : gapSt.detected ? 'GAP_OPENING'
            : uStrikeOpp.available ? 'USI_STRIKE_CHANCE'
            : hookOpp.available ? 'HOOK_CHANCE'
            : usiOpp.available ? 'USI_CHANCE'
            : sweepOpp.available ? 'SWEEP_CHANCE'
            : slideOpp.available ? 'SLIDE_CHANCE'
            : zipOpp.available ? 'ZIP_CHANCE'
            : retreatSt.retreating ? 'RETREAT_MOMENT'
            : 'BAVALAI_OPPORTUNITY'
          fetchCoachingMoment({
            videoTime: formatTime(nowSec), momentType,
            player1Tech: rec.players[0]?.technique || 'Unknown',
            player2Tech: rec.players[1]?.technique || 'Unknown',
            gapType: gapSt.detected ? gapSt.gapType : undefined,
            gapStickPos: gapSt.detected ? gapSt.opponentStickPosition : undefined,
            gapBestTech: gapSt.detected ? (gapSt.bestRecommendation?.technique) : undefined,
            echoDetected: echoOpp.opponentAttackDetected,
            echoDirection: echoOpp.attackDirection,
            trapAvailable: trapOpp.available,
            trapFakeTarget: trapOpp.suggestedFakeTarget,
            trapRealTarget: trapOpp.suggestedRealTarget,
            defenceThreat: defenceOpp.threatDetected,
            defenceType: defenceOpp.recommendedDefence,
            bavalaiQuality: bavalaiSt.detected ? bavalaiSt.quality : undefined,
            bavalaiOpportunity: bavalaiSt.bestOpportunity?.technique || undefined,
            retreatResult: retreatSt.retreating ? retreatSt.speed : undefined,
            slideAvailable: slideOpp.available,
            zipAvailable: zipOpp.available,
            wristSpeed: wristSpeedHistoryRef.current[wristSpeedHistoryRef.current.length - 1],
          })
        }

        setRecords(prev => [rec, ...prev])
        setExpandedId(rec.id)
        if (withAdvice && !isPausedByOrion) getCombatAdvice(rec)
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
    if (isPlaying) {
      autoIntervalRef.current = setInterval(() => analyseFrame(false), 600)
    } else {
      if (autoIntervalRef.current) { clearInterval(autoIntervalRef.current); autoIntervalRef.current = null }
    }
    return () => { if (autoIntervalRef.current) clearInterval(autoIntervalRef.current) }
  }, [isPlaying, analyseFrame])

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

          // Sweep + Bavalai for camera
          const camBavalaiActive = bavalaiHistoryRef.current[0].length >= 8
          const camSweepOpp = detectSweepOpportunity(camAtk, camDef, camBavalaiActive)
          setLiveSweep(camSweepOpp)
          const sTipCam = estimateSweepStickTip(camAtk)
          if (sTipCam) sweepHistoryRef.current[0] = [...sweepHistoryRef.current[0].slice(-29), { ...sTipCam, ts: camNow }]

          const camBAngle = getBavalaiWristAngle(camAtk)
          if (camBAngle !== null) {
            const domW = (camAtk[16]?.visibility || 0) > (camAtk[15]?.visibility || 0) ? camAtk[16] : camAtk[15]
            bavalaiHistoryRef.current[0] = [
              ...bavalaiHistoryRef.current[0].slice(-39),
              { x: domW?.x || 0.5, y: domW?.y || 0.5, ts: camNow, angle: camBAngle },
            ]
          }
          const camBavalaiSt = analyzeBavalaiState(camAtk, camDef, bavalaiHistoryRef.current[0])
          setLiveBavalai(camBavalaiSt)

          // Gap, Echo, Trap, Defence, Retreat, Slide, Zip for camera
          const camGapSt = detectGap(camAtk, camDef)
          setLiveGap(camGapSt)
          const camEchoOpp = detectEchoOpportunity(camAtk, camDef, prevDefenderLmRef.current)
          setLiveEcho(camEchoOpp)
          const camTrapOpp = detectTrapOpportunity(camAtk, camDef)
          setLiveTrap(camTrapOpp)
          const camDefenceOpp = detectDefenceOpportunity(camAtk, camDef, prevDefenderLmRef.current, camBavalaiActive)
          setLiveDefence(camDefenceOpp)
          const camRetSt = detectRetreat(camAtk, prevLandmarksRef.current[0] || null, camDef, wristSpeedHistoryRef.current, camBavalaiActive)
          setLiveRetreat(camRetSt)
          const camSlideOpp = detectSlideOpportunity(camAtk, camDef)
          setLiveSlide(camSlideOpp)
          const camZipOpp = detectZipOpportunity(camAtk, camDef)
          setLiveZip(camZipOpp)
          const camTip = camAtk[16] ? { x: camAtk[16].x, y: camAtk[16].y, ts: camNow } : null
          if (camTip) {
            trapHistoryRef.current[0] = [...trapHistoryRef.current[0].slice(-29), camTip]
            slideHistoryRef.current[0] = [...slideHistoryRef.current[0].slice(-29), camTip]
            zipHistoryRef.current[0] = [...zipHistoryRef.current[0].slice(-29), camTip]
          }
          prevDefenderLmRef.current = camDef

          // Live camera: show coaching card on any attack/defence/counter detection
          const camAnyDetection = (
            camUStrikeOpp.available || camHookOpp.available || camUsiOpp.available ||
            camSweepOpp.available || camGapSt.detected || camEchoOpp.opponentAttackDetected ||
            camTrapOpp.available || camDefenceOpp.threatDetected || camRetSt.retreating ||
            camSlideOpp.available || camZipOpp.available ||
            (camBavalaiSt.detected && !!camBavalaiSt.bestOpportunity)
          )
          const camSig = camAnyDetection ? 0.70 : 0
          if (camAnyDetection) {
            const camMomentType = camEchoOpp.opponentAttackDetected ? 'ECHO COUNTER' : camTrapOpp.available ? 'TRAP' : camDefenceOpp.threatDetected ? 'DEFENCE' : camGapSt.detected ? 'GAP OPENING' : camUStrikeOpp.available ? 'U STRIKE' : camHookOpp.available ? 'HOOK' : camUsiOpp.available ? 'USI STRIKE' : camSweepOpp.available ? 'SWEEP' : camSlideOpp.available ? 'SLIDE' : camZipOpp.available ? 'ZIP' : camRetSt.retreating ? 'RETREAT' : 'BAVALAI'
            setLiveCameraCoach({
              momentType: camMomentType,
              gap: camGapSt.detected ? `Gap: ${camGapSt.gapType} — best: ${camGapSt.bestRecommendation?.technique || '?'}` : null,
              echo: camEchoOpp.opponentAttackDetected ? `Echo from ${camEchoOpp.attackDirection}` : null,
              trap: camTrapOpp.available ? `Trap: fake ${camTrapOpp.suggestedFakeTarget} → hit ${camTrapOpp.suggestedRealTarget}` : null,
              defence: camDefenceOpp.threatDetected ? `Defend: ${camDefenceOpp.recommendedDefence}` : null,
              attack: camUStrikeOpp.available ? 'U Strike opening!' : camHookOpp.available ? 'Hook opening!' : camUsiOpp.available ? 'Usi opening!' : camSweepOpp.available ? 'Sweep available!' : camSlideOpp.available ? 'Slide available!' : camZipOpp.available ? 'Zip available!' : null,
              retreat: camRetSt.retreating ? (camRetSt.stickStatus === 'Dropped' ? 'KEEP STICK ACTIVE during retreat!' : `Retreating — ${camRetSt.speed}`) : null,
              bavalai: camBavalaiSt.bestOpportunity ? `Bavalai chance: ${camBavalaiSt.bestOpportunity.technique}` : null,
              confidence: Math.round(camSig * 100),
            })
          } else {
            setLiveCameraCoach(null)
          }

          const ctx = canvas.getContext('2d')
          if (ctx) {
            const cW = canvas.width; const cH = canvas.height
            drawUStrikeOverlay(ctx, cW, cH, camAtk, camDef, camUStrikeOpp, tipHistoryRef.current[0])
            drawHookOverlay(ctx, cW, cH, camAtk, camDef, camHookOpp, hookHistoryRef.current[0])
            drawUsiOverlay(ctx, cW, cH, camAtk, camDef, camUsiOpp, usiHistoryRef.current[0])
            drawSweepOverlay(ctx, cW, cH, camAtk, camDef, camSweepOpp, sweepHistoryRef.current[0])
            drawBavalaiOverlay(ctx, cW, cH, camAtk, camBavalaiSt, bavalaiHistoryRef.current[0])
            drawGapOverlay(ctx, cW, cH, camDef, camGapSt)
            drawEchoOverlay(ctx, cW, cH, camAtk, camDef, camEchoOpp)
            drawTrapOverlay(ctx, cW, cH, camAtk, camDef, camTrapOpp)
            drawDefenceOverlay(ctx, cW, cH, camAtk, camDefenceOpp)
            drawRetreatOverlay(ctx, cW, cH, camAtk, camRetSt)
            drawSlideOverlay(ctx, cW, cH, camAtk, camDef, slideHistoryRef.current[0], camSlideOpp)
            drawZipOverlay(ctx, cW, cH, camAtk, camDef, zipHistoryRef.current[0], camZipOpp)
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

  const resumePlayback = () => {
    setIsPausedByOrion(false)
    videoRef.current?.play()
    setIsPlaying(true)
  }

  const P1_COLOR = '#ef4444'
  const P2_COLOR = '#3b82f6'

  return (
    <div className="space-y-3">
      <canvas ref={snapshotCanvasRef} className="hidden" />

      {/* Toasts */}
      {cuttingClip && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-900 border border-orion-blue/50 shadow-xl">
          <Scissors size={16} className="text-orion-blue animate-bounce flex-shrink-0" />
          <span className="text-orion-blue text-sm font-bold">Cutting {CATEGORY_META[cuttingClip.category].label} clip…</span>
        </div>
      )}
      {savedFlash && !cuttingClip && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-900 border border-green-400/50 shadow-xl">
          <span className="text-green-400 text-sm font-bold">{savedFlash} saved</span>
        </div>
      )}

      {/* Mode toggle */}
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
          { id: 'records',    label: `🏛 Timeline${coachingHistory.length > 0 ? ` (${coachingHistory.length})` : ''}` },
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
                      <p className="text-slate-400 text-sm">MP4 · MOV · WebM</p>
                      <div className="mt-4 flex gap-2">
                        <span className="text-xs text-slate-500 flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full inline-block" style={{ background: P1_COLOR }} /> Red = Player 1
                        </span>
                        <span className="text-xs text-slate-500 flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full inline-block" style={{ background: P2_COLOR }} /> Blue = Player 2
                        </span>
                      </div>
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
                  {/* ── Video area ── */}
                  <div className="relative rounded-2xl overflow-hidden bg-black border border-orion-border" style={{ aspectRatio: '16/9' }}>
                    <video ref={videoRef} src={videoSrc} className="w-full h-full object-contain"
                      onTimeUpdate={e => setCurrentTime(e.currentTarget.currentTime)}
                      onLoadedMetadata={e => setDuration(e.currentTarget.duration)}
                      onEnded={() => setIsPlaying(false)} />
                    <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" style={{ mixBlendMode: 'screen' }} />

                    {/* ORION pause overlay */}
                    {isPausedByOrion && (
                      <div className="absolute top-2 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-black/80 border border-[#ef4444]/60 rounded-xl px-3 py-1.5">
                        <div className="w-2 h-2 rounded-full bg-[#ef4444] animate-pulse" />
                        <span className="text-[#ef4444] text-xs font-bold tracking-widest">ORION PAUSED</span>
                      </div>
                    )}

                    {/* Loading overlay */}
                    {(loadingModel || fullAnalysing) && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 gap-3">
                        <p className="text-orion-blue text-sm font-medium animate-pulse">
                          {fullAnalysing ? `Scanning... ${fullProgress}%` : 'Loading AI model…'}
                        </p>
                        {fullAnalysing && (
                          <div className="w-48 h-1.5 bg-slate-700 rounded-full">
                            <div className="h-full bg-orion-blue rounded-full transition-all" style={{ width: `${fullProgress}%` }} />
                          </div>
                        )}
                      </div>
                    )}

                    {/* Player legend */}
                    <div className="absolute bottom-2 left-2 flex gap-2">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: `${P1_COLOR}20`, color: P1_COLOR, border: `1px solid ${P1_COLOR}50` }}>Red P1</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: `${P2_COLOR}20`, color: P2_COLOR, border: `1px solid ${P2_COLOR}50` }}>Blue P2</span>
                    </div>

                    {/* Moments count badge */}
                    {coachingHistory.length > 0 && (
                      <div className="absolute top-2 right-2 bg-[#ef4444]/90 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                        {coachingHistory.length} moments
                      </div>
                    )}
                  </div>

                  {/* ── Video controls ── */}
                  <div className="glass rounded-2xl border border-orion-border p-3 space-y-3">
                    <div className="flex items-center gap-2">
                      <button onClick={() => { const v = videoRef.current; if (!v) return; v.currentTime = 0; v.pause(); setIsPlaying(false); setIsPausedByOrion(false) }} className="p-2 text-slate-400 hover:text-white">
                        <SkipBack size={16} />
                      </button>
                      <button onClick={() => {
                        const v = videoRef.current; if (!v) return
                        if (isPlaying) { v.pause(); setIsPlaying(false) } else { v.play(); setIsPlaying(true); setIsPausedByOrion(false) }
                      }}
                        className="p-2 rounded-lg bg-orion-blue/20 border border-orion-blue/30 text-orion-blue">
                        {isPlaying ? <Pause size={18} /> : <Play size={18} />}
                      </button>
                      <span className="text-xs text-slate-400 w-20 tabular-nums">{formatTime(currentTime)} / {formatTime(duration)}</span>
                      <input type="range" min={0} max={duration || 1} step={0.1} value={currentTime}
                        onChange={e => { const v = parseFloat(e.target.value); if (videoRef.current) videoRef.current.currentTime = v; setCurrentTime(v) }}
                        className="flex-1 accent-[#00d4ff] cursor-pointer" />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <button onClick={analyseFullVideo} disabled={isAnalysing || fullAnalysing || !!cuttingClip}
                        className="py-2.5 rounded-xl font-bold text-sm disabled:opacity-50 active:scale-95 transition-all"
                        style={{ background: 'linear-gradient(135deg, #00d4ff22, #a855f722)', border: '1px solid #00d4ff55', color: '#00d4ff' }}>
                        {fullAnalysing ? `Scanning… ${fullProgress}%` : '⚡ Scan Full Match'}
                      </button>
                      <button onClick={() => { setVideoSrc(null); setRecords([]); setCoachingHistory([]); setCoachingMoment(null); setIsPausedByOrion(false) }}
                        className="py-2.5 rounded-xl border border-red-400/20 text-red-400/60 text-sm hover:text-red-400 transition-all">
                        Remove Video
                      </button>
                    </div>
                    {isPausedByOrion && (
                      <button onClick={resumePlayback}
                        className="w-full py-3 rounded-xl font-bold text-sm text-white active:scale-95 transition-all"
                        style={{ background: 'linear-gradient(135deg, #ef444433, #f9731633)', border: '1px solid #ef444460' }}>
                        ▶ Resume Playback
                      </button>
                    )}
                  </div>

                  {/* ── Coach panel (shows when ORION paused) ── */}
                  {isPausedByOrion && (
                    <div className="rounded-2xl border border-[#ef4444]/40 bg-[#ef4444]/5 p-4 space-y-4">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-[#ef4444] animate-pulse" />
                        <span className="text-[#ef4444] text-sm font-bold tracking-wide">ORION COACH — PAUSED AT {formatTime(currentTime)}</span>
                      </div>

                      {loadingCoaching && (
                        <div className="flex items-center gap-2 text-slate-400 text-xs animate-pulse">
                          <div className="w-4 h-4 border-2 border-orion-blue border-t-transparent rounded-full animate-spin" />
                          ORION is analysing this moment…
                        </div>
                      )}

                      {coachingMoment && !loadingCoaching && (
                        <div className="space-y-4">
                          {/* Pause reason */}
                          <p className="text-white text-sm font-semibold leading-snug">{coachingMoment.pauseReason}</p>

                          {/* Red & Blue fighters */}
                          <div className="grid grid-cols-1 gap-3">
                            {(['red', 'blue'] as const).map(side => {
                              const data = coachingMoment[side]
                              const color = side === 'red' ? P1_COLOR : P2_COLOR
                              const label = side === 'red' ? 'Red (P1)' : 'Blue (P2)'
                              if (!data) return null
                              return (
                                <div key={side} className="rounded-xl p-3 space-y-2" style={{ background: `${color}10`, border: `1px solid ${color}30` }}>
                                  <p className="text-xs font-bold" style={{ color }}>{label}</p>
                                  {data.mistakes?.length > 0 && (
                                    <div className="space-y-1">
                                      {data.mistakes.map((m: string, i: number) => (
                                        <p key={i} className="text-xs text-red-300">✗ {m}</p>
                                      ))}
                                    </div>
                                  )}
                                  {data.fixes?.length > 0 && (
                                    <div className="space-y-1">
                                      {data.fixes.map((f: string, i: number) => (
                                        <p key={i} className="text-xs text-yellow-300">→ {f}</p>
                                      ))}
                                    </div>
                                  )}
                                  {data.strengths?.length > 0 && (
                                    <div className="space-y-1">
                                      {data.strengths.map((s: string, i: number) => (
                                        <p key={i} className="text-xs text-green-400">✓ {s}</p>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )
                            })}
                          </div>

                          {/* Point Opportunity */}
                          {coachingMoment.pointOpportunity && (
                            <div className="rounded-xl p-3 space-y-1.5 bg-[#00d4ff]/5 border border-[#00d4ff]/30">
                              <div className="flex items-center justify-between">
                                <span className="text-orion-blue text-xs font-bold">POINT OPPORTUNITY</span>
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{
                                  background: coachingMoment.pointOpportunity.scoringPossibility === 'HIGH' ? '#00ff8820' : coachingMoment.pointOpportunity.scoringPossibility === 'MEDIUM' ? '#f59e0b20' : '#ef444420',
                                  color: coachingMoment.pointOpportunity.scoringPossibility === 'HIGH' ? '#00ff88' : coachingMoment.pointOpportunity.scoringPossibility === 'MEDIUM' ? '#f59e0b' : '#ef4444',
                                }}>{coachingMoment.pointOpportunity.scoringPossibility}</span>
                              </div>
                              <p className="text-white text-xs font-semibold">Target: {coachingMoment.pointOpportunity.target}</p>
                              <p className="text-slate-300 text-[11px]">{coachingMoment.pointOpportunity.reason}</p>
                              <div className="flex items-center justify-between text-[10px] text-slate-400">
                                <span>Open for: {coachingMoment.pointOpportunity.openDuration}</span>
                                <span>Best: <span className="text-orion-blue font-semibold">{coachingMoment.pointOpportunity.bestAction}</span></span>
                                <span>Conf: {coachingMoment.pointOpportunity.confidence}%</span>
                              </div>
                            </div>
                          )}

                          {/* Counter Analysis */}
                          {coachingMoment.counterAnalysis && (
                            <div className="rounded-xl p-3 space-y-1.5 bg-purple-500/5 border border-purple-500/30">
                              <span className="text-purple-400 text-xs font-bold">COUNTER ANALYSIS</span>
                              <p className="text-slate-300 text-[11px]">Attack: {coachingMoment.counterAnalysis.attackAttempted}</p>
                              <p className="text-slate-300 text-[11px]">Response: {coachingMoment.counterAnalysis.defenderResponse}</p>
                              <p className="text-white text-xs font-semibold">Best counter: {coachingMoment.counterAnalysis.bestCounter}</p>
                              <p className="text-slate-400 text-[10px]">{coachingMoment.counterAnalysis.counterReason} — {coachingMoment.counterAnalysis.confidence}% conf</p>
                            </div>
                          )}

                          {/* Stick Speed */}
                          {coachingMoment.stickSpeed && (
                            <div className="rounded-xl p-3 space-y-1.5 bg-yellow-400/5 border border-yellow-400/20">
                              <span className="text-yellow-400 text-xs font-bold">STICK SPEED</span>
                              <div className="flex flex-wrap gap-3 text-[11px]">
                                <span className="text-slate-300">Entry: <span className="text-white font-bold">{coachingMoment.stickSpeed.entryTimeSec}s</span></span>
                                <span className="text-slate-300">Exit: <span className="text-white font-bold">{coachingMoment.stickSpeed.exitTimeSec}s</span></span>
                                <span className="text-slate-300">Cycle: <span className="text-white font-bold">{coachingMoment.stickSpeed.totalCycleSec}s</span></span>
                                <span className="font-semibold" style={{ color: coachingMoment.stickSpeed.speedRating === 'Fast' ? '#00ff88' : '#f59e0b' }}>{coachingMoment.stickSpeed.speedRating}</span>
                                {coachingMoment.stickSpeed.fastEnoughToScore
                                  ? <span className="text-green-400 text-[10px]">✓ Fast enough to score</span>
                                  : <span className="text-red-400 text-[10px]">✗ Too slow — increase wrist speed</span>}
                              </div>
                            </div>
                          )}

                          {/* Skill Recommendations (≥80% only) */}
                          {coachingMoment.skillRecommendations?.length > 0 && (
                            <div className="space-y-2">
                              <span className="text-orion-blue text-xs font-bold">SKILL RECOMMENDATIONS</span>
                              {coachingMoment.skillRecommendations
                                .filter((s: any) => s.confidence >= 80)
                                .map((s: any, i: number) => (
                                  <div key={i} className="flex items-start gap-2 rounded-xl p-2.5 bg-orion-blue/5 border border-orion-blue/20">
                                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-orion-blue/20 text-orion-blue flex-shrink-0">{s.confidence}%</span>
                                    <div>
                                      <p className="text-white text-xs font-semibold">{s.skill}</p>
                                      <p className="text-slate-400 text-[10px]">{s.reason}</p>
                                    </div>
                                  </div>
                                ))}
                            </div>
                          )}

                          {/* Positive notes */}
                          {coachingMoment.positiveNotes?.length > 0 && (
                            <div className="rounded-xl p-2.5 bg-green-400/5 border border-green-400/20">
                              {coachingMoment.positiveNotes.map((n: string, i: number) => (
                                <p key={i} className="text-green-400 text-xs">✓ {n}</p>
                              ))}
                            </div>
                          )}

                          {/* Timeline note */}
                          {coachingMoment.timelineNote && (
                            <p className="text-slate-500 text-[10px] italic">{coachingMoment.timelineNote}</p>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {/* ── Camera mode ── */}
          {mode === 'camera' && (
            <div className="space-y-3">
              {!cameraOn ? (
                <button onClick={() => startCamera()}
                  className="w-full py-5 rounded-2xl bg-orion-blue/10 border border-orion-blue/30 text-orion-blue font-bold text-base flex items-center justify-center gap-3 active:scale-95 transition-all">
                  <Camera size={22} /> Start Live Camera
                </button>
              ) : (
                <>
                  <div className="relative rounded-2xl overflow-hidden bg-black border border-orion-border" style={{ aspectRatio: '4/3' }}>
                    <video ref={cameraRef} autoPlay muted playsInline className="w-full h-full object-cover" />
                    <canvas ref={cameraCanvasRef} className="absolute inset-0 w-full h-full pointer-events-none" style={{ mixBlendMode: 'screen' }} />
                    {isRecording && (
                      <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-red-500/90 text-white text-[10px] font-bold px-2 py-1 rounded-full">
                        <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                        REC {formatDur(recordDuration)}
                      </div>
                    )}
                    <div className="absolute bottom-2 left-2 flex gap-2">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: `${P1_COLOR}20`, color: P1_COLOR, border: `1px solid ${P1_COLOR}50` }}>Red P1</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: `${P2_COLOR}20`, color: P2_COLOR, border: `1px solid ${P2_COLOR}50` }}>Blue P2</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <button onClick={flipCamera} className="py-2.5 rounded-xl bg-slate-700 border border-slate-600 text-slate-300 text-xs font-semibold flex items-center justify-center gap-1">
                      <FlipHorizontal size={14} /> Flip
                    </button>
                    <button onClick={isRecording ? stopRecording : startRecording}
                      className={`py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1 ${isRecording ? 'bg-red-500/20 border border-red-500/40 text-red-400' : 'bg-slate-700 border border-slate-600 text-slate-300'}`}>
                      {isRecording ? <><Square size={14} /> Stop</> : <><Circle size={14} /> Record</>}
                    </button>
                    <button onClick={stopCamera} className="py-2.5 rounded-xl bg-slate-700 border border-slate-600 text-slate-400 text-xs font-semibold">
                      Stop
                    </button>
                  </div>

                  {/* Live coaching card */}
                  {liveCameraCoach && (
                    <div className="rounded-2xl border border-[#ef4444]/50 bg-[#ef4444]/5 p-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-[#ef4444] animate-pulse" />
                        <span className="text-[#ef4444] text-xs font-bold uppercase tracking-wide">ORION — {liveCameraCoach.momentType}</span>
                      </div>
                      {liveCameraCoach.attack && <p className="text-orion-blue text-xs font-semibold">⚔ {liveCameraCoach.attack}</p>}
                      {liveCameraCoach.gap && <p className="text-slate-200 text-xs">🎯 {liveCameraCoach.gap}</p>}
                      {liveCameraCoach.echo && <p className="text-purple-300 text-xs">↩ {liveCameraCoach.echo}</p>}
                      {liveCameraCoach.trap && <p className="text-orange-300 text-xs">🎭 {liveCameraCoach.trap}</p>}
                      {liveCameraCoach.defence && <p className="text-green-300 text-xs">🛡 {liveCameraCoach.defence}</p>}
                      {liveCameraCoach.bavalai && <p className="text-yellow-300 text-xs">⚡ {liveCameraCoach.bavalai}</p>}
                      {liveCameraCoach.retreat && <p className="text-red-400 text-xs font-semibold">⚠ {liveCameraCoach.retreat}</p>}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </>
      )}

      {/* ─── TIMELINE TAB (coaching history) ─── */}
      {tab === 'records' && (
        <div className="space-y-3">
          {coachingHistory.length === 0 ? (
            <div className="rounded-2xl border border-slate-700 bg-slate-800/40 p-8 text-center">
              <p className="text-slate-400 text-sm">No coaching moments yet.</p>
              <p className="text-slate-500 text-xs mt-1">Play a match video — ORION will pause automatically when important moments occur.</p>
            </div>
          ) : (
            coachingHistory.map((entry, i) => (
              <button key={i} onClick={() => {
                if (videoRef.current) { videoRef.current.currentTime = entry.timeSec; videoRef.current.pause(); setIsPlaying(false) }
                setCoachingMoment(entry.moment); setIsPausedByOrion(true); setCurrentTime(entry.timeSec); setTab('analyze')
              }}
                className="w-full rounded-2xl border border-slate-700 bg-slate-800/40 p-3 text-left hover:border-[#ef4444]/40 hover:bg-[#ef4444]/5 transition-all">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-white text-xs font-bold">{entry.timeStr}</span>
                  <span className="text-[10px] text-slate-400">{entry.moment?.timelineNote || ''}</span>
                </div>
                <p className="text-slate-300 text-[11px] leading-snug line-clamp-2">{entry.moment?.pauseReason || 'Training moment'}</p>
                {entry.moment?.pointOpportunity && (
                  <span className="inline-block mt-1.5 text-[10px] px-2 py-0.5 rounded-full font-bold"
                    style={{ background: entry.moment.pointOpportunity.scoringPossibility === 'HIGH' ? '#00ff8820' : '#f59e0b20', color: entry.moment.pointOpportunity.scoringPossibility === 'HIGH' ? '#00ff88' : '#f59e0b' }}>
                    {entry.moment.pointOpportunity.scoringPossibility} — {entry.moment.pointOpportunity.bestAction}
                  </span>
                )}
              </button>
            ))
          )}
        </div>
      )}

      {/* ─── HIGHLIGHTS TAB ─── */}
      {tab === 'highlights' && (
        <div className="space-y-3">
          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
            {(['all', 'strike', 'defense', 'counter', 'acha'] as const).map(f => (
              <button key={f} onClick={() => setHlFilter(f)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${hlFilter === f ? 'bg-orion-blue text-white' : 'bg-slate-700 text-slate-400'}`}>
                {f === 'all' ? 'All' : CATEGORY_META[f].label}
              </button>
            ))}
          </div>
          {filteredHighlights.length === 0 ? (
            <div className="rounded-2xl border border-slate-700 bg-slate-800/40 p-8 text-center">
              <p className="text-slate-400 text-sm">No highlights saved yet.</p>
            </div>
          ) : (
            filteredHighlights.map(hl => (
              <div key={hl.id} className="rounded-2xl border border-slate-700 bg-slate-800/40 p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{CATEGORY_META[hl.category].icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-xs font-bold truncate">{hl.title}</p>
                    <p className="text-slate-400 text-[10px]">{hl.videoName} · {hl.videoTime}</p>
                  </div>
                  <button onClick={() => {
                    const updated = highlights.filter(h => h.id !== hl.id)
                    setHighlights(updated); saveHighlights(updated)
                  }} className="p-1.5 text-slate-500 hover:text-red-400 transition-all">
                    <Trash2 size={14} />
                  </button>
                </div>
                <HighlightPlayer hl={hl} />
                {hl.coachTip && <p className="text-yellow-300 text-[11px] leading-snug">{hl.coachTip}</p>}
              </div>
            ))
          )}
        </div>
      )}

      {/* ─── RECORDINGS TAB ─── */}
      {tab === 'recordings' && (
        <div className="space-y-3">
          {recordedVideos.length === 0 ? (
            <div className="rounded-2xl border border-slate-700 bg-slate-800/40 p-8 text-center">
              <p className="text-slate-400 text-sm">No recordings yet.</p>
              <p className="text-slate-500 text-xs mt-1">Use Live Camera mode to record sessions.</p>
            </div>
          ) : (
            recordedVideos.map((rv, i) => (
              <div key={i} className="rounded-2xl border border-slate-700 bg-slate-800/40 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-white text-xs font-semibold">{rv.name}</p>
                  <span className="text-slate-400 text-[10px]">{rv.time}</span>
                </div>
                <video src={rv.url} controls className="w-full rounded-xl" style={{ maxHeight: 200 }} />
                <a href={rv.url} download={rv.name}
                  className="flex items-center justify-center gap-1.5 w-full py-2 rounded-xl bg-slate-700 border border-slate-600 text-slate-300 text-xs font-semibold">
                  <Download size={13} /> Download
                </a>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
