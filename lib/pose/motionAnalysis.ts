// Full motion analysis engine for Silambam and martial arts
// Calculates: attack speed, power, reaction time, height/weight estimation

export type MotionFrame = {
  landmarks: any[]
  timestamp: number // ms
}

export type MotionMetrics = {
  attackSpeed: number      // m/s estimated
  reactionTime: number     // ms
  power: number            // watts estimated
  strikeCount: number
  estimatedHeight: number  // cm
  estimatedWeight: number  // kg
  avgStrikeSpeed: number   // m/s
  maxStrikeSpeed: number   // m/s
  footworkScore: number    // 0-100
  guardScore: number       // 0-100
  combatReadiness: number  // 0-100
  techniqueType: string    // detected Silambam technique
  remarks: string[]
}

export type SilambamTechnique = {
  id: string
  name: string
  tamilName: string
  category: 'strike' | 'block' | 'footwork' | 'spin' | 'combo'
  description: string
  targetAreas: string[]
  difficulty: 'beginner' | 'intermediate' | 'advanced' | 'master'
  animationFrames: PoseFrame[]  // stick figure keyframes
}

export type PoseFrame = {
  // Normalized 0-1 positions for stick figure animation
  head: { x: number; y: number }
  neck: { x: number; y: number }
  leftShoulder: { x: number; y: number }
  rightShoulder: { x: number; y: number }
  leftElbow: { x: number; y: number }
  rightElbow: { x: number; y: number }
  leftWrist: { x: number; y: number }
  rightWrist: { x: number; y: number }
  leftHip: { x: number; y: number }
  rightHip: { x: number; y: number }
  leftKnee: { x: number; y: number }
  rightKnee: { x: number; y: number }
  leftFoot: { x: number; y: number }
  rightFoot: { x: number; y: number }
  stickTip?: { x: number; y: number }   // Silambam stick tip
  stickBase?: { x: number; y: number }  // Silambam stick base
  duration: number // ms for this frame
}

// Silambam technique definitions with animation keyframes
export const SILAMBAM_TECHNIQUES: SilambamTechnique[] = [
  {
    id: 'veechu',
    name: 'Veechu (Basic Strike)',
    tamilName: 'வீசு',
    category: 'strike',
    description: 'Fundamental Silambam swing. The stick is swung in a wide arc targeting head, shoulders, or legs.',
    targetAreas: ['Head', 'Shoulders', 'Ribs'],
    difficulty: 'beginner',
    animationFrames: [
      // Ready stance
      { head:{x:.5,y:.08}, neck:{x:.5,y:.15}, leftShoulder:{x:.38,y:.22}, rightShoulder:{x:.62,y:.22}, leftElbow:{x:.32,y:.32}, rightElbow:{x:.7,y:.28}, leftWrist:{x:.28,y:.42}, rightWrist:{x:.76,y:.18}, leftHip:{x:.42,y:.5}, rightHip:{x:.58,y:.5}, leftKnee:{x:.4,y:.68}, rightKnee:{x:.6,y:.68}, leftFoot:{x:.38,y:.88}, rightFoot:{x:.62,y:.88}, stickBase:{x:.76,y:.18}, stickTip:{x:.88,y:.05}, duration:400 },
      // Wind-up
      { head:{x:.5,y:.08}, neck:{x:.5,y:.15}, leftShoulder:{x:.36,y:.2}, rightShoulder:{x:.64,y:.2}, leftElbow:{x:.28,y:.28}, rightElbow:{x:.72,y:.15}, leftWrist:{x:.22,y:.14}, rightWrist:{x:.8,y:.08}, leftHip:{x:.42,y:.5}, rightHip:{x:.58,y:.5}, leftKnee:{x:.38,y:.66}, rightKnee:{x:.62,y:.66}, leftFoot:{x:.35,y:.88}, rightFoot:{x:.65,y:.88}, stickBase:{x:.8,y:.08}, stickTip:{x:.92,y:-.05}, duration:300 },
      // Strike
      { head:{x:.5,y:.08}, neck:{x:.5,y:.15}, leftShoulder:{x:.38,y:.22}, rightShoulder:{x:.62,y:.22}, leftElbow:{x:.3,y:.32}, rightElbow:{x:.68,y:.32}, leftWrist:{x:.2,y:.42}, rightWrist:{x:.82,y:.38}, leftHip:{x:.42,y:.5}, rightHip:{x:.58,y:.5}, leftKnee:{x:.38,y:.68}, rightKnee:{x:.62,y:.68}, leftFoot:{x:.36,y:.88}, rightFoot:{x:.64,y:.88}, stickBase:{x:.82,y:.38}, stickTip:{x:.96,y:.52}, duration:200 },
      // Follow-through
      { head:{x:.5,y:.08}, neck:{x:.5,y:.15}, leftShoulder:{x:.38,y:.22}, rightShoulder:{x:.62,y:.22}, leftElbow:{x:.32,y:.34}, rightElbow:{x:.7,y:.36}, leftWrist:{x:.26,y:.44}, rightWrist:{x:.78,y:.44}, leftHip:{x:.42,y:.5}, rightHip:{x:.58,y:.5}, leftKnee:{x:.4,y:.68}, rightKnee:{x:.6,y:.68}, leftFoot:{x:.38,y:.88}, rightFoot:{x:.62,y:.88}, stickBase:{x:.78,y:.44}, stickTip:{x:.9,y:.58}, duration:400 },
    ],
  },
  {
    id: 'kaaladi',
    name: 'Kaaladi (Footwork)',
    tamilName: 'காலடி',
    category: 'footwork',
    description: 'Silambam triangular footwork pattern. Builds agility, balance, and evasion skills.',
    targetAreas: ['Evasion', 'Positioning'],
    difficulty: 'beginner',
    animationFrames: [
      { head:{x:.5,y:.08}, neck:{x:.5,y:.15}, leftShoulder:{x:.38,y:.22}, rightShoulder:{x:.62,y:.22}, leftElbow:{x:.3,y:.32}, rightElbow:{x:.7,y:.32}, leftWrist:{x:.25,y:.42}, rightWrist:{x:.75,y:.42}, leftHip:{x:.43,y:.5}, rightHip:{x:.57,y:.5}, leftKnee:{x:.4,y:.66}, rightKnee:{x:.6,y:.66}, leftFoot:{x:.38,y:.88}, rightFoot:{x:.62,y:.88}, duration:400 },
      { head:{x:.48,y:.09}, neck:{x:.48,y:.16}, leftShoulder:{x:.36,y:.23}, rightShoulder:{x:.6,y:.23}, leftElbow:{x:.28,y:.33}, rightElbow:{x:.68,y:.33}, leftWrist:{x:.23,y:.43}, rightWrist:{x:.73,y:.43}, leftHip:{x:.41,y:.51}, rightHip:{x:.55,y:.51}, leftKnee:{x:.35,y:.66}, rightKnee:{x:.58,y:.7}, leftFoot:{x:.28,y:.88}, rightFoot:{x:.65,y:.88}, duration:350 },
      { head:{x:.52,y:.09}, neck:{x:.52,y:.16}, leftShoulder:{x:.4,y:.23}, rightShoulder:{x:.64,y:.23}, leftElbow:{x:.32,y:.33}, rightElbow:{x:.72,y:.33}, leftWrist:{x:.27,y:.43}, rightWrist:{x:.77,y:.43}, leftHip:{x:.45,y:.51}, rightHip:{x:.59,y:.51}, leftKnee:{x:.42,y:.7}, rightKnee:{x:.62,y:.66}, leftFoot:{x:.38,y:.88}, rightFoot:{x:.72,y:.88}, duration:350 },
      { head:{x:.5,y:.08}, neck:{x:.5,y:.15}, leftShoulder:{x:.38,y:.22}, rightShoulder:{x:.62,y:.22}, leftElbow:{x:.3,y:.32}, rightElbow:{x:.7,y:.32}, leftWrist:{x:.25,y:.42}, rightWrist:{x:.75,y:.42}, leftHip:{x:.43,y:.5}, rightHip:{x:.57,y:.5}, leftKnee:{x:.4,y:.66}, rightKnee:{x:.6,y:.66}, leftFoot:{x:.38,y:.88}, rightFoot:{x:.62,y:.88}, duration:400 },
    ],
  },
  {
    id: 'sutru',
    name: 'Sutru (360° Spin Strike)',
    tamilName: 'சுற்று',
    category: 'spin',
    description: 'Full body rotation strike. Maximum power generated through angular momentum.',
    targetAreas: ['All zones', 'Surprise attack'],
    difficulty: 'intermediate',
    animationFrames: [
      { head:{x:.5,y:.08}, neck:{x:.5,y:.15}, leftShoulder:{x:.38,y:.22}, rightShoulder:{x:.62,y:.22}, leftElbow:{x:.3,y:.32}, rightElbow:{x:.72,y:.28}, leftWrist:{x:.24,y:.42}, rightWrist:{x:.8,y:.2}, leftHip:{x:.42,y:.5}, rightHip:{x:.58,y:.5}, leftKnee:{x:.4,y:.68}, rightKnee:{x:.6,y:.68}, leftFoot:{x:.36,y:.88}, rightFoot:{x:.64,y:.88}, stickBase:{x:.8,y:.2}, stickTip:{x:.9,y:.06}, duration:300 },
      { head:{x:.45,y:.09}, neck:{x:.46,y:.16}, leftShoulder:{x:.34,y:.22}, rightShoulder:{x:.56,y:.24}, leftElbow:{x:.24,y:.3}, rightElbow:{x:.62,y:.34}, leftWrist:{x:.16,y:.24}, rightWrist:{x:.7,y:.44}, leftHip:{x:.4,y:.52}, rightHip:{x:.54,y:.52}, leftKnee:{x:.38,y:.7}, rightKnee:{x:.58,y:.7}, leftFoot:{x:.34,y:.88}, rightFoot:{x:.62,y:.88}, stickBase:{x:.16,y:.24}, stickTip:{x:.04,y:.14}, duration:250 },
      { head:{x:.5,y:.08}, neck:{x:.5,y:.15}, leftShoulder:{x:.62,y:.22}, rightShoulder:{x:.38,y:.22}, leftElbow:{x:.72,y:.28}, rightElbow:{x:.3,y:.3}, leftWrist:{x:.8,y:.2}, rightWrist:{x:.22,y:.4}, leftHip:{x:.58,y:.5}, rightHip:{x:.42,y:.5}, leftKnee:{x:.6,y:.68}, rightKnee:{x:.4,y:.68}, leftFoot:{x:.64,y:.88}, rightFoot:{x:.36,y:.88}, stickBase:{x:.8,y:.2}, stickTip:{x:.92,y:.1}, duration:200 },
      { head:{x:.5,y:.08}, neck:{x:.5,y:.15}, leftShoulder:{x:.38,y:.22}, rightShoulder:{x:.62,y:.22}, leftElbow:{x:.3,y:.32}, rightElbow:{x:.7,y:.32}, leftWrist:{x:.25,y:.42}, rightWrist:{x:.75,y:.42}, leftHip:{x:.42,y:.5}, rightHip:{x:.58,y:.5}, leftKnee:{x:.4,y:.68}, rightKnee:{x:.6,y:.68}, leftFoot:{x:.38,y:.88}, rightFoot:{x:.62,y:.88}, duration:400 },
    ],
  },
  {
    id: 'marappu',
    name: 'Marappu (Block & Counter)',
    tamilName: 'மறப்பு',
    category: 'block',
    description: 'Defensive block followed immediately by counter-strike. Core defensive technique.',
    targetAreas: ['Block incoming', 'Counter to ribs', 'Counter to legs'],
    difficulty: 'intermediate',
    animationFrames: [
      { head:{x:.5,y:.08}, neck:{x:.5,y:.15}, leftShoulder:{x:.38,y:.22}, rightShoulder:{x:.62,y:.22}, leftElbow:{x:.3,y:.28}, rightElbow:{x:.68,y:.26}, leftWrist:{x:.24,y:.2}, rightWrist:{x:.76,y:.16}, leftHip:{x:.43,y:.5}, rightHip:{x:.57,y:.5}, leftKnee:{x:.41,y:.67}, rightKnee:{x:.59,y:.67}, leftFoot:{x:.39,y:.88}, rightFoot:{x:.61,y:.88}, stickBase:{x:.76,y:.16}, stickTip:{x:.64,y:.04}, duration:300 },
      { head:{x:.5,y:.09}, neck:{x:.5,y:.16}, leftShoulder:{x:.37,y:.22}, rightShoulder:{x:.61,y:.22}, leftElbow:{x:.29,y:.3}, rightElbow:{x:.67,y:.26}, leftWrist:{x:.22,y:.36}, rightWrist:{x:.74,y:.16}, leftHip:{x:.43,y:.52}, rightHip:{x:.57,y:.52}, leftKnee:{x:.4,y:.7}, rightKnee:{x:.6,y:.7}, leftFoot:{x:.36,y:.88}, rightFoot:{x:.62,y:.88}, stickBase:{x:.74,y:.16}, stickTip:{x:.62,y:.05}, duration:200 },
      { head:{x:.5,y:.08}, neck:{x:.5,y:.15}, leftShoulder:{x:.38,y:.22}, rightShoulder:{x:.62,y:.22}, leftElbow:{x:.28,y:.34}, rightElbow:{x:.7,y:.34}, leftWrist:{x:.2,y:.46}, rightWrist:{x:.82,y:.42}, leftHip:{x:.42,y:.5}, rightHip:{x:.58,y:.5}, leftKnee:{x:.38,y:.68}, rightKnee:{x:.62,y:.68}, leftFoot:{x:.34,y:.88}, rightFoot:{x:.66,y:.88}, stickBase:{x:.82,y:.42}, stickTip:{x:.96,y:.54}, duration:200 },
      { head:{x:.5,y:.08}, neck:{x:.5,y:.15}, leftShoulder:{x:.38,y:.22}, rightShoulder:{x:.62,y:.22}, leftElbow:{x:.3,y:.32}, rightElbow:{x:.7,y:.32}, leftWrist:{x:.25,y:.42}, rightWrist:{x:.75,y:.42}, leftHip:{x:.42,y:.5}, rightHip:{x:.58,y:.5}, leftKnee:{x:.4,y:.68}, rightKnee:{x:.6,y:.68}, leftFoot:{x:.38,y:.88}, rightFoot:{x:.62,y:.88}, duration:400 },
    ],
  },
  {
    id: 'thadi',
    name: 'Thadi Payirchi (Power Drill)',
    tamilName: 'தடி பயிற்சி',
    category: 'combo',
    description: 'Core power training drill combining overhead, side and low strikes in one continuous flow.',
    targetAreas: ['Head', 'Sides', 'Legs'],
    difficulty: 'advanced',
    animationFrames: [
      { head:{x:.5,y:.08}, neck:{x:.5,y:.15}, leftShoulder:{x:.38,y:.22}, rightShoulder:{x:.62,y:.22}, leftElbow:{x:.3,y:.18}, rightElbow:{x:.7,y:.18}, leftWrist:{x:.28,y:.1}, rightWrist:{x:.72,y:.1}, leftHip:{x:.42,y:.5}, rightHip:{x:.58,y:.5}, leftKnee:{x:.4,y:.68}, rightKnee:{x:.6,y:.68}, leftFoot:{x:.38,y:.88}, rightFoot:{x:.62,y:.88}, stickBase:{x:.5,y:.1}, stickTip:{x:.5,y:-.04}, duration:350 },
      { head:{x:.5,y:.08}, neck:{x:.5,y:.15}, leftShoulder:{x:.36,y:.22}, rightShoulder:{x:.64,y:.22}, leftElbow:{x:.2,y:.3}, rightElbow:{x:.8,y:.3}, leftWrist:{x:.1,y:.38}, rightWrist:{x:.9,y:.38}, leftHip:{x:.42,y:.5}, rightHip:{x:.58,y:.5}, leftKnee:{x:.38,y:.7}, rightKnee:{x:.62,y:.7}, leftFoot:{x:.34,y:.88}, rightFoot:{x:.66,y:.88}, stickBase:{x:.1,y:.38}, stickTip:{x:-.04,y:.44}, duration:300 },
      { head:{x:.5,y:.08}, neck:{x:.5,y:.15}, leftShoulder:{x:.36,y:.22}, rightShoulder:{x:.64,y:.22}, leftElbow:{x:.22,y:.3}, rightElbow:{x:.78,y:.3}, leftWrist:{x:.14,y:.36}, rightWrist:{x:.86,y:.36}, leftHip:{x:.42,y:.5}, rightHip:{x:.58,y:.5}, leftKnee:{x:.38,y:.7}, rightKnee:{x:.62,y:.7}, leftFoot:{x:.34,y:.88}, rightFoot:{x:.66,y:.88}, stickBase:{x:.86,y:.36}, stickTip:{x:1.0,y:.42}, duration:300 },
      { head:{x:.5,y:.1}, neck:{x:.5,y:.17}, leftShoulder:{x:.38,y:.24}, rightShoulder:{x:.62,y:.24}, leftElbow:{x:.28,y:.38}, rightElbow:{x:.72,y:.38}, leftWrist:{x:.2,y:.54}, rightWrist:{x:.8,y:.54}, leftHip:{x:.42,y:.52}, rightHip:{x:.58,y:.52}, leftKnee:{x:.38,y:.72}, rightKnee:{x:.62,y:.72}, leftFoot:{x:.36,y:.9}, rightFoot:{x:.64,y:.9}, stickBase:{x:.5,y:.6}, stickTip:{x:.5,y:.74}, duration:350 },
    ],
  },
  {
    id: 'mael_veechu',
    name: 'Mael Veechu (Overhead Strike)',
    tamilName: 'மேல் வீசு',
    category: 'strike',
    description: 'Powerful downward overhead strike. Targets the head and collarbone area.',
    targetAreas: ['Head', 'Collarbone', 'Shoulder'],
    difficulty: 'beginner',
    animationFrames: [
      { head:{x:.5,y:.08}, neck:{x:.5,y:.15}, leftShoulder:{x:.38,y:.22}, rightShoulder:{x:.62,y:.22}, leftElbow:{x:.3,y:.18}, rightElbow:{x:.7,y:.18}, leftWrist:{x:.32,y:.1}, rightWrist:{x:.68,y:.1}, leftHip:{x:.42,y:.5}, rightHip:{x:.58,y:.5}, leftKnee:{x:.4,y:.68}, rightKnee:{x:.6,y:.68}, leftFoot:{x:.38,y:.88}, rightFoot:{x:.62,y:.88}, stickBase:{x:.5,y:.1}, stickTip:{x:.5,y:-.05}, duration:400 },
      { head:{x:.5,y:.09}, neck:{x:.5,y:.16}, leftShoulder:{x:.38,y:.23}, rightShoulder:{x:.62,y:.23}, leftElbow:{x:.3,y:.26}, rightElbow:{x:.7,y:.26}, leftWrist:{x:.32,y:.36}, rightWrist:{x:.68,y:.36}, leftHip:{x:.43,y:.52}, rightHip:{x:.57,y:.52}, leftKnee:{x:.4,y:.7}, rightKnee:{x:.6,y:.7}, leftFoot:{x:.38,y:.88}, rightFoot:{x:.62,y:.88}, stickBase:{x:.5,y:.36}, stickTip:{x:.5,y:.22}, duration:200 },
      { head:{x:.5,y:.09}, neck:{x:.5,y:.16}, leftShoulder:{x:.38,y:.24}, rightShoulder:{x:.62,y:.24}, leftElbow:{x:.3,y:.36}, rightElbow:{x:.7,y:.36}, leftWrist:{x:.32,y:.5}, rightWrist:{x:.68,y:.5}, leftHip:{x:.43,y:.53}, rightHip:{x:.57,y:.53}, leftKnee:{x:.4,y:.7}, rightKnee:{x:.6,y:.7}, leftFoot:{x:.38,y:.88}, rightFoot:{x:.62,y:.88}, stickBase:{x:.5,y:.5}, stickTip:{x:.5,y:.64}, duration:300 },
    ],
  },
  {
    id: 'keel_veechu',
    name: 'Keel Veechu (Low Strike)',
    tamilName: 'கீழ் வீசு',
    category: 'strike',
    description: 'Upward low strike targeting the legs, knees, and lower body.',
    targetAreas: ['Legs', 'Knees', 'Feet'],
    difficulty: 'beginner',
    animationFrames: [
      { head:{x:.5,y:.08}, neck:{x:.5,y:.15}, leftShoulder:{x:.38,y:.22}, rightShoulder:{x:.62,y:.22}, leftElbow:{x:.3,y:.32}, rightElbow:{x:.7,y:.32}, leftWrist:{x:.24,y:.44}, rightWrist:{x:.76,y:.44}, leftHip:{x:.42,y:.5}, rightHip:{x:.58,y:.5}, leftKnee:{x:.4,y:.68}, rightKnee:{x:.6,y:.68}, leftFoot:{x:.38,y:.88}, rightFoot:{x:.62,y:.88}, stickBase:{x:.76,y:.44}, stickTip:{x:.88,y:.58}, duration:300 },
      { head:{x:.5,y:.09}, neck:{x:.5,y:.16}, leftShoulder:{x:.38,y:.24}, rightShoulder:{x:.62,y:.24}, leftElbow:{x:.3,y:.38}, rightElbow:{x:.7,y:.4}, leftWrist:{x:.22,y:.56}, rightWrist:{x:.8,y:.58}, leftHip:{x:.43,y:.54}, rightHip:{x:.57,y:.54}, leftKnee:{x:.4,y:.72}, rightKnee:{x:.6,y:.72}, leftFoot:{x:.38,y:.9}, rightFoot:{x:.62,y:.9}, stickBase:{x:.8,y:.58}, stickTip:{x:.92,y:.74}, duration:250 },
      { head:{x:.5,y:.08}, neck:{x:.5,y:.15}, leftShoulder:{x:.38,y:.22}, rightShoulder:{x:.62,y:.22}, leftElbow:{x:.3,y:.32}, rightElbow:{x:.7,y:.32}, leftWrist:{x:.24,y:.44}, rightWrist:{x:.76,y:.44}, leftHip:{x:.42,y:.5}, rightHip:{x:.58,y:.5}, leftKnee:{x:.4,y:.68}, rightKnee:{x:.6,y:.68}, leftFoot:{x:.38,y:.88}, rightFoot:{x:.62,y:.88}, duration:400 },
    ],
  },
  {
    id: 'iduppu_sutru',
    name: 'Iduppu Sutru (Hip Spin)',
    tamilName: 'இடுப்பு சுற்று',
    category: 'spin',
    description: 'Hip-driven spinning technique. Uses lower body rotation to generate full-body power.',
    targetAreas: ['Sides', 'Back attack', 'Multiple targets'],
    difficulty: 'advanced',
    animationFrames: [
      { head:{x:.5,y:.08}, neck:{x:.5,y:.15}, leftShoulder:{x:.38,y:.22}, rightShoulder:{x:.62,y:.22}, leftElbow:{x:.28,y:.32}, rightElbow:{x:.72,y:.32}, leftWrist:{x:.2,y:.42}, rightWrist:{x:.8,y:.42}, leftHip:{x:.4,y:.5}, rightHip:{x:.6,y:.5}, leftKnee:{x:.38,y:.68}, rightKnee:{x:.62,y:.68}, leftFoot:{x:.35,y:.88}, rightFoot:{x:.65,y:.88}, duration:300 },
      { head:{x:.46,y:.09}, neck:{x:.47,y:.16}, leftShoulder:{x:.35,y:.22}, rightShoulder:{x:.59,y:.24}, leftElbow:{x:.25,y:.3}, rightElbow:{x:.65,y:.34}, leftWrist:{x:.16,y:.26}, rightWrist:{x:.72,y:.44}, leftHip:{x:.38,y:.52}, rightHip:{x:.54,y:.54}, leftKnee:{x:.35,y:.7}, rightKnee:{x:.58,y:.72}, leftFoot:{x:.3,y:.88}, rightFoot:{x:.62,y:.9}, duration:250 },
      { head:{x:.54,y:.09}, neck:{x:.53,y:.16}, leftShoulder:{x:.41,y:.24}, rightShoulder:{x:.65,y:.22}, leftElbow:{x:.35,y:.34}, rightElbow:{x:.75,y:.3}, leftWrist:{x:.28,y:.44}, rightWrist:{x:.84,y:.26}, leftHip:{x:.46,y:.54}, rightHip:{x:.62,y:.52}, leftKnee:{x:.42,y:.72}, rightKnee:{x:.65,y:.7}, leftFoot:{x:.38,y:.9}, rightFoot:{x:.7,y:.88}, duration:250 },
      { head:{x:.5,y:.08}, neck:{x:.5,y:.15}, leftShoulder:{x:.38,y:.22}, rightShoulder:{x:.62,y:.22}, leftElbow:{x:.28,y:.32}, rightElbow:{x:.72,y:.32}, leftWrist:{x:.2,y:.42}, rightWrist:{x:.8,y:.42}, leftHip:{x:.4,y:.5}, rightHip:{x:.6,y:.5}, leftKnee:{x:.38,y:.68}, rightKnee:{x:.62,y:.68}, leftFoot:{x:.35,y:.88}, rightFoot:{x:.65,y:.88}, duration:400 },
    ],
  },
]

// Detect which Silambam technique is being performed from pose
export function detectTechnique(landmarks: any[]): string {
  if (!landmarks?.length) return 'Unknown'
  const lw = landmarks[15]; const rw = landmarks[16]
  const ls = landmarks[11]; const rs = landmarks[12]
  const lh = landmarks[23]; const rh = landmarks[24]
  const la = landmarks[27]; const ra = landmarks[28]

  const handY = (lw.y + rw.y) / 2
  const shoulderY = (ls.y + rs.y) / 2
  const hipY = (lh.y + rh.y) / 2
  const stanceW = Math.abs(la.x - ra.x)
  const armSpread = Math.abs(lw.x - rw.x)

  if (handY < shoulderY - 0.1) return 'Mael Veechu (Overhead)'
  if (handY > hipY + 0.1) return 'Keel Veechu (Low Strike)'
  if (armSpread > 0.5) return 'Thadi Payirchi (Power Drill)'
  if (stanceW < 0.15) return 'Kaaladi (Footwork)'
  if (armSpread > 0.35) return 'Sutru (Spin Strike)'
  return 'Veechu (Basic Strike)'
}

// Estimate height from pose landmarks (camera height reference)
export function estimateHeight(landmarks: any[], frameHeightPx: number): number {
  if (!landmarks?.length) return 170
  const nose = landmarks[0]
  const leftAnkle = landmarks[27]
  const rightAnkle = landmarks[28]
  const ankleY = (leftAnkle.y + rightAnkle.y) / 2
  const bodyFraction = ankleY - nose.y
  if (bodyFraction <= 0) return 170
  // Person occupies bodyFraction of frame. Assume they're ~90% of frame height when standing full
  const estimatedHeightFraction = bodyFraction / 0.85
  // Average frame captures ~2m of vertical space when person fills ~85%
  const estimatedCm = Math.round(estimatedHeightFraction * 185)
  return Math.min(220, Math.max(140, estimatedCm))
}

// Estimate weight from height + shoulder width (BMI-neutral approximation)
export function estimateWeight(heightCm: number, landmarks: any[]): number {
  if (!landmarks?.length) return 70
  const ls = landmarks[11]; const rs = landmarks[12]
  const shoulderRatio = Math.abs(ls.x - rs.x)
  // Broad shoulders → higher weight estimate
  const buildFactor = shoulderRatio > 0.25 ? 1.1 : shoulderRatio < 0.18 ? 0.9 : 1.0
  const bmiBase = 22 // average healthy BMI
  const heightM = heightCm / 100
  return Math.round(bmiBase * heightM * heightM * buildFactor)
}

// Calculate attack speed from wrist velocity between two frames
export function calculateAttackSpeed(
  prev: any[] | null,
  curr: any[],
  dtMs: number,
  heightCm: number,
  frameHeight: number
): number {
  if (!prev || dtMs <= 0) return 0
  const pxPerMeter = (frameHeight * (heightCm / 100)) / (heightCm / 100) * 0.85
  const pLw = prev[15]; const pRw = prev[16]
  const cLw = curr[15]; const cRw = curr[16]
  const lwDist = Math.sqrt(Math.pow((cLw.x - pLw.x), 2) + Math.pow((cLw.y - pLw.y), 2))
  const rwDist = Math.sqrt(Math.pow((cRw.x - pRw.x), 2) + Math.pow((cRw.y - pRw.y), 2))
  const maxDist = Math.max(lwDist, rwDist)
  // Convert normalised distance to metres
  const metres = maxDist * (heightCm / 100) * 1.2
  const speedMs = metres / (dtMs / 1000)
  return Math.min(25, Math.round(speedMs * 10) / 10)
}

// Calculate power from speed + estimated mass
export function calculatePower(speedMs: number, weightKg: number): number {
  // Kinetic energy proxy: 0.5 * m * v^2 (watts-like score 0-100)
  const ke = 0.5 * weightKg * speedMs * speedMs
  return Math.min(100, Math.round(ke / 5))
}

// Detect stick spin score (0–10) by measuring wrist + body angular velocity between frames
export function detectSpinScore(prev: any[] | null, curr: any[], dtMs: number): number {
  if (!prev || dtMs <= 0 || dtMs > 2000) return 0
  const pRS = prev[12]; const pRW = prev[16]; const pLS = prev[11]
  const cRS = curr[12]; const cRW = curr[16]; const cLS = curr[11]
  if (!pRS || !cRS || !pRW || !cRW) return 0

  // Wrist angle relative to shoulder
  const prevWristAngle = Math.atan2(pRW.y - pRS.y, pRW.x - pRS.x)
  const currWristAngle = Math.atan2(cRW.y - cRS.y, cRW.x - cRS.x)
  let wristDelta = Math.abs(currWristAngle - prevWristAngle)
  if (wristDelta > Math.PI) wristDelta = 2 * Math.PI - wristDelta

  // Body shoulder-line rotation
  const prevBodyAngle = Math.atan2(pRS.y - pLS.y, pRS.x - pLS.x)
  const currBodyAngle = Math.atan2(cRS.y - cLS.y, cRS.x - cLS.x)
  let bodyDelta = Math.abs(currBodyAngle - prevBodyAngle)
  if (bodyDelta > Math.PI) bodyDelta = 2 * Math.PI - bodyDelta

  const wristAngVel = wristDelta / (dtMs / 1000)
  const bodyAngVel = bodyDelta / (dtMs / 1000)
  // Full π rotation per second = spin score 10
  return Math.min(10, Math.round((wristAngVel + bodyAngVel * 2) / Math.PI * 3.3))
}

// Reflex score 0–10 based on reaction speed + attack speed
export function calcReflexScore(speedMs: number, dtMs: number): number {
  const speedScore = Math.min(5, Math.round(speedMs / 5 * 5 * 10) / 10)
  const timeScore = dtMs < 200 ? 5 : dtMs < 400 ? 4 : dtMs < 600 ? 3 : dtMs < 800 ? 2 : 1
  return Math.min(10, Math.round(speedScore + timeScore))
}

// Power as 0–10 score
export function powerScore(power: number): number {
  return Math.min(10, Math.round(power / 10))
}

// Footwork score from ankle movement variability
export function calcFootworkScore(frames: MotionFrame[]): number {
  if (frames.length < 3) return 50
  let totalMovement = 0
  for (let i = 1; i < frames.length; i++) {
    const prev = frames[i - 1].landmarks[0]
    const curr = frames[i].landmarks[0]
    if (!prev?.[27] || !curr?.[27]) continue
    const la = Math.sqrt(Math.pow(curr[27].x - prev[27].x, 2) + Math.pow(curr[27].y - prev[27].y, 2))
    const ra = Math.sqrt(Math.pow(curr[28].x - prev[28].x, 2) + Math.pow(curr[28].y - prev[28].y, 2))
    totalMovement += la + ra
  }
  const avg = (totalMovement / frames.length) * 100
  return Math.min(100, Math.round(avg * 300))
}

export function generateMotionRemarks(metrics: MotionMetrics): string[] {
  const r: string[] = []
  if (metrics.attackSpeed > 8) r.push(`⚡ Excellent attack speed at ${metrics.attackSpeed} m/s — competition level!`)
  else if (metrics.attackSpeed > 4) r.push(`🟡 Good attack speed (${metrics.attackSpeed} m/s). Push for 8+ m/s for tournament level.`)
  else if (metrics.attackSpeed > 0) r.push(`🔴 Attack speed is ${metrics.attackSpeed} m/s. Focus on wrist snap and hip rotation to increase.`)

  if (metrics.power > 70) r.push(`💥 Power output is excellent (${metrics.power}/100). Your body mechanics are generating great force.`)
  else if (metrics.power > 40) r.push(`🟡 Power is moderate (${metrics.power}/100). Drive more from your hips and core.`)
  else r.push(`🔴 Low power output (${metrics.power}/100). Work on core strength and rotation speed.`)

  if (metrics.footworkScore > 70) r.push(`🦶 Footwork is dynamic and active — great mobility!`)
  else if (metrics.footworkScore > 40) r.push(`🟡 Footwork is moderate. Practise Kaaladi drills daily.`)
  else r.push(`🔴 Footwork is static. You must move your feet more during combat.`)

  if (metrics.guardScore > 75) r.push(`🛡️ Guard position is strong. Stick is well placed for defence.`)
  else r.push(`⚠️ Improve guard position. Keep stick tip higher to protect head zone.`)

  r.push(`📐 Estimated height ${metrics.estimatedHeight}cm, weight ~${metrics.estimatedWeight}kg used for calculations.`)
  return r
}
