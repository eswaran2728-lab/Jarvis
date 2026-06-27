import { detectGap } from '@/lib/combat/gapDetector'
import { detectEchoCounter } from '@/lib/combat/echoDetector'
import { detectTrapOpportunity } from '@/lib/combat/trapDetector'
import { detectActiveBasalaiDefence } from '@/lib/combat/basalaiDefence'
import { detectEmergencyBlock } from '@/lib/combat/emergencyBlock'
import { detectRetreat } from '@/lib/combat/retreatDetector'
import { detectSlide } from '@/lib/combat/slideDetector'
import { detectZip } from '@/lib/combat/zipDetector'

export type CombatDetectionResult = {
  anyDetection: boolean
  detectedTechniques: string
  payload: Record<string, any>
}

export function runCombatAnalysis(
  p1Lm: any[],
  p2Lm: any[],
  prevLm: any[],
  prevDefLm: any[][],
  timestamp: string
): CombatDetectionResult {
  const combined = [...p1Lm, ...p2Lm]

  const gapSt = detectGap(combined, prevLm)
  const echoSt = detectEchoCounter(p1Lm, p2Lm)
  const trapOpp = detectTrapOpportunity(p1Lm, p2Lm)
  const bavalaiSt = detectActiveBasalaiDefence(p1Lm, p2Lm, prevDefLm)
  const emergSt = detectEmergencyBlock(p1Lm, p2Lm)
  const retreatSt = detectRetreat(p1Lm, p2Lm, prevLm)
  const slideSt = detectSlide(p1Lm, p2Lm)
  const zipSt = detectZip(p1Lm, p2Lm)

  const flags = [
    gapSt?.gapType !== 'NONE' ? `Gap:${gapSt?.gapType}` : null,
    echoSt?.echoDetected ? `Echo:${echoSt?.echoDirection}` : null,
    trapOpp?.trapAvailable ? 'Trap' : null,
    bavalaiSt?.defenceActive ? 'Bavalai' : null,
    emergSt?.blockDetected ? 'Block' : null,
    retreatSt?.retreatDetected ? 'Retreat' : null,
    (slideSt as any)?.slideAvailable ? 'Slide' : null,
    (zipSt as any)?.zipAvailable ? 'Zip' : null,
  ].filter(Boolean) as string[]

  const anyDetection = flags.length > 0

  return {
    anyDetection,
    detectedTechniques: flags.join(', '),
    payload: {
      timestamp,
      player: 'Both',
      detectedTechniques: flags.join(', '),
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
      bavalaiOpportunity: bavalaiSt?.bestOpportunity?.technique,
      retreatResult: retreatSt?.result,
      slideAvailable: (slideSt as any)?.slideAvailable,
      zipAvailable: (zipSt as any)?.zipAvailable,
      uStrikeAvailable: false,
      hookAvailable: false,
      usiAvailable: false,
      sweepAvailable: false,
      wristSpeed: null,
    },
  }
}
