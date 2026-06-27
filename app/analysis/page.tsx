'use client'
import { useRef, useState, useCallback, useEffect } from 'react'
import AppShell from '@/components/layout/AppShell'
import CoachPauseCard from '@/components/training/CoachPauseCard'
import CombatSummary from '@/components/training/CombatSummary'
import CombatFocusSelector from '@/components/training/CombatFocusSelector'
import SkillSuggestionCard from '@/components/training/SkillSuggestionCard'
import {
  Play, Pause, Upload, Camera, CameraOff, RotateCcw, ChevronRight, ChevronLeft,
  Scan, AlertTriangle, FlipHorizontal, Zap,
} from 'lucide-react'
import {
  autoSelectPlayers, buildLockedPlayers, findClosestPersonToClick,
  LockedPlayer, CombatZone,
} from '@/lib/combat/playerLock'
import { getSkillsForMistakes } from '@/lib/combat/skillLibrary'

// ─── Detection imports ──────────────────────────────────────────────────────
import { detectGap } from '@/lib/combat/gapDetector'
import { detectEchoCounter } from '@/lib/combat/echoDetector'
import { detectTrapOpportunity } from '@/lib/combat/trapDetector'
import { detectActiveBasalaiDefence } from '@/lib/combat/basalaiDefence'
import { detectEmergencyBlock } from '@/lib/combat/emergencyBlock'
import { detectRetreat } from '@/lib/combat/retreatDetector'
import { detectSlide } from '@/lib/combat/slideDetector'
import { detectZip } from '@/lib/combat/zipDetector'

const COACH_COLORS: Record<string, string> = { P1: '#ef4444', P2: '#3b82f6' }
const SKEL_PAIRS = [[11,13],[13,15],[12,14],[14,16],[11,12],[23,24],[11,23],[12,24],[23,25],[25,27],[24,26],[26,28]]

type CombatMoment = {
  id: string; timestamp: number; timeStr: string; player: string;
  type: 'mistake' | 'counter' | 'scoring_chance' | 'good_action'; moment: any
}

function fmtTime(s: number) {
  const m = Math.floor(s / 60); const sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}

export default function AnalysisPage() {
  // ─── Media state ───────────────────────────────────────────────────────────
  const [mode, setMode] = useState<'video' | 'camera'>('video')
  const [videoSrc, setVideoSrc] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [playbackRate, setPlaybackRate] = useState(1)
  const [isDragOver, setIsDragOver] = useState(false)
  const [cameraOn, setCameraOn] = useState(false)
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment')
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null)

  // ─── Player lock / zone state ──────────────────────────────────────────────
  const [lockedPlayers, setLockedPlayers] = useState<LockedPlayer[]>([])
  const [playersLocked, setPlayersLocked] = useState(false)
  const [selectingPlayer, setSelectingPlayer] = useState<'P1' | 'P2' | null>(null)
  const [combatZone, setCombatZone] = useState<CombatZone>({ x: 0, y: 0, w: 1, h: 1, active: false })
  const [settingZone, setSettingZone] = useState(false)

  // ─── Coach / pause state ───────────────────────────────────────────────────
  const [isPausedByOrion, setIsPausedByOrion] = useState(false)
  const [coachMoment, setCoachMoment] = useState<any>(null)
  const [loadingCoach, setLoadingCoach] = useState(false)
  const [replayTime, setReplayTime] = useState<number | null>(null)

  // ─── Summary / tabs ────────────────────────────────────────────────────────
  const [moments, setMoments] = useState<CombatMoment[]>([])
  const [tab, setTab] = useState<'coach' | 'mistakes' | 'counters' | 'skills'>('coach')
  const [scanning, setScanning] = useState(false)
  const [scanProgress, setScanProgress] = useState(0)

  // ─── Live camera alert ─────────────────────────────────────────────────────
  const [liveCameraAlert, setLiveCameraAlert] = useState<any>(null)

  // ─── Refs ──────────────────────────────────────────────────────────────────
  const videoRef = useRef<HTMLVideoElement>(null)
  const cameraRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const camCanvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const camIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const p1IndexRef = useRef<number>(0)
  const p2IndexRef = useRef<number>(1)
  const latestLandmarksRef = useRef<any[][]>([])
  const prevDefLmRef = useRef<any[][]>([])
  const wristHistRef = useRef<{ lx: number[]; ly: number[]; rx: number[]; ry: number[] }>({ lx: [], ly: [], rx: [], ry: [] })
  const tipHRef = useRef<{ x: number; y: number }[]>([])
  const hookHRef = useRef<{ x: number; y: number }[]>([])
  const usiHRef = useRef<{ x: number; y: number }[]>([])
  const sweepHRef = useRef<{ x: number; y: number }[]>([])
  const bavHRef = useRef<{ x: number; y: number }[]>([])
  const trapHRef = useRef<{ x: number; y: number }[]>([])
  const slideHRef = useRef<{ x: number; y: number }[]>([])
  const zipHRef = useRef<{ x: number; y: number }[]>([])
  const prevLmRef = useRef<any[]>([])
  const lastPauseRef = useRef<number>(0)
  const zoneDragRef = useRef<{ startX: number; startY: number } | null>(null)
  const poseLandmarkerRef = useRef<any>(null)

  // ─── Load MediaPipe ────────────────────────────────────────────────────────
  useEffect(() => {
    let active = true
    async function load() {
      try {
        const vision = await import('@mediapipe/tasks-vision')
        const { PoseLandmarker, FilesetResolver } = vision
        const filesetResolver = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm'
        )
        const pl = await PoseLandmarker.createFromOptions(filesetResolver, {
          baseOptions: { modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task', delegate: 'GPU' },
          runningMode: 'VIDEO', numPoses: 4,
        })
        if (active) poseLandmarkerRef.current = pl
      } catch (e) { console.error('MediaPipe load error', e) }
    }
    load()
    return () => { active = false }
  }, [])

  // ─── Draw helpers ──────────────────────────────────────────────────────────
  function drawSkeleton(ctx: CanvasRenderingContext2D, lm: any[], color: string, w: number, h: number) {
    ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.globalAlpha = 0.85
    for (const [a, b] of SKEL_PAIRS) {
      if (!lm[a] || !lm[b] || lm[a].visibility < 0.4 || lm[b].visibility < 0.4) continue
      ctx.beginPath(); ctx.moveTo(lm[a].x * w, lm[a].y * h); ctx.lineTo(lm[b].x * w, lm[b].y * h); ctx.stroke()
    }
    ctx.fillStyle = color
    for (const lp of lm) {
      if (!lp || lp.visibility < 0.4) continue
      ctx.beginPath(); ctx.arc(lp.x * w, lp.y * h, 3, 0, Math.PI * 2); ctx.fill()
    }
    ctx.globalAlpha = 1
  }

  function drawCombatZone(ctx: CanvasRenderingContext2D, zone: CombatZone, w: number, h: number) {
    if (!zone.active) return
    ctx.strokeStyle = '#00d4ff'; ctx.lineWidth = 1.5; ctx.setLineDash([6, 3])
    ctx.strokeRect(zone.x * w, zone.y * h, zone.w * w, zone.h * h)
    ctx.setLineDash([]); ctx.fillStyle = '#00d4ff08'
    ctx.fillRect(zone.x * w, zone.y * h, zone.w * w, zone.h * h)
  }

  // ─── Pose detection + draw ─────────────────────────────────────────────────
  const drawFrame = useCallback(() => {
    const video = videoRef.current; const canvas = canvasRef.current
    if (!video || !canvas) return
    const ctx = canvas.getContext('2d'); if (!ctx) return
    const w = canvas.width = video.videoWidth || canvas.offsetWidth
    const h = canvas.height = video.videoHeight || canvas.offsetHeight
    ctx.clearRect(0, 0, w, h)

    if (!poseLandmarkerRef.current || video.readyState < 2) return
    try {
      const result = poseLandmarkerRef.current.detectForVideo(video, performance.now())
      const allLm: any[][] = result.landmarks || []
      latestLandmarksRef.current = allLm

      const p1Lm = allLm[p1IndexRef.current]
      const p2Lm = allLm[p2IndexRef.current]
      if (p1Lm) drawSkeleton(ctx, p1Lm, COACH_COLORS.P1, w, h)
      if (p2Lm) drawSkeleton(ctx, p2Lm, COACH_COLORS.P2, w, h)
      drawCombatZone(ctx, combatZone, w, h)

      if (playersLocked) {
        const updated = buildLockedPlayers(allLm, p1IndexRef.current, p2IndexRef.current)
        setLockedPlayers(updated)
      }
    } catch (e) { /* frame skip */ }
  }, [combatZone, playersLocked])

  // ─── Analyse frame (auto-pause logic) ────────────────────────────────────
  const analyseFrame = useCallback(async () => {
    const video = videoRef.current; if (!video || video.paused || video.ended) return
    const allLm = latestLandmarksRef.current
    if (!allLm.length) return

    const p1Lm = allLm[p1IndexRef.current] || []
    const p2Lm = allLm[p2IndexRef.current] || []
    const combined = [...p1Lm, ...p2Lm]
    if (!combined.length) return

    const now = video.currentTime
    const sinceLastPause = now - lastPauseRef.current

    // Run all detections
    const gapSt = detectGap(combined, prevLmRef.current)
    const echoSt = detectEchoCounter(p1Lm, p2Lm)
    const trapOpp = detectTrapOpportunity(p1Lm, p2Lm)
    const bavalaiSt = detectActiveBasalaiDefence(p1Lm, p2Lm, prevDefLmRef.current)
    const emergSt = detectEmergencyBlock(p1Lm, p2Lm)
    const retreatSt = detectRetreat(p1Lm, p2Lm, prevLmRef.current)
    const slideSt = detectSlide(p1Lm, p2Lm)
    const zipSt = detectZip(p1Lm, p2Lm)

    prevLmRef.current = combined
    prevDefLmRef.current = [p1Lm, p2Lm]

    const anyDetection =
      (gapSt && gapSt.gapType !== 'NONE') ||
      (echoSt && echoSt.echoDetected) ||
      (trapOpp && trapOpp.trapAvailable) ||
      (bavalaiSt && bavalaiSt.defenceActive) ||
      (emergSt && emergSt.blockDetected) ||
      (retreatSt && retreatSt.retreatDetected) ||
      (slideSt && (slideSt as any).slideAvailable) ||
      (zipSt && (zipSt as any).zipAvailable)

    if (anyDetection && sinceLastPause >= 4) {
      lastPauseRef.current = now
      video.pause()
      setIsPlaying(false)
      setIsPausedByOrion(true)
      setLoadingCoach(true)
      setCoachMoment(null)

      const body = {
        timestamp: fmtTime(now),
        player: 'Both',
        detectedTechniques: [
          gapSt?.gapType !== 'NONE' ? `Gap:${gapSt?.gapType}` : null,
          echoSt?.echoDetected ? `Echo:${echoSt?.echoDirection}` : null,
          trapOpp?.trapAvailable ? 'Trap' : null,
          bavalaiSt?.defenceActive ? 'Bavalai' : null,
          emergSt?.blockDetected ? 'EmergencyBlock' : null,
          retreatSt?.retreatDetected ? `Retreat:${retreatSt?.result}` : null,
          (slideSt as any)?.slideAvailable ? 'Slide' : null,
          (zipSt as any)?.zipAvailable ? 'Zip' : null,
        ].filter(Boolean).join(', '),
        gapType: gapSt?.gapType,
        gapStickPos: gapSt?.opponentStickPosition,
        gapBestTech: gapSt?.bestRecommendation?.technique,
        echoDetected: echoSt?.echoDetected,
        echoDirection: echoSt?.echoDirection,
        trapAvailable: trapOpp?.trapAvailable,
        trapFakeTarget: trapOpp?.suggestedFakeTarget,
        trapRealTarget: trapOpp?.suggestedRealTarget,
        defenceThreat: bavalaiSt?.defenceActive,
        defenceType: bavalaiSt?.defenceType,
        bavalaiQuality: null,
        bavalaiOpportunity: bavalaiSt?.bestOpportunity?.technique,
        retreatResult: retreatSt?.result,
        slideAvailable: (slideSt as any)?.slideAvailable,
        zipAvailable: (zipSt as any)?.zipAvailable,
        uStrikeAvailable: false,
        hookAvailable: false,
        usiAvailable: false,
        sweepAvailable: false,
        wristSpeed: null,
      }

      try {
        const res = await fetch('/api/combat-moment', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
        const data = await res.json()
        setCoachMoment(data)
        const momentType: CombatMoment['type'] = data.mistake ? 'mistake' : data.bestCounter ? 'counter' : data.positiveNote ? 'good_action' : 'scoring_chance'
        setMoments(prev => [{
          id: `${now}-${Math.random()}`, timestamp: now, timeStr: fmtTime(now),
          player: data.player || 'Both', type: momentType, moment: data,
        }, ...prev])
      } catch (e) {
        setCoachMoment(null)
      } finally {
        setLoadingCoach(false)
      }
    }
  }, [])

  // ─── Playback interval ─────────────────────────────────────────────────────
  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    if (!isPlaying) return
    intervalRef.current = setInterval(() => { drawFrame(); analyseFrame() }, 150)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [isPlaying, drawFrame, analyseFrame])

  // ─── Video time update ─────────────────────────────────────────────────────
  useEffect(() => {
    const v = videoRef.current; if (!v) return
    const onTime = () => setCurrentTime(v.currentTime)
    const onMeta = () => setDuration(v.duration)
    const onEnded = () => { setIsPlaying(false); setIsPausedByOrion(false) }
    v.addEventListener('timeupdate', onTime)
    v.addEventListener('loadedmetadata', onMeta)
    v.addEventListener('ended', onEnded)
    return () => { v.removeEventListener('timeupdate', onTime); v.removeEventListener('loadedmetadata', onMeta); v.removeEventListener('ended', onEnded) }
  }, [videoSrc])

  // ─── Camera ────────────────────────────────────────────────────────────────
  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode } })
      setCameraStream(stream)
      if (cameraRef.current) { cameraRef.current.srcObject = stream; cameraRef.current.play() }
      setCameraOn(true)
    } catch (e) { console.error('Camera error', e) }
  }, [facingMode])

  const stopCamera = useCallback(() => {
    cameraStream?.getTracks().forEach(t => t.stop())
    setCameraStream(null); setCameraOn(false)
    if (camIntervalRef.current) clearInterval(camIntervalRef.current)
  }, [cameraStream])

  // ─── Player lock handlers ─────────────────────────────────────────────────
  const handleAutoLock = useCallback(() => {
    const allLm = latestLandmarksRef.current
    if (!allLm.length) return
    const { p1Idx, p2Idx } = autoSelectPlayers(allLm, combatZone)
    p1IndexRef.current = p1Idx; p2IndexRef.current = p2Idx
    const locked = buildLockedPlayers(allLm, p1Idx, p2Idx)
    setLockedPlayers(locked); setPlayersLocked(true)
  }, [combatZone])

  const handleVideoClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!selectingPlayer) return
    const canvas = canvasRef.current; if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const nx = (e.clientX - rect.left) / rect.width
    const ny = (e.clientY - rect.top) / rect.height
    const allLm = latestLandmarksRef.current
    const idx = findClosestPersonToClick(allLm, nx, ny)
    if (selectingPlayer === 'P1') p1IndexRef.current = idx
    else p2IndexRef.current = idx
    const locked = buildLockedPlayers(allLm, p1IndexRef.current, p2IndexRef.current)
    setLockedPlayers(locked); setPlayersLocked(true); setSelectingPlayer(null)
  }, [selectingPlayer])

  // ─── Zone drag ────────────────────────────────────────────────────────────
  const handleZoneDragStart = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!settingZone) return
    const canvas = canvasRef.current; if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    zoneDragRef.current = { startX: (e.clientX - rect.left) / rect.width, startY: (e.clientY - rect.top) / rect.height }
  }, [settingZone])

  const handleZoneDragEnd = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!settingZone || !zoneDragRef.current) return
    const canvas = canvasRef.current; if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const ex = (e.clientX - rect.left) / rect.width
    const ey = (e.clientY - rect.top) / rect.height
    const { startX, startY } = zoneDragRef.current
    setCombatZone({
      x: Math.min(startX, ex), y: Math.min(startY, ey),
      w: Math.abs(ex - startX), h: Math.abs(ey - startY), active: true,
    })
    setSettingZone(false); zoneDragRef.current = null
  }, [settingZone])

  // ─── File upload ───────────────────────────────────────────────────────────
  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith('video/')) return
    const url = URL.createObjectURL(file)
    setVideoSrc(url); setIsPlaying(false); setIsPausedByOrion(false); setCoachMoment(null)
    setMoments([]); lastPauseRef.current = 0
  }, [])

  // ─── Toggle play ───────────────────────────────────────────────────────────
  const togglePlay = useCallback(() => {
    const v = videoRef.current; if (!v) return
    if (v.paused) { v.play(); setIsPlaying(true); setIsPausedByOrion(false) }
    else { v.pause(); setIsPlaying(false) }
  }, [])

  const handleContinue = useCallback(() => {
    const v = videoRef.current; if (!v) return
    setIsPausedByOrion(false)
    v.play(); setIsPlaying(true)
  }, [])

  const handleReplay = useCallback(() => {
    const v = videoRef.current; if (!v || replayTime === null) return
    v.currentTime = replayTime - 3; v.play(); setIsPlaying(true); setIsPausedByOrion(false)
  }, [replayTime])

  const handleSlowMotion = useCallback(() => {
    const v = videoRef.current; if (!v) return
    v.playbackRate = 0.25; setPlaybackRate(0.25)
    v.play(); setIsPlaying(true); setIsPausedByOrion(false)
  }, [])

  const setSpeed = useCallback((rate: number) => {
    const v = videoRef.current; if (!v) return
    v.playbackRate = rate; setPlaybackRate(rate)
  }, [])

  const stepFrame = useCallback((dir: number) => {
    const v = videoRef.current; if (!v) return
    v.currentTime = Math.max(0, Math.min(duration, v.currentTime + dir * (1 / 30)))
    drawFrame()
  }, [duration, drawFrame])

  const jumpTo = useCallback((t: number) => {
    const v = videoRef.current; if (!v) return
    v.currentTime = t; setCurrentTime(t); drawFrame()
  }, [drawFrame])

  // ─── Full match scan ───────────────────────────────────────────────────────
  const scanFullMatch = useCallback(async () => {
    const v = videoRef.current; if (!v || !duration) return
    setScanning(true); setScanProgress(0); setMoments([])
    const step = 3; const total = Math.floor(duration / step); let collected: CombatMoment[] = []
    for (let i = 0; i < total; i++) {
      const t = i * step; v.currentTime = t
      await new Promise(r => setTimeout(r, 200))
      drawFrame()
      const allLm = latestLandmarksRef.current
      const p1Lm = allLm[p1IndexRef.current] || []; const p2Lm = allLm[p2IndexRef.current] || []
      const combined = [...p1Lm, ...p2Lm]
      const gapSt = detectGap(combined, prevLmRef.current)
      const anyD = gapSt?.gapType !== 'NONE'
      if (anyD) {
        const res = await fetch('/api/combat-moment', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ timestamp: fmtTime(t), player: 'Both', gapType: gapSt?.gapType }) })
        const data = await res.json()
        const momentType: CombatMoment['type'] = data.mistake ? 'mistake' : data.bestCounter ? 'counter' : data.positiveNote ? 'good_action' : 'scoring_chance'
        collected.push({ id: `scan-${t}`, timestamp: t, timeStr: fmtTime(t), player: data.player || 'Both', type: momentType, moment: data })
      }
      prevLmRef.current = combined
      setScanProgress(Math.round(((i + 1) / total) * 100))
    }
    setMoments(collected); setScanning(false); setTab('mistakes')
  }, [duration, drawFrame])

  // ─── Skill suggestions from moments ───────────────────────────────────────
  const suggestedSkills = getSkillsForMistakes(
    moments.flatMap(m => m.moment?.mistakeCodes || [])
  )

  const mistakeMoments = moments.filter(m => m.type === 'mistake')
  const counterMoments = moments.filter(m => m.type === 'counter')

  const p1Label = lockedPlayers.find(p => p.id === 'P1')?.label || 'Red P1'
  const p2Label = lockedPlayers.find(p => p.id === 'P2')?.label || 'Blue P2'

  return (
    <AppShell>
      <div className="p-3 md:p-5 max-w-2xl mx-auto w-full pb-28 space-y-3">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-black text-white tracking-tight">ORION ANALYSIS</h1>
            <p className="text-slate-500 text-[11px]">Silambam combat coach AI</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => { setMode('video'); stopCamera() }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${mode === 'video' ? 'bg-orion-blue/20 text-orion-blue border border-orion-blue/40' : 'bg-slate-800 text-slate-400 border border-slate-700'}`}>
              Video
            </button>
            <button onClick={() => { setMode('camera'); startCamera() }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${mode === 'camera' ? 'bg-orion-blue/20 text-orion-blue border border-orion-blue/40' : 'bg-slate-800 text-slate-400 border border-slate-700'}`}>
              Camera
            </button>
          </div>
        </div>

        {/* ─── VIDEO MODE ─────────────────────────────────────────────── */}
        {mode === 'video' && (
          <>
            {/* Upload area */}
            {!videoSrc && (
              <div
                className={`relative rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-3 transition-all cursor-pointer ${isDragOver ? 'border-orion-blue bg-orion-blue/10' : 'border-slate-700 bg-slate-900/40'}`}
                style={{ minHeight: '45vh' }}
                onDragOver={e => { e.preventDefault(); setIsDragOver(true) }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={e => { e.preventDefault(); setIsDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload size={32} className="text-slate-600" />
                <div className="text-center">
                  <p className="text-slate-300 text-sm font-semibold">Drop video here</p>
                  <p className="text-slate-500 text-xs mt-1">or tap to browse</p>
                </div>
                <input ref={fileInputRef} type="file" accept="video/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
              </div>
            )}

            {/* Video player */}
            {videoSrc && (
              <div className="relative rounded-2xl overflow-hidden bg-black" style={{ minHeight: '45vh' }}>
                <video ref={videoRef} src={videoSrc} className="w-full h-full object-contain" style={{ minHeight: '45vh' }} playsInline onPlay={() => setIsPlaying(true)} onPause={() => setIsPlaying(false)} />
                <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" style={{ mixBlendMode: 'screen' }} />

                {/* Interaction overlay for tap-to-select + zone drag */}
                <canvas
                  className="absolute inset-0 w-full h-full"
                  style={{ opacity: 0, cursor: selectingPlayer ? 'crosshair' : settingZone ? 'crosshair' : 'default' }}
                  onClick={handleVideoClick}
                  onMouseDown={handleZoneDragStart}
                  onMouseUp={handleZoneDragEnd}
                />

                {/* ORION PAUSED overlay */}
                {isPausedByOrion && (
                  <div className="absolute top-3 left-3 right-3 flex items-center gap-2 bg-black/70 rounded-xl px-3 py-2">
                    <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                    <span className="text-red-400 text-xs font-black tracking-widest">⏸ ORION PAUSED</span>
                  </div>
                )}

                {/* Selecting player hint */}
                {selectingPlayer && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="bg-black/80 rounded-2xl px-4 py-3 text-center">
                      <p className="text-yellow-400 text-sm font-bold animate-pulse">Tap on {selectingPlayer === 'P1' ? 'Red P1' : 'Blue P2'} player</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Controls */}
            {videoSrc && (
              <div className="space-y-2">
                {/* Progress bar */}
                <div className="flex items-center gap-2">
                  <span className="text-slate-500 text-[10px] tabular-nums w-10">{fmtTime(currentTime)}</span>
                  <input type="range" className="flex-1 h-1 accent-orion-blue" min={0} max={duration || 100} step={0.1} value={currentTime}
                    onChange={e => { const t = parseFloat(e.target.value); if (videoRef.current) videoRef.current.currentTime = t; setCurrentTime(t) }} />
                  <span className="text-slate-500 text-[10px] tabular-nums w-10 text-right">{fmtTime(duration)}</span>
                </div>

                {/* Play controls */}
                <div className="flex items-center gap-2">
                  <button onClick={() => stepFrame(-1)} className="p-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 active:scale-95 transition-all"><ChevronLeft size={14} /></button>
                  <button onClick={togglePlay} className="flex-1 py-2.5 rounded-xl bg-orion-blue/20 border border-orion-blue/40 text-orion-blue font-bold text-sm flex items-center justify-center gap-2 active:scale-95 transition-all">
                    {isPlaying ? <Pause size={16} /> : <Play size={16} />}
                    {isPlaying ? 'Pause' : 'Play'}
                  </button>
                  <button onClick={() => stepFrame(1)} className="p-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 active:scale-95 transition-all"><ChevronRight size={14} /></button>
                </div>

                {/* Speed + Scan */}
                <div className="flex gap-2">
                  {[0.25, 0.5, 1].map(r => (
                    <button key={r} onClick={() => setSpeed(r)}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${playbackRate === r ? 'bg-orion-blue/20 border border-orion-blue/40 text-orion-blue' : 'bg-slate-800 border border-slate-700 text-slate-400'}`}>
                      {r === 0.25 ? '¼×' : r === 0.5 ? '½×' : '1×'}
                    </button>
                  ))}
                  <button onClick={scanFullMatch} disabled={scanning}
                    className="flex-1 py-1.5 rounded-lg text-xs font-semibold bg-purple-500/15 border border-purple-500/30 text-purple-400 flex items-center justify-center gap-1 active:scale-95 transition-all disabled:opacity-50">
                    <Scan size={12} /> {scanning ? `${scanProgress}%` : 'Full Scan'}
                  </button>
                </div>

                {/* Change video */}
                <button onClick={() => { setVideoSrc(null); setMoments([]); setCoachMoment(null); setIsPausedByOrion(false) }}
                  className="w-full py-2 rounded-xl text-xs text-slate-500 border border-slate-800 hover:border-slate-700 transition-all">
                  ↑ Upload different video
                </button>
              </div>
            )}
          </>
        )}

        {/* ─── CAMERA MODE ────────────────────────────────────────────── */}
        {mode === 'camera' && (
          <div className="space-y-3">
            <div className="relative rounded-2xl overflow-hidden bg-black" style={{ minHeight: '45vh' }}>
              <video ref={cameraRef} autoPlay playsInline muted className="w-full h-full object-cover" style={{ minHeight: '45vh' }} />
              <canvas ref={camCanvasRef} className="absolute inset-0 w-full h-full pointer-events-none" style={{ mixBlendMode: 'screen' }} />
              {!cameraOn && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <button onClick={startCamera} className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-orion-blue/20 border border-orion-blue/40 text-orion-blue font-bold">
                    <Camera size={18} /> Start Camera
                  </button>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              {cameraOn && (
                <>
                  <button onClick={stopCamera} className="flex-1 py-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-semibold flex items-center justify-center gap-1.5">
                    <CameraOff size={13} /> Stop
                  </button>
                  <button onClick={() => { setFacingMode(f => f === 'user' ? 'environment' : 'user'); stopCamera(); setTimeout(startCamera, 300) }}
                    className="flex-1 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 text-xs font-semibold flex items-center justify-center gap-1.5">
                    <FlipHorizontal size={13} /> Flip
                  </button>
                </>
              )}
            </div>
            {liveCameraAlert && (
              <div className="rounded-2xl border border-orion-blue/30 bg-orion-blue/5 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Zap size={13} className="text-orion-blue" />
                  <span className="text-orion-blue text-xs font-black">LIVE ALERT</span>
                </div>
                <p className="text-white text-sm">{liveCameraAlert.action}</p>
                {liveCameraAlert.correction && <p className="text-yellow-300 text-xs mt-1">→ {liveCameraAlert.correction}</p>}
              </div>
            )}
          </div>
        )}

        {/* ─── COMBAT FOCUS SELECTOR ──────────────────────────────────── */}
        <CombatFocusSelector
          locked={playersLocked}
          players={lockedPlayers}
          combatZone={combatZone}
          selectingPlayer={selectingPlayer}
          settingZone={settingZone}
          onAutoLock={handleAutoLock}
          onSelectPlayer={id => setSelectingPlayer(id)}
          onCancelSelect={() => setSelectingPlayer(null)}
          onSetZone={() => setSettingZone(true)}
          onResetZone={() => { setCombatZone({ x: 0, y: 0, w: 1, h: 1, active: false }); setSettingZone(false) }}
        />

        {/* ─── COACH PAUSE CARD ────────────────────────────────────────── */}
        {isPausedByOrion && (
          <CoachPauseCard
            moment={coachMoment}
            timestamp={fmtTime(currentTime)}
            loading={loadingCoach}
            onReplay={handleReplay}
            onSlowMotion={handleSlowMotion}
            onContinue={handleContinue}
          />
        )}

        {/* ─── TABS ────────────────────────────────────────────────────── */}
        <div className="flex gap-1 rounded-xl bg-slate-900 border border-slate-800 p-1">
          {(['coach', 'mistakes', 'counters', 'skills'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex-1 py-1.5 rounded-lg text-[11px] font-semibold capitalize transition-all ${tab === t ? 'bg-slate-700 text-white' : 'text-slate-500 hover:text-slate-300'}`}>
              {t === 'coach' ? 'Coach Notes' : t === 'mistakes' ? `Mistakes${mistakeMoments.length ? ` (${mistakeMoments.length})` : ''}` : t === 'counters' ? `Counters${counterMoments.length ? ` (${counterMoments.length})` : ''}` : 'Skills'}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {tab === 'coach' && (
          <div>
            {moments.length === 0 ? (
              <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-8 text-center">
                <AlertTriangle size={24} className="text-slate-600 mx-auto mb-2" />
                <p className="text-slate-400 text-sm font-semibold">No coach notes yet</p>
                <p className="text-slate-500 text-xs mt-1">Play a video — ORION will auto-pause on key moments.</p>
              </div>
            ) : (
              <CombatSummary moments={moments} p1Label={p1Label} p2Label={p2Label} onJump={jumpTo} />
            )}
          </div>
        )}

        {tab === 'mistakes' && (
          <div className="space-y-2">
            {mistakeMoments.length === 0 ? (
              <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-8 text-center">
                <p className="text-slate-400 text-sm">No mistakes recorded yet.</p>
              </div>
            ) : (
              <CombatSummary moments={mistakeMoments} p1Label={p1Label} p2Label={p2Label} onJump={jumpTo} />
            )}
          </div>
        )}

        {tab === 'counters' && (
          <div className="space-y-2">
            {counterMoments.length === 0 ? (
              <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-8 text-center">
                <p className="text-slate-400 text-sm">No counters recorded yet.</p>
              </div>
            ) : (
              <CombatSummary moments={counterMoments} p1Label={p1Label} p2Label={p2Label} onJump={jumpTo} />
            )}
          </div>
        )}

        {tab === 'skills' && (
          <div className="space-y-2">
            {suggestedSkills.length === 0 ? (
              <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-8 text-center">
                <p className="text-slate-400 text-sm">Skills suggested based on detected mistakes.</p>
                <p className="text-slate-500 text-xs mt-1">Analyse more moments to get personalised skill tips.</p>
              </div>
            ) : (
              suggestedSkills.map(sk => <SkillSuggestionCard key={sk.id} skill={sk} />)
            )}
          </div>
        )}

      </div>
    </AppShell>
  )
}
