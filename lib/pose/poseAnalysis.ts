import { PoseMetrics } from '@/types'
import { POSE_LANDMARKS } from './poseDetector'

function getAngle(a: {x:number,y:number}, b: {x:number,y:number}, c: {x:number,y:number}): number {
  const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x)
  let angle = Math.abs(radians * 180 / Math.PI)
  if (angle > 180) angle = 360 - angle
  return angle
}

function getTilt(left: {x:number,y:number}, right: {x:number,y:number}): number {
  return Math.abs((left.y - right.y) * 100)
}

export function analyzePose(landmarks: any[]): PoseMetrics {
  if (!landmarks || landmarks.length === 0) {
    return { shoulderTilt: 0, hipTilt: 0, kneeBend: 0, stanceWidth: 0, balance: 0, handHeight: 0, overallScore: 0 }
  }

  const lm = landmarks
  const ls = lm[POSE_LANDMARKS.LEFT_SHOULDER]
  const rs = lm[POSE_LANDMARKS.RIGHT_SHOULDER]
  const lh = lm[POSE_LANDMARKS.LEFT_HIP]
  const rh = lm[POSE_LANDMARKS.RIGHT_HIP]
  const lk = lm[POSE_LANDMARKS.LEFT_KNEE]
  const rk = lm[POSE_LANDMARKS.RIGHT_KNEE]
  const la = lm[POSE_LANDMARKS.LEFT_ANKLE]
  const ra = lm[POSE_LANDMARKS.RIGHT_ANKLE]
  const lw = lm[POSE_LANDMARKS.LEFT_WRIST]
  const rw = lm[POSE_LANDMARKS.RIGHT_WRIST]

  const shoulderTilt = getTilt(ls, rs)
  const hipTilt = getTilt(lh, rh)

  const leftKneeBend = getAngle(lh, lk, la)
  const rightKneeBend = getAngle(rh, rk, ra)
  const kneeBend = (leftKneeBend + rightKneeBend) / 2

  const stanceWidth = Math.abs(la.x - ra.x) * 100

  const centerX = (ls.x + rs.x + lh.x + rh.x) / 4
  const balance = Math.max(0, 100 - Math.abs(centerX - 0.5) * 200)

  const shoulderMidY = (ls.y + rs.y) / 2
  const handHeight = ((lw.y + rw.y) / 2 - shoulderMidY) * 100

  // Calculate overall score
  let score = 100
  if (shoulderTilt > 5) score -= Math.min(shoulderTilt * 2, 20)
  if (hipTilt > 5) score -= Math.min(hipTilt * 2, 20)
  if (kneeBend < 150 && kneeBend > 90) score += 5 // slight bend is good
  if (stanceWidth < 15) score -= 15
  if (stanceWidth > 50) score -= 10
  score = Math.max(0, Math.min(100, score))

  return {
    shoulderTilt: Math.round(shoulderTilt * 10) / 10,
    hipTilt: Math.round(hipTilt * 10) / 10,
    kneeBend: Math.round(kneeBend),
    stanceWidth: Math.round(stanceWidth),
    balance: Math.round(balance),
    handHeight: Math.round(handHeight),
    overallScore: Math.round(score),
  }
}

export function generateFeedback(metrics: PoseMetrics): string[] {
  const feedback: string[] = []

  if (metrics.overallScore === 0) return ['Sir, please step in front of the camera.']

  if (metrics.shoulderTilt > 8) {
    feedback.push('Sir, your shoulders are not level. Please align them horizontally.')
  } else if (metrics.shoulderTilt > 4) {
    feedback.push('Sir, minor shoulder imbalance detected. Adjust slightly.')
  } else {
    feedback.push('Good shoulder alignment, sir.')
  }

  if (metrics.hipTilt > 8) {
    feedback.push('Sir, your hips are tilted. Center your weight evenly.')
  } else {
    feedback.push('Hip alignment looks good, sir.')
  }

  if (metrics.stanceWidth < 15) {
    feedback.push('Sir, widen your stance for better stability.')
  } else if (metrics.stanceWidth > 50) {
    feedback.push('Sir, your stance is too wide. Bring your feet closer.')
  } else {
    feedback.push('Excellent stance width, sir.')
  }

  if (metrics.balance < 60) {
    feedback.push('Sir, keep your body centered over your base.')
  } else if (metrics.balance > 80) {
    feedback.push('Good balance, sir.')
  }

  if (metrics.kneeBend < 160 && metrics.kneeBend > 100) {
    feedback.push('Good knee bend, sir. Maintain this athletic position.')
  } else if (metrics.kneeBend >= 160) {
    feedback.push('Sir, bend your knees slightly for better readiness.')
  }

  return feedback
}
