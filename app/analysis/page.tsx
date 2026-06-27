'use client'
import { useRef, useState, useCallback, useEffect } from 'react'
import AppShell from '@/components/layout/AppShell'
import CoachPauseCard from '@/components/analysis/CoachPauseCard'
import CombatSummary from '@/components/analysis/CombatSummary'
import TrackingStatusBadge from '@/components/analysis/TrackingStatusBadge'
import CombatVideoPlayer from '@/components/analysis/CombatVideoPlayer'
import { SKILL_LIBRARY, getSkillsForMistakes } from '@/lib/combat/skillLibrary'
import SkillSuggestionCard from '@/components/training/SkillSuggestionCard'
import {
  autoFocusPlayers, findClosestToClick,
  TrackingMode,
} from '@/lib/orion/playerFocus'
import { fetchCoachMoment, SimpleCoachMoment } from '@/lib/orion/coachMomentBuilder'
import { quickScan, ScanMoment } from '@/lib/orion/quickScan'
import { runCombatAnalysis } from '@/lib/orion/runCombatAnalysis'
import {
  Play, Pause, Upload, ChevronLeft, ChevronRight, Scan,
} from 'lucide-react'
import { SavedCombatMoment } from '@/lib/orion/memoryLibrary'

const SKEL_PAIRS = [[11,13],[13,15],[12,14],[14,16],[11,12],[23,24],[11,23],[12,24],[23,25],[25,27],[24,26],[26,28]]

function fmtTime(s: number) {
  const m = Math.floor(s / 60)
  return `${m}:${Math.floor(s % 60).toString().padStart(2, '0')}`
}

type Tab = 'coach' | 'mistakes' | 'counters' | 'skills'

export default function AnalysisPage() {
  // ── Media ──────────────────────────────────────────────────────────────────
  const [videoSrc, setVideoSrc] = useState<string | null>(null)
  const [videoName, setVideoName] = useState('Combat Video')
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [playbackRate, setPlaybackRate] = useState(1)
  const [isDragOver, setIsDragOver] = useState(false)

  // ── Player lock ────────────────────────────────────────────────────────────
  const [playersLocked, setPlayersLocked] = useState(false)
  const [trackingMode, setTrackingMode] = useState<TrackingMode>('pose')
  const [trackingConfident, setTrackingConfident] = useState(false)
  const [selectingPlayer, setSelectingPlayer] = useState<'P1' | 'P2' | null>(null)
  const [combatZone] = useState({ x: 0, y: 0, w: 1, h: 1, active: false })
  const [settingZone] = useState(false)

  // ── Coach / pause ──────────────────────────────────────────────────────────
  const [isPausedByOrion, setIsPausedByOrion] = useState(false)
  const [coachMoment, setCoachMoment] = useState<SimpleCoachMoment | null>(null)
  const [loadingCoach, setLoadingCoach] = useState(false)
  const [analysisTimedOut, setAnalysisTimedOut] = useState(false)
  const [replayTimestamp, setReplayTimestamp] = useState(0)

  // ── Summary / tabs ─────────────────────────────────────────────────────────
  const [moments, setMoments] = useState<ScanMoment[]>([])
  const [tab, setTab] = useState<Tab>('coach')
  const [scanning, setScanning] = useState(false)
  const [scanProgress, setScanProgress] = useState(0)

  // ── Refs ───────────────────────────────────────────────────────────────────
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const p1IndexRef = useRef(0)
  const p2IndexRef = useRef(1)
  const latestLandmarksRef = useRef<any[][]>([])
  const prevLmRef = useRef<any[]>([])
  const prevDefLmRef = useRef<any[][]>([])
  const lastPauseRef = useRef(0)
  const poseLandmarkerRef = useRef<any>(null)
  const zoneDragRef = useRef<{ startX: number; startY: number } | null>(null)

  // ── Load MediaPipe ─────────────────────────────────────────────────────────
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
          baseOptions: {
            modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
            delegate: 'GPU',
          },
          runningMode: 'VIDEO',
          numPoses: 4,
        })
        if (active) poseLandmarkerRef.current = pl
      } catch (e) {
        console.error('MediaPipe load error', e)
        setTrackingMode('movement')
      }
    }
    load()
    return () => { active = false }
  }, [])

  // ── Draw helpers ───────────────────────────────────────────────────────────
  const drawFrame = useCallback(() => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const w = canvas.width = video.videoWidth || canvas.offsetWidth
    const h = canvas.height = video.videoHeight || canvas.offsetHeight
    ctx.clearRect(0, 0, w, h)

    if (!poseLandmarkerRef.current || video.readyState < 2) return
    try {
      const result = poseLandmarkerRef.current.detectForVideo(video, performance.now())
      const allLm: any[][] = result.landmarks || []
      latestLandmarksRef.current = allLm

      // Auto-focus if not locked
      if (!playersLocked && allLm.length >= 2) {
        const focus = autoFocusPlayers(allLm, combatZone)
        p1IndexRef.current = focus.p1Index
        p2IndexRef.current = focus.p2Index
        setTrackingMode(focus.mode)
        setTrackingConfident(focus.confident)
      }

      const colors: Record<number, string> = {
        [p1IndexRef.current]: '#ef4444',
        [p2IndexRef.current]: '#3b82f6',
      }

      for (const [idxStr, color] of Object.entries(colors)) {
        const idx = Number(idxStr)
        const lm = allLm[idx]
        if (!lm) continue
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
    } catch { /* skip */ }
  }, [combatZone, playersLocked])

  // ── Analyse frame (auto-pause) ─────────────────────────────────────────────
  const analyseFrame = useCallback(async () => {
    const video = videoRef.current
    if (!video || video.paused || video.ended) return
    const allLm = latestLandmarksRef.current
    if (!allLm.length) return

    const p1Lm = allLm[p1IndexRef.current] || []
    const p2Lm = allLm[p2IndexRef.current] || []
    if (!p1Lm.length && !p2Lm.length) return

    const now = video.currentTime
    if (now - lastPauseRef.current < 4) return

    const result = runCombatAnalysis(p1Lm, p2Lm, prevLmRef.current, prevDefLmRef.current, fmtTime(now))
    prevLmRef.current = [...p1Lm, ...p2Lm]
    prevDefLmRef.current = [p1Lm, p2Lm]

    if (!result.anyDetection) return

    lastPauseRef.current = now
    setReplayTimestamp(now)
    video.pause()
    setIsPlaying(false)
    setIsPausedByOrion(true)
    setLoadingCoach(true)
    setCoachMoment(null)
    setAnalysisTimedOut(false)

    // 15s timeout
    timeoutRef.current = setTimeout(() => {
      setLoadingCoach(false)
      setAnalysisTimedOut(true)
    }, 15000)

    try {
      const moment = await fetchCoachMoment(result.payload)
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      setCoachMoment(moment)
      setMoments(prev => [{
        id: `${now}-${Math.random()}`,
        timestamp: now,
        timeStr: fmtTime(now),
        player: moment.player,
        type: moment.momentType,
        coach: moment,
      }, ...prev])
    } catch {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      setCoachMoment(null)
    } finally {
      setLoadingCoach(false)
    }
  }, [])

  // ── Interval ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    if (!isPlaying) return
    intervalRef.current = setInterval(() => { drawFrame(); analyseFrame() }, 150)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [isPlaying, drawFrame, analyseFrame])

  // ── Video events ───────────────────────────────────────────────────────────
  useEffect(() => {
    const v = videoRef.current; if (!v) return
    const onTime = () => setCurrentTime(v.currentTime)
    const onMeta = () => setDuration(v.duration)
    const onEnded = () => { setIsPlaying(false); setIsPausedByOrion(false) }
    v.addEventListener('timeupdate', onTime)
    v.addEventListener('loadedmetadata', onMeta)
    v.addEventListener('ended', onEnded)
    return () => {
      v.removeEventListener('timeupdate', onTime)
      v.removeEventListener('loadedmetadata', onMeta)
      v.removeEventListener('ended', onEnded)
    }
  }, [videoSrc])

  // ── File upload ────────────────────────────────────────────────────────────
  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith('video/')) return
    setVideoName(file.name)
    setVideoSrc(URL.createObjectURL(file))
    setIsPlaying(false); setIsPausedByOrion(false); setCoachMoment(null)
    setMoments([]); lastPauseRef.current = 0; setPlayersLocked(false)
    setTrackingConfident(false)
  }, [])

  // ── Playback controls ──────────────────────────────────────────────────────
  const togglePlay = useCallback(() => {
    const v = videoRef.current; if (!v) return
    if (v.paused) { v.play(); setIsPlaying(true); setIsPausedByOrion(false) }
    else { v.pause(); setIsPlaying(false) }
  }, [])

  const handleContinue = useCallback(() => {
    const v = videoRef.current; if (!v) return
    setIsPausedByOrion(false); v.play(); setIsPlaying(true)
  }, [])

  const handleReplay = useCallback(() => {
    const v = videoRef.current; if (!v) return
    v.currentTime = Math.max(0, replayTimestamp - 3)
    v.play(); setIsPlaying(true); setIsPausedByOrion(false)
  }, [replayTimestamp])

  const handleSlowMotion = useCallback(() => {
    const v = videoRef.current; if (!v) return
    v.playbackRate = 0.5; setPlaybackRate(0.5)
    v.play(); setIsPlaying(true); setIsPausedByOrion(false)
  }, [])

  const setSpeed = useCallback((r: number) => {
    const v = videoRef.current; if (!v) return
    v.playbackRate = r; setPlaybackRate(r)
  }, [])

  const stepFrame = useCallback((dir: number) => {
    const v = videoRef.current; if (!v) return
    v.currentTime = Math.max(0, Math.min(duration, v.currentTime + dir / 30))
    drawFrame()
  }, [duration, drawFrame])

  const jumpTo = useCallback((t: number) => {
    const v = videoRef.current; if (!v) return
    v.currentTime = t; setCurrentTime(t); drawFrame()
  }, [drawFrame])

  // ── Player tap selection ───────────────────────────────────────────────────
  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!selectingPlayer) return
    const canvas = canvasRef.current; if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const nx = (e.clientX - rect.left) / rect.width
    const ny = (e.clientY - rect.top) / rect.height
    const allLm = latestLandmarksRef.current
    const idx = findClosestToClick(allLm, nx, ny)
    if (selectingPlayer === 'P1') p1IndexRef.current = idx
    else p2IndexRef.current = idx
    setPlayersLocked(true); setTrackingMode('manual')
    setTrackingConfident(true); setSelectingPlayer(null)
  }, [selectingPlayer])

  // ── Zone drag (kept for future) ────────────────────────────────────────────
  const handleZoneMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!settingZone) return
    const canvas = canvasRef.current; if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    zoneDragRef.current = { startX: (e.clientX - rect.left) / rect.width, startY: (e.clientY - rect.top) / rect.height }
  }, [settingZone])

  const handleZoneMouseUp = useCallback((_e: React.MouseEvent<HTMLDivElement>) => {
    zoneDragRef.current = null
  }, [])

  // ── Auto lock ──────────────────────────────────────────────────────────────
  const handleAutoLock = useCallback(() => {
    const allLm = latestLandmarksRef.current
    if (!allLm.length) return
    const focus = autoFocusPlayers(allLm, combatZone)
    p1IndexRef.current = focus.p1Index; p2IndexRef.current = focus.p2Index
    setPlayersLocked(true); setTrackingMode(focus.mode); setTrackingConfident(focus.confident)
  }, [combatZone])

  // ── Full match scan ────────────────────────────────────────────────────────
  const handleScan = useCallback(async () => {
    const v = videoRef.current; if (!v) return
    setScanning(true); setScanProgress(0); setMoments([])
    const results = await quickScan(
      v,
      () => latestLandmarksRef.current[p1IndexRef.current] || [],
      () => latestLandmarksRef.current[p2IndexRef.current] || [],
      setScanProgress,
    )
    setMoments(results); setScanning(false); setTab('coach')
    drawFrame()
  }, [drawFrame])

  // ── Quick scan (timeout fallback) ──────────────────────────────────────────
  const handleQuickScan = useCallback(async () => {
    setAnalysisTimedOut(false); setIsPausedByOrion(false)
    await handleScan()
  }, [handleScan])

  // ── Derived ────────────────────────────────────────────────────────────────
  const suggestedSkills = getSkillsForMistakes(
    moments.flatMap(m => m.coach?.mistakeCodes || [])
  )
  const mistakeMoments = moments.filter(m => m.type === 'mistake')
  const counterMoments = moments.filter(m => m.type === 'counter')

  return (
    <AppShell>
      <div className="p-3 md:p-5 max-w-2xl mx-auto w-full space-y-4" style={{ paddingBottom: 100 }}>

        {/* Header */}
        <div>
          <h1 className="text-white font-black tracking-tight" style={{ fontSize: 22 }}>ORION ANALYSIS</h1>
          <p className="text-slate-500 text-sm mt-0.5">Silambam combat coach · auto-pause mode</p>
        </div>

        {/* Upload area */}
        {!videoSrc && (
          <div
            className={`rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-4 cursor-pointer transition-all ${isDragOver ? 'border-orion-blue bg-orion-blue/10' : 'border-slate-700 bg-slate-900/40'}`}
            style={{ minHeight: '45vh' }}
            onDragOver={e => { e.preventDefault(); setIsDragOver(true) }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={e => { e.preventDefault(); setIsDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload size={40} className="text-slate-600" />
            <div className="text-center">
              <p className="text-white font-semibold" style={{ fontSize: 18 }}>Drop combat video here</p>
              <p className="text-slate-500 text-sm mt-1">or tap to browse</p>
            </div>
            <input ref={fileInputRef} type="file" accept="video/*" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
          </div>
        )}

        {/* Video player */}
        {videoSrc && (
          <>
            <CombatVideoPlayer
              ref={videoRef}
              src={videoSrc}
              isPausedByOrion={isPausedByOrion}
              selectingPlayer={selectingPlayer}
              settingZone={settingZone}
              onCanvasClick={handleCanvasClick}
              onZoneMouseDown={handleZoneMouseDown}
              onZoneMouseUp={handleZoneMouseUp}
              canvasRef={canvasRef}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
            />

            {/* Progress bar */}
            <div className="flex items-center gap-2">
              <span className="text-slate-500 text-xs tabular-nums w-10">{fmtTime(currentTime)}</span>
              <input type="range" className="flex-1 h-1 accent-orion-blue" min={0} max={duration || 100} step={0.1} value={currentTime}
                onChange={e => { const t = parseFloat(e.target.value); if (videoRef.current) videoRef.current.currentTime = t; setCurrentTime(t) }} />
              <span className="text-slate-500 text-xs tabular-nums w-10 text-right">{fmtTime(duration)}</span>
            </div>

            {/* Controls row */}
            <div className="flex items-center gap-2">
              <button onClick={() => stepFrame(-1)} className="p-3 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 active:scale-95 transition-all">
                <ChevronLeft size={18} />
              </button>
              <button onClick={togglePlay}
                className="flex-1 py-3 rounded-xl bg-orion-blue/20 border border-orion-blue/40 text-orion-blue font-bold flex items-center justify-center gap-2 active:scale-95 transition-all"
                style={{ fontSize: 18 }}>
                {isPlaying ? <Pause size={20} /> : <Play size={20} />}
                {isPlaying ? 'Pause' : 'Play'}
              </button>
              <button onClick={() => stepFrame(1)} className="p-3 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 active:scale-95 transition-all">
                <ChevronRight size={18} />
              </button>
            </div>

            {/* Speed + Scan */}
            <div className="flex gap-2">
              {([0.25, 0.5, 1] as const).map(r => (
                <button key={r} onClick={() => setSpeed(r)}
                  className={`flex-1 py-2.5 rounded-xl font-semibold transition-all ${playbackRate === r ? 'bg-orion-blue/20 border border-orion-blue/40 text-orion-blue' : 'bg-slate-800 border border-slate-700 text-slate-400'}`}
                  style={{ fontSize: 15 }}>
                  {r === 0.25 ? '¼×' : r === 0.5 ? '½×' : '1×'}
                </button>
              ))}
              <button onClick={handleScan} disabled={scanning}
                className="flex-1 py-2.5 rounded-xl font-semibold bg-purple-500/15 border border-purple-500/30 text-purple-400 flex items-center justify-center gap-1.5 active:scale-95 transition-all disabled:opacity-50"
                style={{ fontSize: 15 }}>
                <Scan size={15} /> {scanning ? `${scanProgress}%` : 'Full Scan'}
              </button>
            </div>

            {/* Tracking status */}
            <TrackingStatusBadge
              mode={trackingMode}
              confident={trackingConfident}
              playersLocked={playersLocked}
              onSelectP1={() => setSelectingPlayer('P1')}
              onSelectP2={() => setSelectingPlayer('P2')}
              onRescan={handleAutoLock}
            />

            {/* Change video */}
            <button onClick={() => { setVideoSrc(null); setMoments([]); setCoachMoment(null); setIsPausedByOrion(false) }}
              className="w-full py-2.5 rounded-xl text-slate-500 border border-slate-800 hover:border-slate-700 transition-all"
              style={{ fontSize: 14 }}>
              ↑ Upload different video
            </button>
          </>
        )}

        {/* Coach Pause Card */}
        {isPausedByOrion && (
          <CoachPauseCard
            moment={coachMoment}
            timestamp={fmtTime(currentTime)}
            timestampSec={currentTime}
            loading={loadingCoach}
            timedOut={analysisTimedOut}
            videoName={videoName}
            onReplay={handleReplay}
            onSlowMotion={handleSlowMotion}
            onContinue={handleContinue}
            onQuickScan={handleQuickScan}
          />
        )}

        {/* Tabs */}
        {videoSrc && (
          <>
            <div className="flex gap-1 rounded-xl bg-slate-900 border border-slate-800 p-1">
              {(['coach', 'mistakes', 'counters', 'skills'] as const).map(t => (
                <button key={t} onClick={() => setTab(t)}
                  className={`flex-1 py-2 rounded-lg font-semibold capitalize transition-all ${tab === t ? 'bg-slate-700 text-white' : 'text-slate-500'}`}
                  style={{ fontSize: 13 }}>
                  {t === 'coach' ? 'Coach'
                    : t === 'mistakes' ? `Mistakes${mistakeMoments.length ? ` (${mistakeMoments.length})` : ''}`
                    : t === 'counters' ? `Counters${counterMoments.length ? ` (${counterMoments.length})` : ''}`
                    : 'Skills'}
                </button>
              ))}
            </div>

            {tab === 'coach' && (
              <CombatSummary moments={moments} onJump={jumpTo} videoName={videoName} />
            )}

            {tab === 'mistakes' && (
              <CombatSummary moments={mistakeMoments} onJump={jumpTo} videoName={videoName} />
            )}

            {tab === 'counters' && (
              <CombatSummary moments={counterMoments} onJump={jumpTo} videoName={videoName} />
            )}

            {tab === 'skills' && (
              <div className="space-y-3">
                {suggestedSkills.length === 0 ? (
                  <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-8 text-center">
                    <p className="text-slate-400" style={{ fontSize: 16 }}>Skills appear based on mistakes found.</p>
                    <p className="text-slate-500 text-sm mt-1">Run Scan Full Match to get personalised skill tips.</p>
                  </div>
                ) : suggestedSkills.map(sk => <SkillSuggestionCard key={sk.id} skill={sk} />)}
              </div>
            )}
          </>
        )}

      </div>
    </AppShell>
  )
}
